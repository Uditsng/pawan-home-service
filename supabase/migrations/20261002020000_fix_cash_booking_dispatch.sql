-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix BUG-01 Cash Bookings Blocked From Dispatch
-- File: 20261002020000_fix_cash_booking_dispatch.sql
--
-- Problem:
--   1. claim_dispatch_tier strictly required `v_booking.payment_status = 'paid'`.
--      For Cash on Completion bookings, `payment_status` is intentionally 'pending'
--      until the partner collects cash upon service completion.
--      This caused claim_dispatch_tier to reject every cash booking with
--      `reason: 'payment_not_completed'`, blocking initial Tier 1 dispatch.
--   2. The dispatch escalation cron query strictly filtered on `.eq('payment_status', 'paid')`,
--      preventing cash bookings from ever escalating to higher tiers.
--
-- Resolution:
--   1. Update claim_dispatch_tier to inspect `payment_method`:
--      Bookings are eligible if `payment_status = 'paid'` OR `payment_method = 'Cash'`
--      with `payment_status = 'pending'`.
--   2. Unblock any historical cash bookings stuck in dispatching/failed state.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Update claim_dispatch_tier RPC ───────────────────────────────────────
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
BEGIN
  -- Read current booking state with row lock
  SELECT id, status, partner_id, payment_status, payment_method, broadcast_tier, dispatch_status, last_broadcast_at, dispatch_locked_at
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'booking_not_found');
  END IF;

  -- Verify booking is still eligible for dispatch (pending and unassigned)
  IF v_booking.status != 'pending' OR v_booking.partner_id IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_assigned_or_inactive');
  END IF;

  -- Payment check:
  -- Online/gateway bookings MUST be 'paid'.
  -- Cash on completion bookings are eligible with payment_status = 'pending'.
  IF v_booking.payment_status != 'paid' AND LOWER(COALESCE(v_booking.payment_method, '')) != 'cash' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'payment_not_completed');
  END IF;

  -- Check if dispatch is closed for this booking
  IF v_booking.dispatch_status IN ('exhausted', 'assigned', 'cancelled') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'dispatch_closed', 'status', v_booking.dispatch_status);
  END IF;

  -- Evaluate claim eligibility:
  -- Case A: Stale lock recovery (worker crashed or timed out in 'dispatching' state)
  IF v_booking.dispatch_status = 'dispatching' THEN
    IF v_booking.dispatch_locked_at IS NOT NULL AND v_booking.dispatch_locked_at <= (NOW() - (p_lock_timeout_sec || ' seconds')::INTERVAL) THEN
      UPDATE public.bookings
      SET dispatch_locked_at = NOW()
      WHERE id = p_booking_id;

      RETURN jsonb_build_object('claimed', true, 'recovered_stale_lock', true, 'target_tier', p_target_tier);
    ELSE
      RETURN jsonb_build_object('claimed', false, 'reason', 'currently_dispatching');
    END IF;
  END IF;

  -- Case B: Initial dispatch (Tier 1)
  IF p_target_tier = 1 THEN
    IF v_booking.broadcast_tier = 0 OR v_booking.broadcast_tier IS NULL OR v_booking.dispatch_status IN ('failed', 'broadcasting') THEN
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

REVOKE ALL ON FUNCTION public.claim_dispatch_tier(UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_dispatch_tier(UUID, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;

-- ─── 2. Safe Backfill / Reset for Stuck Cash Bookings ────────────────────────
-- Reset pending cash bookings that were blocked from dispatching so they can broadcast.
UPDATE public.bookings
SET dispatch_status    = 'failed',
    dispatch_locked_at = NULL,
    broadcast_tier     = 0
WHERE status = 'pending'
  AND partner_id IS NULL
  AND LOWER(COALESCE(payment_method, '')) = 'cash'
  AND (
    dispatch_status IS NULL
    OR (dispatch_status = 'dispatching' AND dispatch_locked_at <= NOW() - INTERVAL '60 seconds')
  );
