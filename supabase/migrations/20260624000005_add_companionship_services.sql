-- SQL Migration to add Companionship Services under Personal Assistance Services
-- Name: 20260624000005_add_companionship_services.sql

-- 1. Seed Subcategory: Companionship Services (icon: diversity_3)
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
VALUES ('2cb6a6b5-0c7f-4b95-a204-0987c6543220'::uuid, 'Companionship Services', 'diversity_3', '5ba6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 2. Seed Service: Girlfriend on demand (Companionship Service)
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
  page_content
) VALUES (
  '5ba6c71c-30ad-4ef7-8c35-1d096a605f7a'::uuid,
  '2cb6a6b5-0c7f-4b95-a204-0987c6543220'::uuid,
  'Girlfriend on demand (Companionship Service)',
  'Need a friendly companion for a social event, shopping trip, family function, café visit, movie outing, travel assistance, or simply engaging conversation? Our verified female companions provide professional, respectful, and non-romantic companionship for various social occasions.',
  499.00,
  599.00,
  true,
  'Personal Assistance Services',
  'hourly',
  '/assets/services/girlfriend_on_demand.png',
  '{
    "about_text": "Need a friendly companion for a social event, shopping trip, family function, café visit, movie outing, travel assistance, or simply engaging conversation? Our verified female companions provide professional, respectful, and non-romantic companionship for various social occasions.",
    "included_features": [
      "Social event companionship",
      "Shopping companion",
      "Café and restaurant visits",
      "Travel and sightseeing assistance",
      "Conversation and social support",
      "Family function attendance"
    ],
    "excluded_features": [
      "Physical intimacy of any kind",
      "Sexual services",
      "Overnight stays",
      "Illegal activities",
      "Financial borrowing or lending",
      "Alcohol or substance-related obligations"
    ],
    "faqs": [
      { "question": "Is this a dating service?", "answer": "No. This is a professional companionship service only." },
      { "question": "Can I choose a companion?", "answer": "Yes, subject to availability." },
      { "question": "Can companions attend weddings or events?", "answer": "Yes." },
      { "question": "Is personal information kept confidential?", "answer": "Yes." },
      { "question": "Are companions verified?", "answer": "Yes, verification is recommended for all companions." },
      { "question": "Can the service be extended?", "answer": "Yes, additional charges apply." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Companions", "desc": "Identity-verified and background-checked companions." },
      { "icon": "security", "title": "Safe & Respectful", "desc": "Meetings occur in public with strict service rules for safety." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Choose Duration", "desc": "Select the duration you need (minimum 1 hour)." },
      { "step": 2, "title": "Meet Companion", "desc": "Meet your companion at the designated public location." }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  subcategory_id = EXCLUDED.subcategory_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  original_price = EXCLUDED.original_price,
  is_active = EXCLUDED.is_active,
  category = EXCLUDED.category,
  pricing_model = EXCLUDED.pricing_model,
  image_url = EXCLUDED.image_url,
  page_content = EXCLUDED.page_content;

-- 3. Seed Service: Boyfriend on demand (Companionship Service)
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
  page_content
) VALUES (
  '5ba6c71c-30ad-4ef7-8c35-1d096a605f7b'::uuid,
  '2cb6a6b5-0c7f-4b95-a204-0987c6543220'::uuid,
  'Boyfriend on demand (Companionship Service)',
  'Looking for a reliable companion for events, shopping, travel assistance, social gatherings, or casual conversation? Our verified male companions offer professional and respectful companionship tailored to your needs.',
  499.00,
  599.00,
  true,
  'Personal Assistance Services',
  'hourly',
  '/assets/services/boyfriend_on_demand.png',
  '{
    "about_text": "Looking for a reliable companion for events, shopping, travel assistance, social gatherings, or casual conversation? Our verified male companions offer professional and respectful companionship tailored to your needs.",
    "included_features": [
      "Event companionship",
      "Shopping assistance",
      "Travel companion support",
      "Restaurant and café visits",
      "Social gathering attendance",
      "Friendly conversation"
    ],
    "excluded_features": [
      "Physical intimacy of any kind",
      "Sexual services",
      "Overnight stays",
      "Illegal activities",
      "Financial transactions on behalf of customers",
      "Personal relationship commitments"
    ],
    "faqs": [
      { "question": "Is this a romantic relationship service?", "answer": "No. It is a professional companionship service." },
      { "question": "Can the companion attend an event with me?", "answer": "Yes." },
      { "question": "Can I request a specific companion?", "answer": "Subject to availability." },
      { "question": "Is the service confidential?", "answer": "Yes." },
      { "question": "Can I extend the booking duration?", "answer": "Yes, additional charges apply." },
      { "question": "Are companions background verified?", "answer": "Verification is strongly recommended for platform safety." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Companions", "desc": "Identity-verified and background-checked companions." },
      { "icon": "security", "title": "Safe & Respectful", "desc": "Meetings occur in public with strict service rules for safety." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Choose Duration", "desc": "Select the duration you need (minimum 1 hour)." },
      { "step": 2, "title": "Meet Companion", "desc": "Meet your companion at the designated public location." }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  subcategory_id = EXCLUDED.subcategory_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  original_price = EXCLUDED.original_price,
  is_active = EXCLUDED.is_active,
  category = EXCLUDED.category,
  pricing_model = EXCLUDED.pricing_model,
  image_url = EXCLUDED.image_url,
  page_content = EXCLUDED.page_content;

-- 4. Seed Duration Pricing for Girlfriend on demand
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES 
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7a'::uuid, 60, 499.00, 599.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7a'::uuid, 120, 899.00, 1099.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7a'::uuid, 180, 1299.00, 1599.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7a'::uuid, 240, 1699.00, 2099.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;

-- 5. Seed Duration Pricing for Boyfriend on demand
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES 
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7b'::uuid, 60, 499.00, 599.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7b'::uuid, 120, 899.00, 1099.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7b'::uuid, 180, 1299.00, 1599.00, true),
  ('5ba6c71c-30ad-4ef7-8c35-1d096a605f7b'::uuid, 240, 1699.00, 2099.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;
