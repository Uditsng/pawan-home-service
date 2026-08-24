-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Re-dispatch State Transitions on Reschedule, Reassign, Cancel
-- File: 20260823000005_fix_redispatch_state_transitions.sql
-- Purpose:
--   1. Ensure customer_reschedule_booking resets dispatch_status to 'broadcasting'
--      and broadcast_tier to 0 so fresh dispatch (Tier 1) can proceed.
--   2. Ensure customer_cancel_booking sets dispatch_status to 'cancelled'.
--   3. Ensure reassign_partner resets dispatch_status to 'broadcasting' and
--      broadcast_tier to 0 so re-dispatch can claim Tier 1.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Update reassign_partner RPC
CREATE OR REPLACE FUNCTION public.reassign_partner(p_booking_id UUID)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Revert the booking to pending and reset dispatch state for fresh Tier 1 broadcast
  UPDATE public.bookings
  SET partner_id         = NULL,
      status             = 'pending',
      dispatch_status    = 'broadcasting',
      broadcast_tier     = 0,
      last_broadcast_at  = NULL,
      dispatch_locked_at = NULL
  WHERE id = p_booking_id;

  RETURN NULL;
END;
$$;

-- 2. Update customer_cancel_booking RPC
CREATE OR REPLACE FUNCTION public.customer_cancel_booking(p_booking_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking         RECORD;
  v_window_minutes  INTEGER;
  v_elapsed_minutes NUMERIC;
  v_refund_eligible BOOLEAN;
  v_released        UUID;
  v_reason          TEXT;
  v_metadata        JSONB;
BEGIN
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  IF v_booking.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Idempotent exit if already cancelled
  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'already_cancelled', true,
      'refund_eligible', COALESCE(v_booking.refund_eligible, false));
  END IF;

  IF v_booking.status IN ('completed', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_cancellable');
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_cancellable');
  END IF;

  -- Refund policy evaluation
  v_window_minutes  := public.get_cancellation_free_window_minutes();
  v_elapsed_minutes := EXTRACT(EPOCH FROM (now() - v_booking.created_at)) / 60.0;
  v_refund_eligible := (v_elapsed_minutes <= v_window_minutes);

  v_reason := NULLIF(TRIM(p_reason), '');
  IF v_reason IS NULL THEN
    v_reason := 'Cancelled by customer';
  END IF;

  -- Release assigned partner (if any) and clear offers
  v_released := public.release_partner_assignment(p_booking_id, v_booking.partner_id, TRUE);

  UPDATE public.bookings
     SET status             = 'cancelled',
         dispatch_status    = 'cancelled',
         dispatch_locked_at = NULL,
         cancelled_at       = now(),
         cancellation_reason = v_reason,
         refund_eligible    = v_refund_eligible,
         refund_status      = CASE
                                WHEN NOT v_refund_eligible THEN 'non_refundable'
                                WHEN v_booking.payment_status = 'paid' THEN 'pending'
                                ELSE 'not_applicable'
                              END
   WHERE id = p_booking_id;

  -- If all sibling bookings in this parent order are now terminal, update the order
  IF v_booking.order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings
       WHERE order_id = v_booking.order_id
         AND id      <> p_booking_id
         AND status  NOT IN ('completed', 'cancelled', 'expired', 'refunded')
    ) THEN
      UPDATE public.orders
         SET status         = 'cancelled',
             payment_status = CASE
                                WHEN v_refund_eligible THEN 'refunded'
                                ELSE payment_status
                              END,
             updated_at     = now()
       WHERE id = v_booking.order_id
         AND status <> 'cancelled';
    END IF;
  END IF;

  v_metadata := jsonb_build_object(
    'reason', v_reason,
    'refund_eligible', v_refund_eligible,
    'cancelled_by', 'customer',
    'window_minutes', v_window_minutes,
    'elapsed_minutes', ROUND(v_elapsed_minutes, 1),
    'released_partner_id', v_released
  );

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, remarks)
  VALUES (p_booking_id, 'cancelled', auth.uid(), 'Cancelled by customer');

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (p_booking_id, 'JOB_CANCELLED', 'USER', v_metadata);

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_CANCELLED', 'CUSTOMER', v_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'already_cancelled', false,
    'refunded', v_refund_eligible,
    'refund_eligible', v_refund_eligible,
    'released_partner_id', v_released
  );
END;
$$;

-- 3. Update customer_reschedule_booking RPC
CREATE OR REPLACE FUNCTION public.customer_reschedule_booking(
  p_booking_id UUID,
  p_new_date   DATE,
  p_new_time   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking         RECORD;
  v_new_ts          TIMESTAMPTZ;
  v_service_active  BOOLEAN;
  v_service_status  TEXT;
  v_released        UUID;
  v_old_scheduled   TIMESTAMPTZ;
  v_metadata        JSONB;
BEGIN
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  IF v_booking.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Terminal bookings can never be rescheduled
  IF v_booking.status IN ('completed', 'cancelled', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_reschedulable');
  END IF;

  -- Only before dispatch-to-location / service start
  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_reschedulable');
  END IF;

  -- Slot validity (server-side)
  v_new_ts := public.parse_slot_timestamp(p_new_date, p_new_time);
  IF v_new_ts IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_slot');
  END IF;
  IF v_new_ts <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'slot_in_past');
  END IF;

  -- Service must still be bookable
  SELECT is_active, status INTO v_service_active, v_service_status
    FROM public.services
   WHERE id = v_booking.service_id;
  IF v_service_active IS NOT TRUE OR COALESCE(v_service_status, 'published') <> 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_unavailable');
  END IF;

  -- Idempotency: identical slot on an already-pending booking is a no-op
  IF v_booking.status = 'pending'
     AND v_booking.scheduled_date IS NOT DISTINCT FROM v_new_ts THEN
    RETURN jsonb_build_object('success', true, 'already_done', true,
      'old_scheduled_date', v_booking.scheduled_date,
      'released_partner_id', NULL);
  END IF;

  v_old_scheduled := v_booking.scheduled_date;

  -- Release old assignment; clear offers so the old partner + prior tiers become
  -- re-eligible for the new slot, then reset broadcast metadata for a fresh dispatch.
  v_released := public.release_partner_assignment(p_booking_id, v_booking.partner_id, TRUE);

  UPDATE public.bookings
     SET scheduled_date     = v_new_ts,
         status             = 'pending',
         partner_id         = NULL,
         rescheduled_at     = now(),
         dispatch_status    = 'broadcasting',
         broadcast_tier     = 0,
         last_broadcast_at  = NULL,
         dispatch_locked_at = NULL
   WHERE id = p_booking_id;

  -- Keep the parent order grouping in sync (when present)
  IF v_booking.order_id IS NOT NULL THEN
    UPDATE public.orders
       SET scheduled_date = v_new_ts
     WHERE id = v_booking.order_id;
  END IF;

  v_metadata := jsonb_build_object(
    'old_date', (v_old_scheduled AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT,
    'old_time', to_char(v_old_scheduled AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM'),
    'new_date', p_new_date::TEXT,
    'new_time', p_new_time,
    'old_partner_id', v_released,
    'pricing_changed', false
  );

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, remarks)
  VALUES (p_booking_id, 'pending', auth.uid(), 'Rescheduled by customer');

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_RESCHEDULED', 'USER', v_metadata);

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_RESCHEDULED', 'CUSTOMER', v_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'already_done', false,
    'old_scheduled_date', v_old_scheduled,
    'new_scheduled_date', v_new_ts,
    'released_partner_id', v_released
  );
END;
$$;
