-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Dispatch Escalation Schema & Crash-Resilient State Machine
-- File: 20260823000001_dispatch_escalation_schema.sql
-- Purpose:
--   1. Add explicit dispatch_status and dispatch_locked_at to bookings.
--   2. Implement atomic two-phase tier claiming with automatic stale lock recovery.
--   3. Implement batch confirmation and failure routines.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add dispatch columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS dispatch_status TEXT NOT NULL DEFAULT 'broadcasting',
  ADD COLUMN IF NOT EXISTS dispatch_locked_at TIMESTAMPTZ;

-- Ensure check constraint on dispatch_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bookings_dispatch_status'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT chk_bookings_dispatch_status
      CHECK (dispatch_status IN ('broadcasting', 'dispatching', 'failed', 'exhausted', 'assigned', 'cancelled'));
  END IF;
END $$;

-- 2. claim_dispatch_tier RPC
-- Atomically claims the right to broadcast tier N for a booking.
-- Prevents concurrent workers from broadcasting the same tier.
-- Recovers automatically from stale locks (worker crashes).
CREATE OR REPLACE FUNCTION public.claim_dispatch_tier(
  p_booking_id            UUID,
  p_target_tier           INTEGER DEFAULT 1,
  p_response_window_sec   INTEGER DEFAULT 45,
  p_lock_timeout_sec      INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_rows    INTEGER;
BEGIN
  -- Read current booking state
  SELECT id, status, partner_id, payment_status, broadcast_tier, dispatch_status, last_broadcast_at, dispatch_locked_at
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'booking_not_found');
  END IF;

  -- Verify booking is still eligible for dispatch
  IF v_booking.status != 'pending' OR v_booking.partner_id IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_assigned_or_inactive');
  END IF;

  IF v_booking.payment_status != 'paid' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'payment_not_completed');
  END IF;

  IF v_booking.dispatch_status IN ('exhausted', 'assigned', 'cancelled') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'dispatch_closed', 'status', v_booking.dispatch_status);
  END IF;

  -- Evaluate claim eligibility:
  -- Case A: Stale lock recovery (worker crashed while in 'dispatching' state)
  IF v_booking.dispatch_status = 'dispatching' THEN
    IF v_booking.dispatch_locked_at IS NOT NULL AND v_booking.dispatch_locked_at <= (NOW() - (p_lock_timeout_sec || ' seconds')::INTERVAL) THEN
      -- Recover stale lock
      UPDATE public.bookings
      SET dispatch_locked_at = NOW()
      WHERE id = p_booking_id;
      
      RETURN jsonb_build_object('claimed', true, 'recovered_stale_lock', true, 'target_tier', p_target_tier);
    ELSE
      -- Currently being dispatched by an active worker
      RETURN jsonb_build_object('claimed', false, 'reason', 'currently_dispatching');
    END IF;
  END IF;

  -- Case B: Initial dispatch (Tier 1)
  IF p_target_tier = 1 THEN
    IF v_booking.broadcast_tier = 0 OR v_booking.dispatch_status = 'failed' THEN
      UPDATE public.bookings
      SET dispatch_status    = 'dispatching',
          dispatch_locked_at = NOW()
      WHERE id = p_booking_id;

      RETURN jsonb_build_object('claimed', true, 'target_tier', 1);
    ELSE
      RETURN jsonb_build_object('claimed', false, 'reason', 'tier_1_already_dispatched');
    END IF;
  END IF;

  -- Case C: Escalation tier (Tier > 1)
  IF p_target_tier > 1 THEN
    -- Must have finished previous tier and waited the response window
    IF v_booking.broadcast_tier >= p_target_tier THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'tier_already_completed');
    END IF;

    IF v_booking.last_broadcast_at IS NOT NULL AND v_booking.last_broadcast_at > (NOW() - (p_response_window_sec || ' seconds')::INTERVAL) THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'waiting_for_response_window');
    END IF;

    UPDATE public.bookings
    SET dispatch_status    = 'dispatching',
        dispatch_locked_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object('claimed', true, 'target_tier', p_target_tier);
  END IF;

  RETURN jsonb_build_object('claimed', false, 'reason', 'unhandled_case');
END;
$$;

-- 3. confirm_dispatch_batch RPC
-- Confirms successful broadcast of a tier or marks dispatch exhausted if 0 partners found.
CREATE OR REPLACE FUNCTION public.confirm_dispatch_batch(
  p_booking_id       UUID,
  p_tier             INTEGER,
  p_dispatched_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_dispatched_count > 0 THEN
    UPDATE public.bookings
    SET dispatch_status    = 'broadcasting',
        broadcast_tier     = p_tier,
        last_broadcast_at  = NOW(),
        dispatch_locked_at = NULL
    WHERE id = p_booking_id
      AND status = 'pending'
      AND partner_id IS NULL;

    RETURN jsonb_build_object('success', true, 'status', 'broadcasting', 'tier', p_tier, 'count', p_dispatched_count);
  ELSE
    -- Zero eligible unoffered partners left -> mark exhausted
    UPDATE public.bookings
    SET dispatch_status    = 'exhausted',
        dispatch_locked_at = NULL
    WHERE id = p_booking_id
      AND status = 'pending'
      AND partner_id IS NULL;

    RETURN jsonb_build_object('success', true, 'status', 'exhausted', 'tier', p_tier, 'count', 0);
  END IF;
END;
$$;

-- 4. fail_dispatch_batch RPC
-- Resets dispatch status to 'failed' on unrecoverable error so next cycle can retry safely.
CREATE OR REPLACE FUNCTION public.fail_dispatch_batch(
  p_booking_id UUID,
  p_error_msg  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET dispatch_status    = 'failed',
      dispatch_locked_at = NULL
  WHERE id = p_booking_id
    AND status = 'pending'
    AND partner_id IS NULL;

  RETURN jsonb_build_object('success', true, 'status', 'failed');
END;
$$;
