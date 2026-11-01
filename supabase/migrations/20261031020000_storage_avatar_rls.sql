-- ═══════════════════════════════════════════════════════════════
-- Migration: Supabase Storage RLS Policies for Avatar Bucket
-- Created: 2026-10-31
-- Purpose: Allow authenticated users to upload, update, and manage their avatar images
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure 'Avatar' storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Avatar',
  'Avatar',
  true,
  1048576, -- 1MB server-side ceiling (client compresses to ~25KB WebP)
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 2. Allow authenticated users to upload their avatar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'Avatar'
      AND (
        -- Enforces file name prefix to match current user ID
        name LIKE auth.uid()::text || '-%'
        OR name LIKE auth.uid()::text || '/%'
        OR name LIKE 'partner-' || auth.uid()::text || '-%'
      )
    );
  END IF;

  -- 3. Allow authenticated users to update/overwrite their avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users can update their avatars'
  ) THEN
    CREATE POLICY "Authenticated users can update their avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'Avatar'
      AND (
        name LIKE auth.uid()::text || '-%'
        OR name LIKE auth.uid()::text || '/%'
        OR name LIKE 'partner-' || auth.uid()::text || '-%'
      )
    )
    WITH CHECK (
      bucket_id = 'Avatar'
      AND (
        name LIKE auth.uid()::text || '-%'
        OR name LIKE auth.uid()::text || '/%'
        OR name LIKE 'partner-' || auth.uid()::text || '-%'
      )
    );
  END IF;

  -- 4. Allow public read access to avatar images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Public can view avatars'
  ) THEN
    CREATE POLICY "Public can view avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'Avatar');
  END IF;

  -- 5. Allow authenticated users to delete their avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users can delete their avatars'
  ) THEN
    CREATE POLICY "Authenticated users can delete their avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'Avatar'
      AND (
        name LIKE auth.uid()::text || '-%'
        OR name LIKE auth.uid()::text || '/%'
        OR name LIKE 'partner-' || auth.uid()::text || '-%'
      )
    );
  END IF;
END $$;
