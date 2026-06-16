-- ═══════════════════════════════════════════════════════════════
-- Auto Delete Old Notifications Migration
-- Created: 2026-06-15
-- Purpose: Automatically clean up notifications older than 2 days.
-- ═══════════════════════════════════════════════════════════════

-- 1. Create or Replace Trigger Function
CREATE OR REPLACE FUNCTION public.clean_old_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete notifications older than 2 days
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '2 days';
  
  RETURN NEW;
END;
$$;

-- 2. Bind trigger to notifications table
-- Using a STATEMENT trigger rather than ROW trigger so it runs once per insert statement/batch.
DROP TRIGGER IF EXISTS tr_clean_old_notifications ON public.notifications;
CREATE TRIGGER tr_clean_old_notifications
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.clean_old_notifications();
