-- ═══════════════════════════════════════════════════════════════
-- Payments System Migration
-- Created: 2026-06-14
-- Purpose: Add payments table and track payment statuses on bookings/orders
-- ═══════════════════════════════════════════════════════════════

-- 1. ADD payment_status column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 2. ADD payment_status column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 3. CREATE payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id            UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'INR',
  payment_status      TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);

-- 4. ENABLE RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Customers view own payments" ON public.payments;
CREATE POLICY "Customers view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to payments" ON public.payments;
CREATE POLICY "Admins full access to payments" ON public.payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. updated_at auto-trigger for payments
CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_payments_updated_at ON public.payments;
CREATE TRIGGER tr_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();
