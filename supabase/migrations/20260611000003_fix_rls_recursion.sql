-- Migration: Fix Infinite Recursion in Row Level Security (RLS) Policies
-- Created: 2026-06-11
-- Description: Redefines the public.is_admin() helper function to query auth.users (which does not trigger profiles RLS)
-- and updates all inline profile role checks across various tables to call public.is_admin() instead of querying profiles directly.

-- 1. Redefine is_admin function to query auth.users instead of public.profiles
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Update Bookings policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Admins have full access to bookings" ON public.bookings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Update Disputes policies
DROP POLICY IF EXISTS "Involved parties can view disputes" ON public.disputes;
CREATE POLICY "Involved parties can view disputes" ON public.disputes
  FOR SELECT TO authenticated USING ((auth.uid() = customer_id) OR (auth.uid() = partner_id) OR (public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- 4. Update Categories policies
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. Update Tickets policies
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.tickets;
CREATE POLICY "Admins have full access to tickets" ON public.tickets
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. Update Platform Settings policies
DROP POLICY IF EXISTS "Admins have full access to platform_settings" ON public.platform_settings;
CREATE POLICY "Admins have full access to platform_settings" ON public.platform_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 7. Update Reviews policies
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
CREATE POLICY "Admins have full access to reviews" ON public.reviews
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 8. Update Booking Events policies
DROP POLICY IF EXISTS "Admins have full access to booking_events" ON public.booking_events;
CREATE POLICY "Admins have full access to booking_events" ON public.booking_events
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 9. Update Booking Rejections policies
DROP POLICY IF EXISTS "Admins have full access to booking_rejections" ON public.booking_rejections;
CREATE POLICY "Admins have full access to booking_rejections" ON public.booking_rejections
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 10. Update Services policies
DROP POLICY IF EXISTS "Admins have full access to services" ON public.services;
CREATE POLICY "Admins have full access to services" ON public.services
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 11. Update Subcategories policies
DROP POLICY IF EXISTS "Allow admins to write subcategories" ON public.subcategories;
CREATE POLICY "Allow admins to write subcategories" ON public.subcategories
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 12. Update Notifications policies
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.notifications;
CREATE POLICY "Admins have full access to notifications" ON public.notifications
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 13. Update Notification Tokens policies
DROP POLICY IF EXISTS "Admins have full access to notification_tokens" ON public.notification_tokens;
CREATE POLICY "Admins have full access to notification_tokens" ON public.notification_tokens
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 14. Update Rate Limits policies
DROP POLICY IF EXISTS "Admins have full access to rate_limits" ON public.rate_limits;
CREATE POLICY "Admins have full access to rate_limits" ON public.rate_limits
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 15. Update Device Tokens policies
DROP POLICY IF EXISTS "Admins have full access to device tokens" ON public.device_tokens;
CREATE POLICY "Admins have full access to device tokens" ON public.device_tokens
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 16. Update Booking Audit Trail policies
DROP POLICY IF EXISTS "Admins have full access to audit trail" ON public.booking_audit_trail;
CREATE POLICY "Admins have full access to audit trail" ON public.booking_audit_trail
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 17. Update Orders policies
DROP POLICY IF EXISTS "Admins full access to orders" ON public.orders;
CREATE POLICY "Admins full access to orders" ON public.orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
