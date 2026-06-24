-- SQL Migration to fix category mapping and split subcategories
-- Name: 20260624000004_fix_house_keeping_categories.sql

-- 1. Point the shared subcategories back to 'Cleaning' category
UPDATE public.subcategories
SET category_id = '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid
WHERE id IN (
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  '6aa375c5-4a88-4427-9ee9-815aa2164b40'::uuid  -- Vehicle Wash & Detailing
);

-- 2. Create new subcategories under 'House Keeping' category
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
VALUES 
  ('8f9c2dee-9bae-41e0-81f1-6be4409fb219'::uuid, 'Chimney Cleaning', 'countertops', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('75d160e8-4791-4f0a-8c88-779647d346e0'::uuid, 'Home & Office Cleaning', 'cleaning_services', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('6aa375c5-4a88-4427-9ee9-815aa2164b41'::uuid, 'Car Cleaning', 'directions_car', '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name,
  icon_name = EXCLUDED.icon_name,
  category_id = EXCLUDED.category_id;

-- 3. Reassign the 4 housekeeping services to the new subcategories
UPDATE public.services SET subcategory_id = '8f9c2dee-9bae-41e0-81f1-6be4409fb219'::uuid WHERE title = 'Chimney Cleaning';
UPDATE public.services SET subcategory_id = '75d160e8-4791-4f0a-8c88-779647d346e0'::uuid WHERE title = 'Home Cleaning';
UPDATE public.services SET subcategory_id = '75d160e8-4791-4f0a-8c88-779647d346e0'::uuid WHERE title = 'Office Cleaning';
UPDATE public.services SET subcategory_id = '6aa375c5-4a88-4427-9ee9-815aa2164b41'::uuid WHERE title = 'Car Cleaning';

-- 4. Align flat category fields for all services under Cleaning
UPDATE public.services s
SET category = 'Cleaning'
FROM public.subcategories sub
WHERE s.subcategory_id = sub.id AND sub.category_id = '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid;

-- 5. Align flat category fields for all services under House Keeping
UPDATE public.services s
SET category = 'House Keeping'
FROM public.subcategories sub
WHERE s.subcategory_id = sub.id AND sub.category_id = '79a4de54-30ad-4ef7-8c35-1d096a605f6e'::uuid;
