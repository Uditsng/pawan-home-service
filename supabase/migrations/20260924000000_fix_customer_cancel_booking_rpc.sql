-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix customer_cancel_booking RPC function-name mismatch
-- File: 20260924000000_fix_customer_cancel_booking_rpc.sql
--
-- Root cause of "user cannot cancel booking":
--   20260823000005_fix_redispatch_state_transitions.sql recreated
--   `customer_cancel_booking` but called
--     public.get_cancellation_free_window_minutes()
--   while the canonical function defined in 20260809000001 is
--     public.get_free_cancellation_window_minutes()
--
-- The misspelled function does not exist, so every RPC invocation throws
--   "function public.get_cancellation_free_window_minutes() does not exist"
-- and customer cancellations fail.
--
-- Fix:
--   1. Create a defensive alias so any deployed RPC that references the
--      misspelled name still resolves.
--   2. Recreate `customer_cancel_booking` calling the canonical function.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Defensive alias for the misspelled name (older RPC binaries may hang on it).
CREATE OR REPLACE FUNCTION public.get_cancellation_free_window_minutes()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_free_cancellation_window_minutes();
$$;

REVOKE ALL ON FUNCTION public.get_cancellation_free_window_minutes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cancellation_free_window_minutes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cancellation_free_window_minutes() TO service_role;

-- 2. Recreate customer_cancel_booking using the canonical function name.
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
  v_window_minutes  := public.get_free_cancellation_window_minutes();
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

REVOKE ALL ON FUNCTION public.customer_cancel_booking(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(UUID, TEXT) TO service_role;