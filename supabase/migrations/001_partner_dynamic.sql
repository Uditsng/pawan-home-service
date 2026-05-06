-- ============================================================
-- MIGRATION: Dynamic Partner Portal
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1A. ALTER bookings — Add timestamp tracking columns
-- These columns track the lifecycle of each booking through the state machine.
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('USER', 'PARTNER', 'SYSTEM')),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 1B. ALTER profiles — Add partner metric cached fields
-- These are event-driven aggregates, updated on write, NEVER recomputed on every request.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rating_avg FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_offered_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_accepted_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_cancelled_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_rate FLOAT DEFAULT 0;

-- 1C. CREATE reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1D. CREATE job_offers table
CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  offered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1E. CREATE job_declines table
CREATE TABLE IF NOT EXISTS job_declines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1F. CREATE booking_events table (audit trail)
CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT CHECK (actor IN ('USER', 'PARTNER', 'SYSTEM')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 1G. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_declines ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Reviews: customers can insert reviews for their bookings, partners can read their own
CREATE POLICY "Customers can insert reviews" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Partners can read their reviews" ON reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = partner_id OR auth.uid() = customer_id);

-- Job Offers: system inserts, partners can read their own
CREATE POLICY "Partners can read their job offers" ON job_offers
  FOR SELECT TO authenticated
  USING (auth.uid() = partner_id);

CREATE POLICY "Authenticated can insert job offers" ON job_offers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Job Declines: partners can insert their own declines
CREATE POLICY "Partners can insert their declines" ON job_declines
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Partners can read their declines" ON job_declines
  FOR SELECT TO authenticated
  USING (auth.uid() = partner_id);

-- Booking Events: readable by booking participants
CREATE POLICY "Users can read booking events" ON booking_events
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert booking events" ON booking_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Bookings: Ensure partners can read pending (available) bookings and their own assigned bookings
-- (If not already existing — check your current RLS policies)
DO $$
BEGIN
  -- Partners can read bookings assigned to them OR pending/available ones
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Partners can read available and own bookings'
  ) THEN
    CREATE POLICY "Partners can read available and own bookings" ON bookings
      FOR SELECT TO authenticated
      USING (
        customer_id = auth.uid() 
        OR partner_id = auth.uid() 
        OR (partner_id IS NULL AND status = 'pending')
      );
  END IF;
END $$;

-- Partners can update bookings they are assigned to (for status transitions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Partners can update assigned bookings'
  ) THEN
    CREATE POLICY "Partners can update assigned bookings" ON bookings
      FOR UPDATE TO authenticated
      USING (partner_id = auth.uid() OR (partner_id IS NULL AND status = 'pending'))
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- DONE. Verify by running:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ============================================================
