-- ═══════════════════════════════════════════════════════════════
-- BUG-05: Fix Admin Notifications Delivery Across Unprivileged Sessions
-- Created: 2026-10-03
-- Purpose:
--   1. Provide SECURITY DEFINER public.get_active_admin_ids() so
--      caller sessions (customers, partners, unprivileged clients)
--      can resolve active administrator recipient IDs without
--      falling victim to strict profiles RLS isolation (0 rows).
--   2. Provide public.notify_admins(...) SECURITY DEFINER RPC to
--      atomically enqueue operational alerts directly to all active
--      admins from any caller or SQL trigger.
--   3. Add RLS policy on public.notifications permitting authenticated
--      sessions to insert operational alerts specifically targeted at
--      verified admins (public.is_admin(user_id) AND role = 'admin').
-- ═══════════════════════════════════════════════════════════════

-- 1. Helper Function: Get Active Admin IDs (SECURITY DEFINER)
-- Bypasses profiles RLS so non-admin callers can resolve recipient UUIDs.
CREATE OR REPLACE FUNCTION public.get_active_admin_ids()
RETURNS TABLE (admin_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM public.profiles p
  WHERE p.role = 'admin'
    AND COALESCE(p.status, 'active') NOT IN ('suspended', 'inactive', 'banned');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_admin_ids() TO authenticated, anon, service_role;

-- 2. RLS Policy: Allow Authenticated Users to Insert Admin Operational Alerts
-- Prevents RLS violation when customers or partners notify platform admins.
-- Enforces strictly that the target user_id is an active administrator.
DROP POLICY IF EXISTS "Users can insert admin notifications" ON public.notifications;
CREATE POLICY "Users can insert admin notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(user_id) AND role = 'admin'
  );

-- 3. Stored Procedure: notify_admins RPC (SECURITY DEFINER)
-- Broadcasts an operational alert to all active admins atomically and idempotently.
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_notif public.notifications%ROWTYPE;
  v_booking_id UUID;
  v_dedup_key TEXT;
  v_time_bucket BIGINT;
BEGIN
  -- Extract booking_id if present in metadata and verify existence to avoid FK violation
  IF p_metadata ? 'booking_id' AND (p_metadata->>'booking_id') IS NOT NULL THEN
    BEGIN
      SELECT b.id INTO v_booking_id
      FROM public.bookings b
      WHERE b.id = (p_metadata->>'booking_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_booking_id := NULL;
    END;
  END IF;

  v_time_bucket := FLOOR(EXTRACT(EPOCH FROM NOW()) / 300); -- 5-minute deduplication bucket

  FOR v_admin_id IN 
    SELECT a.admin_id FROM public.get_active_admin_ids() a
  LOOP
    v_dedup_key := COALESCE(v_booking_id::TEXT, 'global') || ':' || v_admin_id::TEXT || ':' || p_type || ':1:' || v_time_bucket::TEXT;

    INSERT INTO public.notifications (
      user_id,
      title,
      body,
      message,
      type,
      metadata,
      booking_id,
      role,
      is_read,
      dedup_key,
      delivery_status
    ) VALUES (
      v_admin_id,
      p_title,
      p_body,
      p_body,
      p_type,
      p_metadata,
      v_booking_id,
      'admin',
      false,
      v_dedup_key,
      'created'
    )
    ON CONFLICT (dedup_key) DO UPDATE
      SET title = EXCLUDED.title,
          body = EXCLUDED.body,
          message = EXCLUDED.message,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
    RETURNING * INTO v_notif;

    IF v_notif.id IS NOT NULL THEN
      RETURN NEXT v_notif;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;
