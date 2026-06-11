-- ═══════════════════════════════════════════════════════════════
-- Cart & Orders System Migration
-- Created: 2026-06-11
-- Purpose: Multi-service cart checkout support
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CREATE orders table ──────────────────────────────────
-- Acts as the master container for a multi-service cart checkout.
-- A single customer checkout creates 1 order + N bookings (one per service).
-- Existing single-service bookings keep order_id = NULL — zero impact.

CREATE TABLE IF NOT EXISTS public.orders (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  total_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  address        TEXT,
  city           TEXT,
  pincode        TEXT,
  scheduled_date TIMESTAMPTZ,
  item_count     INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. ADD order_id FK to bookings ──────────────────────────
-- Nullable so all existing single-service bookings are unaffected.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Index for fast lookups: "give me all bookings for this order"
CREATE INDEX IF NOT EXISTS idx_bookings_order_id ON public.bookings(order_id);

-- ─── 3. RLS on orders ────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers see and insert only their own orders
DROP POLICY IF EXISTS "Customers see own orders" ON public.orders;
CREATE POLICY "Customers see own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers insert own orders" ON public.orders;
CREATE POLICY "Customers insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND total_amount > 0);

DROP POLICY IF EXISTS "Customers update own orders" ON public.orders;
CREATE POLICY "Customers update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Admins have full access
DROP POLICY IF EXISTS "Admins full access to orders" ON public.orders;
CREATE POLICY "Admins full access to orders" ON public.orders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 4. updated_at auto-trigger ──────────────────────────────

CREATE OR REPLACE FUNCTION public.set_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_orders_updated_at();
