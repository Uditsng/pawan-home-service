-- Migration to enable Row Level Security on subcategories table and configure policies

-- 1. Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 2. Allow public/authenticated read access (everyone can view subcategories)
DROP POLICY IF EXISTS "Allow public read access to subcategories" ON public.subcategories;
CREATE POLICY "Allow public read access to subcategories"
ON public.subcategories
FOR SELECT
TO public
USING (true);

-- 3. Restrict write/edit access to admin profiles
DROP POLICY IF EXISTS "Allow admins to write subcategories" ON public.subcategories;
CREATE POLICY "Allow admins to write subcategories"
ON public.subcategories
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));
