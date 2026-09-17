-- ═══════════════════════════════════════════════════════════════
-- Notification Delivery Ledger & Schema Hardening — Milestone 1
-- Created: 2026-09-23 (apply BEFORE deploying M2/M3 code)
--
-- Sections:
--   1. notification_deliveries — per-recipient-per-device delivery ledger
--      + claim_notification_deliveries() drain RPC (FOR UPDATE SKIP LOCKED)
--   2. notification_tokens — multi-device support columns + indexes
--   3. notifications — opened_at / read_at / pinned + softened retention
--   4. admin_notifications — campaign lease + truthful delivery counters
--   5. RLS consistency — campaign tables switch to public.is_admin()
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. notification_deliveries (delivery ledger)
--    The single per-recipient-per-device audit record for push.
--    `notifications` remains the in-app source of truth; this table
--    is the honest FCM/delivery ledger layered on top of it.
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,      -- in-app row (per-event sends)
  campaign_id UUID REFERENCES public.admin_notifications(id) ON DELETE CASCADE,    -- set for broadcasts
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_id UUID REFERENCES public.notification_tokens(id) ON DELETE SET NULL,      -- one row per device token
  fcm_token TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'in_flight',
    'firebase_accepted',             -- FCM accepted into its queue  (NOT delivered/heard)
    'delivered', 'opened', 'read',   -- client-confirmed soft receipts
    'retryable',                     -- transient FCM failure, backoff pending
    'failed_permanent',
    'failed_unregistered',           -- token deleted, will never deliver
    'expired',                       -- device offline past FCM TTL
    'no_token',                      -- recipient had no registered device at send time
    'degraded'                       -- delivered in-app only (FCM unconfigured / skipped)
  )),
  fcm_error_code TEXT,
  fcm_error_msg TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Per-device exactly-once: one ledger row per (token, notification).
-- Per-recipient no-token leg: one row per (user, notification) when no device exists.
-- NOTE: a recipient with a valid token must never ALSO get a no_token row;
-- that invariant is enforced by the application sender, not the DB.
CREATE UNIQUE INDEX IF NOT EXISTS uq_nd_device
  ON public.notification_deliveries(token_id, notification_id) WHERE token_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nd_no_token
  ON public.notification_deliveries(user_id, notification_id)
  WHERE token_id IS NULL AND fcm_token IS NULL;

-- Drain cursor: queued + retryable that are due.
CREATE INDEX IF NOT EXISTS idx_nd_drain
  ON public.notification_deliveries(status, next_retry_at)
  WHERE status IN ('queued','retryable');
CREATE INDEX IF NOT EXISTS idx_nd_campaign ON public.notification_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_nd_user ON public.notification_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_nd_notification ON public.notification_deliveries(notification_id);

