-- ═══════════════════════════════════════════════════════════════
-- Migration: Invoice v2 Snapshot Engine
-- Created: 2026-09-25
--
-- Goal: make the app the SINGLE authoritative invoice-snapshot compiler.
-- The SQL trigger no longer fabricates snapshots; it only assigns the
-- invoice number and injects it into a snapshot provided by the app.
-- Snapshots compiled by the old DB compiler (version "1.0") missed Offer
-- Card discounts, real coupon codes, order-fee line items and the
-- wallet-vs-online payment split. resolveInvoice regenerates any snapshot
-- whose version != the current app version on next view.
--
-- Also fixes the completion-trigger row math so the intermediate invoice
-- row (columns created before the app regenerates on first view) includes
-- offer_discount in the discount back-calculation and labels wallet-only
-- orders as "Wallet" instead of "Cash".
-- ═══════════════════════════════════════════════════════════════

-- 1. assign_invoice_number: number assignment + snapshot injection only.
--    The legacy NULL-snapshot SQL compiler is deliberately removed so DB
--    and app can never drift.
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val  INT;
  year_val TEXT;
BEGIN
  -- Assign invoice number if not already present
  IF NEW.invoice_number IS NULL THEN
    seq_val := nextval('public.invoice_number_seq');
    year_val := to_char(now(), 'YYYY');
    NEW.invoice_number := 'PHS-' || year_val || '-' || lpad(seq_val::text, 6, '0');
  END IF;

  -- Ensure the snapshot (provided by the app compiler) carries the invoice number
  IF NEW.snapshot IS NOT NULL AND NEW.invoice_number IS NOT NULL THEN
    NEW.snapshot := jsonb_set(NEW.snapshot, '{invoice_number}', to_jsonb(NEW.invoice_number));
  END IF;

  RETURN NEW;
END;
$$;

-- 2. tr_create_invoice_on_completion: keep creating the invoice row at
--    completion (snapshot stays NULL; the app compiles it on first view),
--    but fix the intermediate numeric columns so they never mis-state the
--    discount or payment method for offer / wallet-only bookings.
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
  v_discount         NUMERIC(10, 2) := 0;
  v_payment_method   TEXT           := 'Cash';
  v_transaction_id   TEXT           := '';
  v_tax_val          TEXT;
  v_gst_enabled      BOOLEAN;
  v_coupon           NUMERIC(10, 2) := 0;
  v_wallet           NUMERIC(10, 2) := 0;
  v_manual           NUMERIC(10, 2) := 0;
  v_offer            NUMERIC(10, 2) := 0;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.completion_otp_verified = true
  THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Read tax_rate as a JSON string scalar: value#>>'{}' (value->>0 is wrong
    -- for a scalar and always returned NULL -> tax was hardcoded to 18%).
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

    -- Honor gst_enabled: if disabled, no tax on the invoice.
    SELECT COALESCE((value#>>'{}')::BOOLEAN, true)
    INTO   v_gst_enabled
    FROM   public.platform_settings
    WHERE  key = 'gst_enabled'
    LIMIT  1;

    IF v_gst_enabled IS FALSE THEN
      v_tax_rate := 0;
    END IF;

    -- Extract full discount stack: coupon + offer + wallet (manual edits
    -- remain the explicit override). bookings.total_amount is stored after
    -- ALL of these were deducted, so the back-calculation must include offer.
    SELECT
      COALESCE(coupon_discount, 0),
      COALESCE(wallet_discount, 0),
      COALESCE(discount_amount, 0),
      COALESCE(offer_discount, 0)
    INTO v_coupon, v_wallet, v_manual, v_offer
    FROM public.booking_pricing
    WHERE booking_id = NEW.id;

    v_discount := v_manual;
    IF v_discount = 0 THEN v_discount := v_coupon + v_wallet + v_offer; END IF;
    IF v_discount = 0 THEN v_discount := COALESCE(NEW.wallet_discount_applied, 0); END IF;

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

    -- Payment method: wallet-only orders have no Razorpay payment row, so
    -- label them "Wallet" instead of falling through to a misleading "Cash".
    IF v_payment_method IS NULL THEN
      IF COALESCE(NEW.wallet_discount_applied, 0) > 0
         AND NEW.total_amount <= COALESCE(NEW.wallet_discount_applied, 0) THEN
        v_payment_method := 'Wallet';
      ELSE
        v_payment_method := COALESCE(NEW.payment_method, 'Cash');
      END IF;
    END IF;

    v_subtotal   := ROUND((NEW.total_amount + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND((NEW.total_amount + v_discount) - v_subtotal, 2);

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
      NEW.total_amount,
      'paid',
      v_payment_method,
      v_transaction_id
    );
  END IF;
  RETURN NEW;
END;
$$;