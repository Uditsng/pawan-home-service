-- ════════════════════════════════════════════════════════════════════════════
-- Migration: booking_events Actor Constraint Compatibility
-- File: 20260825000002_booking_events_actor_compat.sql
-- Purpose:
--   The live booking_events.actor CHECK constraint only allows
--   SYSTEM / USER / PARTNER. Replaces admin_release_booking_assignment so the
--   PARTNER_REASSIGNED event is logged as SYSTEM with admin_override metadata.
--   (booking_audit_trail has no actor constraint; 'ADMIN' remains valid there.)
--   Fully idempotent — safe to run on any environment state.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_release_booking_assignment(
  p_booking_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_reason  TEXT;
  v_rows    INTEGER;
BEGIN
  -- Authorization: caller must be an authenticated admin (defense in depth;
  -- the server action also enforces requireAdmin()).
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  v_reason := NULLIF(TRIM(COALESCE(p_reason, '')), '');

  -- Lock the booking row for the whole transition.
  SELECT id, status, partner_id
  INTO   v_booking
  FROM   public.bookings
  WHERE  id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'booking_not_found');
  END IF;

  IF v_booking.status IN ('completed', 'cancelled', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'booking_not_reassignable');
  END IF;

  -- Outgoing professional handling.
  IF v_booking.partner_id IS NOT NULL THEN
    -- Permanently exclude from this booking's redispatch (idempotent; the
    -- original rejection reason is preserved on repeated reassigns).
    INSERT INTO public.booking_rejections (booking_id, partner_id, reason)
    VALUES (
      p_booking_id,
      v_booking.partner_id,
      COALESCE(v_reason, 'Admin initiated reassignment')
    )
    ON CONFLICT (booking_id, partner_id) DO NOTHING;

    -- Cancellation metrics for the outgoing professional.
    UPDATE public.profiles
       SET jobs_cancelled_count = COALESCE(jobs_cancelled_count, 0) + 1,
           cancellation_rate    =
             (COALESCE(jobs_cancelled_count, 0) + 1)::NUMERIC
             / GREATEST(COALESCE(jobs_offered_count, 0), 1)
     WHERE id = v_booking.partner_id;
  END IF;

  -- Fresh dispatch cycle: delete ALL offer rows for this booking so every
  -- previously-contacted professional becomes eligible again (mirrors
  -- customer_reschedule_booking). Rejected professionals stay excluded via
  -- booking_rejections above.
  PERFORM public.release_partner_assignment(
    p_booking_id, v_booking.partner_id, TRUE);

  -- Reset to pending/unassigned with clean Tier-1 broadcast state.
  UPDATE public.bookings
     SET partner_id         = NULL,
         status             = 'pending',
         dispatch_status    = 'broadcasting',
         broadcast_tier     = 0,
         last_broadcast_at  = NULL,
         dispatch_locked_at = NULL
   WHERE id = p_booking_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'reset_failed');
  END IF;

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (
    p_booking_id,
    'PARTNER_REASSIGNED',
    -- booking_events.actor CHECK allows only SYSTEM / USER / PARTNER;
    -- admin actions are logged as SYSTEM with admin_override metadata.
    'SYSTEM',
    jsonb_build_object(
      'admin_override', TRUE,
      'previous_partner_id', v_booking.partner_id,
      'new_partner_id', NULL,
      'reason', v_reason,
      'result', 'redispatching_new_partner'
    )
  );

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (
    p_booking_id,
    'PARTNER_REASSIGNED',
    'ADMIN',
    jsonb_build_object(
      'previous_partner_id', v_booking.partner_id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_partner_id', v_booking.partner_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_release_booking_assignment(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_release_booking_assignment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_release_booking_assignment(UUID, TEXT) TO authenticated;
