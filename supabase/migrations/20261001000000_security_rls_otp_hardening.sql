-- ═══════════════════════════════════════════════════════════════
-- Security & RLS Hardening: BUG-04 & BUG-15 Fixes (Corrected)
-- Created: 2026-10-01
--
-- Fixes:
-- 1. BUG-04: OTP Leakage and Direct Partner Update Bypass
--    - Creates public.booking_otps table isolated with strict RLS:
--        * Customers: SELECT only for their own bookings.
--        * Admins: Full access (ALL) via public.is_admin().
--        * Partners: NO access (SELECT/INSERT/UPDATE/DELETE revoked).
--          Partners verify OTPs exclusively via authenticated server actions.
--    - Strips all legacy plaintext OTPs from public.bookings.
--    - Drops unsafe BEFORE INSERT/UPDATE OTP trigger that caused FK violations.
--    - Drops "Partners can update their assigned bookings" policy on public.bookings.
-- 2. BUG-15: Elimination of Overly Permissive Client INSERT Policies
--    - Revokes direct client INSERT/UPDATE on public.booking_pricing.
--      Only trusted server actions (checkout/quote approval) and RPCs write pricing.
--    - Revokes direct client INSERT on public.booking_status_history.
--      Only trusted server actions and SECURITY DEFINER RPCs record status history.
--    - Revokes direct client INSERT on public.booking_audit_trail.
--      Only trusted server operations record immutable audit trail entries.
--    - Revokes direct client INSERT on public.booking_form_answers.
--      Checkout server action persists verified form answers server-side.
--    - Retains scoped SELECT policies for Customers, Assigned Partners, and Admins.
--    - Grants Admins full access on all 4 tables via public.is_admin().
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Create Isolated booking_otps Table ────────────────────
CREATE TABLE IF NOT EXISTS public.booking_otps (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  arrival_otp VARCHAR(6),
  arrival_otp_generated_at TIMESTAMP WITH TIME ZONE,
  arrival_otp_expires_at TIMESTAMP WITH TIME ZONE,
  completion_otp VARCHAR(6),
  completion_otp_generated_at TIMESTAMP WITH TIME ZONE,
  completion_otp_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Customers can only view OTPs for their own bookings
DROP POLICY IF EXISTS "Customers can view own booking otps" ON public.booking_otps;
CREATE POLICY "Customers can view own booking otps" ON public.booking_otps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_otps.booking_id AND b.customer_id = auth.uid()
    )
  );

-- Admins have full access to booking_otps
DROP POLICY IF EXISTS "Admins have full access to booking otps" ON public.booking_otps;
CREATE POLICY "Admins have full access to booking otps" ON public.booking_otps
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- NOTE: Partners deliberately have NO SELECT/INSERT/UPDATE policy on booking_otps.
-- Partners verify OTPs via server actions with brute-force prevention; they can never read or forge them.

-- ─── 2. Migrate Existing OTPs and Clear Plaintext from public.bookings ───
INSERT INTO public.booking_otps (
  booking_id,
  arrival_otp,
  arrival_otp_generated_at,
  arrival_otp_expires_at,
  completion_otp,
  completion_otp_generated_at,
  completion_otp_expires_at,
  created_at,
  updated_at
)
SELECT
  id,
  arrival_otp,
  arrival_otp_generated_at,
  arrival_otp_expires_at,
  completion_otp,
  completion_otp_generated_at,
  completion_otp_expires_at,
  COALESCE(created_at, now()),
  now()
FROM public.bookings
WHERE arrival_otp IS NOT NULL OR completion_otp IS NOT NULL
ON CONFLICT (booking_id) DO UPDATE SET
  arrival_otp = EXCLUDED.arrival_otp,
  arrival_otp_generated_at = EXCLUDED.arrival_otp_generated_at,
  arrival_otp_expires_at = EXCLUDED.arrival_otp_expires_at,
  completion_otp = EXCLUDED.completion_otp,
  completion_otp_generated_at = EXCLUDED.completion_otp_generated_at,
  completion_otp_expires_at = EXCLUDED.completion_otp_expires_at,
  updated_at = now();

-- Clear plaintext OTPs from public.bookings to eliminate leakage
UPDATE public.bookings
SET arrival_otp = NULL,
    completion_otp = NULL
