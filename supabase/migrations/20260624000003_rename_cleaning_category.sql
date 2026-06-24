-- SQL Migration to update categories, subcategories, and service relationships for the new House Keeping category
-- Name: 20260624000003_rename_cleaning_category.sql

-- 1. Ensure 'Cleaning' category has the proper name and UUID
INSERT INTO public.categories (id, category_name)
VALUES ('06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid, 'Cleaning')
ON CONFLICT (id) DO UPDATE SET category_name = 'Cleaning';

-- Rename any leftover 'Cleaning & Housekeeping' records in public.categories just in case
UPDATE public.categories 
SET category_name = 'Cleaning' 
WHERE category_name = 'Cleaning & Housekeeping' OR id = '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid;

-- 2. Insert the 'House Keeping' category
INSERT INTO public.categories (id, category_name)
VALUES ('79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid, 'House Keeping')
ON CONFLICT (id) DO UPDATE SET category_name = 'House Keeping';

-- 3. Ensure the housekeeping subcategories exist and are pointed to 'House Keeping'
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, 'Sofa & Upholstery Care', 'chair', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('89ae8ba2-9da2-45ac-9467-8c3a594d3830'::uuid, 'Full Home Deep Cleaning', 'cleaning_services', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('7f3a32c4-1a49-4885-a32b-98a9878daac6'::uuid, 'Water Tank Cleaning', 'water_drop', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('6aa375c5-4a88-4427-9ee9-815aa2164b40'::uuid, 'Vehicle Wash & Detailing', 'directions_car', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, 'Kitchen Cleaning', 'countertops', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('8ce74ebb-7406-458c-b4eb-50d36f18b830'::uuid, 'Bathroom Cleaning', 'bathroom', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, 'General Cleaning', 'cleaning_services', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  category_id = EXCLUDED.category_id,
  subcategory_name = EXCLUDED.subcategory_name,
  icon_name = EXCLUDED.icon_name;

-- 4. Update the category field on the 10 services to 'House Keeping'
UPDATE public.services
SET category = 'House Keeping'
WHERE title IN (
  'Water Tank Cleaning',
  'Carpet Cleaning',
  'Sofa Cleaning',
  'Deep Cleaning',
  'Bathroom Cleaning',
  'Chimney Cleaning',
  'Office Cleaning',
  'Home Cleaning',
  'Chair Cleaning',
  'Car Cleaning'
);

-- 5. Set category field to 'Cleaning' for the rest of the services that belong to Cleaning subcategories
UPDATE public.services
SET category = 'Cleaning'
WHERE subcategory_id IN (
  '1b330268-b401-4f56-8360-7a0be7470dae'::uuid, -- Gardening & Plant Care
  '8827db87-3f6e-4c09-9fc0-066042c5b3e0'::uuid  -- Laundry Services
);
