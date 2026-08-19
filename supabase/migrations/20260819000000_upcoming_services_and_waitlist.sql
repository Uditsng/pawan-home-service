-- ═══════════════════════════════════════════════════════════════
-- Upcoming Services & Waitlist
-- Created: 2026-08-19
-- Purpose:
--   * Support admin-created "Coming Soon" teaser services (poster +
--     tagline) using the 'upcoming' status value.
--   * Add a poster_url column (9:16 portrait poster) to services.
--   * Allow anonymous + authenticated users to read upcoming services so
--     they appear on public & customer-facing pages.
--   * Create service_waitlist for customers to express interest, plus an
--     anon-safe count RPC for public "X people are interested" badges.
-- NOTE: The 'upcoming' enum value itself is added by the EARLIER
--   migration 20260818000000_add_service_status_upcoming.sql so it is
--   committed before this file references it (Postgres error 55P04).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Poster column on services ──────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- ─── 2. Public read policy includes upcoming services ──────────
DROP POLICY IF EXISTS "Allow public read access to services" ON public.services;

CREATE POLICY "Allow public read access to services" ON public.services
  FOR SELECT TO public USING (status IN ('published', 'upcoming'));

-- ─── 3. service_waitlist table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_waitlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_waitlist_service_user UNIQUE (service_id, user_id)
);

CREATE INDEX IF NOT EXISTS service_waitlist_service_idx ON public.service_waitlist (service_id);
CREATE INDEX IF NOT EXISTS service_waitlist_user_idx ON public.service_waitlist (user_id);

ALTER TABLE public.service_waitlist ENABLE ROW LEVEL SECURITY;

-- Users may only manage their own waitlist entries.
CREATE POLICY "users manage own waitlist" ON public.service_waitlist
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins get full access (read all counts + member details).
CREATE POLICY "admin full access on waitlist" ON public.service_waitlist
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 4. Anon-safe waitlist count RPC ───────────────────────────
-- RLS would otherwise hide other users' rows, so a security-definer
-- count function is used for public "X people are interested" badges.
CREATE OR REPLACE FUNCTION public.get_service_waitlist_count(p_service_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT count(*)::BIGINT
      FROM public.service_waitlist
     WHERE service_id = p_service_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_service_waitlist_count(UUID) TO anon, authenticated;