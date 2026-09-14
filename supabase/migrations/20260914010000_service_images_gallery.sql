-- ═══════════════════════════════════════════════════════════════
-- Service Gallery — Multiple Images per Service
-- Created: 2026-09-14
--
-- `image_urls` holds the full ordered gallery of showcase images.
-- `image_url` remains the canonical COVER image (= image_urls[0]) for
-- backward compatibility: every card / thumbnail / booking / search /
-- partner surface reads `image_url` and continues to work unchanged.
-- Only the customer service-detail hero renders the carousel.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Backfill existing rows: cover image becomes the first gallery image.
UPDATE public.services
   SET image_urls = ARRAY[image_url]
 WHERE image_url IS NOT NULL
   AND btrim(image_url) <> ''
   AND (image_urls IS NULL OR cardinality(image_urls) = 0);