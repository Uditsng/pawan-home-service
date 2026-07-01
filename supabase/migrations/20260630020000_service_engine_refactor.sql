-- PHS Service Engine Refactor Migration SQL
-- Recreates or alters tables for modular service pricing, variants, dynamic forms, quotes, and coupons.

-- 1. DROP LEGACY CONSTRAINTS
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_pricing_model_check;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_pricing_model_check;

-- 2. ALTER SERVICES TABLE
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- in minutes
  ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preparation_instructions TEXT,
  ADD COLUMN IF NOT EXISTS warranty TEXT,
  ADD COLUMN IF NOT EXISTS revisit_policy TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduling_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS availability_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements_config JSONB DEFAULT '{}'::jsonb;

-- Ensure slug is generated for existing services if NULL
UPDATE public.services SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- 3. CREATE SERVICE VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.service_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  duration_minutes INTEGER,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE SERVICE ADDONS TABLE
CREATE TABLE IF NOT EXISTS public.service_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  is_required BOOLEAN DEFAULT false,
  max_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREATE SERVICE PRICING RULES TABLE (Surcharges / Discounts)
CREATE TABLE IF NOT EXISTS public.service_pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE, -- null means global rule
  name TEXT NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('surcharge', 'discount')),
  amount_type VARCHAR(50) NOT NULL CHECK (amount_type IN ('fixed', 'percentage')),
  amount_value NUMERIC(10, 2) NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb, -- e.g. { "days": [0, 6], "hours": ["20:00", "06:00"] }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CREATE SERVICE PACKAGES TABLE (Bundled Services)
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  services JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { service_id, variant_id }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CREATE BOOKING PRICING TABLE (Detailed breakdown)
CREATE TABLE IF NOT EXISTS public.booking_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  hourly_price NUMERIC(10, 2) DEFAULT 0,
  area_price NUMERIC(10, 2) DEFAULT 0,
  quantity_price NUMERIC(10, 2) DEFAULT 0,
  distance_price NUMERIC(10, 2) DEFAULT 0,
  inspection_fee NUMERIC(10, 2) DEFAULT 0,
  travel_fee NUMERIC(10, 2) DEFAULT 0,
  surcharges JSONB DEFAULT '[]'::jsonb, -- Array of { name, amount }
  addons_total NUMERIC(10, 2) DEFAULT 0,
  addons_breakdown JSONB DEFAULT '[]'::jsonb, -- Array of { addon_id, title, price, quantity }
  gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  coupon_discount NUMERIC(10, 2) DEFAULT 0,
  wallet_discount NUMERIC(10, 2) DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. CREATE BOOKING FORM ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.booking_form_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_value TEXT, -- JSON-string or plain value
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_booking_field UNIQUE (booking_id, field_name)
);

-- 9. CREATE BOOKING QUOTES & QUOTE ITEMS (Inspection Services)
CREATE TABLE IF NOT EXISTS public.booking_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_customer_approval' CHECK (status IN ('pending_customer_approval', 'approved', 'declined', 'expired')),
  tax_rate NUMERIC(5, 2) DEFAULT 18.00,
  discount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expiry_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.booking_quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.booking_quotes(id) ON DELETE CASCADE NOT NULL,
  item_type VARCHAR(50) DEFAULT 'material' CHECK (item_type IN ('material', 'labour')),
  name TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. CREATE BOOKING STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. CREATE COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC(10, 2) NOT NULL,
  min_booking_amount NUMERIC(10, 2) DEFAULT 0,
  max_discount NUMERIC(10, 2),
  limit_per_user INTEGER DEFAULT 1,
  total_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. CREATE MEMBERSHIP SYSTEM
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  benefits JSONB DEFAULT '{}'::jsonb, -- e.g. { "discount_percent": 10, "free_cancellation": true }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.membership_plans(id) ON DELETE RESTRICT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ENABLE ROW LEVEL SECURITY & DEFINE POLICIES
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- Dynamic Icon Pattern & Service Catalogs are public
CREATE POLICY "Allow public select on service_variants" ON public.service_variants FOR SELECT USING (true);
CREATE POLICY "Allow public select on service_addons" ON public.service_addons FOR SELECT USING (true);
CREATE POLICY "Allow public select on service_pricing_rules" ON public.service_pricing_rules FOR SELECT USING (true);
CREATE POLICY "Allow public select on service_packages" ON public.service_packages FOR SELECT USING (true);
CREATE POLICY "Allow public select on coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public select on membership_plans" ON public.membership_plans FOR SELECT USING (true);

-- Admin Management policies (checking profiles role)
CREATE POLICY "Admins have full access on service_variants" ON public.service_variants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on service_addons" ON public.service_addons FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on service_pricing_rules" ON public.service_pricing_rules FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on service_packages" ON public.service_packages FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on coupons" ON public.coupons FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on membership_plans" ON public.membership_plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins have full access on user_memberships" ON public.user_memberships FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Booking Pricing Policies
CREATE POLICY "Users can select own booking_pricing" ON public.booking_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_pricing.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.partner_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert booking_pricing" ON public.booking_pricing FOR INSERT
  WITH CHECK (true); -- allowed during payment/checkout actions

-- Booking Form Answers Policies
CREATE POLICY "Users can select own booking_form_answers" ON public.booking_form_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_form_answers.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.partner_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert booking_form_answers" ON public.booking_form_answers FOR INSERT
  WITH CHECK (true);

-- Booking Quotes Policies
CREATE POLICY "Users can select own booking_quotes" ON public.booking_quotes FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = professional_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Pros and Admins can insert booking_quotes" ON public.booking_quotes FOR INSERT
  WITH CHECK (auth.uid() = professional_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own booking_quotes" ON public.booking_quotes FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = professional_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Booking Quote Items Policies
CREATE POLICY "Users can select own booking_quote_items" ON public.booking_quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_quotes
      WHERE booking_quotes.id = booking_quote_items.quote_id
        AND (booking_quotes.customer_id = auth.uid() OR booking_quotes.professional_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Pros and Admins can manage booking_quote_items" ON public.booking_quote_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_quotes
      WHERE booking_quotes.id = booking_quote_items.quote_id
        AND (booking_quotes.professional_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Booking Status History Policies
CREATE POLICY "Users can select own booking_status_history" ON public.booking_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_status_history.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.partner_id = auth.uid())
    ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert booking_status_history" ON public.booking_status_history FOR INSERT
  WITH CHECK (true);

-- User Memberships Policies
CREATE POLICY "Users can see own user_memberships" ON public.user_memberships FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
