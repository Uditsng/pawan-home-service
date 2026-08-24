-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Validated Partner Decline Offer RPC
-- File: 20260823000004_decline_job_offer_rpc.sql
-- Purpose:
--   1. Allow partners to dismiss/decline open job offers.
--   2. Atomically validates offer ownership, 'offered' status, and pending unassigned booking.
--   3. Logs rejection in booking_rejections to prevent redispatching to this partner.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.decline_job_offer(
  p_booking_id UUID,
  p_partner_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
  v_booking RECORD;
BEGIN
  -- 1. Check offer existence and state
  SELECT id, status, booking_id, partner_id
  INTO v_offer
  FROM public.booking_job_offers
  WHERE booking_id = p_booking_id
    AND partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_not_found');
  END IF;

  IF v_offer.status != 'offered' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_no_longer_available', 'status', v_offer.status);
  END IF;

  -- 2. Check booking state
  SELECT id, status, partner_id
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND OR v_booking.partner_id IS NOT NULL OR v_booking.status != 'pending' THEN
    -- Expire the offer safely since the booking is already assigned or inactive
    UPDATE public.booking_job_offers
    SET status = 'expired'
    WHERE booking_id = p_booking_id AND partner_id = p_partner_id;

    RETURN jsonb_build_object('success', false, 'reason', 'offer_no_longer_available');
  END IF;

  -- 3. Atomically expire the offer
  UPDATE public.booking_job_offers
  SET status = 'expired'
  WHERE booking_id = p_booking_id
    AND partner_id = p_partner_id
    AND status     = 'offered';

  -- 4. Record rejection to prevent future redispatch
  INSERT INTO public.booking_rejections (booking_id, partner_id, reason)
  VALUES (p_booking_id, p_partner_id, COALESCE(p_reason, 'Partner declined offer'))
  ON CONFLICT DO NOTHING;

  -- 5. Log audit trail and event
  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (
    p_booking_id,
    'OFFER_DECLINED',
    'PARTNER',
    jsonb_build_object('partner_id', p_partner_id, 'reason', COALESCE(p_reason, 'Partner declined offer'))
  );

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (
    p_booking_id,
    'OFFER_DECLINED',
    'PARTNER',
    jsonb_build_object('partner_id', p_partner_id, 'reason', COALESCE(p_reason, 'Partner declined offer'))
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
