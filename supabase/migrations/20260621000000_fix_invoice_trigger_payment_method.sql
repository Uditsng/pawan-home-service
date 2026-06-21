-- ═══════════════════════════════════════════════════════════════
-- Fix: Invoice Trigger Payment Method Column
-- Created: 2026-06-21
-- Root Cause: tr_create_invoice_on_completion() referenced
--   NEW.payment_method which does not exist on the bookings table,
--   causing every booking completion UPDATE to be rolled back,
--   surfacing as "Failed to mark booking completed."
-- ═══════════════════════════════════════════════════════════════

-- 1. Add the missing payment_method column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 2. Replace the trigger function with a safe version that:
--    a) Uses COALESCE defensively on all nullable columns
--    b) Does not reference any column that may not exist
--    c) Has explicit fallbacks if the payments table has no row
CREATE OR REPLACE FUNCTION public.tr_create_invoice_on_completion()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
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
  -- Only fire when a booking transitions to 'completed' with OTP verified
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.completion_otp_verified = true
  THEN
    -- Idempotency guard — never create duplicate invoices
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Fetch platform tax rate (safe: SELECT INTO sets FOUND flag, no exception on 0 rows)
    SELECT value->>0
    INTO   v_tax_val
    FROM   public.platform_settings
    WHERE  key = 'tax_rate'
    LIMIT  1;

    IF v_tax_val IS NOT NULL THEN
      BEGIN
        v_tax_rate := REPLACE(v_tax_val, '%', '')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        v_tax_rate := 18.00; -- safe fallback if value is malformed
      END;
    END IF;

    -- Extract discount amount (wallet_discount_applied has DEFAULT 0, always safe)
    v_discount := COALESCE(NEW.wallet_discount_applied, 0);

    -- Extract payment info from the payments table (no row = NULL, handled by fallbacks below)
    SELECT
      COALESCE(razorpay_payment_id, ''),
      'Razorpay'
    INTO v_transaction_id, v_payment_method
    FROM public.payments
    WHERE booking_id = NEW.id
       OR (order_id = NEW.order_id AND NEW.order_id IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Fallback: if no payment row exists, generate a synthetic transaction reference
    IF v_transaction_id IS NULL OR v_transaction_id = '' THEN
      v_transaction_id := 'TXN-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;

    -- Fallback: payment method from bookings.payment_method (now guaranteed to exist)
    IF v_payment_method IS NULL THEN
      v_payment_method := COALESCE(NEW.payment_method, 'Cash');
    END IF;

    -- Calculate subtotal and tax
    -- Formula: total_amount = subtotal * (1 + tax_rate/100) - discount
    -- So:      subtotal = (total_amount + discount) / (1 + tax_rate/100)
    v_subtotal   := ROUND((NEW.total_amount + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND((NEW.total_amount + v_discount) - v_subtotal, 2);

    -- Insert invoice (tr_assign_invoice_number BEFORE INSERT trigger will fill invoice_number)
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

-- 3. Re-attach the trigger (DROP + CREATE to ensure fresh definition is used)
DROP TRIGGER IF EXISTS tr_bookings_create_invoice ON public.bookings;
CREATE TRIGGER tr_bookings_create_invoice
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tr_create_invoice_on_completion();
