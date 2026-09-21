-- ============================================================
-- Partner Documents Normalized System
-- Migration: 20260929000000_partner_documents_normalized.sql
-- Runtime dependency — apply BEFORE deploying code.
-- ============================================================

-- 1. New table: partner_documents
CREATE TABLE IF NOT EXISTS public.partner_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type         TEXT NOT NULL CHECK (doc_type IN (
    'aadhaar_front','aadhaar_back','pan','dl','selfie','address_proof','police_verification'
  )),
  file_url         TEXT,
  storage_path     TEXT,
  status           TEXT NOT NULL DEFAULT 'missing'
    CHECK (status IN (
      'missing','pending','approved','rejected','resubmit_required','deferred','expired'
    )),
  rejection_reason TEXT,
  uploaded_at      TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES public.profiles(id),
  due_at           TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON public.partner_documents (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_due ON public.partner_documents (status, due_at)
  WHERE doc_type = 'police_verification';

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_partner_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_partner_documents_updated_at ON public.partner_documents;
CREATE TRIGGER tr_partner_documents_updated_at
  BEFORE UPDATE ON public.partner_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_partner_documents_updated_at();

-- 2. Backfill from kyc_documents JSONB
--    Existing 'aadhaar_url' becomes 'aadhaar_front'; 'aadhaar_back' rows created as missing for approved partners.
INSERT INTO public.partner_documents
  (partner_id, doc_type, file_url, storage_path, status, uploaded_at)
SELECT
  p.id,
  m.doc_type,
  m.url,
  CASE
    WHEN m.url IS NULL OR m.url = '' THEN NULL
    ELSE nullif(regexp_replace(m.url, '^.*/partner-docs/', ''), '')
  END AS storage_path,
  CASE
    WHEN p.kyc_status = 'approved' AND m.url IS NOT NULL AND m.url <> '' THEN 'approved'
    WHEN p.kyc_status = 'pending' AND m.url IS NOT NULL AND m.url <> '' THEN 'pending'
    ELSE 'missing'
  END,
  CASE WHEN m.url IS NOT NULL AND m.url <> '' THEN now() ELSE NULL END
FROM public.profiles p
CROSS JOIN LATERAL (VALUES
  ('aadhaar_front',           p.kyc_documents ->> 'aadhaar_url'),
  ('aadhaar_back',            p.kyc_documents ->> 'aadhaar_back_url'),
  ('pan',                     p.kyc_documents ->> 'pan_url'),
  ('dl',                      p.kyc_documents ->> 'dl_url'),
  ('selfie',                  p.kyc_documents ->> 'selfie_url'),
  ('address_proof',           p.kyc_documents ->> 'address_proof_url'),
  ('police_verification',     p.kyc_documents ->> 'police_verification_url')
) AS m(doc_type, url)
WHERE p.role = 'partner'
  AND p.kyc_documents IS NOT NULL
ON CONFLICT (partner_id, doc_type) DO NOTHING;

-- Create 'missing' aadhaar_back rows for approved partners who already have aadhaar_front
INSERT INTO public.partner_documents (partner_id, doc_type, status)
SELECT pd.partner_id, 'aadhaar_back', 'missing'
FROM public.partner_documents pd
WHERE pd.doc_type = 'aadhaar_front'
  AND pd.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_documents pd2
    WHERE pd2.partner_id = pd.partner_id AND pd2.doc_type = 'aadhaar_back'
  )
ON CONFLICT (partner_id, doc_type) DO NOTHING;

-- Create 'deferred' police rows for approved partners who don't have police
INSERT INTO public.partner_documents (partner_id, doc_type, status, due_at)
SELECT
  pd.partner_id,
  'police_verification',
  'deferred',
  now() + COALESCE(
    (SELECT (value #>> '{}' || ' days')::interval FROM public.platform_settings WHERE key = 'police_verification_due_days'),
    interval '30 days'
  )
FROM public.partner_documents pd
JOIN public.profiles p ON p.id = pd.partner_id
WHERE pd.doc_type = 'aadhaar_front'
  AND pd.status = 'approved'
  AND p.kyc_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_documents pd2
    WHERE pd2.partner_id = pd.partner_id AND pd2.doc_type = 'police_verification'
  )
ON CONFLICT (partner_id, doc_type) DO NOTHING;

-- 3. DB CHECK constraints (NOT VALID first for zero-downtime, then VALIDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_kyc_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_kyc_status
      CHECK (kyc_status IN ('draft','action_required','pending','approved','rejected')) NOT VALID;
    ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_kyc_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_status
      CHECK (status IN ('active','pending','offline','busy','suspended','blocked')) NOT VALID;
    ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_status;
  END IF;
END $$;

-- 4. platform_settings default for police deadline
INSERT INTO public.platform_settings (key, value)
VALUES ('police_verification_due_days', '30')
ON CONFLICT (key) DO NOTHING;

-- 5. Private bucket + storage RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner-docs', 'partner-docs', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id)
  DO UPDATE SET public = false,
                file_size_limit = 10485760,
                allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];

-- Owner can INSERT (own folder only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'partner_docs_insert_own'
  ) THEN
    CREATE POLICY "partner_docs_insert_own"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'partner-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Owner + admin can SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'partner_docs_select_owner_admin'
  ) THEN
    CREATE POLICY "partner_docs_select_owner_admin"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'partner-docs'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin(auth.uid())
        )
      );
  END IF;
END $$;

-- Admin can DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'partner_docs_delete_admin'
  ) THEN
    CREATE POLICY "partner_docs_delete_admin"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'partner-docs' AND public.is_admin(auth.uid()));
  END IF;
END $$;

-- 6. partner_documents RLS
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pd_select_own_or_admin'
  ) THEN
    CREATE POLICY "pd_select_own_or_admin"
      ON public.partner_documents FOR SELECT
      TO authenticated
      USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- All writes via server actions using admin client (bypasses RLS).

-- 7. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'partner_documents'
      AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_documents;
  END IF;
END $$;
