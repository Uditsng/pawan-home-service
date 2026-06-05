-- Migration to create platform_settings and tickets tables for Admin Portal

-- 1. Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO platform_settings (key, value)
VALUES 
  ('tax_rate', '"18%"'::jsonb),
  ('free_cancellation_window', '"2 Hours"'::jsonb),
  ('partner_penalty_rate', '"10%"'::jsonb),
  ('service_areas', '["Roorkee", "Chandigarh", "Dehradun", "Haridwar"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Row-Level Security (RLS) policies for Admin Portal operations

-- Enable RLS on bookings (if not already enabled)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow admins to perform all actions (insert, select, update, delete) on bookings table
DROP POLICY IF EXISTS "Admins have full access to bookings" ON bookings;
CREATE POLICY "Admins have full access to bookings" ON bookings
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Enable RLS and add policies for tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to tickets" ON tickets;
CREATE POLICY "Admins have full access to tickets" ON tickets
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Users can read their own tickets" ON tickets;
CREATE POLICY "Users can read their own tickets" ON tickets
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR partner_id = auth.uid());

-- Enable RLS and add policies for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to platform_settings" ON platform_settings;
CREATE POLICY "Admins have full access to platform_settings" ON platform_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Anyone can read platform_settings" ON platform_settings;
CREATE POLICY "Anyone can read platform_settings" ON platform_settings
  FOR SELECT
  TO public
  USING (true);

-- Enable RLS and add policies for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to reviews" ON reviews;
CREATE POLICY "Admins have full access to reviews" ON reviews
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Enable RLS and add policies for booking_events
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to booking_events" ON booking_events;
CREATE POLICY "Admins have full access to booking_events" ON booking_events
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Enable RLS and add policies for booking_rejections
ALTER TABLE booking_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to booking_rejections" ON booking_rejections;
CREATE POLICY "Admins have full access to booking_rejections" ON booking_rejections
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
