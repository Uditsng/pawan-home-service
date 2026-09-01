-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Create service_interest_requests Table for Demand Analytics
-- File: 20260901000000_create_service_interest_requests.sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.service_interest_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pincode TEXT NOT NULL,
  city TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for analytics aggregation
CREATE INDEX IF NOT EXISTS idx_service_interest_pincode ON public.service_interest_requests (pincode);
CREATE INDEX IF NOT EXISTS idx_service_interest_created_at ON public.service_interest_requests (created_at DESC);

-- Enable RLS
ALTER TABLE public.service_interest_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to log interest
DROP POLICY IF EXISTS "Anyone can insert interest requests" ON public.service_interest_requests;
CREATE POLICY "Anyone can insert interest requests" ON public.service_interest_requests
  FOR INSERT WITH CHECK (true);

-- Allow admins to read all interest requests
DROP POLICY IF EXISTS "Admins can view interest requests" ON public.service_interest_requests;
CREATE POLICY "Admins can view interest requests" ON public.service_interest_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
