-- ═══════════════════════════════════════════════════════════════
-- Fix: Supabase Storage RLS Policies for Service & Review Uploads
-- Created: 2026-07-27
-- Purpose: Allow authenticated customers to upload review photos to storage.objects bucket 'services'
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure 'services' storage bucket exists and is set to public
INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload review photos into 'services' bucket under 'reviews/' path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users upload review images'
  ) THEN
    CREATE POLICY "Authenticated users upload review images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'services');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users update review images'
  ) THEN
    CREATE POLICY "Authenticated users update review images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'services')
    WITH CHECK (bucket_id = 'services');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Public access to service and review images'
  ) THEN
    CREATE POLICY "Public access to service and review images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'services');
  END IF;
END $$;
