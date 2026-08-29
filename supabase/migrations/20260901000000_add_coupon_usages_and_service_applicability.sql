-- 20260901000000_add_coupon_usages_and_service_applicability.sql
-- PHS Coupon System — Usage Tracking & Service Applicability
-- Additions are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- 1. Add service applicability to coupons (NULL = all services)
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_to_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- 2. Create coupon_usages table — tracks every successful redemption atomically
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  coupon_code_snapshot TEXT NOT NULL,
  discount_type_snapshot VARCHAR(50) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Idempotency guard: a single Razorpay order may only redeem a coupon once.
  -- (Per-user / total usage limits are enforced in application code during
  --  validation, since they are configurable and may exceed 1.)
  UNIQUE (coupon_id, order_id)
);

-- 3. Indexes for usage counting and lookups
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer_id ON public.coupon_usages(customer_id);

-- 4. Enable RLS on both tables (idempotent)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- 5. coupons — public read for client-side validation/preview + admin full access
--    (Coupon codes/discounts are marketing data, safe to expose; matches the
--     subcategories/services public-read convention.)
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
CREATE POLICY "Coupons are viewable by everyone" ON public.coupons
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins have full access on coupons" ON public.coupons;
CREATE POLICY "Admins have full access on coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. coupon_usages — customers manage only their own redemptions; admin full access
--    Redemptions contain PII (customer_id + discount), so they are NOT public.
DROP POLICY IF EXISTS "Customers see own coupon usages" ON public.coupon_usages;
CREATE POLICY "Customers see own coupon usages" ON public.coupon_usages
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Customers insert own coupon usages" ON public.coupon_usages;
CREATE POLICY "Customers insert own coupon usages" ON public.coupon_usages
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access on coupon_usages" ON public.coupon_usages;
CREATE POLICY "Admins have full access on coupon_usages" ON public.coupon_usages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. SECURITY DEFINER RPC for usage counts.
--    Runs as the owner (bypasses RLS) so the global total_limit can be counted
--    without exposing individual redemptions to clients. Mirrors the
--    get_service_waitlist_count pattern from the waitlist system.
DROP FUNCTION IF EXISTS public.get_coupon_usage_counts(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_coupon_usage_counts(
  p_coupon_id uuid,
  p_user_id uuid
)
RETURNS TABLE (total_count bigint, user_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COUNT(*) FILTER (WHERE coupon_id = p_coupon_id)::bigint AS total_count,
    COUNT(*) FILTER (WHERE coupon_id = p_coupon_id AND customer_id = p_user_id)::bigint AS user_count
  FROM public.coupon_usages;
$$;

GRANT EXECUTE ON FUNCTION public.get_coupon_usage_counts(uuid, uuid) TO authenticated;

-- 9. Coupon snapshot columns on orders (immutable pricing context for the order's lifecycle)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_valid_at_creation BOOLEAN NOT NULL DEFAULT FALSE;