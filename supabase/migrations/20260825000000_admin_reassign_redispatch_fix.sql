-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Admin Reassign & Redispatch Eligibility
-- File: 20260825000000_admin_reassign_redispatch_fix.sql
-- Purpose:
--   1. get_dispatch_batch: exclude only ACTIVE offers ('offered'). Historical
--      expired/accepted offer rows no longer permanently blacklist a partner.
--      Explicit declines remain excluded via booking_rejections.
--   2. booking_rejections: safely deduplicate (booking_id, partner_id) rows
--      (live data had 22 rows / 8 unique pairs), then add unique protection.
--   3. admin_release_booking_assignment RPC: single atomic, locked state
--      transition for Admin Reassign — auth check, rejection log, partner
--      metrics, offer cleanup (fresh cycle, reschedule parity), booking
--      dispatch reset, and audit records in one transaction.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Redispatch eligibility: only active offers block re-offer ──────────
CREATE OR REPLACE FUNCTION public.get_dispatch_batch(
  p_booking_id UUID,
  p_limit      INTEGER DEFAULT 10
)
RETURNS TABLE(partner_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM   public.profiles                  p
  JOIN   public.partner_services          ps  ON ps.partner_id  = p.id
  JOIN   public.partner_service_areas     psa ON psa.partner_id = p.id
  JOIN   public.bookings                  b   ON b.id           = p_booking_id
  LEFT   JOIN public.partner_performance_scores pps ON pps.partner_id = p.id
  WHERE  p.role         = 'partner'
    AND  p.status       = 'active'           -- partner is Online
    AND  p.is_available = TRUE               -- not currently on a job
    AND  ps.service_id  = b.service_id       -- covers this specific service
    AND  psa.pincode    = b.pincode          -- serves this customer pincode
    -- Exclude only partners with a LIVE (active) offer for this booking.
    -- Expired/accepted historical rows do NOT permanently block re-offer.
    AND  NOT EXISTS (
           SELECT 1
           FROM   public.booking_job_offers bjo
           WHERE  bjo.booking_id = p_booking_id
             AND  bjo.partner_id = p.id
             AND  bjo.status     = 'offered'
         )
    -- Explicit declines/rejections always exclude the partner.
    AND  NOT EXISTS (
           SELECT 1
           FROM   public.booking_rejections br
           WHERE  br.booking_id = p_booking_id
             AND  br.partner_id = p.id
         )
  GROUP  BY p.id, pps.total_score
  ORDER  BY COALESCE(pps.total_score, 85.0) DESC   -- grace score for new partners
  LIMIT  GREATEST(COALESCE(p_limit, 10), 1);
$$;

-- ─── 2. booking_rejections hygiene (verified against live schema/data) ─────
-- Live schema: id uuid PK, booking_id uuid FK→bookings.id,
-- partner_id uuid FK→profiles.id, reason text, created_at timestamptz.

-- 2a. Deduplicate keeping the earliest record per (booking_id, partner_id).
DELETE FROM public.booking_rejections a
USING  public.booking_rejections b
WHERE  a.booking_id = b.booking_id
  AND  a.partner_id = b.partner_id
  AND  (a.created_at, a.id) > (b.created_at, b.id);

-- 2b. Add unique protection unless an equivalent unique index already exists.
DO $$
DECLARE
  v_rel        regclass := 'public.booking_rejections'::regclass;
  v_att_booking SMALLINT;
  v_att_partner SMALLINT;
  v_has_unique BOOLEAN;
BEGIN
  IF v_rel IS NULL THEN
    RAISE EXCEPTION 'booking_rejections table does not exist';
  END IF;

  SELECT attnum INTO v_att_booking
    FROM pg_attribute
   WHERE attrelid = v_rel AND attname = 'booking_id' AND NOT attisdropped;
  SELECT attnum INTO v_att_partner
    FROM pg_attribute
   WHERE attrelid = v_rel AND attname = 'partner_id' AND NOT attisdropped;

  IF v_att_booking IS NULL OR v_att_partner IS NULL THEN
    RAISE EXCEPTION 'booking_rejections is missing booking_id/partner_id columns';
  END IF;

  -- Any full (non-partial) unique index whose first two key columns are
  -- exactly (booking_id, partner_id)? Covers UNIQUE constraints too.
  SELECT EXISTS (
    SELECT 1
      FROM pg_index i
     WHERE i.indrelid = v_rel
       AND i.indisunique
       AND i.indpred IS NULL
       AND array_length(i.indkey::int2[], 1) >= 2
       AND (i.indkey::int2[])[1:2]
           = ARRAY[v_att_booking, v_att_partner]::int2[]
  ) INTO v_has_unique;

  IF NOT v_has_unique THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_rejections_booking_partner
      ON public.booking_rejections (booking_id, partner_id);
    RAISE NOTICE 'Created unique index ux_booking_rejections_booking_partner';
  ELSE
    RAISE NOTICE 'Unique index on (booking_id, partner_id) already present; skipping';
  END IF;
END $$;

-- ─── 3. Atomic Admin Reassign release RPC ──────────────────────────────────
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
    -- booking_events.actor has a CHECK constraint allowing only
    -- SYSTEM / USER / PARTNER. Admin actions are logged as SYSTEM with
    -- admin_override metadata (same convention as other admin actions).
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
