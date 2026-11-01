-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Payment Security Hardening (Phase 1)
-- File: supabase/migrations/20261101000000_payment_security_hardening.sql
--
-- Security Enhancements:
--   1. Revoke public/authenticated execution of sensitive SECURITY DEFINER RPCs:
--      - use_wallet_balance
--      - claim_order_for_fulfillment
--      - create_order_bookings_atomic
--      Grant execute EXCLUSIVELY to service_role.
--
--   2. Add defence-in-depth checks inside create_order_bookings_atomic,
--      claim_order_for_fulfillment, and use_wallet_balance.
--
--   3. Add razorpay_order_id and razorpay_payment_id to booking_extensions
--      to bind gateway payments and prevent replay attacks.
--
--   4. Allow complete_wallet_recharge and complete_offer_purchase to recover
--      and credit valid gateway payments even if client-side ondismiss marked
--      the initial row cancelled/failed.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. EXTENSIONS SCHEMA BINDING ───────────────────────────────────────────

ALTER TABLE public.booking_extensions
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_extensions_razorpay_order_id
  ON public.booking_extensions (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- ─── 2. HARDEN use_wallet_balance ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.use_wallet_balance(
  p_user_id    UUID,
  p_amount     NUMERIC,
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total       NUMERIC(10,2);
  v_cash        NUMERIC(10,2);
  v_bonus       NUMERIC(10,2);
  v_spend_bonus NUMERIC(10,2);
  v_spend_cash  NUMERIC(10,2);
  v_new_total   NUMERIC(10,2);
  v_new_cash    NUMERIC(10,2);
  v_new_bonus   NUMERIC(10,2);
BEGIN
  -- Defence-in-depth: caller must be service_role or the wallet owner
  IF auth.role() != 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized wallet debit.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid debit amount.');
  END IF;

  SELECT wallet_balance, wallet_cash_balance, wallet_bonus_balance
    INTO v_total, v_cash, v_bonus
    FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found.');
  END IF;

  IF COALESCE(v_total, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance.');
  END IF;

  v_spend_bonus := LEAST(COALESCE(v_bonus, 0), p_amount);
  v_spend_cash  := p_amount - v_spend_bonus;
  v_new_bonus   := COALESCE(v_bonus, 0) - v_spend_bonus;
  v_new_cash    := COALESCE(v_cash, 0) - v_spend_cash;
  v_new_total   := v_new_cash + v_new_bonus;

  UPDATE public.profiles
     SET wallet_balance       = v_new_total,
         wallet_cash_balance  = v_new_cash,
         wallet_bonus_balance = v_new_bonus
   WHERE id = p_user_id;

  -- Ledger entries: split cash and bonus if both are spent
  IF v_spend_cash > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
    ) VALUES (
      p_user_id, 'debit', 'booking_discount', v_spend_cash, v_new_total,
      'Wallet cash payment applied to booking', p_booking_id,
      jsonb_build_object('cash_used', v_spend_cash, 'bonus_used', v_spend_bonus),
      'cash'
    );
  END IF;

  IF v_spend_bonus > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
    ) VALUES (
      p_user_id, 'debit', 'booking_discount', v_spend_bonus, v_new_total,
      'Wallet bonus credit applied to booking', p_booking_id,
      jsonb_build_object('cash_used', v_spend_cash, 'bonus_used', v_spend_bonus),
      'bonus'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_total,
    'new_cash', v_new_cash,
    'new_bonus', v_new_bonus,
    'cash_used', v_spend_cash,
    'bonus_used', v_spend_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_wallet_balance(UUID, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_wallet_balance(UUID, NUMERIC, UUID) TO service_role;


-- ─── 3. HARDEN claim_order_for_fulfillment ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_order_for_fulfillment(
  p_order_id          UUID,
  p_razorpay_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order         public.orders%ROWTYPE;
  v_booking_count INT;
BEGIN
  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- Defence-in-depth: caller must be service_role or the order customer
  IF auth.role() != 'service_role' AND auth.uid() IS DISTINCT FROM v_order.customer_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized_order_claim');
  END IF;

  -- Bind razorpay_order_id if provided
  IF p_razorpay_order_id IS NOT NULL AND v_order.razorpay_order_id IS NULL THEN
    UPDATE public.orders
       SET razorpay_order_id = p_razorpay_order_id,
           updated_at = NOW()
     WHERE id = p_order_id;
    v_order.razorpay_order_id := p_razorpay_order_id;
  END IF;

  SELECT count(*) INTO v_booking_count
    FROM public.bookings
   WHERE order_id = p_order_id;

  -- If child bookings already exist and order is paid, it is already fulfilled
  IF v_booking_count > 0 AND v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_fulfilled', true,
      'booking_count', v_booking_count,
      'order', row_to_json(v_order)
    );
  END IF;

  -- Only orders in pending or processing status can be claimed
  IF v_order.payment_status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'order_not_claimable',
      'payment_status', v_order.payment_status
    );
  END IF;

  -- Check if actively processing by another concurrent worker within the last 60 seconds
  IF v_order.payment_status = 'processing' AND v_order.updated_at > (NOW() - INTERVAL '60 seconds') THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'actively_processing',
      'booking_count', v_booking_count,
      'order', row_to_json(v_order)
    );
  END IF;

  -- Atomically claim
  UPDATE public.orders
     SET payment_status = 'processing',
         updated_at = NOW()
   WHERE id = p_order_id;

  v_order.payment_status := 'processing';

  RETURN jsonb_build_object(
    'success', true,
    'already_fulfilled', false,
    'booking_count', v_booking_count,
    'order', row_to_json(v_order)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_order_for_fulfillment(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_for_fulfillment(UUID, TEXT) TO service_role;


-- ─── 4. HARDEN create_order_bookings_atomic ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_order_bookings_atomic(
  p_order_id      UUID,
  p_bookings      JSONB,
  p_order_updates JSONB,
  p_offer_context JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order          public.orders%ROWTYPE;
  v_existing_count INT;
  v_existing_ids   JSONB;
  v_item           JSONB;
  v_booking_id     UUID;
  v_created_ids    UUID[] := ARRAY[]::UUID[];
  v_is_first       BOOLEAN := TRUE;
  v_pricing        JSONB;
  v_answers        JSONB;
  v_ans            JSONB;
  v_actor          TEXT;
  v_remarks        TEXT;
  v_metadata       JSONB;
  v_total_items    INT;
BEGIN
  -- 1. Lock and verify the parent order
  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Defence-in-depth: caller must be service_role or the order customer
  IF auth.role() != 'service_role' AND auth.uid() IS DISTINCT FROM v_order.customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_order_fulfillment');
  END IF;

  -- 2. Idempotency check: if child bookings already exist for this order, return them
  SELECT count(*), coalesce(jsonb_agg(id), '[]'::jsonb)
    INTO v_existing_count, v_existing_ids
    FROM public.bookings
   WHERE order_id = p_order_id;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_created', true,
      'booking_ids', v_existing_ids,
      'count', v_existing_count
    );
  END IF;

  v_total_items := jsonb_array_length(p_bookings);
  IF v_total_items = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_bookings_array');
  END IF;

  -- 3. Iterate through each booking in the atomic transaction
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_bookings)
  LOOP
    v_booking_id := gen_random_uuid();

    -- Insert into bookings
    INSERT INTO public.bookings (
      id,
      service_id,
      customer_id,
      order_id,
      status,
      total_amount,
      city,
      area,
      address,
      pincode,
      scheduled_date,
      payment_status,
      payment_method,
      selected_duration_minutes,
      base_price,
      final_price,
      wallet_discount_applied,
      business_name,
      business_gstin,
      meeting_location,
      destination,
      expected_bags,
      latitude,
      longitude
    ) VALUES (
      v_booking_id,
      (v_item->>'service_id')::UUID,
      v_order.customer_id,
      p_order_id,
      coalesce(v_item->>'status', 'pending'),
      (v_item->>'total_amount')::NUMERIC,
      v_item->>'city',
      v_item->>'area',
      v_item->>'address',
      v_item->>'pincode',
      (v_item->>'scheduled_date')::TIMESTAMPTZ,
      coalesce(v_item->>'payment_status', 'pending'),
      v_item->>'payment_method',
      (v_item->>'selected_duration_minutes')::INT,
      (v_item->>'base_price')::NUMERIC,
      (v_item->>'final_price')::NUMERIC,
      coalesce((v_item->>'wallet_discount_applied')::NUMERIC, 0),
      v_item->>'business_name',
      v_item->>'business_gstin',
      v_item->>'meeting_location',
      v_item->>'destination',
      coalesce((v_item->>'expected_bags')::INT, 0),
      (v_item->>'latitude')::NUMERIC,
      (v_item->>'longitude')::NUMERIC
    );

    -- Link offer entitlement & application to first booking if present
    IF v_is_first AND p_offer_context IS NOT NULL THEN
      IF (p_offer_context->>'entitlement_id') IS NOT NULL THEN
        UPDATE public.offer_redemptions
           SET booking_id = v_booking_id
         WHERE entitlement_id = (p_offer_context->>'entitlement_id')::UUID
           AND order_id = p_order_id;
      END IF;

      IF (p_offer_context->>'application_id') IS NOT NULL THEN
        UPDATE public.offer_applications
           SET booking_id = v_booking_id
         WHERE id = (p_offer_context->>'application_id')::UUID;
      END IF;
    END IF;

    -- Insert into booking_pricing
    v_pricing := v_item->'pricing';
    IF v_pricing IS NOT NULL THEN
      INSERT INTO public.booking_pricing (
        booking_id,
        base_price,
        hourly_price,
        area_price,
        quantity_price,
        distance_price,
        inspection_fee,
        travel_fee,
        surcharges,
        addons_total,
        addons_breakdown,
        gst_amount,
        discount_amount,
        coupon_discount,
        wallet_discount,
        offer_id,
        offer_entitlement_id,
        offer_discount,
        total_price
      ) VALUES (
        v_booking_id,
        coalesce((v_pricing->>'base_price')::NUMERIC, 0),
        coalesce((v_pricing->>'hourly_price')::NUMERIC, 0),
        coalesce((v_pricing->>'area_price')::NUMERIC, 0),
        coalesce((v_pricing->>'quantity_price')::NUMERIC, 0),
        coalesce((v_pricing->>'distance_price')::NUMERIC, 0),
        coalesce((v_pricing->>'inspection_fee')::NUMERIC, 0),
        coalesce((v_pricing->>'travel_fee')::NUMERIC, 0),
        coalesce(v_pricing->'surcharges', '[]'::jsonb),
        coalesce((v_pricing->>'addons_total')::NUMERIC, 0),
        coalesce(v_pricing->'addons_breakdown', '[]'::jsonb),
        coalesce((v_pricing->>'gst_amount')::NUMERIC, 0),
        coalesce((v_pricing->>'discount_amount')::NUMERIC, 0),
        coalesce((v_pricing->>'coupon_discount')::NUMERIC, 0),
        coalesce((v_pricing->>'wallet_discount')::NUMERIC, 0),
        (v_pricing->>'offer_id')::UUID,
        (v_pricing->>'offer_entitlement_id')::UUID,
        coalesce((v_pricing->>'offer_discount')::NUMERIC, 0),
        coalesce((v_pricing->>'total_price')::NUMERIC, 0)
      );
    END IF;

    -- Insert form answers
    v_answers := v_item->'form_answers';
    IF v_answers IS NOT NULL AND jsonb_typeof(v_answers) = 'array' THEN
      FOR v_ans IN SELECT * FROM jsonb_array_elements(v_answers)
      LOOP
        INSERT INTO public.booking_form_answers (
          booking_id,
          field_name,
          field_label,
          field_value
        ) VALUES (
          v_booking_id,
          coalesce(v_ans->>'field_name', 'field'),
          coalesce(v_ans->>'field_label', 'Field'),
          coalesce(v_ans->>'field_value', '')
        );
      END LOOP;
    END IF;

    -- Insert initial booking status history
    INSERT INTO public.booking_status_history (
      booking_id,
      status,
      remarks,
      changed_by
    ) VALUES (
      v_booking_id,
      coalesce(v_item->>'status', 'pending'),
      coalesce(v_item->>'status_remarks', 'Booking created'),
      NULL
    );

    -- Insert initial booking event
    v_actor := coalesce(v_item->>'event_actor', 'SYSTEM');
    v_remarks := coalesce(v_item->>'status_remarks', 'Booking created');
    v_metadata := coalesce(v_item->'event_metadata', '{}'::jsonb);

    INSERT INTO public.booking_events (
      booking_id,
      event_type,
      actor,
      metadata
    ) VALUES (
      v_booking_id,
      'BOOKING_CREATED',
      v_actor,
      v_metadata
    );

    v_created_ids := array_append(v_created_ids, v_booking_id);
    v_is_first := FALSE;
  END LOOP;

  -- 4. Apply atomic order updates
  IF p_order_updates IS NOT NULL AND p_order_updates <> '{}'::jsonb THEN
    UPDATE public.orders
       SET status         = coalesce(p_order_updates->>'status', status),
           payment_status = coalesce(p_order_updates->>'payment_status', payment_status),
           updated_at     = NOW()
     WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_created', false,
    'booking_ids', to_jsonb(v_created_ids),
    'count', array_length(v_created_ids, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_bookings_atomic(UUID, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_bookings_atomic(UUID, JSONB, JSONB, JSONB) TO service_role;


-- ─── 5. RECOVERY RESILIENCE FOR WALLET RECHARGE & OFFER PURCHASE ───────────
-- Allow complete_wallet_recharge to credit valid gateway payments even if the
-- customer dismissed the modal (marked cancelled/failed). Idempotency remains
-- guaranteed by unique payment id index and 'success' status check.

CREATE OR REPLACE FUNCTION public.complete_wallet_recharge(
  p_recharge_id            UUID,
  p_razorpay_order_id      TEXT,
  p_payment_id             TEXT,
  p_signature              TEXT,
  p_gateway_verified_amount NUMERIC,
  p_method                 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_r         public.wallet_recharges%ROWTYPE;
  v_new_total NUMERIC(10,2);
  v_new_cash  NUMERIC(10,2);
  v_tx_id     UUID;
BEGIN
  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing payment id.');
  END IF;

  SELECT * INTO v_r
    FROM public.wallet_recharges
   WHERE id = p_recharge_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge not found.');
  END IF;

  IF v_r.razorpay_order_id IS DISTINCT FROM p_razorpay_order_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gateway order mismatch.');
  END IF;

  IF v_r.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true);
  END IF;

  -- Allow recovery from created, pending, cancelled, or failed
  IF v_r.status NOT IN ('created', 'pending', 'cancelled', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge can no longer be credited.');
  END IF;

  IF v_r.amount IS DISTINCT FROM p_gateway_verified_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch with gateway.');
  END IF;

  -- Credit CASH only.
  UPDATE public.profiles
     SET wallet_balance       = wallet_balance + v_r.amount,
         wallet_cash_balance  = wallet_cash_balance + v_r.amount
   WHERE id = v_r.user_id
   RETURNING wallet_balance, wallet_cash_balance INTO v_new_total, v_new_cash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    v_r.user_id, 'credit', 'recharge', v_r.amount, v_new_total,
    'Wallet recharge of ₹' || ROUND(v_r.amount, 0)::TEXT, v_r.id,
    jsonb_build_object(
      'razorpay_order_id', p_razorpay_order_id,
      'razorpay_payment_id', p_payment_id,
      'razorpay_signature', p_signature,
      'method', p_method
    ),
    'cash'
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.wallet_recharges
     SET status              = 'success',
         razorpay_payment_id = p_payment_id,
         razorpay_signature  = p_signature,
         payment_method      = p_method,
         updated_at          = now()
   WHERE id = v_r.id;

  RETURN jsonb_build_object(
    'success', true,
    'credited', v_r.amount,
    'new_balance', v_new_total,
    'new_cash', v_new_cash,
    'transaction_id', v_tx_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_wallet_recharge(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_wallet_recharge(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;


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
  v_p              public.offer_purchases%ROWTYPE;
  v_o              public.offers%ROWTYPE;
  v_expires_at     TIMESTAMPTZ;
  v_entitlement_id UUID;
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

  -- Allow recovery from created, pending, cancelled, or failed
  IF v_p.status NOT IN ('created', 'pending', 'cancelled', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase can no longer be completed.');
  END IF;

  IF v_p.amount IS DISTINCT FROM p_gateway_verified_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch with gateway.');
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = v_p.offer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found.');
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
    v_o.id, v_p.customer_id, v_p.id, v_o.offer_type,
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
      'payment_method', p_method, 'gateway_payment_id', p_payment_id
    )
  )
  RETURNING id INTO v_entitlement_id;

  UPDATE public.offer_purchases
     SET status              = 'success',
         razorpay_payment_id = p_payment_id,
         razorpay_signature  = p_signature,
         payment_method      = coalesce(p_method, 'razorpay'),
         metadata            = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('entitlement_id', v_entitlement_id),
         updated_at          = now()
   WHERE id = v_p.id;

  RETURN jsonb_build_object(
    'success', true,
    'entitlement_id', v_entitlement_id,
    'offer_title', v_o.title
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;
