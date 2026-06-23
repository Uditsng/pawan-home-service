-- SQL Migration for Personal Assistance Services (CarryBuddy)
-- Name: 20260624000000_shopping_assistant_service.sql

-- 1. Extend bookings table with CarryBuddy specific fields
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expected_bags INTEGER DEFAULT 0;

-- 2. Extend service_duration_pricing table with package controls
ALTER TABLE public.service_duration_pricing ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.service_duration_pricing ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Seed Category: Personal Assistance Services
INSERT INTO public.categories (id, category_name)
VALUES ('5ba6c71c-30ad-4ef7-8c35-1d096a605f6e', 'Personal Assistance Services')
ON CONFLICT (id) DO UPDATE SET category_name = EXCLUDED.category_name;

-- 4. Seed Subcategory: Shopping Assistant Service (with icon_name = 'shopping_bag')
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
VALUES ('2cb6a6b5-0c7f-4b95-a204-0987c6543210', 'Shopping Assistant Service', 'shopping_bag', '5ba6c71c-30ad-4ef7-8c35-1d096a605f6e')
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 5. Seed Service: CarryBuddy (pricing_model = 'hourly')
INSERT INTO public.services (id, subcategory_id, title, description, base_price, original_price, is_active, category, pricing_model, image_url, page_content)
VALUES (
  '7e3a6a9b-6401-4f56-8360-7a0be7470dae',
  '2cb6a6b5-0c7f-4b95-a204-0987c6543210',
  'CarryBuddy',
  'A trained shopping assistant who accompanies you on your shopping trips. Helps carry shopping bags, navigate crowded markets, and assist until cab, metro, parking, or designated drop point.',
  499.00,
  599.00,
  true,
  'Personal Assistance Services',
  'hourly',
  '/assets/shopping_assistant_service.png',
  '{
    "about_text": "CarryBuddy is a dedicated duration-based shopping assistant service. We match you with a verified assistant who handles carrying your shopping bags, navigating busy markets, and walking with you to your parking spot, cab pickup, or metro station.",
    "included_features": [
      "Assistance carrying bags and shopping items (up to 25kg total weight)",
      "Accompaniment and guidance in crowded markets or malls",
      "Assistance loading bags into taxi, cab trunk, or personal car",
      "Support walking to cab pickup point, parking garage, or metro station"
    ],
    "excluded_features": [
      "No cash handling, purchasing items, or lending money",
      "No driving customer vehicles",
      "No carrying hazardous, illegal, or prohibited materials",
      "No heavy luggage lifting above 25kg"
    ],
    "faqs": [
      {
        "question": "What is the weight limit for bags the assistant can carry?",
        "answer": "Our CarryBuddy assistants can carry up to a total of 25kg of shopping bags/items at any given time for safety and convenience."
      },
      {
        "question": "Can the assistant pay for my items or handle my wallet?",
        "answer": "No. For safety and compliance reasons, assistants are strictly prohibited from handling cash, cards, wallets, or paying on your behalf."
      },
      {
        "question": "What happens if I need more time than booked?",
        "answer": "If your shopping trip runs longer, you can easily request a time extension from the assistant through the app. Additional charges are applied on approval."
      }
    ],
    "why_choose_us": [
      {
        "icon": "shield",
        "title": "100% Vetted Assistants",
        "desc": "All CarryBuddy professionals undergo strict identification and registration checks before onboarding."
      },
      {
        "icon": "work",
        "title": "Hands-Free Shopping",
        "desc": "Focus on picking the items you love without worrying about heavy carrying or navigation."
      },
      {
        "icon": "schedule",
        "title": "Flexible Hours",
        "desc": "Book for 30 minutes up to 4 hours, and easily extend duration mid-trip as needed."
      }
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

-- 6. Seed Duration Pricing Packages
-- 30 Minutes
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES ('7e3a6a9b-6401-4f56-8360-7a0be7470dae', 30, 299.00, 399.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;

-- 1 Hour (60 minutes)
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES ('7e3a6a9b-6401-4f56-8360-7a0be7470dae', 60, 499.00, 599.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;

-- 2 Hours (120 minutes)
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES ('7e3a6a9b-6401-4f56-8360-7a0be7470dae', 120, 899.00, 1099.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;

-- 3 Hours (180 minutes)
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES ('7e3a6a9b-6401-4f56-8360-7a0be7470dae', 180, 1299.00, 1599.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;

-- 4 Hours (240 minutes)
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active)
VALUES ('7e3a6a9b-6401-4f56-8360-7a0be7470dae', 240, 1699.00, 2099.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET 
  price = EXCLUDED.price, 
  original_price = EXCLUDED.original_price, 
  is_active = EXCLUDED.is_active;
