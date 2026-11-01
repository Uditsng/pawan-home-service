-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Offer Arbitrage Prevention, Customer Cap Enforcement,
--            Snapshot Activation & Wallet Mixed Debit Splitting
-- File: supabase/migrations/20261101000300_offer_wallet_ledger_fixes.sql
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Update purchase_offer_with_wallet
CREATE OR REPLACE FUNCTION public.purchase_offer_with_wallet(
  p_offer_id    UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor         UUID := auth.uid();
  v_o             public.offers%ROWTYPE;
  v_total         NUMERIC(10,2);
  v_cash          NUMERIC(10,2);
  v_bonus         NUMERIC(10,2);
  v_spend_bonus   NUMERIC(10,2);
  v_spend_cash    NUMERIC(10,2);
  v_new_total     NUMERIC(10,2);
  v_new_cash      NUMERIC(10,2);
  v_new_bonus     NUMERIC(10,2);
  v_purchase_id   UUID;
  v_entitlement_id UUID;
  v_expires_at    TIMESTAMPTZ;
  v_past_uses     INT := 0;
  v_max_uses      INT;
BEGIN
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: you can only purchase offers for yourself.';
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is not available.');
  END IF;
  IF v_o.valid_from IS NOT NULL AND now() < v_o.valid_from THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has not started yet.');
  END IF;
  IF v_o.valid_until IS NOT NULL AND now() > v_o.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has ended.');
  END IF;
  IF COALESCE(v_o.purchase_price, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is free — claim it instead of paying.');
  END IF;

  -- Arbitrage protection: SERVICE_CREDIT cannot yield more credit than purchase price unless promotional
  IF v_o.offer_type = 'SERVICE_CREDIT' AND v_o.benefit_value > v_o.purchase_price THEN
    IF NOT COALESCE((v_o.metadata->>'is_promotional')::BOOLEAN, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'This offer configuration requires promotional authorization.');
    END IF;
  END IF;

  -- Eligibility check
  IF NOT public.is_customer_offer_eligible(v_o.id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      CASE WHEN v_o.eligibility = 'new' THEN 'This offer is for new customers only.'
           ELSE 'This offer is for existing customers only.' END);
  END IF;

  -- Enforce per-customer redemption cap across ALL existing entitlements for this offer
  v_max_uses := COALESCE(v_o.max_redemptions_per_customer, 1);
  SELECT COALESCE(COUNT(*), 0)
    INTO v_past_uses
    FROM public.offer_entitlements
   WHERE customer_id = p_customer_id
     AND offer_id = v_o.id;

  IF v_past_uses >= v_max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already reached the maximum limit for this offer.');
  END IF;

  BEGIN
    -- Bonus-first wallet debit
    SELECT wallet_balance, wallet_cash_balance, wallet_bonus_balance
      INTO v_total, v_cash, v_bonus
      FROM public.profiles
     WHERE id = p_customer_id FOR UPDATE;

    IF COALESCE(v_total, 0) < v_o.purchase_price THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance.');
    END IF;

    v_spend_bonus := LEAST(COALESCE(v_bonus, 0), v_o.purchase_price);
    v_spend_cash  := v_o.purchase_price - v_spend_bonus;
    v_new_bonus   := COALESCE(v_bonus, 0) - v_spend_bonus;
    v_new_cash    := COALESCE(v_cash, 0) - v_spend_cash;
    v_new_total   := v_new_cash + v_new_bonus;

    UPDATE public.profiles
       SET wallet_balance = v_new_total,
           wallet_cash_balance  = v_new_cash,
           wallet_bonus_balance = v_new_bonus
     WHERE id = p_customer_id;

    INSERT INTO public.offer_purchases (offer_id, customer_id, amount, status, payment_method, metadata)
    VALUES (v_o.id, p_customer_id, v_o.purchase_price, 'success', 'wallet',
            jsonb_build_object('cash_used', v_spend_cash, 'bonus_used', v_spend_bonus))
    RETURNING id INTO v_purchase_id;

    -- Split ledger entries when both cash and bonus are spent
    IF v_spend_cash > 0 THEN
      INSERT INTO public.wallet_transactions (
        user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
      ) VALUES (
        p_customer_id, 'debit', 'offer_purchase', v_spend_cash, v_new_total,
        'Purchased offer (cash): ' || v_o.title, v_purchase_id,
        jsonb_build_object('offer_id', v_o.id, 'offer_code', v_o.code, 'cash_used', v_spend_cash),
        'cash'
      );
    END IF;

    IF v_spend_bonus > 0 THEN
      INSERT INTO public.wallet_transactions (
        user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
      ) VALUES (
        p_customer_id, 'debit', 'offer_purchase', v_spend_bonus, v_new_total,
        'Purchased offer (bonus): ' || v_o.title, v_purchase_id,
        jsonb_build_object('offer_id', v_o.id, 'offer_code', v_o.code, 'bonus_used', v_spend_bonus),
        'bonus'
      );
    END IF;

    IF v_o.validity_model = 'relative_days' THEN
      v_expires_at := now() + (v_o.valid_days * interval '1 day');
    ELSE
      v_expires_at := v_o.valid_until;
    END IF;

    INSERT INTO public.offer_entitlements (
      offer_id, customer_id, purchase_id, offer_type,
      original_value, remaining_value, total_uses, remaining_uses,
      purchased_price, status, activated_at, expires_at, metadata
    ) VALUES (
      v_o.id, p_customer_id, v_purchase_id, v_o.offer_type,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      v_o.purchase_price,
      'active', now(), v_expires_at,
      jsonb_build_object(
        'offer_code', v_o.code, 'offer_title', v_o.title, 'offer_type', v_o.offer_type,
        'benefit_value', v_o.benefit_value, 'max_discount', v_o.max_discount,
        'min_booking_amount', v_o.min_booking_amount, 'validity_model', v_o.validity_model,
        'usage_limit_type', v_o.usage_limit_type,
        'max_redemptions_per_customer', v_o.max_redemptions_per_customer,
        'eligibility', v_o.eligibility
      )
    )
    RETURNING id INTO v_entitlement_id;

    RETURN jsonb_build_object(
      'success', true,
      'purchase_id', v_purchase_id,
      'entitlement_id', v_entitlement_id,
      'paid', v_o.purchase_price,
      'cash_used', v_spend_cash,
      'bonus_used', v_spend_bonus,
      'expires_at', v_expires_at
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_offer_with_wallet(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_offer_with_wallet(UUID, UUID) TO authenticated, service_role;

-- 2. Update complete_offer_purchase to activate from snapshot and enforce customer cap
CREATE OR REPLACE FUNCTION public.complete_offer_purchase(
  p_purchase_id             UUID,
  p_razorpay_order_id       TEXT,
  p_payment_id              TEXT,
  p_signature               TEXT,
  p_gateway_verified_amount NUMERIC,
  p_method                  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p          public.offer_purchases%ROWTYPE;
  v_o          public.offers%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_entitlement_id UUID;
  v_past_uses  INT := 0;
  v_max_uses   INT;
  v_meta       JSONB;
BEGIN
  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing payment id.');
  END IF;

  SELECT * INTO v_p FROM public.offer_purchases WHERE id = p_purchase_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found.');
  END IF;

  IF v_p.razorpay_order_id IS DISTINCT FROM p_razorpay_order_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gateway order mismatch.');
  END IF;

  IF v_p.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  -- Allow completion from created, pending, or gateway-recovered cancelled/failed rows
  IF v_p.status NOT IN ('created', 'pending', 'cancelled', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase can no longer be completed.');
  END IF;

  IF abs(COALESCE(v_p.amount, 0) - COALESCE(p_gateway_verified_amount, 0)) > 0.01 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch with gateway.');
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = v_p.offer_id;

  -- Snapshot fallback: if live offer was paused/expired after payment was initiated,
  -- activate entitlement using the snapshot stored in offer_purchases.metadata
  v_meta := COALESCE(v_p.metadata, '{}'::jsonb);

  IF NOT FOUND OR v_o.status <> 'active' OR (v_o.valid_until IS NOT NULL AND now() > v_o.valid_until) THEN
    -- If snapshot terms exist, honor the purchase
    IF v_meta ? 'offer_snapshot' THEN
      v_o.id := v_p.offer_id;
      v_o.code := v_meta->'offer_snapshot'->>'code';
      v_o.title := v_meta->'offer_snapshot'->>'title';
      v_o.offer_type := v_meta->'offer_snapshot'->>'offer_type';
      v_o.benefit_value := (v_meta->'offer_snapshot'->>'benefit_value')::NUMERIC;
      v_o.max_discount := (v_meta->'offer_snapshot'->>'max_discount')::NUMERIC;
      v_o.min_booking_amount := (v_meta->'offer_snapshot'->>'min_booking_amount')::NUMERIC;
      v_o.validity_model := v_meta->'offer_snapshot'->>'validity_model';
      v_o.usage_limit_type := v_meta->'offer_snapshot'->>'usage_limit_type';
      v_o.max_redemptions_per_customer := (v_meta->'offer_snapshot'->>'max_redemptions_per_customer')::INT;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'This offer is no longer available.');
    END IF;
  END IF;

  -- Enforce per-customer cap
  v_max_uses := COALESCE(v_o.max_redemptions_per_customer, 1);
  SELECT COALESCE(COUNT(*), 0)
    INTO v_past_uses
    FROM public.offer_entitlements
   WHERE customer_id = v_p.customer_id
     AND offer_id = v_p.offer_id;

  IF v_past_uses >= v_max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum limit reached for this offer.');
  END IF;

  IF v_o.validity_model = 'relative_days' THEN
    v_expires_at := now() + (COALESCE(v_o.valid_days, 30) * interval '1 day');
  ELSE
    v_expires_at := COALESCE(v_o.valid_until, now() + interval '30 days');
  END IF;

  -- Activate the entitlement
  INSERT INTO public.offer_entitlements (
    offer_id, customer_id, purchase_id, offer_type,
    original_value, remaining_value, total_uses, remaining_uses,
    purchased_price, status, activated_at, expires_at, metadata
  ) VALUES (
    v_p.offer_id, v_p.customer_id, v_p.id, v_o.offer_type,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
         WHEN v_o.usage_limit_type = 'one_time' THEN 1
         ELSE v_o.max_redemptions_per_customer END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
         WHEN v_o.usage_limit_type = 'one_time' THEN 1
         ELSE v_o.max_redemptions_per_customer END,
    v_p.amount,
    'active', now(), v_expires_at,
    jsonb_build_object(
      'offer_code', v_o.code, 'offer_title', v_o.title, 'offer_type', v_o.offer_type,
      'benefit_value', v_o.benefit_value, 'max_discount', v_o.max_discount,
      'min_booking_amount', v_o.min_booking_amount, 'validity_model', v_o.validity_model,
      'usage_limit_type', v_o.usage_limit_type,
      'max_redemptions_per_customer', v_o.max_redemptions_per_customer,
      'eligibility', v_o.eligibility
    )
  )
  RETURNING id INTO v_entitlement_id;

  UPDATE public.offer_purchases
     SET status = 'success',
         razorpay_payment_id = p_payment_id,
         razorpay_signature  = p_signature,
         payment_method      = p_method,
         updated_at          = now()
   WHERE id = v_p.id;

  RETURN jsonb_build_object(
    'success', true,
    'entitlement_id', v_entitlement_id,
    'paid', v_p.amount,
    'expires_at', v_expires_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already completed.');
END;
$$;

REVOKE ALL ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;
