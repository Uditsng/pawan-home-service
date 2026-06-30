-- ═══════════════════════════════════════════════════════════════
-- Notifications Security & Realtime Migration
-- Created: 2026-06-30
-- Purpose: Implement server-side idempotency, RLS security lockdown,
--          and enable Supabase Realtime for instant updates.
-- ═══════════════════════════════════════════════════════════════

-- 1. Add unique dedup_key column to public.notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS dedup_key TEXT UNIQUE;

-- Create an index on the dedup_key for quick validation
CREATE INDEX IF NOT EXISTS idx_notifications_dedup_key 
  ON public.notifications(dedup_key);

-- 2. Drop the insecure client-side insert policy
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- 3. Enable Supabase Realtime replication on the notifications table
-- This enables the client to receive Postgres Change events in real time.
-- We check if the table is already in the publication first (via exception block/standard sql).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
