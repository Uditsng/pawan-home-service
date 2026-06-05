-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) policies for core tables
-- Created: 2026-06-04
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper function to check admin status bypassing RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 2. profiles Table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile fields" ON public.profiles;
CREATE POLICY "Users can update their own profile fields" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 3. bookings Table RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
CREATE POLICY "Customers can insert their own bookings" ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Partners can view their assigned bookings" ON public.bookings;
CREATE POLICY "Partners can view their assigned bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update their assigned bookings" ON public.bookings;
CREATE POLICY "Partners can update their assigned bookings" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());


-- 4. user_addresses Table RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage their own addresses" ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.user_addresses;
CREATE POLICY "Admins can manage all addresses" ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 5. partner_services Table RLS
ALTER TABLE public.partner_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view their own services" ON public.partner_services;
CREATE POLICY "Partners can view their own services" ON public.partner_services
  FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can insert their own services" ON public.partner_services;
CREATE POLICY "Partners can insert their own services" ON public.partner_services
  FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can delete their own services" ON public.partner_services;
CREATE POLICY "Partners can delete their own services" ON public.partner_services
  FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all partner services" ON public.partner_services;
CREATE POLICY "Admins can manage all partner services" ON public.partner_services
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 6. partner_service_areas Table RLS
ALTER TABLE public.partner_service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view their own service areas" ON public.partner_service_areas;
CREATE POLICY "Partners can view their own service areas" ON public.partner_service_areas
  FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can insert their own service areas" ON public.partner_service_areas;
CREATE POLICY "Partners can insert their own service areas" ON public.partner_service_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can delete their own service areas" ON public.partner_service_areas;
CREATE POLICY "Partners can delete their own service areas" ON public.partner_service_areas
  FOR DELETE
  TO authenticated
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all partner service areas" ON public.partner_service_areas;
CREATE POLICY "Admins can manage all partner service areas" ON public.partner_service_areas
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 7. reviews Table RLS (make sure customers can insert/update reviews)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;
CREATE POLICY "Everyone can view reviews" ON public.reviews
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Customers can insert reviews for bookings" ON public.reviews;
CREATE POLICY "Customers can insert reviews for bookings" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
CREATE POLICY "Customers can update their own reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());
