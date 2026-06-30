-- ═══════════════════════════════════════════════════════════════
-- Notification Management System Migration
-- Created: 2026-06-30
-- Purpose: Add admin_notifications, notification_logs, and
--          notification_templates tables with RLS and indexes.
-- ═══════════════════════════════════════════════════════════════

-- 1. admin_notifications Table (Campaign/Broadcast metadata)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL, -- promotional, offers, discounts, festival, reminder, booking_update, payment, announcement, emergency, custom
  priority TEXT NOT NULL DEFAULT 'normal', -- normal, high
  audience_type TEXT NOT NULL, -- all, customers, partners, admins, selected
  audience_filters JSONB DEFAULT '{}'::jsonb, -- e.g., { "userIds": [...] }
  deep_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, failed, cancelled, archived
  scheduled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0 NOT NULL,
  success_count INTEGER DEFAULT 0 NOT NULL,
  failure_count INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. notification_logs Table (Delivery logs for each targeted user)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_token TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, failed, opened, clicked
  failure_reason TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- 3. notification_templates Table (Reusable message templates)
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  deep_link TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON public.admin_notifications(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_scheduled ON public.admin_notifications(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_admin_notifications_deleted ON public.admin_notifications(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_notif_id ON public.notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON public.notification_templates(created_by);

-- ─── ROW LEVEL SECURITY (RLS) ───────────────────────────────

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins have full access to admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins have full access to notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Admins have full access to notification_templates" ON public.notification_templates;

-- Create policies (only role = 'admin' profiles can do anything)
CREATE POLICY "Admins have full access to admin_notifications" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins have full access to notification_logs" ON public.notification_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins have full access to notification_templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
