-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Quote & Extension Reconciliation, Component-Level Cash Clawback,
--            Restitution Payout Settlement, Invoice & Refund Hardening
-- File: supabase/migrations/20261101000200_quote_extension_reconciliation.sql
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add subtotal and gst_amount to booking_quotes
ALTER TABLE public.booking_quotes
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2);

-- 1b. Cash earnings that have not been received yet must be excluded from
-- payout selection. Add 'pending' to the partner_earnings lifecycle.
ALTER TABLE public.partner_earnings
  DROP CONSTRAINT IF EXISTS partner_earnings_status_check;
ALTER TABLE public.partner_earnings
  ADD CONSTRAINT partner_earnings_status_check
  CHECK (status IN ('pending', 'eligible', 'reserved', 'paid', 'reversed'));

-- 2. Component-level Cash Math & Cash Receipt Guard in handle_partner_earning_on_complete
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
  v_order_fee           NUMERIC(10, 2) := 0;
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
  v_quotes_online       NUMERIC(10, 2) := 0;
  v_cash_quote_gst      NUMERIC(10, 2) := 0;
  v_online_quote_gst    NUMERIC(10, 2) := 0;
  v_cash_gst            NUMERIC(10, 2) := 0;
  v_cash_collected      NUMERIC(10, 2) := 0;
  v_is_cash             BOOLEAN := FALSE;
  v_cash_service        NUMERIC(10, 2) := 0;
  v_cash_partner_earning NUMERIC(10, 2) := 0;
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
         COALESCE(bp.wallet_discount, NEW.wallet_discount_applied, 0),
         COALESCE(bp.order_fee, 0)
    INTO v_total_amount, v_gst_amount, v_wallet_discount, v_order_fee
    FROM public.booking_pricing bp
   WHERE bp.booking_id = NEW.id;

  IF v_total_amount IS NULL THEN
    v_total_amount := COALESCE(NEW.total_amount, 0);
    v_gst_amount   := 0;
    v_order_fee    := 0;
  END IF;

  -- Order fees are platform revenue and excluded from partner commission.
  -- booking_pricing.order_fee is stored GROSS, while wallet_discount is the
  -- TOTAL wallet amount (service + fee). Adding wallet back before subtracting
  -- the gross fee reconstructs the pre-wallet service value exactly once.
  v_gross_service_value := GREATEST(0, (v_total_amount + COALESCE(v_wallet_discount, 0)) - v_order_fee);
  v_service_revenue     := GREATEST(0, v_gross_service_value - COALESCE(v_gst_amount, 0));
  v_platform_commission := ROUND(v_service_revenue * (v_commission_percent / 100), 2);
  v_partner_earning     := ROUND(v_service_revenue * ((100 - v_commission_percent) / 100), 2);
  v_completed_at        := COALESCE(NEW.completed_at, NEW.service_completed_at, NEW.created_at, now());

  v_payment_method := COALESCE(NULLIF(TRIM(NEW.payment_method), ''), 'Online');
  v_is_cash := (LOWER(v_payment_method) = 'cash');

  -- Paid quote split. NEW.total_amount / booking_pricing.total_price already
  -- includes every approved quote, so the base cash amount must exclude quotes
  -- that were paid online. Cash quotes are then added back explicitly.
  SELECT
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'cash' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) <> 'cash' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) = 'cash' THEN COALESCE(gst_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_method, '')) <> 'cash' THEN COALESCE(gst_amount, 0) ELSE 0 END), 0)
    INTO v_quotes_cash, v_quotes_online, v_cash_quote_gst, v_online_quote_gst
    FROM public.booking_quotes
   WHERE booking_id = NEW.id
     AND status = 'approved'
     AND payment_status = 'paid';

  IF v_is_cash THEN
    v_base_cash := GREATEST(0, v_total_amount - v_quotes_online);
  ELSE
    v_base_cash := 0;
  END IF;

  v_cash_collected := v_base_cash + v_quotes_cash;

  -- Guard: Cash earnings are marked 'paid' ONLY when cash collection is confirmed.
  -- 'pending' is excluded from payout selection until cash_received_at is stamped.
  IF v_is_cash THEN
    IF NEW.cash_received_at IS NOT NULL THEN
      v_earning_status := 'paid';
    ELSE
      v_earning_status := 'pending';
    END IF;
  ELSE
    v_earning_status := 'eligible';
  END IF;

  -- Component-level cash math:
  -- Partner is entitled to keep their commission-split from the cash service amount.
  -- The platform claws back: order fee + cash GST + platform commission.
  IF v_cash_collected > 0 THEN
    IF v_is_cash THEN
      -- GST collected in cash = all GST minus GST paid online with quotes.
      v_cash_gst := GREATEST(0, COALESCE(v_gst_amount, 0) - v_online_quote_gst);
      v_cash_service := GREATEST(0, v_cash_collected - v_order_fee - v_cash_gst);
      v_cash_partner_earning := ROUND(v_cash_service * ((100 - v_commission_percent) / 100), 2);
      v_clawback_amount := GREATEST(0, v_cash_collected - v_cash_partner_earning);
    ELSE
      -- Online booking with a paid cash quote: partner collected quote cash in hand
      v_cash_service := GREATEST(0, v_quotes_cash - v_cash_quote_gst);
      v_cash_partner_earning := ROUND(v_cash_service * ((100 - v_commission_percent) / 100), 2);
      v_clawback_amount := GREATEST(0, v_quotes_cash - v_cash_partner_earning);
    END IF;
  ELSE
    v_clawback_amount := 0;
  END IF;

  -- Insert or update partner_earnings with exact partial index predicate
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
      'Platform fee, tax and commission settlement for booking #' || SUBSTRING(NEW.id::text, 1, 8),
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