WHERE arrival_otp IS NOT NULL OR completion_otp IS NOT NULL;

-- ─── 3. Remove Any Unsafe Triggers & Eliminate Trigger-Based Redirection ───
-- Server actions write directly to public.booking_otps.
-- The previous BEFORE INSERT trigger caused FK violations because booking_otps
-- references bookings(id) before the new bookings row exists.
DROP TRIGGER IF EXISTS tr_protect_booking_otps ON public.bookings;
DROP FUNCTION IF EXISTS public.tr_protect_booking_otps();

-- ─── 4. Drop Direct Partner UPDATE Policy on public.bookings ──
-- Partners must NOT perform direct client updates. State transitions
-- are strictly handled by authenticated, validated server actions/RPCs.
DROP POLICY IF EXISTS "Partners can update their assigned bookings" ON public.bookings;

-- ─── 5. Hardening Trusted Tables: Revoke Direct Client INSERT/UPDATE ───

-- A. booking_pricing (Authoritative Financial Data)
-- Client INSERT and UPDATE are completely removed.
DROP POLICY IF EXISTS "Users can insert booking_pricing" ON public.booking_pricing;
DROP POLICY IF EXISTS "Users can update booking_pricing" ON public.booking_pricing;

-- Preserve SELECT for Customer and Assigned Partner
DROP POLICY IF EXISTS "Users can select own booking_pricing" ON public.booking_pricing;
CREATE POLICY "Users can select own booking_pricing" ON public.booking_pricing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_pricing.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) OR public.is_admin(auth.uid())
  );

-- Admins retain full access
DROP POLICY IF EXISTS "Admins have full access to booking_pricing" ON public.booking_pricing;
CREATE POLICY "Admins have full access to booking_pricing" ON public.booking_pricing
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- B. booking_status_history (Authoritative Operational Lifecycle)
-- Client INSERT is completely removed.
DROP POLICY IF EXISTS "Users can insert booking_status_history" ON public.booking_status_history;

-- Preserve SELECT for Customer and Assigned Partner
DROP POLICY IF EXISTS "Users can select own booking_status_history" ON public.booking_status_history;
CREATE POLICY "Users can select own booking_status_history" ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_status_history.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) OR public.is_admin(auth.uid())
  );

-- Admins retain full access
DROP POLICY IF EXISTS "Admins have full access to booking_status_history" ON public.booking_status_history;
CREATE POLICY "Admins have full access to booking_status_history" ON public.booking_status_history
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- C. booking_audit_trail (Immutable Audit Trail)
-- Client INSERT is completely removed.
DROP POLICY IF EXISTS "Users can insert audit trail entries" ON public.booking_audit_trail;

-- Preserve SELECT for Customer and Assigned Partner
DROP POLICY IF EXISTS "Customers can view their bookings audit trail" ON public.booking_audit_trail;
DROP POLICY IF EXISTS "Partners can view their bookings audit trail" ON public.booking_audit_trail;
DROP POLICY IF EXISTS "Users can select own booking_audit_trail" ON public.booking_audit_trail;
CREATE POLICY "Users can select own booking_audit_trail" ON public.booking_audit_trail
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_audit_trail.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) OR public.is_admin(auth.uid())
  );

-- Admins retain full access
DROP POLICY IF EXISTS "Admins have full access to booking_audit_trail" ON public.booking_audit_trail;
CREATE POLICY "Admins have full access to booking_audit_trail" ON public.booking_audit_trail
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- D. booking_form_answers (Verified Checkout Form Answers)
-- Client INSERT is completely removed.
DROP POLICY IF EXISTS "Users can insert booking_form_answers" ON public.booking_form_answers;

-- Preserve SELECT for Customer and Assigned Partner
DROP POLICY IF EXISTS "Users can select own booking_form_answers" ON public.booking_form_answers;
CREATE POLICY "Users can select own booking_form_answers" ON public.booking_form_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_form_answers.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) OR public.is_admin(auth.uid())
  );

-- Admins retain full access
DROP POLICY IF EXISTS "Admins have full access to booking_form_answers" ON public.booking_form_answers;
CREATE POLICY "Admins have full access to booking_form_answers" ON public.booking_form_answers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
