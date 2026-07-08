-- ═══════════════════════════════════════════════════════════════
-- Fix Notifications and Enable Realtime Tables
-- Created: 2026-07-08
-- Purpose: Add delivery_status column to notifications table and
--          register bookings, booking_job_offers, and profiles in realtime.
-- ═══════════════════════════════════════════════════════════════

-- 1. Add delivery_status column to notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'created';

-- 2. Add index for delivery status querying
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status 
  ON public.notifications(delivery_status);

-- 3. Register required tables in the Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'booking_job_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_job_offers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