-- 3. Restitution & Settlement Fix in request_partner_payout
CREATE OR REPLACE FUNCTION public.request_partner_payout(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id           UUID;
  v_enabled            BOOLEAN;
  v_min                NUMERIC(10, 2);
  v_eligible           NUMERIC(10, 2) := 0;
  v_clawback_due       NUMERIC(10, 2) := 0;
  v_restitution        NUMERIC(10, 2) := 0;
  v_net_deductions     NUMERIC(10, 2) := 0;
  v_available          NUMERIC(10, 2) := 0;
  v_payout_id          UUID;
  v_payout_number      TEXT;
  v_gross_allocated    NUMERIC(10, 2) := 0;
  v_earning            RECORD;
  v_adj                RECORD;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND v_actor_id IS DISTINCT FROM p_partner_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot request a payout for another professional.';
  END IF;

  SELECT pc.enabled, pc.min_amount INTO v_enabled, v_min
    FROM public.get_payout_config() AS pc;

  IF NOT COALESCE(v_enabled, TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payouts are currently disabled. Please try later.');
  END IF;

  -- 1. Strictly serialize concurrent requests for the same partner via row-level lock
  PERFORM 1 FROM public.profiles WHERE id = p_partner_id FOR UPDATE;

  -- 2. Single active payout per partner
  IF EXISTS (
    SELECT 1 FROM public.payouts
     WHERE partner_id = p_partner_id AND status IN ('requested', 'approved', 'processing')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a payout in progress.');
  END IF;

  -- 3. Lock eligible earning rows
  PERFORM 1 FROM public.partner_earnings
    WHERE partner_id = p_partner_id AND status = 'eligible'
    FOR UPDATE;

  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  -- Calculate unsettled deductions and restitutions
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_clawback_due
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount < 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  SELECT COALESCE(SUM(amount), 0) INTO v_restitution
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount > 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  -- Available balance: eligible earnings + restitution - clawback_due
  v_available      := GREATEST(0, (v_eligible + v_restitution) - v_clawback_due);
  v_net_deductions := GREATEST(0, v_clawback_due - v_restitution);

  IF v_available <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No available earnings to withdraw.');
  END IF;

  IF v_available < v_min THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum payout is ₹' || TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) ||
               '. You have ₹' || TRIM(TO_CHAR(v_available, 'FM999G999G999G999')) || ' available.'
    );
  END IF;

  v_payout_number := 'PAY-' || LPAD(nextval('public.payout_number_seq')::TEXT, 6, '0');

  INSERT INTO public.payouts (
    payout_number, partner_id, requested_amount, gross_amount, deductions_amount, status
  ) VALUES (
    v_payout_number, p_partner_id, v_available, v_eligible, v_net_deductions, 'requested'
  )
  RETURNING id INTO v_payout_id;

  -- Allocate all eligible earnings to this payout
  FOR v_earning IN
    SELECT id, partner_earning_amount
      FROM public.partner_earnings
     WHERE partner_id = p_partner_id AND status = 'eligible'
     ORDER BY completed_at ASC NULLS LAST, id ASC
  LOOP
    INSERT INTO public.payout_allocations (payout_id, earning_id, partner_id, amount, status)
    VALUES (v_payout_id, v_earning.id, p_partner_id, v_earning.partner_earning_amount, 'allocated');

    UPDATE public.partner_earnings
       SET status = 'reserved'
     WHERE id = v_earning.id;

    v_gross_allocated := v_gross_allocated + v_earning.partner_earning_amount;
  END LOOP;

  -- Settle ALL pending adjustments (both restitution and clawback) against this payout
  FOR v_adj IN
    SELECT id, amount
      FROM public.payout_adjustments
     WHERE partner_id = p_partner_id
       AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL))
     ORDER BY created_at ASC
  LOOP
    UPDATE public.payout_adjustments
       SET status = 'settled',
           settled_at = now(),
           settled_payout_id = v_payout_id
     WHERE id = v_adj.id;
  END LOOP;

  -- Recalculate final net payout amount
  v_available := GREATEST(0, (v_gross_allocated + v_restitution) - v_clawback_due);

  IF v_available < v_min THEN
    DELETE FROM public.payouts WHERE id = v_payout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to withdraw: available balance after adjustments is below the minimum payout of ₹' ||
               TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) || '.'
    );
  END IF;

  UPDATE public.payouts
     SET requested_amount  = v_available,
         gross_amount      = v_gross_allocated,
         deductions_amount = v_net_deductions
   WHERE id = v_payout_id;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (v_payout_id, 'requested', p_partner_id, 'partner',
          jsonb_build_object(
            'requested_amount', v_available,
            'gross_allocated', v_gross_allocated,
            'restitution', v_restitution,
            'clawback_due', v_clawback_due,
            'payout_number', v_payout_number
          ));

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'payout_number', v_payout_number,
    'requested_amount', v_available,
    'gross_amount', v_gross_allocated,
    'deductions_amount', v_net_deductions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_partner_payout(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_partner_payout(UUID) TO authenticated, service_role;

-- 4. Cancellation Refund Hardening (Support partially_paid, avoid fee double-count)
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id         UUID;
  v_service_total    NUMERIC(10, 2) := 0;
  v_order_fees_total NUMERIC(10, 2) := 0;
  v_gross            NUMERIC(10, 2) := 0;
  v_wallet_cash      NUMERIC(10, 2) := 0;
  v_wallet_bonus     NUMERIC(10, 2) := 0;
  v_wallet_total     NUMERIC(10, 2) := 0;
  v_is_closing       BOOLEAN        := FALSE;
  v_refund_amount    NUMERIC(10, 2) := 0;
  v_wallet_slice     NUMERIC(10, 2) := 0;
  v_wallet_cash_part NUMERIC(10, 2) := 0;
  v_bonus_part       NUMERIC(10, 2) := 0;
  v_cash_part        NUMERIC(10, 2) := 0;
  v_credit           JSONB;
  v_actual_paid      NUMERIC(10, 2) := 0;
  v_order_fee_col    NUMERIC(10, 2) := 0;
BEGIN
  -- Support both paid and partially_paid bookings that are eligible for refund
  IF NEW.status <> 'cancelled'
     OR OLD.status IS NOT DISTINCT FROM 'cancelled'
     OR NEW.payment_status NOT IN ('paid', 'partially_paid')
     OR NEW.refund_eligible IS FALSE THEN
    RETURN NEW;
  END IF;

  v_order_id := NEW.order_id;

  -- Idempotency: never refund the same booking twice
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = NEW.id
       AND source       = 'refund'
  ) THEN
    RETURN NEW;
  END IF;

  -- Serialize sibling cancellations of the same order
  IF v_order_id IS NOT NULL THEN
    PERFORM 1 FROM public.orders WHERE id = v_order_id FOR UPDATE;
  END IF;

  -- Check if booking_pricing has allocated order_fee
  SELECT COALESCE(order_fee, 0) INTO v_order_fee_col
    FROM public.booking_pricing
   WHERE booking_id = NEW.id;

  -- Compute actual paid online/quote/extension amounts + wallet discount
  SELECT COALESCE(SUM(amount), 0) INTO v_actual_paid
    FROM public.payments
   WHERE (booking_id = NEW.id OR (order_id = v_order_id AND v_order_id IS NOT NULL))
     AND payment_status = 'completed';

  v_actual_paid := v_actual_paid + COALESCE(NEW.wallet_discount_applied, 0);

  IF v_order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(total_amount), 0)
      INTO v_service_total
      FROM public.bookings
     WHERE order_id = v_order_id;

    -- Legacy fallback: read order_fees array only if order_fee_col == 0
    IF COALESCE(v_order_fee_col, 0) = 0 THEN
      SELECT COALESCE(SUM((fee ->> 'amount')::NUMERIC), 0)
        INTO v_order_fees_total
        FROM public.orders o
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(o.order_fees) = 'array' THEN o.order_fees ELSE '[]'::jsonb END
        ) AS fee
       WHERE o.id = v_order_id;
    END IF;

    SELECT NOT EXISTS (
      SELECT 1 FROM public.bookings
       WHERE order_id = v_order_id
         AND id      <> NEW.id
         AND status NOT IN ('completed', 'cancelled', 'expired', 'refunded')
    ) INTO v_is_closing;
  END IF;

  IF v_service_total <= 0 THEN
    v_service_total := COALESCE(NEW.total_amount, 0);
  END IF;

  v_gross := v_service_total + v_order_fees_total;

  -- Read wallet debit split
  SELECT COALESCE((metadata ->> 'cash_used')::NUMERIC, 0),
         COALESCE((metadata ->> 'bonus_used')::NUMERIC, 0)
    INTO v_wallet_cash, v_wallet_bonus
    FROM public.wallet_transactions
   WHERE source       = 'booking_discount'
     AND reference_id = COALESCE(v_order_id, NEW.id)
   ORDER BY created_at DESC
   LIMIT 1;

  v_wallet_total := COALESCE(v_wallet_cash, 0) + COALESCE(v_wallet_bonus, 0);

  -- For new rows (v_order_fee_col > 0), NEW.total_amount already includes allocated fee
  -- For legacy rows (v_order_fee_col = 0), include v_order_fees_total when order is closing with no fee
  IF COALESCE(v_order_fee_col, 0) > 0 THEN
    v_refund_amount := GREATEST(0, COALESCE(NEW.total_amount, 0) - COALESCE(NEW.cancellation_fee, 0));
  ELSE
    v_refund_amount := GREATEST(0, COALESCE(NEW.total_amount, 0) - COALESCE(NEW.cancellation_fee, 0))
                       + CASE WHEN v_is_closing AND COALESCE(NEW.cancellation_fee, 0) = 0 THEN v_order_fees_total ELSE 0 END;
  END IF;

  -- Customer can never be refunded more than what was actually paid
  IF v_actual_paid > 0 THEN
    v_refund_amount := LEAST(v_refund_amount, v_actual_paid);
  END IF;

  IF v_refund_amount <= 0 THEN
    NEW.payment_status := 'refunded';
    NEW.refund_status  := 'refunded';
    NEW.refund_amount  := 0.00;
    RETURN NEW;
  END IF;

  IF v_gross > 0 AND v_wallet_total > 0 THEN
    v_wallet_slice := LEAST(v_refund_amount, ROUND(v_wallet_total * (v_refund_amount / v_gross), 2));

    IF v_wallet_total > 0 THEN
      v_wallet_cash_part := ROUND(v_wallet_slice * (v_wallet_cash / v_wallet_total), 2);
      v_bonus_part       := v_wallet_slice - v_wallet_cash_part;
    END IF;
  END IF;

  v_cash_part := v_refund_amount - v_bonus_part;

  -- Credit refund to customer wallet
  v_credit := public.credit_wallet_balance(
    p_user_id     := NEW.customer_id,
    p_cash_amount := v_cash_part,
    p_bonus_amount := v_bonus_part,
    p_source      := 'refund',
    p_description := 'Refund for cancelled booking #' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
    p_reference_id := NEW.id,
    p_metadata    := jsonb_build_object(
      'booking_id', NEW.id,
      'order_id', v_order_id,
      'total_amount', NEW.total_amount,
      'cancellation_fee', NEW.cancellation_fee,
      'actual_paid', v_actual_paid,
      'refund_amount', v_refund_amount,
      'cash_part', v_cash_part,
      'bonus_part', v_bonus_part
    )
  );

  NEW.payment_status := 'refunded';
  NEW.refund_status  := 'refunded';
  NEW.refund_amount  := v_refund_amount;

  RETURN NEW;
