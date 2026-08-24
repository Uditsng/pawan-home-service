-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Unified Assignment Finalization RPC
-- File: 20260823000002_unified_assignment_rpc.sql
-- Purpose:
--   1. Create a single, server/database-authoritative assignment finalization RPC
--      used identically by partner self-claim and admin manual assignment.
--   2. Enforce atomic booking assignment with pessimistic locking.
--   3. Expire all competing open offers in booking_job_offers.
--   4. Synchronize partner availability (is_available = FALSE, last_assigned_at = NOW()).
--   5. Maintain authoritative metric single-ownership (jobs_accepted_count, score).
--   6. Enforce server-side eligibility validation on admin assignment with auditable override.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.finalize_booking_assignment(
  p_booking_id           UUID,
  p_partner_id           UUID,
  p_assigned_by          TEXT, -- 'partner' | 'admin'
  p_override_eligibility BOOLEAN DEFAULT FALSE,
  p_override_reason      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking            RECORD;
  v_partner_profile    RECORD;
  v_is_service_matched BOOLEAN := FALSE;
  v_is_area_matched    BOOLEAN := FALSE;
  v_offer_exists       BOOLEAN := FALSE;
  v_rows               INTEGER;
BEGIN
  -- 1. Lock and read booking
  SELECT id, status, partner_id, service_id, pincode, total_amount
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'booking_not_found');
  END IF;

  -- 2. Verify booking is in an assignable state
  IF v_booking.partner_id IS NOT NULL OR v_booking.status NOT IN ('pending', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_assigned');
  END IF;

  -- 3. Read partner profile
  SELECT id, role, status, is_available, jobs_offered_count, jobs_accepted_count
  INTO v_partner_profile
  FROM public.profiles
  WHERE id = p_partner_id;

  IF NOT FOUND OR v_partner_profile.role != 'partner' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_partner');
  END IF;

  -- 4. Eligibility check for normal assignments
  IF p_assigned_by = 'admin' AND NOT p_override_eligibility THEN
    IF v_partner_profile.status != 'active' THEN
      RETURN jsonb_build_object('success', false, 'reason', 'partner_not_active');
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.partner_services
      WHERE partner_id = p_partner_id AND service_id = v_booking.service_id
    ) INTO v_is_service_matched;

    IF NOT v_is_service_matched THEN
      RETURN jsonb_build_object('success', false, 'reason', 'service_mismatch');
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.partner_service_areas
      WHERE partner_id = p_partner_id AND pincode = v_booking.pincode
    ) INTO v_is_area_matched;

    IF NOT v_is_area_matched THEN
      RETURN jsonb_build_object('success', false, 'reason', 'pincode_mismatch');
    END IF;
  END IF;

  -- 5. Atomic claim update on bookings
  UPDATE public.bookings
  SET partner_id      = p_partner_id,
      status          = 'confirmed',
      accepted_at     = NOW(),
      dispatch_status = 'assigned'
  WHERE id         = p_booking_id
    AND partner_id IS NULL
    AND status     IN ('pending', 'reassigned');

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_assigned');
  END IF;

  -- 6. Expire all other outstanding offers for this booking
  UPDATE public.booking_job_offers
  SET status = 'expired'
  WHERE booking_id = p_booking_id
    AND partner_id != p_partner_id
    AND status     = 'offered';

  -- 7. Upsert/Update winning partner's offer record to 'accepted'
  SELECT EXISTS (
    SELECT 1 FROM public.booking_job_offers
    WHERE booking_id = p_booking_id AND partner_id = p_partner_id
  ) INTO v_offer_exists;

  IF v_offer_exists THEN
    UPDATE public.booking_job_offers
    SET status = 'accepted'
    WHERE booking_id = p_booking_id AND partner_id = p_partner_id;
  ELSE
    -- Direct admin assignment without prior broadcast offer
    INSERT INTO public.booking_job_offers (booking_id, partner_id, broadcast_tier, status)
    VALUES (p_booking_id, p_partner_id, 1, 'accepted')
    ON CONFLICT (booking_id, partner_id) DO UPDATE SET status = 'accepted';

    -- Increment jobs_offered_count because no prior broadcast offered it
    UPDATE public.profiles
    SET jobs_offered_count = COALESCE(jobs_offered_count, 0) + 1
    WHERE id = p_partner_id;
  END IF;

  -- 8. Mark partner unavailable (busy on this job) & increment accepted count
  UPDATE public.profiles
  SET is_available        = FALSE,
      last_assigned_at    = NOW(),
      jobs_accepted_count = COALESCE(jobs_accepted_count, 0) + 1
  WHERE id = p_partner_id;

  -- 9. Increment accepted count in partner_performance_scores
  UPDATE public.partner_performance_scores
  SET total_accepted = total_accepted + 1,
      updated_at     = NOW()
  WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'partner_id', p_partner_id,
    'assigned_by', p_assigned_by,
    'override_eligibility', p_override_eligibility
  );
END;
$$;

-- Backward-compatibility wrapper for claim_booking_offer
CREATE OR REPLACE FUNCTION public.claim_booking_offer(
  p_booking_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.finalize_booking_assignment(p_booking_id, p_partner_id, 'partner', false, null);
END;
$$;
