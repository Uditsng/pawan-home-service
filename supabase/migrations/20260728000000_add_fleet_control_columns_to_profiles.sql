-- Migration: Add Fleet Control / Compliance Columns to Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_tier TEXT DEFAULT 'standard';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_documents JSONB;
