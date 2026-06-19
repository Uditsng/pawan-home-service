-- Update recalculate_partner_score function to use SECURITY DEFINER so it runs with admin privileges, 
-- allowing partners to complete bookings without RLS insert/update violations on partner_performance_scores.

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
