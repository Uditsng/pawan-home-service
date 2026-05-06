-- Add rich page content column for dynamic service landing pages
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS page_content JSONB DEFAULT '{}'::jsonb;
