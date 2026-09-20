-- ═══════════════════════════════════════════════════════════════
-- Home Banners — Admin-Managed Customer Dashboard Carousel
-- Created: 2026-09-27
--
-- Purpose:
--   Replaces the hardcoded carousel banner array in the customer
--   dashboard with an admin-managed table. Banners are displayed on
--   the customer dashboard (and potentially landing page later) in
--   `sort_order` position. Each banner carries:
--     * `title`    — hover/alt text (required)
--     * `image_url`— public image URL. Admins upload a cropped,
--                     fixed-dimension WebP to the public `services`
--                     storage bucket via the SAME compression pipeline
--                     used by the admin Service create page
--                     (ImageUploadField + ImageCropper). Upload-only.
--     * `link_url` — CUSTOM link target the banner opens on click.
--                     Accepts an internal route (`/customer/...`) or an
--                     external URL (`https://...`). Free-form for admin.
--     * `is_active` — controls visibility on the customer dashboard.
--     * `sort_order`— display ordering (ascending).
--
-- Security invariants:
--   * Public (anon + authenticated) can only SELECT `is_active = true`
--     banners — drafts/inactive are invisible to users.
--   * INSERT/UPDATE/DELETE require `public.is_admin(auth.uid())`.
--   * The `services` storage bucket already has public-read + auth
--     upload policies, so banner uploads under `banners/` need no new
--     storage migration.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. HOME_BANNERS — the carousel content ───────────────────
CREATE TABLE IF NOT EXISTS public.home_banners (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  image_url   TEXT NOT NULL CHECK (length(btrim(image_url)) > 0),
  link_url    TEXT NOT NULL DEFAULT ''
                CHECK (link_url = '' OR link_url LIKE '/%' OR link_url LIKE 'http://%' OR link_url LIKE 'https://%'),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_active_order
  ON public.home_banners (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_home_banners_created
  ON public.home_banners (created_at DESC);

-- ─── 2. RLS ──────────────────────────────────────────────────
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

-- Public read: only active (visible-on-dashboard) banners.
DROP POLICY IF EXISTS "Active home banners are viewable by everyone" ON public.home_banners;
CREATE POLICY "Active home banners are viewable by everyone" ON public.home_banners
  FOR SELECT TO public
  USING (is_active = true);

-- Admins manage the full catalog (including drafts/inactive).
DROP POLICY IF EXISTS "Admins have full access on home banners" ON public.home_banners;
CREATE POLICY "Admins have full access on home banners" ON public.home_banners
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 3. SEED — preserve the current hardcoded carousel ───────
-- The customer dashboard currently renders these 5 static `/assets`
-- images. Seed them as active rows so the dashboard looks identical
-- after deployment and admins can edit/swap them from day one.
INSERT INTO public.home_banners (title, image_url, link_url, is_active, sort_order)
VALUES
  ('PHS Cleaning Company - Premium Home Services', '/assets/PHS Banner 1.jpeg', '/customer/services/cleaning', true, 1),
  ('PHS Cleaning Company - Safe & Effective Pest Control', '/assets/PHS Banner 2.jpeg', '/customer/services/pest-control-services', true, 2),
  ('PHS Cleaning Company - Premium Housekeeping & Cleaning', '/assets/PHS Banner 3.jpeg', '/customer/services/house-keeping', true, 3),
  ('PHS Cleaning Company - Expert Maintenance & Repair', '/assets/PHS Banner 4.jpeg', '/services', true, 4),
  ('PHS Cleaning Company - Comprehensive Home Solutions', '/assets/PHS Banner 5.jpeg', '/services', true, 5)
ON CONFLICT (id) DO NOTHING;