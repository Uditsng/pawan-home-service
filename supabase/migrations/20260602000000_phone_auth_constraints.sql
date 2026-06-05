-- Migration: Phone Auth Constraints
-- Adds phone UNIQUE + email UNIQUE to profiles table for phone-based authentication.

-- 1. Ensure phone column exists (idempotent — already in schema but guard anyway)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Ensure email column exists (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Ensure updated_at column exists
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 4. Add UNIQUE constraint on phone (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_unique' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- 5. Add UNIQUE constraint on email (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_unique' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- 6. Create index on phone for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone);

-- 7. Create index on email for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
