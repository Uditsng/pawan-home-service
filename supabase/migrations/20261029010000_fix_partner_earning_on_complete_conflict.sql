-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Partner Earning On Complete ON CONFLICT Predicate (42P10)
-- File: supabase/migrations/20261029010000_fix_partner_earning_on_complete_conflict.sql
--
-- Root Cause:
--   Migration 20261003010000 dropped `partner_earnings_booking_id_key` and created
--   the partial unique index:
--     CREATE UNIQUE INDEX uq_partner_earnings_booking_id ON (booking_id) WHERE booking_id IS NOT NULL;
--   to support NULL booking_id for partner referral rewards.
--
--   However, `handle_partner_earning_on_complete()` was still executing:
--     INSERT INTO public.partner_earnings (...) ON CONFLICT (booking_id) DO UPDATE SET ...
--   without the matching predicate `WHERE booking_id IS NOT NULL`.
--
--   PostgreSQL requires that conflict targets for partial indexes match the index
--   predicate exactly. Otherwise, it throws:
--     ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
--   This aborted every completion transaction (both Partner OTP verify and Admin Force Complete).
--
-- Fix:
--   Update `handle_partner_earning_on_complete()` so the ON CONFLICT clause specifies:
--     ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO UPDATE SET ...
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_partner_earning_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount        NUMERIC(10, 2);
  v_gst_amount          NUMERIC(10, 2);
  v_wallet_discount     NUMERIC(10, 2);
  v_gross_service_value NUMERIC(10, 2);
  v_service_revenue     NUMERIC(10, 2);
  v_commission_percent  NUMERIC(5, 2);
  v_platform_commission NUMERIC(10, 2);
  v_partner_earning     NUMERIC(10, 2);
  v_cfg                 RECORD;
  v_completed_at        TIMESTAMP WITH TIME ZONE;
  v_earning_status      VARCHAR(20);
  v_payment_method      VARCHAR(30);
  v_earning_id          UUID;
  v_base_cash           NUMERIC(10, 2) := 0;
  v_quotes_cash         NUMERIC(10, 2) := 0;
  v_cash_collected      NUMERIC(10, 2) := 0;
  v_is_cash             BOOLEAN := FALSE;
  v_clawback_amount     NUMERIC(10, 2) := 0;
BEGIN
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_cfg
    FROM public.get_payout_config();

  v_commission_percent := COALESCE(v_cfg.commission_percent, 20);

  SELECT COALESCE(bp.total_price, NEW.total_amount, 0),
         COALESCE(bp.gst_amount, 0),
         COALESCE(bp.wallet_discount, NEW.wallet_discount_applied, 0)
    INTO v_total_amount, v_gst_amount, v_wallet_discount
    FROM public.booking_pricing bp
   WHERE bp.booking_id = NEW.id;

  IF v_total_amount IS NULL THEN
    v_total_amount := COALESCE(NEW.total_amount, 0);
    v_gst_amount   := 0;
  END IF;

  v_gross_service_value := v_total_amount + COALESCE(v_wallet_discount, 0);
  v_service_revenue     := GREATEST(0, v_gross_service_value - COALESCE(v_gst_amount, 0));
  v_platform_commission := ROUND(v_service_revenue * (v_commission_percent / 100), 2);
  v_partner_earning     := ROUND(v_service_revenue * ((100 - v_commission_percent) / 100), 2);
  v_completed_at        := COALESCE(NEW.completed_at, NEW.service_completed_at, NEW.created_at, now());

  v_payment_method := COALESCE(NULLIF(TRIM(NEW.payment_method), ''), 'Online');
  v_is_cash := (LOWER(v_payment_method) = 'cash');

  IF v_is_cash THEN
    v_earning_status := 'paid';
    v_base_cash := v_total_amount;
  ELSE
    v_earning_status := 'eligible';
    v_base_cash := 0;
  END IF;

  SELECT COALESCE(SUM(total_amount), 0)
    INTO v_quotes_cash
    FROM public.booking_quotes
   WHERE booking_id = NEW.id
     AND LOWER(COALESCE(payment_method, '')) = 'cash'
     AND status = 'approved';

  v_cash_collected := v_base_cash + v_quotes_cash;

  IF v_is_cash THEN
    v_clawback_amount := v_platform_commission + v_quotes_cash;
  ELSIF v_quotes_cash > 0 THEN
    v_clawback_amount := v_quotes_cash;
  ELSE
    v_clawback_amount := 0;
  END IF;

  -- Match PostgreSQL partial index: WHERE booking_id IS NOT NULL
  INSERT INTO public.partner_earnings (
    booking_id, partner_id, total_amount, gst_amount, service_revenue,
    commission_percent, platform_commission_amount, partner_earning_amount,
    status, completed_at, payment_method, is_cash
  ) VALUES (
    NEW.id, NEW.partner_id, v_gross_service_value, COALESCE(v_gst_amount, 0), v_service_revenue,
    v_commission_percent,
    v_platform_commission,
    v_partner_earning,
    v_earning_status, v_completed_at,
    v_payment_method, v_is_cash
  )
  ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO UPDATE SET
    total_amount               = EXCLUDED.total_amount,
    gst_amount                 = EXCLUDED.gst_amount,
    service_revenue            = EXCLUDED.service_revenue,
    commission_percent         = EXCLUDED.commission_percent,
    platform_commission_amount = EXCLUDED.platform_commission_amount,
    partner_earning_amount     = EXCLUDED.partner_earning_amount,
    payment_method             = EXCLUDED.payment_method,
    is_cash                    = EXCLUDED.is_cash,
    status                     = CASE
                                   WHEN partner_earnings.status IN ('reserved', 'paid') AND NOT EXCLUDED.is_cash
                                     THEN partner_earnings.status
                                   ELSE EXCLUDED.status
                                 END
  RETURNING id INTO v_earning_id;

  IF v_clawback_amount > 0 THEN
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
    ) VALUES (
      NULL,
      NEW.partner_id,
      NEW.id,
      'clawback',
      -v_clawback_amount,
      'Platform commission / cash settlement for booking #' || SUBSTRING(NEW.id::text, 1, 8),
      'pending',
      NULL
    )
    ON CONFLICT (booking_id, kind) WHERE booking_id IS NOT NULL DO UPDATE SET
      amount     = -v_clawback_amount,
      partner_id = EXCLUDED.partner_id
    WHERE payout_adjustments.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;
