-- Migration: Extend reviews table and configure RLS + partner rating triggers
-- Created: 2026-07-07

-- 1. Ensure public.reviews table exists
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Unique constraint on booking_id to prevent duplicates
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);

-- 3. Add extended reviews columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS behaviour_rating INTEGER CHECK (behaviour_rating >= 1 AND behaviour_rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_images TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden'));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_reviews_service_id_status ON public.reviews (service_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_partner_id_status ON public.reviews (partner_id, status);

-- 5. RLS Policies Configuration
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop obsolete policies
DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Partners can view reviews about themselves" ON public.reviews;
DROP POLICY IF EXISTS "Customers can insert reviews for bookings" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;

-- Create updated policies
-- Select: Public can see approved reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Select: Customers can see their own reviews regardless of status
CREATE POLICY "Customers can view their own reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Select: Partners can see reviews assigned to them regardless of status
CREATE POLICY "Partners can view reviews about themselves" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Select/All: Admins have full access to all reviews
CREATE POLICY "Admins have full access to reviews" ON public.reviews
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Insert: Customers can insert pending reviews for their own completed bookings
CREATE POLICY "Customers can insert reviews for bookings" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- Update: Customers can update their pending reviews
CREATE POLICY "Customers can update their own reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'pending'
  );

-- 6. Trigger Functions for Score Recalculation

-- Re-create recalculate_partner_score for completed bookings
CREATE OR REPLACE FUNCTION public.recalculate_partner_score()
RETURNS TRIGGER
SECURITY DEFINER
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

  -- Average customer rating (only approved reviews count!)
  SELECT COALESCE(AVG(rating), 5.0)
  INTO   v_rating_avg
  FROM   public.reviews
  WHERE  partner_id = v_partner_id AND status = 'approved';

  -- Derived rates (safe division)
  v_acceptance_rate   := CASE WHEN v_total_offered  > 0 THEN v_total_accepted::NUMERIC  / v_total_offered  ELSE 1.0 END;
  v_completion_rate   := CASE WHEN v_total_accepted > 0 THEN v_total_completed::NUMERIC / v_total_accepted ELSE 1.0 END;
  v_cancellation_rate := CASE WHEN v_total_accepted > 0 THEN v_total_cancelled::NUMERIC / v_total_accepted ELSE 0.0 END;

  -- Score formula: Rating 30% + Acceptance 25% + Completion 45%
  v_total_score := (v_rating_avg / 5.0 * 30.0)
                 + (v_acceptance_rate   * 25.0)
                 + (v_completion_rate   * 45.0);

  -- Upsert score record
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

  -- Sync to public.profiles table
  UPDATE public.profiles
  SET 
    rating_avg           = v_rating_avg,
    acceptance_rate      = v_acceptance_rate,
    cancellation_rate    = v_cancellation_rate,
    jobs_offered_count   = v_total_offered,
    jobs_accepted_count  = v_total_accepted,
    jobs_cancelled_count = v_total_cancelled
  WHERE id = v_partner_id;

  RETURN NEW;
END;
$$;

-- Create recalculate_partner_score_on_review function
CREATE OR REPLACE FUNCTION public.recalculate_partner_score_on_review()
RETURNS TRIGGER
SECURITY DEFINER
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
  IF TG_OP = 'DELETE' THEN
    v_partner_id := OLD.partner_id;
  ELSE
    v_partner_id := NEW.partner_id;
  END IF;

  IF v_partner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count this partner's booking lifecycle stats
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'accepted', 'in_progress', 'professional_en_route', 'professional_arrived', 'otp_pending', 'completed', 'cancelled')) AS offered,
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'accepted', 'in_progress', 'professional_en_route', 'professional_arrived', 'otp_pending', 'completed'))                 AS accepted,
    COUNT(*) FILTER (WHERE status = 'completed')                                                                   AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = 'PARTNER')                                      AS cancelled
  INTO v_total_offered, v_total_accepted, v_total_completed, v_total_cancelled
  FROM public.bookings
  WHERE partner_id = v_partner_id;

  -- Average customer rating (only approved reviews count!)
  SELECT COALESCE(AVG(rating), 5.0)
  INTO   v_rating_avg
  FROM   public.reviews
  WHERE  partner_id = v_partner_id AND status = 'approved';

  -- Derived rates (safe division)
  v_acceptance_rate   := CASE WHEN v_total_offered  > 0 THEN v_total_accepted::NUMERIC  / v_total_offered  ELSE 1.0 END;
  v_completion_rate   := CASE WHEN v_total_accepted > 0 THEN v_total_completed::NUMERIC / v_total_accepted ELSE 1.0 END;
  v_cancellation_rate := CASE WHEN v_total_accepted > 0 THEN v_total_cancelled::NUMERIC / v_total_accepted ELSE 0.0 END;

  -- Score formula: Rating 30% + Acceptance 25% + Completion 45%
  v_total_score := (v_rating_avg / 5.0 * 30.0)
                 + (v_acceptance_rate   * 25.0)
                 + (v_completion_rate   * 45.0);

  -- Upsert score record
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

  -- Sync to public.profiles table
  UPDATE public.profiles
  SET 
    rating_avg           = v_rating_avg,
    acceptance_rate      = v_acceptance_rate,
    cancellation_rate    = v_cancellation_rate,
    jobs_offered_count   = v_total_offered,
    jobs_accepted_count  = v_total_accepted,
    jobs_cancelled_count = v_total_cancelled
  WHERE id = v_partner_id;

  RETURN NULL;
END;
$$;

-- Create reviews trigger
DROP TRIGGER IF EXISTS trg_recalculate_partner_score_on_review ON public.reviews;
CREATE TRIGGER trg_recalculate_partner_score_on_review
AFTER INSERT OR UPDATE OF rating, status OR DELETE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_partner_score_on_review();
