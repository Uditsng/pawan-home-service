-- Migration to add hourly services and dynamic extensions

-- Add pricing_model to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'hourly'));

-- Create service_duration_pricing table
CREATE TABLE IF NOT EXISTS public.service_duration_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_service_duration UNIQUE (service_id, duration_minutes)
);

-- Enable RLS on service_duration_pricing
ALTER TABLE public.service_duration_pricing ENABLE ROW LEVEL SECURITY;

-- Policies for service_duration_pricing
DROP POLICY IF EXISTS "Allow public read access to service_duration_pricing" ON public.service_duration_pricing;
CREATE POLICY "Allow public read access to service_duration_pricing" ON public.service_duration_pricing
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins have full access to service_duration_pricing" ON public.service_duration_pricing;
CREATE POLICY "Admins have full access to service_duration_pricing" ON public.service_duration_pricing
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add hourly booking columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'hourly'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS selected_duration_minutes INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_price NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_price NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notified_30m_remaining BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notified_time_completed BOOLEAN DEFAULT false;

-- Create booking_extensions table
CREATE TABLE IF NOT EXISTS public.booking_extensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  requested_by_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  additional_minutes INTEGER NOT NULL,
  additional_amount NUMERIC NOT NULL,
  status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'payment_pending', 'paid', 'active', 'completed')),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on booking_extensions
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;

-- Policies for booking_extensions
DROP POLICY IF EXISTS "Users can read booking_extensions they are involved in" ON public.booking_extensions;
CREATE POLICY "Users can read booking_extensions they are involved in" ON public.booking_extensions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_id 
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Partners can insert booking_extensions for assigned jobs" ON public.booking_extensions;
CREATE POLICY "Partners can insert booking_extensions for assigned jobs" ON public.booking_extensions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_id AND b.partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Involved users and admins can update booking_extensions" ON public.booking_extensions;
CREATE POLICY "Involved users and admins can update booking_extensions" ON public.booking_extensions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_id 
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_id 
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    ) 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
