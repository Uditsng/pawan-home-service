-- ═══════════════════════════════════════════════════════════════
-- Fix: Invoices Trigger SECURITY DEFINER & RLS Bypass
-- Created: 2026-07-26
-- Root Cause: Auto-invoicing trigger functions lacked SECURITY DEFINER,
--   causing partner-triggered status updates to fail with RLS error (42501)
--   on table invoices.
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure assign_invoice_number trigger function has SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val            INT;
  year_val           TEXT;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    seq_val := nextval('public.invoice_number_seq');
    year_val := to_char(now(), 'YYYY');
    NEW.invoice_number := 'PHS-' || year_val || '-' || lpad(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Ensure tr_create_invoice_on_completion has SECURITY DEFINER + tax rate handling
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
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.completion_otp_verified = true
  THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT value->>0
    INTO   v_tax_val
    FROM   public.platform_settings
    WHERE  key = 'tax_rate'
    LIMIT  1;

    IF v_tax_val IS NOT NULL THEN
      BEGIN
        v_tax_rate := REPLACE(REPLACE(v_tax_val, '"', ''), '%', '')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        v_tax_rate := 18.00;
      END;
    END IF;

    v_discount := COALESCE(NEW.wallet_discount_applied, 0);

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
      v_payment_method := COALESCE(NEW.payment_method, 'Cash');
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
