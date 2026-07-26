-- ═══════════════════════════════════════════════════════════════
-- Fix: Invoices RLS Policy — Use is_admin() helper
-- Created: 2026-07-22
-- Root Cause: The invoices table RLS policy used a direct 
--   subquery on public.profiles which can cause recursion.
--   All other admin-level policies were migrated to use
--   public.is_admin(auth.uid()) in a prior fix migration,
--   but invoices was created afterward and missed the update.
-- ═══════════════════════════════════════════════════════════════

-- Drop the old policy that queries profiles directly
DROP POLICY IF EXISTS "Admins have full access to invoices" ON public.invoices;

-- Recreate using the non-recursive is_admin() helper
CREATE POLICY "Admins have full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
