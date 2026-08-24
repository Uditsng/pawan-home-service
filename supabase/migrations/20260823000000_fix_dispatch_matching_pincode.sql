-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Dispatch Eligibility Matching & Natural Batch Progression
-- File: 20260823000000_fix_dispatch_matching_pincode.sql
-- Purpose:
--   1. Match partners primarily on authoritative serviceable pincode + service capability.
--   2. Use NULL-safe NOT EXISTS for prior offer and rejection exclusions.
--   3. Eliminate OFFSET to allow natural batch progression without skipping partners.
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_dispatch_batch(UUID, INTEGER);

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
    AND  p.is_available = TRUE              -- not currently on a job
    AND  ps.service_id  = b.service_id      -- covers this specific service
    AND  psa.pincode    = b.pincode         -- serves this customer pincode
    -- NULL-safe exclusion: never offered this booking before
    AND  NOT EXISTS (
           SELECT 1
           FROM   public.booking_job_offers bjo
           WHERE  bjo.booking_id = p_booking_id
             AND  bjo.partner_id = p.id
         )
    -- NULL-safe exclusion: never rejected/declined this booking before
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
