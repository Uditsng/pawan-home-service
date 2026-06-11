-- ═══════════════════════════════════════════════════════════════
-- Notifications & OTP Verification System Migration
-- Created: 2026-06-09
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter notifications Table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to populate message with body
UPDATE public.notifications SET message = body WHERE message IS NULL;

-- 2. Alter bookings Table with OTP Columns & Status Constraints
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrival_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS arrival_otp_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS arrival_otp_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS arrival_otp_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arrival_otp_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completion_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS completion_otp_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completion_otp_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completion_otp_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_otp_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS failed_otp_attempts INTEGER DEFAULT 0;

-- Drop existing status check if it exists
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add updated status check constraint supporting the 10 workflow lifecycle states
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN (
    'pending', 'confirmed', 'assigned', 'professional_en_route', 'professional_arrived',
    'otp_pending', 'in_progress', 'completed', 'cancelled', 'refunded',
    'PENDING', 'CONFIRMED', 'ASSIGNED', 'PROFESSIONAL_EN_ROUTE', 'PROFESSIONAL_ARRIVED',
    'OTP_PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'
  ));

-- 3. Create device_tokens Table
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, device_token)
);

-- Enable RLS on device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own device tokens" ON public.device_tokens;
CREATE POLICY "Users can read own device tokens" ON public.device_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.device_tokens;
CREATE POLICY "Users can insert own device tokens" ON public.device_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own device tokens" ON public.device_tokens;
CREATE POLICY "Users can update own device tokens" ON public.device_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.device_tokens;
CREATE POLICY "Users can delete own device tokens" ON public.device_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to device tokens" ON public.device_tokens;
CREATE POLICY "Admins have full access to device tokens" ON public.device_tokens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 4. Create booking_audit_trail Table
CREATE TABLE IF NOT EXISTS public.booking_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on booking_audit_trail
ALTER TABLE public.booking_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their bookings audit trail" ON public.booking_audit_trail;
CREATE POLICY "Customers can view their bookings audit trail" ON public.booking_audit_trail
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.customer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Partners can view their bookings audit trail" ON public.booking_audit_trail;
CREATE POLICY "Partners can view their bookings audit trail" ON public.booking_audit_trail
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.partner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert audit trail entries" ON public.booking_audit_trail;
CREATE POLICY "Users can insert audit trail entries" ON public.booking_audit_trail
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins have full access to audit trail" ON public.booking_audit_trail;
CREATE POLICY "Admins have full access to audit trail" ON public.booking_audit_trail
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
