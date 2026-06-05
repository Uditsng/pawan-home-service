-- ═══════════════════════════════════════════════════════════════
-- Push Notifications Migration
-- Created: 2026-06-03
-- Purpose: Create notifications & notification_tokens tables
--          with RLS policies and performance indexes.
-- ═══════════════════════════════════════════════════════════════

-- ─── NOTIFICATIONS TABLE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ─── NOTIFICATION_TOKENS TABLE ──────────────────────────────

CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, fcm_token)
);

-- ─── INDEXES: notifications ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);

-- ─── INDEXES: notification_tokens ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id
  ON notification_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_token
  ON notification_tokens (fcm_token);

-- ─── RLS: notifications ─────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can insert notifications (for server actions triggering
-- notifications for other users under their session when service role is unavailable)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;
CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins have full access to notifications
DROP POLICY IF EXISTS "Admins have full access to notifications" ON notifications;
CREATE POLICY "Admins have full access to notifications" ON notifications
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ─── RLS: notification_tokens ───────────────────────────────

ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can read own tokens" ON notification_tokens;
CREATE POLICY "Users can read own tokens" ON notification_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tokens" ON notification_tokens;
CREATE POLICY "Users can insert own tokens" ON notification_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tokens" ON notification_tokens;
CREATE POLICY "Users can update own tokens" ON notification_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own tokens" ON notification_tokens;
CREATE POLICY "Users can delete own tokens" ON notification_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins have full access to notification_tokens
DROP POLICY IF EXISTS "Admins have full access to notification_tokens" ON notification_tokens;
CREATE POLICY "Admins have full access to notification_tokens" ON notification_tokens
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
