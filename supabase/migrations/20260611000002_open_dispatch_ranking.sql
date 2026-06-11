-- ═══════════════════════════════════════════════════════════════
-- Open Dispatch & Partner Ranking System Migration
-- Created: 2026-06-11
-- Purpose: Broadcast-and-claim job dispatch with scored matching
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ADD area + dispatch tracking columns to bookings ──────
-- area stores the colony/locality for precise partner matching.
-- broadcast_tier and last_broadcast_at drive the 30s batch loop.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS broadcast_tier INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_broadcast_at TIMESTAMPTZ;

-- ─── 2. CREATE booking_job_offers table ──────────────────────
-- Tracks which partners were offered which booking per tier.
-- UNIQUE constraint prevents a partner being offered the same job twice.

CREATE TABLE IF NOT EXISTS public.booking_job_offers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  broadcast_tier INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'offered'
                  CHECK (status IN ('offered', 'accepted', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, partner_id)
);

-- ─── 3. CREATE partner_performance_scores table ───────────────
-- Computed ranking store. Created after first job completion.
-- New partners with no record get grace score 85.0 via COALESCE in queries.

CREATE TABLE IF NOT EXISTS public.partner_performance_scores (
  partner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_score       NUMERIC(5,2)  NOT NULL DEFAULT 85.00,
  rating_avg        NUMERIC(3,2)  NOT NULL DEFAULT 5.00,
  acceptance_rate   NUMERIC(5,4)  NOT NULL DEFAULT 1.0000,
  completion_rate   NUMERIC(5,4)  NOT NULL DEFAULT 1.0000,
  cancellation_rate NUMERIC(5,4)  NOT NULL DEFAULT 0.0000,
  total_offered     INTEGER       NOT NULL DEFAULT 0,
  total_accepted    INTEGER       NOT NULL DEFAULT 0,
  total_completed   INTEGER       NOT NULL DEFAULT 0,
  total_cancelled   INTEGER       NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─── 4. claim_booking_offer RPC ──────────────────────────────
-- Atomic pessimistic lock — only one partner can claim a booking.
-- Returns { success: true } or { success: false, reason: 'already_claimed' }.

CREATE OR REPLACE FUNCTION public.claim_booking_offer(
  p_booking_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Attempt atomic claim. Fails silently if booking is already taken.
  UPDATE public.bookings
  SET
    partner_id  = p_partner_id,
    status      = 'confirmed',
    accepted_at = NOW()
  WHERE id          = p_booking_id
    AND partner_id  IS NULL
    AND status      = 'pending';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  -- Expire all other outstanding offers for this booking
  UPDATE public.booking_job_offers
  SET status = 'expired'
  WHERE booking_id = p_booking_id
    AND partner_id != p_partner_id
    AND status     = 'offered';

  -- Mark the winning partner's offer as accepted
  UPDATE public.booking_job_offers
  SET status = 'accepted'
  WHERE booking_id = p_booking_id
    AND partner_id = p_partner_id;

  -- Mark partner as unavailable (busy on this job)
  UPDATE public.profiles
  SET last_assigned_at = NOW(),
      is_available     = FALSE
  WHERE id = p_partner_id;

  -- Increment accepted count if performance record exists
  UPDATE public.partner_performance_scores
  SET total_accepted = total_accepted + 1,
      updated_at     = NOW()
  WHERE partner_id = p_partner_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 5. get_dispatch_batch SQL function ──────────────────────
-- Returns the next batch of up to 10 eligible partners for a booking.
-- Matching: service + pincode + area (ILIKE) + online + not already offered.
-- Ordering: by score DESC (new partners with no score get grace score 85.0).
-- Pagination: OFFSET (p_tier - 1) * 10 skips already-dispatched tiers.

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
  ORDER  BY COALESCE(pps.total_score, 85.0) DESC   -- grace score for new partners
  LIMIT  10
  OFFSET (p_tier - 1) * 10;
$$;

-- ─── 6. Score Recalculation Trigger ──────────────────────────
-- Fires AFTER a booking moves to 'completed' or 'cancelled'.
-- Recalculates the partner's rates and total_score, then UPSERTs.

CREATE OR REPLACE FUNCTION public.recalculate_partner_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_partner_id       UUID;
  v_total_offered    INTEGER;
  v_total_accepted   INTEGER;
  v_total_completed  INTEGER;
  v_total_cancelled  INTEGER;
  v_rating_avg       NUMERIC;
  v_acceptance_rate  NUMERIC;
  v_completion_rate  NUMERIC;
  v_cancellation_rate NUMERIC;
  v_total_score      NUMERIC;
BEGIN
  -- Only recalculate when a booking with a partner changes to completed or cancelled
  IF NEW.partner_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('completed', 'cancelled') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_partner_id := NEW.partner_id;

  -- Count this partner's booking lifecycle stats
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'accepted', 'in_progress', 'professional_en_route', 'professional_arrived', 'otp_pending', 'completed', 'cancelled')) AS offered,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'accepted', 'in_progress', 'professional_en_route', 'professional_arrived', 'otp_pending', 'completed'))                 AS accepted,
    COUNT(*) FILTER (WHERE status = 'completed')                                                                   AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = 'PARTNER')                                      AS cancelled
  INTO v_total_offered, v_total_accepted, v_total_completed, v_total_cancelled
  FROM public.bookings
  WHERE partner_id = v_partner_id;

  -- Average customer rating
  SELECT COALESCE(AVG(rating), 5.0)
  INTO   v_rating_avg
  FROM   public.reviews
  WHERE  partner_id = v_partner_id;

  -- Derived rates (safe division)
  v_acceptance_rate   := CASE WHEN v_total_offered  > 0 THEN v_total_accepted::NUMERIC  / v_total_offered  ELSE 1.0 END;
  v_completion_rate   := CASE WHEN v_total_accepted > 0 THEN v_total_completed::NUMERIC / v_total_accepted ELSE 1.0 END;
  v_cancellation_rate := CASE WHEN v_total_accepted > 0 THEN v_total_cancelled::NUMERIC / v_total_accepted ELSE 0.0 END;

  -- Score formula: Rating 30% + Acceptance 25% + Completion 45%
  v_total_score := (v_rating_avg / 5.0 * 30.0)
                 + (v_acceptance_rate   * 25.0)
                 + (v_completion_rate   * 45.0);

  -- Upsert score record (created here for the first time after first job)
  INSERT INTO public.partner_performance_scores (
    partner_id, total_score, rating_avg,
    acceptance_rate, completion_rate, cancellation_rate,
    total_offered, total_accepted, total_completed, total_cancelled,
    updated_at
  ) VALUES (
    v_partner_id, v_total_score, v_rating_avg,
    v_acceptance_rate, v_completion_rate, v_cancellation_rate,
    v_total_offered, v_total_accepted, v_total_completed, v_total_cancelled,
    NOW()
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    rating_avg        = EXCLUDED.rating_avg,
    acceptance_rate   = EXCLUDED.acceptance_rate,
    completion_rate   = EXCLUDED.completion_rate,
    cancellation_rate = EXCLUDED.cancellation_rate,
    total_offered     = EXCLUDED.total_offered,
    total_accepted    = EXCLUDED.total_accepted,
    total_completed   = EXCLUDED.total_completed,
    total_cancelled   = EXCLUDED.total_cancelled,
    updated_at        = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_recalculate_partner_score ON public.bookings;
CREATE TRIGGER tr_recalculate_partner_score
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_partner_score();

-- ─── 7. RLS Policies ─────────────────────────────────────────

-- booking_job_offers: partners see only their own offers
ALTER TABLE public.booking_job_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners see their own job offers" ON public.booking_job_offers;
CREATE POLICY "Partners see their own job offers" ON public.booking_job_offers
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to job offers" ON public.booking_job_offers;
CREATE POLICY "Admins full access to job offers" ON public.booking_job_offers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- partner_performance_scores: partners see their own, admins see all
ALTER TABLE public.partner_performance_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners see their own scores" ON public.partner_performance_scores;
CREATE POLICY "Partners see their own scores" ON public.partner_performance_scores
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to scores" ON public.partner_performance_scores;
CREATE POLICY "Admins full access to scores" ON public.partner_performance_scores
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 8. Performance Indexes ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_booking_job_offers_booking_id
  ON public.booking_job_offers(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_job_offers_partner_status
  ON public.booking_job_offers(partner_id, status);

-- Fast sweep for the cron loop: find pending bookings needing dispatch
CREATE INDEX IF NOT EXISTS idx_bookings_pending_dispatch
  ON public.bookings(status, last_broadcast_at)
  WHERE status = 'pending' AND partner_id IS NULL;
