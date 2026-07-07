-- Migration: Normalize Duplicate Subcategories
-- Name: 20260707120000_normalize_subcategories.sql

-- 1. Merge subcategories safely
-- A. Kitchen Deep Cleaning -> Kitchen Cleaning
-- Update services that point to 'Kitchen Deep Cleaning' (953e32bc-545f-488c-8494-bc2089135bae) to 'Kitchen Cleaning' (8f9c2dee-9bae-41e0-81f1-6be4409fb218)
UPDATE public.services
SET subcategory_id = '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid
WHERE subcategory_id = '953e32bc-545f-488c-8494-bc2089135bae'::uuid;

-- Delete 'Kitchen Deep Cleaning' subcategory row
DELETE FROM public.subcategories
WHERE id = '953e32bc-545f-488c-8494-bc2089135bae'::uuid;

-- B. Bathroom Deep Cleaning -> Bathroom Cleaning
-- Update services that point to 'Bathroom Deep Cleaning' (79bb235a-69f9-4a0f-b904-a1986a893bb9) to 'Bathroom Cleaning' (8ce74ebb-7406-458c-b4eb-50d36f18b830)
UPDATE public.services
SET subcategory_id = '8ce74ebb-7406-458c-b4eb-50d36f18b830'::uuid
WHERE subcategory_id = '79bb235a-69f9-4a0f-b904-a1986a893bb9'::uuid;

-- Delete 'Bathroom Deep Cleaning' subcategory row
DELETE FROM public.subcategories
WHERE id = '79bb235a-69f9-4a0f-b904-a1986a893bb9'::uuid;

-- C. Packing & Moving -> Packers & Movers
-- Update services that point to 'Packing & Moving' (a4aac9fd-572f-41a3-ad88-2aa38a40ce09) to 'Packers & Movers' (36d1dacf-e15b-4d8a-b6fe-9cc3c0413146)
UPDATE public.services
SET subcategory_id = '36d1dacf-e15b-4d8a-b6fe-9cc3c0413146'::uuid
WHERE subcategory_id = 'a4aac9fd-572f-41a3-ad88-2aa38a40ce09'::uuid;

-- Delete 'Packing & Moving' subcategory row
DELETE FROM public.subcategories
WHERE id = 'a4aac9fd-572f-41a3-ad88-2aa38a40ce09'::uuid;

-- 2. Rename existing services for clarity and consistency
-- 'Kitchen Cleaning' -> 'Basic Kitchen Cleaning'
UPDATE public.services
SET title = 'Basic Kitchen Cleaning'
WHERE title = 'Kitchen Cleaning';

-- 'Bathroom Cleaning' -> 'Basic Bathroom Cleaning'
UPDATE public.services
SET title = 'Basic Bathroom Cleaning'
WHERE title = 'Bathroom Cleaning';

-- 3. Insert new services under the merged subcategories if they do not exist
-- 'Deep Kitchen Cleaning' under 'Kitchen Cleaning' (8f9c2dee-9bae-41e0-81f1-6be4409fb218)
INSERT INTO public.services (
  id,
  subcategory_id,
  title,
  description,
  base_price,
  original_price,
  is_active,
  category,
  pricing_model,
  image_url,
  price_breakdown,
  page_content
) VALUES (
  'd186c52a-9bae-41e0-81f1-6be4409fb301'::uuid,
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid,
  'Deep Kitchen Cleaning',
  'Thorough deep cleaning of kitchen surfaces, cabinets (inside & out), exhaust fan, tiles, slab, sink, and machine scrubbing of floors.',
  1499.00,
  1999.00,
  true,
  'Cleaning',
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  'Starting at ₹1499',
  '{
    "about_text": "Give your kitchen a complete makeover. Our deep cleaning service targets grease, oil stains, grime on tiles, inside-out cleaning of cabinets, and sanitization of the sink and slab.",
    "included_features": [
      "Cabinet cleaning (inside and out)",
      "Exhaust fan and chimney exterior cleaning",
      "Slab, tiles, and backsplash degreasing",
      "Sink sanitization and tap polishing",
      "Machine floor scrubbing and drying"
    ],
    "excluded_features": [
      "Chimney internal duct cleaning",
      "Washing utensils",
      "Cleaning inside refrigerator or microwave (available as add-ons)"
    ],
    "faqs": [
      { "question": "Does this include cleaning inside the cabinets?", "answer": "Yes, we clean inside all empty kitchen cabinets. Please remove utensils before the service." },
      { "question": "How long does it take?", "answer": "Usually takes 2–4 hours depending on the size." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dusting & Prep", "desc": "Removing items and dry dusting all surfaces." },
      { "step": 2, "title": "Degreasing", "desc": "Applying eco-friendly degreasing agent on tiles, counters, and cabinets." },
      { "step": 3, "title": "Scrubbing & Wiping", "desc": "Intense scrubbing and wiping down all surfaces." }
    ]
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 'Deep Bathroom Cleaning' under 'Bathroom Cleaning' (8ce74ebb-7406-458c-b4eb-50d36f18b830)
INSERT INTO public.services (
  id,
  subcategory_id,
  title,
  description,
  base_price,
  original_price,
  is_active,
  category,
  pricing_model,
  image_url,
  price_breakdown,
  page_content
) VALUES (
  'd186c52a-9bae-41e0-81f1-6be4409fb302'::uuid,
  '8ce74ebb-7406-458c-b4eb-50d36f18b830'::uuid,
  'Deep Bathroom Cleaning',
  'Intense deep cleaning of toilet bowl, washbasin, taps, wall tiles, shower area, glass partitions, and machine floor scrubbing.',
  699.00,
  999.00,
  true,
  'House Keeping',
  'fixed',
  '/assets/services/bathroom_cleaning.png',
  'Starting at ₹699',
  '{
    "about_text": "Restore your bathroom''s sparkle and hygiene. Our professional deep cleaning removes hard water stains, sanitizes all sanitaryware, deep scrubs wall tiles, and polishes mirrors and fixtures.",
    "included_features": [
      "Removal of hard water stains from tiles & taps",
      "Toilet bowl sanitization and descaling",
      "Washbasin and mirror polishing",
      "Cleaning of glass partitions & shower area",
      "Deep floor scrubbing and sanitizing"
    ],
    "excluded_features": [
      "Fixing pipe leaks or plumbing repairs",
      "Cleaning ceiling or exhaust fan internal parts"
    ],
    "faqs": [
      { "question": "Do you remove hard water stains?", "answer": "Yes, we use specialized descaling agents to remove hard water stains from tiles, glass, and fittings." },
      { "question": "Are cleaning agents safe?", "answer": "Yes, we use certified safe and non-corrosive cleaning agents." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Descaling", "desc": "Applying descaling agents on taps, shower, and tiles." },
      { "step": 2, "title": "Scrubbing & Sanitization", "desc": "Deep scrubbing wall and floor tiles, and sanitizing the toilet." },
      { "step": 3, "title": "Polishing", "desc": "Polishing mirrors, chrome fittings, and final drying." }
    ]
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;
