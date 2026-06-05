-- Supabase Migration: Strict RLS & Data Isolation Fixes
-- Addressed Security Vulnerabilities: Cross-Role Data Exposure, Forged Notifications

-- 1. FIX PROFILES RLS
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Add strict visibility
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow users to view profiles of their booking partners/customers
CREATE POLICY "Users can view profiles of booking partners" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.customer_id = auth.uid() AND b.partner_id = profiles.id)
         OR (b.partner_id = auth.uid() AND b.customer_id = profiles.id)
    )
  );

-- Note: Admins already have a full access policy in 20260604000000_rls_security_fixes.sql

-- 2. FIX REVIEWS RLS
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;

-- Customers can view their own reviews
CREATE POLICY "Customers can view their own reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- Partners can view reviews about themselves
CREATE POLICY "Partners can view reviews about themselves" ON public.reviews
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid());

-- 3. FIX NOTIFICATIONS INSERT POLICY
-- Drop the overly permissive policy that allowed anyone to insert anything
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- We rely entirely on the service_role key to insert notifications from server actions.
-- However, we can optionally allow users to insert their OWN notifications if needed by client components.
CREATE POLICY "Users can insert their own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