END;
$$;

-- 5. Invoice Trigger Fix (Generate on completed status regardless of OTP, preserve actual payment_status)
-- NOTE: the live trigger is tr_bookings_create_invoice -> tr_create_invoice_on_completion().
CREATE OR REPLACE FUNCTION public.tr_create_invoice_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal         NUMERIC(10, 2);
  v_tax_rate         NUMERIC(5, 2)  := 18.00;
  v_tax_amount       NUMERIC(10, 2);
  v_total_amount     NUMERIC(10, 2);
  v_discount         NUMERIC(10, 2) := 0;
  v_payment_method   TEXT           := 'Cash';
  v_transaction_id   TEXT           := '';
  v_tax_val          TEXT;
  v_gst_enabled      BOOLEAN;
  v_coupon           NUMERIC(10, 2) := 0;
  v_wallet           NUMERIC(10, 2) := 0;
  v_manual           NUMERIC(10, 2) := 0;
  v_offer            NUMERIC(10, 2) := 0;
  v_order_fee        NUMERIC(10, 2) := 0;
BEGIN
  -- Fires whenever booking status transitions to 'completed' (partner OTP or admin force complete)
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
  THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_total_amount := COALESCE(NEW.total_amount, 0);

    SELECT (value#>>'{}')::TEXT
    INTO   v_tax_val
    FROM   public.platform_settings
    WHERE  key = 'tax_rate'
    LIMIT  1;

    IF v_tax_val IS NOT NULL THEN
      BEGIN
        v_tax_rate := REPLACE(v_tax_val, '%', '')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        v_tax_rate := 18.00;
      END;
    END IF;

    SELECT COALESCE((value#>>'{}')::BOOLEAN, true)
    INTO   v_gst_enabled
    FROM   public.platform_settings
    WHERE  key = 'gst_enabled'
    LIMIT  1;

    IF v_gst_enabled IS FALSE THEN
      v_tax_rate := 0;
    END IF;

    SELECT
      COALESCE(coupon_discount, 0),
      COALESCE(wallet_discount, 0),
      COALESCE(discount_amount, 0),
      COALESCE(offer_discount, 0),
      COALESCE(order_fee, 0)
    INTO v_coupon, v_wallet, v_manual, v_offer, v_order_fee
    FROM public.booking_pricing
    WHERE booking_id = NEW.id;

    v_coupon := COALESCE(v_coupon, 0);
    v_wallet := COALESCE(v_wallet, 0);
    v_manual := COALESCE(v_manual, 0);
    v_offer  := COALESCE(v_offer, 0);
    v_order_fee := COALESCE(v_order_fee, 0);

    v_discount := v_manual;
    IF v_discount = 0 THEN v_discount := v_coupon + v_wallet + v_offer; END IF;
    IF v_discount = 0 THEN v_discount := COALESCE(NEW.wallet_discount_applied, 0); END IF;
    v_discount := COALESCE(v_discount, 0);

    SELECT
      COALESCE(razorpay_payment_id, ''),
      'Razorpay'
    INTO v_transaction_id, v_payment_method
    FROM public.payments
    WHERE booking_id = NEW.id
       OR (order_id = NEW.order_id AND NEW.order_id IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_transaction_id IS NULL OR v_transaction_id = '' THEN
      v_transaction_id := 'TXN-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;

    IF v_payment_method IS NULL THEN
      IF COALESCE(NEW.wallet_discount_applied, 0) > 0
         AND v_total_amount <= COALESCE(NEW.wallet_discount_applied, 0) THEN
        v_payment_method := 'Wallet';
      ELSE
        v_payment_method := COALESCE(NEW.payment_method, 'Cash');
      END IF;
    END IF;

    v_tax_rate := COALESCE(v_tax_rate, 18.00);

    -- Compute pre-tax subtotal from service portion
    v_subtotal   := ROUND(((v_total_amount - v_order_fee) + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND(((v_total_amount - v_order_fee) + v_discount) - v_subtotal, 2);

    v_subtotal     := COALESCE(v_subtotal, 0);
    v_tax_amount   := COALESCE(v_tax_amount, 0);
    v_discount     := COALESCE(v_discount, 0);

    INSERT INTO public.invoices (
      booking_id,
      customer_id,
      partner_id,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      grand_total,
      payment_status,
      payment_method,
      transaction_id
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.partner_id,
      v_subtotal,
      v_tax_rate,
      v_tax_amount,
      v_discount,
      v_total_amount,
      COALESCE(NEW.payment_status, 'pending'),
      v_payment_method,
      v_transaction_id
    );
  END IF;
  RETURN NEW;
END;
$$;
