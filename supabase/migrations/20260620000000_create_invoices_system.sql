-- ═══════════════════════════════════════════════════════════════
-- Invoices System Migration
-- Created: 2026-06-20
-- Purpose: Add invoices table, sequence, triggers, and RLS policies
-- ═══════════════════════════════════════════════════════════════

-- 1. CREATE invoice number sequence starting at 1
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;

-- 2. CREATE invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number      TEXT UNIQUE NOT NULL,
  booking_id          UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subtotal            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_rate            NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  tax_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  grand_total         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_status      TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_method      TEXT DEFAULT 'Card',
  transaction_id      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

-- 3. ENABLE RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
CREATE POLICY "Customers view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to invoices" ON public.invoices;
CREATE POLICY "Admins have full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. FUNCTION: Auto-assign Invoice Number
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_val INT;
  year_val TEXT;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    seq_val := nextval('public.invoice_number_seq');
    year_val := to_char(now(), 'YYYY');
    NEW.invoice_number := 'PHS-' || year_val || '-' || lpad(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_assign_invoice_number ON public.invoices;
CREATE TRIGGER tr_assign_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- 6. FUNCTION: Auto-create Invoice on Completed Booking Status + OTP Verified
CREATE OR REPLACE FUNCTION public.tr_create_invoice_on_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_subtotal NUMERIC(10, 2);
  v_tax_rate NUMERIC(5, 2) := 18.00;
  v_tax_amount NUMERIC(10, 2);
  v_discount NUMERIC(10, 2) := 0;
  v_payment_method TEXT := 'Card';
  v_transaction_id TEXT := '';
  v_tax_setting RECORD;
BEGIN
  -- Trigger condition: status becomes completed and completion OTP is verified
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.completion_otp_verified = true THEN
    -- Check if invoice already exists to prevent duplicates
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Fetch platform settings for tax rate
    SELECT value->>0 AS val INTO v_tax_setting FROM public.platform_settings WHERE key = 'tax_rate';
    IF FOUND THEN
      v_tax_rate := REPLACE(v_tax_setting.val, '%', '')::NUMERIC;
    END IF;

    -- Extract discount amount
    v_discount := COALESCE(NEW.wallet_discount_applied, 0);

    -- Extract payment mode / transaction ID from payments table
    SELECT razorpay_payment_id, 'Razorpay'
    INTO v_transaction_id, v_payment_method
    FROM public.payments
    WHERE booking_id = NEW.id OR (order_id = NEW.order_id AND NEW.order_id IS NOT NULL)
    LIMIT 1;

    -- Fallbacks
    IF v_transaction_id IS NULL THEN
      v_transaction_id := 'TXN-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;
    IF v_payment_method IS NULL THEN
      v_payment_method := COALESCE(NEW.payment_method, 'Card');
    END IF;

    -- Back-calculate subtotal and tax amounts
    -- total_amount = subtotal + tax - discount
    -- total_amount + discount = subtotal * (1 + tax_rate/100)
    -- subtotal = (total_amount + discount) / (1 + tax_rate/100)
    v_subtotal := ROUND((NEW.total_amount + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND((NEW.total_amount + v_discount) - v_subtotal, 2);

    -- Insert Invoice
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

-- 7. CREATE TRIGGER on bookings
DROP TRIGGER IF EXISTS tr_bookings_create_invoice ON public.bookings;
CREATE TRIGGER tr_bookings_create_invoice
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tr_create_invoice_on_completion();

-- 8. FUNCTION: updated_at auto-trigger for invoices
CREATE OR REPLACE FUNCTION public.set_invoices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_invoices_updated_at ON public.invoices;
CREATE TRIGGER tr_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoices_updated_at();
