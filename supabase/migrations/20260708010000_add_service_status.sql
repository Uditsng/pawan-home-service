-- Migration: Add service status column using ENUM type
-- Target: public.services

-- 1. Create the service_status enum type if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
    CREATE TYPE public.service_status AS ENUM ('draft', 'published');
  END IF;
END
$$;

-- 2. Add the status column to the services table using the custom ENUM type.
-- We use DEFAULT 'published' to ensure backward compatibility for all existing services.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS status public.service_status DEFAULT 'published'::public.service_status NOT NULL;

-- 3. Recreate the SELECT policy to restrict non-admin access to published services.
-- Admins will still have full access through the permissive "Admins have full access to services" policy.
DROP POLICY IF EXISTS "Allow public read access to services" ON public.services;

CREATE POLICY "Allow public read access to services" ON public.services
  FOR SELECT TO public USING (status = 'published');
