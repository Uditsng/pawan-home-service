-- Category & Subcategory images (admin-controlled catalog visuals)
-- image_url stores a Supabase public bucket URL (WebP tile, typically 512x512).
-- icon_name on subcategories remains the automatic fallback when no image is set.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS image_url TEXT;