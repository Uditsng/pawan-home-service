-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Admin Booking Cancellation Complete Teardown (BUG-10)
-- File: 20261002060000_fix_admin_booking_cancellation.sql
--
-- Purpose:
--   Ensure complete teardown when an Admin cancels a booking:
--   1. Automatically release any assigned partner and restore availability.
--   2. Expire all outstanding broadcast job offers (booking_job_offers).
--   3. Set dispatch_status = 'cancelled' and clear dispatch_locked_at.
--   4. Synchronize parent order status and refund status.
--   5. Record status history, booking events, and audit trail atomically.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Helper overload: parameterless is_admin() using auth.uid()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 2. Authoritative admin_cancel_booking RPC
CREATE OR REPLACE FUNCTION public.admin_cancel_booking(
  p_booking_id      UUID,
  p_reason          TEXT DEFAULT NULL,
  p_refund_eligible BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking           public.bookings%ROWTYPE;
  v_partner_released  UUID;
  v_reason            TEXT;
  v_is_authorized     BOOLEAN;
BEGIN
  -- Verify caller has admin privileges or is service_role
  v_is_authorized := (
    public.is_admin(auth.uid()) OR
    auth.role() = 'service_role' OR
    current_user = 'postgres'
  );

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_admin_required');
  END IF;

  -- Lock target booking
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  -- Idempotent check
  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'booking_id', p_booking_id,
      'refund_eligible', COALESCE(v_booking.refund_eligible, false)
    );
  END IF;

  v_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Cancelled by admin');

  -- 1. Release assigned partner and expire open broadcast job offers
  v_partner_released := public.release_partner_assignment(
    p_booking_id   => p_booking_id,
    p_partner_id   => v_booking.partner_id,
    p_clear_offers => FALSE
  );

  -- 2. Update booking state completely
  UPDATE public.bookings
     SET status              = 'cancelled',
         dispatch_status     = 'cancelled',
         dispatch_locked_at  = NULL,
         cancelled_at        = NOW(),
         cancelled_by        = 'ADMIN',
         cancellation_reason = v_reason,
         refund_eligible     = p_refund_eligible,
         refund_status       = CASE
                                 WHEN NOT p_refund_eligible THEN 'non_refundable'
                                 WHEN v_booking.payment_status = 'paid' THEN 'pending'
                                 ELSE 'not_applicable'
                               END
   WHERE id = p_booking_id;

  -- 3. Synchronize parent order if all sibling bookings are now terminal
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
                                WHEN p_refund_eligible AND v_booking.payment_status = 'paid' THEN 'refunded'
                                ELSE payment_status
                              END,
             updated_at     = NOW()
       WHERE id = v_booking.order_id
         AND status <> 'cancelled';
    END IF;
  END IF;

  -- 4. Record status history
  INSERT INTO public.booking_status_history (
    booking_id,
    status,
    changed_by,
    remarks
  ) VALUES (
    p_booking_id,
    'cancelled',
    auth.uid(),
    v_reason
  );

  -- 5. Record booking events (audit & timeline)
  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    actor,
    metadata
  ) VALUES (
    p_booking_id,
    'JOB_CANCELLED',
    'SYSTEM',
    jsonb_build_object(
      'admin_override', true,
      'reason', v_reason,
      'refund_eligible', p_refund_eligible,
      'partner_released', v_partner_released IS NOT NULL,
      'released_partner_id', v_partner_released
    )
  );

  -- 6. Record admin audit trail
  INSERT INTO public.booking_audit_trail (
    booking_id,
    action,
    actor,
    metadata
  ) VALUES (
    p_booking_id,
    'ADMIN_CANCELLED',
    'ADMIN',
    jsonb_build_object(
      'reason', v_reason,
      'refund_eligible', p_refund_eligible,
      'partner_released', v_partner_released IS NOT NULL,
      'released_partner_id', v_partner_released
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'partner_released', v_partner_released IS NOT NULL,
    'released_partner_id', v_partner_released,
    'refund_eligible', p_refund_eligible
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cancel_booking(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_cancel_booking(UUID, TEXT, BOOLEAN) TO authenticated, service_role;
