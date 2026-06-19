-- Remove the auto-assignment trigger on insert
DROP TRIGGER IF EXISTS tr_bookings_auto_assign ON public.bookings;

-- Drop the obsolete trigger function
DROP FUNCTION IF EXISTS public.tr_auto_assign_booking_insert() CASCADE;

-- Drop the obsolete 1-argument auto_assign_partner function
DROP FUNCTION IF EXISTS public.auto_assign_partner(UUID) CASCADE;

-- Update reassign_partner RPC to return booking to pending/unassigned instead of force-assigning
CREATE OR REPLACE FUNCTION public.reassign_partner(p_booking_id UUID)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- We now revert the booking to pending and unassigned
  UPDATE public.bookings
  SET partner_id = NULL,
      status = 'pending'
  WHERE id = p_booking_id;

  RETURN NULL;
END;
$$;

-- Update get_dispatch_batch SQL function to exclude partners who have rejected this booking
CREATE OR REPLACE FUNCTION public.get_dispatch_batch(
  p_booking_id UUID,
  p_tier       INTEGER
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
  WHERE  p.role        = 'partner'
    AND  p.status      = 'active'           -- partner is Online
    AND  p.is_available = TRUE              -- not currently on a job
    AND  ps.service_id = b.service_id      -- covers this service
    AND  psa.pincode   = b.pincode         -- pincode matches
    AND  (
           b.area IS NULL
           OR b.area = ''
           OR psa.city ILIKE b.area        -- area/colony matches (case-insensitive)
         )
    AND  p.id NOT IN (                     -- never offered this booking before
           SELECT partner_id
           FROM   public.booking_job_offers
           WHERE  booking_id = p_booking_id
         )
    AND  p.id NOT IN (                     -- exclude partners who rejected this booking
           SELECT partner_id
           FROM   public.booking_rejections
           WHERE  booking_id = p_booking_id
         )
  ORDER  BY COALESCE(pps.total_score, 85.0) DESC   -- grace score for new partners
  LIMIT  10
  OFFSET (p_tier - 1) * 10;
$$;