-- RLS: users read/update only their own rows (receipts); admins full;
-- inserts are service-role only (no user INSERT policy).
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification deliveries" ON public.notification_deliveries;
CREATE POLICY "Users can read own notification deliveries" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own delivery receipts" ON public.notification_deliveries;
CREATE POLICY "Users can update own delivery receipts" ON public.notification_deliveries
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "Admins have full access to notification_deliveries" ON public.notification_deliveries
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── claim_notification_deliveries() ───────────────────────────
-- Atomically hands a worker a batch of queued/retryable rows to process.
-- FOR UPDATE SKIP LOCKED guarantees two concurrent workers (scheduled cron
-- + inline fast-path drain) never claim the same row, so overlapping
-- dispatch is idempotent. Claims EXACTLY what it returns — no orphans.
CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(
  p_batch_size integer DEFAULT 200
)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_batch_size <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
    WITH batch AS (
      SELECT nd.id
      FROM public.notification_deliveries nd
      WHERE nd.status IN ('queued','retryable')
        AND (nd.next_retry_at IS NULL OR nd.next_retry_at <= now())
      ORDER BY nd.created_at
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.notification_deliveries nd
    SET status = 'in_flight',
        claimed_at = now(),
        updated_at = now()
    FROM batch b
    WHERE nd.id = b.id
    RETURNING nd.*;
END;
$$;

-- ── claim_notification_deliveries_for() ─────────────────────
-- Scoped variant used by the event fast-path: claims only rows
-- belonging to a specific set of notification_ids (e.g. a fresh
-- job alert) so the inline drain never races the cron worker.
CREATE OR REPLACE FUNCTION public.claim_notification_deliveries_for(
  p_notification_ids uuid[],
  p_batch_size integer DEFAULT 200
)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_batch_size <= 0 OR p_notification_ids IS NULL OR cardinality(p_notification_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
    WITH batch AS (
      SELECT nd.id
      FROM public.notification_deliveries nd
      WHERE nd.status IN ('queued','retryable')
        AND nd.notification_id = ANY(p_notification_ids)
        AND (nd.next_retry_at IS NULL OR nd.next_retry_at <= now())
      ORDER BY nd.created_at
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.notification_deliveries nd
    SET status = 'in_flight',
        claimed_at = now(),
        updated_at = now()
    FROM batch b
    WHERE nd.id = b.id
    RETURNING nd.*;
END;
$$;

-- ── reclaim_stale_notification_deliveries() ───────────────────
-- Recovers rows left `in_flight` by a worker that crashed mid-drain.
-- Called by the drain worker after every claim pass so a single stuck
-- run can never wedge the queue (delivery pipeline "not silently lost").
CREATE OR REPLACE FUNCTION public.reclaim_stale_notification_deliveries(
  p_stale_after interval default interval '10 minutes'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reclaimed integer;
BEGIN
  UPDATE public.notification_deliveries
  SET status = 'queued',
      claimed_at = NULL,
      updated_at = now()
  WHERE status = 'in_flight'
    AND claimed_at < now() - p_stale_after;

  GET DIAGNOSTICS v_reclaimed = ROW_COUNT;
  RETURN v_reclaimed;
END;
$$;

-- SECURITY: these SECURITY DEFINER functions return other users' fcm_token /
-- user_id and mutate queue state, so they must NEVER be callable by
-- `authenticated`. All server code paths (inline fast-path, /api/notifications/
-- deliver, /api/notifications/process, admin actions, diagnostics) use the
-- service-role client exclusively — grant to service_role only.
REVOKE ALL ON FUNCTION public.claim_notification_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(integer) TO service_role;

REVOKE ALL ON FUNCTION public.claim_notification_deliveries_for(uuid[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries_for(uuid[], integer) TO service_role;

REVOKE ALL ON FUNCTION public.reclaim_stale_notification_deliveries(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_stale_notification_deliveries(interval) TO service_role;

-- ───────────────────────────────────────────────────────────────
-- 2. notification_tokens — multi-device support
--    Registration keeps UNIQUE(user_id, fcm_token); the old
--    one-token-per-platform eviction is removed in M2 server code.
-- ───────────────────────────────────────────────────────────────

ALTER TABLE public.notification_tokens
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS last_token_error_at TIMESTAMPTZ;

-- user_id lookup used by sendFcmPush token resolution + registerTokenAction.
DROP INDEX IF EXISTS idx_notification_tokens_user_id;
CREATE INDEX IF NOT EXISTS idx_notification_tokens_active_user
  ON public.notification_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_error
  ON public.notification_tokens(last_token_error_at) WHERE last_token_error_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────
-- 3. notifications — open/read audit + retention hardening
--    Retention: booking-linked rows 90 days, general 30 days, pinned never.
--    (Scheduled maintenance job introduced in M7; softened trigger is the
--    safety net meanwhile.)
-- ───────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.clean_old_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE NOT pinned
    AND (
      (booking_id IS NULL     AND created_at < NOW() - INTERVAL '30 days')
      OR
      (booking_id IS NOT NULL AND created_at < NOW() - INTERVAL '90 days')
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_clean_old_notifications ON public.notifications;
CREATE TRIGGER tr_clean_old_notifications
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.clean_old_notifications();

-- ───────────────────────────────────────────────────────────────
-- 4. admin_notifications — recoverable campaigns + truthful stats
-- ───────────────────────────────────────────────────────────────

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_token_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_lease
  ON public.admin_notifications(lease_expires_at) WHERE status = 'sending';

-- ───────────────────────────────────────────────────────────────
-- 5. RLS consistency — campaign tables use public.is_admin() like
--    every other admin-gated table (matches fix_rls_recursion pattern).
-- ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins have full access to admin_notifications" ON public.admin_notifications;
CREATE POLICY "Admins have full access to admin_notifications" ON public.admin_notifications
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to notification_logs" ON public.notification_logs;
CREATE POLICY "Admins have full access to notification_logs" ON public.notification_logs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to notification_templates" ON public.notification_templates;
CREATE POLICY "Admins have full access to notification_templates" ON public.notification_templates
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));