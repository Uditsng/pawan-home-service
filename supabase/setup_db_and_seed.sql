-- Supabase Database Restorer & Services Catalog Seed Script
-- Recreates missing tables (subcategories, services), configures RLS, and seeds the 19 requested services.
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. RECREATE/VERIFY CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default categories if they don't exist
INSERT INTO public.categories (id, category_name) VALUES
  ('06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid, 'Cleaning & Housekeeping'),
  ('aa721151-4604-4c9d-ae07-68960a5f8564'::uuid, 'Pest Control Services'),
  ('4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid, 'Home Repairs & Maintenance'),
  ('c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid, 'Renovation, Logistics & Events')
ON CONFLICT (category_name) DO UPDATE SET category_name = EXCLUDED.category_name;

-- 2. RECREATE SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_name TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed subcategories with precise icons and parent relations
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  -- Cleaning & Housekeeping
  ('fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, 'Sofa & Upholstery Care', 'chair', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('89ae8ba2-9da2-45ac-9467-8c3a594d3830'::uuid, 'Full Home Deep Cleaning', 'cleaning_services', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('953e32bc-545f-488c-8494-bc2089135bae'::uuid, 'Kitchen Deep Cleaning', 'skillet', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('79bb235a-69f9-4a0f-b904-a1986a893bb9'::uuid, 'Bathroom Deep Cleaning', 'bathtub', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('7f3a32c4-1a49-4885-a32b-98a9878daac6'::uuid, 'Water Tank Cleaning', 'water_drop', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('6aa375c5-4a88-4427-9ee9-815aa2164b40'::uuid, 'Vehicle Wash & Detailing', 'directions_car', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, 'Kitchen Cleaning', 'countertops', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('8ce74ebb-7406-458c-b4eb-50d36f18b830'::uuid, 'Bathroom Cleaning', 'bathroom', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, 'General Cleaning', 'cleaning_services', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('1b330268-b401-4f56-8360-7a0be7470dae'::uuid, 'Gardening & Plant Care', 'potted_plant', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  ('8827db87-3f6e-4c09-9fc0-066042c5b3e0'::uuid, 'Laundry Services', 'local_laundry_service', '06fe8241-df90-42b3-a6c6-612b189ba54c'::uuid),
  -- Pest Control Services
  ('4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, 'General Pest Management', 'bug_report', 'aa721151-4604-4c9d-ae07-68960a5f8564'::uuid),
  ('88549b54-7d83-4bfa-8829-5377962e6b8f'::uuid, 'Bed Bug Extermination', 'bed', 'aa721151-4604-4c9d-ae07-68960a5f8564'::uuid),
  ('860d493a-51ff-45bc-bbd7-8132d4a081ac'::uuid, 'Termite Protection', 'pest_control', 'aa721151-4604-4c9d-ae07-68960a5f8564'::uuid),
  ('08d11104-30f5-4cd6-a4a2-798c73088bd8'::uuid, 'Mosquito, Rodent & Crawling Insect Control', 'pest_control_rodent', 'aa721151-4604-4c9d-ae07-68960a5f8564'::uuid),
  -- Home Repairs & Maintenance
  ('b43f26e5-4dc8-4640-860a-9e214f826d57'::uuid, 'Plumbing Services', 'plumbing', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd2'::uuid, 'Electrical Services', 'electrical_services', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, 'Carpentry Services', 'tools', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, 'AC & Appliance Repair', 'ac_unit', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  -- Renovation, Logistics & Events
  ('55700483-dbce-43f9-96ec-37960ccfbf39'::uuid, 'Wall Painting & Texturing', 'format_paint', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('37680277-a2fa-4b0c-9d22-31254a2c3f0a'::uuid, 'Waterproofing & Seepage', 'water_damage', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('36d1dacf-e15b-4d8a-b6fe-9cc3c0413146'::uuid, 'Packers & Movers', 'local_shipping', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('cc693569-1b3a-4c8b-acc3-8ba25155f254'::uuid, 'Event & Party Decoration', 'celebration', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('c22d9017-4a4d-48c5-b684-bb6d32371351'::uuid, 'Business Marketing/Advertising', 'campaign', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('a4aac9fd-572f-41a3-ad88-2aa38a40ce09'::uuid, 'Packing & Moving', 'inventory_2', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 3. RECREATE SERVICES TABLE WITH FULL SCHEMA
DROP TABLE IF EXISTS public.services CASCADE;

CREATE TABLE public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  price_breakdown TEXT,
  page_content JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  category TEXT DEFAULT null,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and setup standard policies
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to services" ON public.services
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins have full access to services" ON public.services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 4. SEED THE 19 SERVICES
INSERT INTO public.services (
  title, 
  subcategory_id, 
  base_price, 
  price_breakdown, 
  description, 
  page_content, 
  is_active, 
  category
) VALUES 
(
  'Utensils',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  1,
  'Original Price: ₹125',
  'Standard utensils washing and dishwashing area cleanup using customer-provided supplies.',
  '{
    "about_text": "Get your dishes washed, dried, and perfectly reracked. Our professionals ensure your utensils sink and the dishwashing area are clean and dry at the end.",
    "included_features": [
      "Washing utensils with customer-provided supplies",
      "Drying and placing utensils in rack",
      "Cleaning the sink and surrounding area after completion"
    ],
    "excluded_features": [
      "Cleaning other kitchen areas such as slabs or tiles",
      "Taking out kitchen garbage or waste disposal",
      "Deep cleaning of burnt or heavily stained utensils"
    ],
    "faqs": [
      {
        "question": "Do you bring dishwashing liquid and scrubs?",
        "answer": "No, this service utilizes customer-provided washing supplies like dishwashing bars, liquid, and scrubbers."
      },
      {
        "question": "Will you clean heavily burnt pots?",
        "answer": "Deep scrubbing of heavily burnt or stained utensils is not covered in the standard utensils washing service."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Utensils washing", "desc": "The dirty utensils are washed thoroughly." },
      { "step": 2, "title": "Reracking", "desc": "The washed utensils are dried and rearranged in their respective racks." },
      { "step": 3, "title": "Utensils sink", "desc": "The utensils sink is cleaned after washing up of the utensils." },
      { "step": 4, "title": "Dishwashing area", "desc": "The dishwashing area is cleaned and dried off at the end of the process." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Bathroom Cleaning',
  '8ce74ebb-7406-458c-b4eb-50d36f18b830'::uuid, -- Bathroom Cleaning
  1,
  'Original Price: ₹250',
  'Complete cleaning of toilet bowl, washbasin, tiles, fixtures, and bathroom floors.',
  '{
    "about_text": "A clean bathroom is a healthy bathroom. We take care of scrubbing the washbasin, sanitizing the toilet bowl, wiping down tiles and fixtures, and mopping the floor to leave it spotless.",
    "included_features": [
      "Cleaning of toilet bowl (inside and rim)",
      "Cleaning of washbasin and faucet",
      "Wiping of bathroom tiles and visible surfaces",
      "Cleaning of taps and fixtures",
      "Sweeping and mopping of bathroom floor",
      "Final wipe-down and deodorizing of the bathroom"
    ],
    "excluded_features": [
      "Deep cleaning such as tile grout scrubbing",
      "Removal of heavy mold or hard water stains",
      "Use of acid-based or strong descaling chemicals",
      "Cleaning of shower curtains or drains",
      "Shifting or relocating heavy items in bathroom"
    ],
    "faqs": [
      {
        "question": "Do you clean hard water stains on glass/fixtures?",
        "answer": "Heavy hard water deposits and tile grout deep scrubbing are part of deep cleaning and not included in this standard cleaning service."
      },
      {
        "question": "Do you use acid-based cleaners?",
        "answer": "No, we strictly avoid harsh acid-based cleaners to protect your premium bathroom fittings and tiles from damage."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Toilet cleaning", "desc": "The toilet bowl is thoroughly cleaned as the initial step." },
      { "step": 2, "title": "Surface cleaning", "desc": "All surfaces in the bathroom, such as the walls and tiles, are cleaned." },
      { "step": 3, "title": "Washbasin", "desc": "The washbasin is scrubbed, cleaned and wiped dry." },
      { "step": 4, "title": "Finishing up", "desc": "The floor is swept, mopped, wiped and dried off at the end." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Sweeping & Mopping',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  1,
  'Original Price: ₹125',
  'Thorough sweeping and mopping of required rooms with minor furniture movement for cleaning access.',
  '{
    "about_text": "Ensure clean, dust-free floors across your rooms. We sweep away all loose dirt and mop the surface cleanly, moving light items as needed.",
    "included_features": [
      "Sweeping and mopping floors of required rooms",
      "Removal of dust and loose dirt from the floor",
      "Slight movement of light movable items for cleaning access"
    ],
    "excluded_features": [
      "Sweeping or mopping of balcony or outdoor areas",
      "Stain removal/deep scrubbing or floor polishing",
      "Moving heavy furniture such as beds or cupboards",
      "Vacuum cleaning of carpets or rugs"
    ],
    "faqs": [
      {
        "question": "Will you mop the balcony or outside area?",
        "answer": "No, balcony and outdoor floor cleaning is excluded from this standard indoor sweeping and mopping service."
      },
      {
        "question": "Do you clean carpets?",
        "answer": "Carpet vacuuming or shampooing is not covered under standard floor sweeping and mopping."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Sweeping", "desc": "All the eligible floors are carefully swept to accumulate loose dust." },
      { "step": 2, "title": "Dirt removal", "desc": "The dust collected from sweeping is disposed of safely." },
      { "step": 3, "title": "Mopping", "desc": "All the swept floors are mopped using standard clean water and disinfectants." },
      { "step": 4, "title": "Light furniture movement", "desc": "Light furniture items are moved slightly for a thorough under-furniture cleanup." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Dusting & Wiping',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  1,
  'Original Price: ₹125',
  'Dry dusting of furniture surfaces, shelves, reachable corners, light fixtures, and electrical switches.',
  '{
    "about_text": "Remove settled dust from your surfaces. We dry-dust furniture, reachable shelves, switches, light fixtures, and clean light under-bed surfaces.",
    "included_features": [
      "Dry dusting of furniture surfaces and shelves",
      "Dusting of corners and reachable surfaces",
      "Dusting of light fixtures (bulbs and tube lights – exterior only)",
      "Dusting of electrical switches and plug points",
      "Minor bed adjustment to dust underneath (if easily movable)"
    ],
    "excluded_features": [
      "Dusting of ceiling fans",
      "Cleaning of windows or window sills",
      "Dusting in balcony or terrace areas",
      "Wet cleaning of furniture or electrical items",
      "Moving heavy furniture or appliances"
    ],
    "faqs": [
      {
        "question": "Is ceiling fan cleaning included?",
        "answer": "No, ceiling fans are excluded from general dusting and wiping. We offer a dedicated fan cleaning service."
      },
      {
        "question": "Do you wet-wipe the furniture?",
        "answer": "This is a dry dusting service. Wet wiping of delicate wooden surfaces or electrical components is excluded."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dry dusting", "desc": "The surfaces of furnitures, doors and light fixtures are dusted carefully to clear accumulated dirt." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Fridge Cleaning',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  149,
  'Original Price: ₹250 | Single Door: 45 mins, Double Door: 60 mins, Large: 90 mins',
  'Thorough interior and exterior wipe-down of one refrigerator unit including drawers, trays, and basic deodorization.',
  '{
    "about_text": "Restore hygiene to your refrigerator. Our professional switches off the unit, safely places your items aside, wipes and sanitizes interior compartments and rubber linings, removes expired items, deodorizes, and packs everything back neatly.",
    "included_features": [
      "Service includes cleaning of one refrigerator unit only",
      "Estimated cleaning time depends on fridge size (Single Door: 45 mins, Double Door: 60 mins, Large Fridges: 90 mins)",
      "Switching off fridge before cleaning",
      "Removing food items and placing them safely aside",
      "Discarding expired or spoiled items (as instructed)",
      "Cleaning shelves, trays, drawers, and compartments",
      "Wiping interior surfaces (walls, door panels, rubber lining)",
      "Basic deodorising of fridge interior",
      "Cleaning fridge exterior (front & sides only)",
      "Drying surfaces before placing items back",
      "Replacing food items neatly into the fridge"
    ],
    "excluded_features": [
      "Moving or lifting the refrigerator",
      "Cleaning the back panel or condenser coils",
      "Repair or servicing of the fridge",
      "Handling frozen items requiring defrosting beyond service time",
      "Cleaning deep stains caused by long-term neglect",
      "Use of special chemicals or deodorising products",
      "Organising food by diet, expiry system, or labelling",
      "Disposal of garbage outside the home",
      "Deep freezer cleaning is not included in the service",
      "Service may be paused if scope exceeds inclusions",
      "Meat will not be handled by our professional due to hygiene conditions"
    ],
    "faqs": [
      {
        "question": "Do you clean the back panel of the fridge?",
        "answer": "No, cleaning back condenser coils or doing repair work is excluded. We only clean the interior and front/side exterior surfaces."
      },
      {
        "question": "Do you handle non-vegetarian or meat sections?",
        "answer": "Due to hygiene conditions and standard policies, raw meat will not be handled by our professional."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Personal Items", "desc": "Remove personal or sensitive items such as medicines, supplements, and personal care products before the service begins." },
      { "step": 2, "title": "Defrost the Fridge", "desc": "Ensure the refrigerator is defrosted in advance if required to allow smooth cleaning." },
      { "step": 3, "title": "Report Ice Buildup", "desc": "Inform the professional in advance if the fridge has heavy ice buildup that may require extra time." },
      { "step": 4, "title": "Keep Garbage Bags Ready", "desc": "Keep garbage bags available to help with waste disposal during the service." },
      { "step": 5, "title": "Be Available for Approvals", "desc": "Stay available during the service to approve or decline discarding of items." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Pre-Party Express Clean',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  149,
  'Original Price: ₹175 | 90 mins service time',
  '90 minutes express prep-cleaning covering living/dining rooms, kitchen surfaces, bathroom, floors, utensils, and trash.',
  '{
    "about_text": "Get your home ready for guests in just 90 minutes. You can prioritize sweeping, mopping, basic bathroom cleaning, kitchen surface wiping, utensils, or trash removal.",
    "included_features": [
      "90 mins service time",
      "Living room & dining clean",
      "Kitchen surface cleaning",
      "Bathroom clean",
      "Full house floor sweeping & mopping",
      "Trash removal",
      "Utensils"
    ],
    "excluded_features": [
      "Upholstery/appliance interiors, chimneys, or balcony exteriors",
      "Heavy grease or stains cleaning, removal of construction debris, and bulk waste",
      "Tasks outside the defined package scope and work beyond the booked time"
    ],
    "faqs": [
      {
        "question": "Can the pro stay longer if the cleaning takes more time?",
        "answer": "This package is fixed for 90 minutes. For extensive deep cleaning, please choose our Full Home Deep Cleaning package."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Plan the Work", "desc": "Your professional plans the tasks as per your needs and the 90-minute time booked." },
      { "step": 2, "title": "Start Cleaning", "desc": "They''ll begin with the tasks you want like sweeping, mopping, utensils or bathroom cleaning." },
      { "step": 3, "title": "Final Checks", "desc": "Before finishing, they''ll give a quick wipe to make sure everything looks clean and tidy." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Packing or Unpacking',
  'a4aac9fd-572f-41a3-ad88-2aa38a40ce09'::uuid, -- Packing & Moving
  1,
  'Original Price: ₹125',
  'Packing or unpacking of clothes, kitchenware, books, toys, dry groceries, folding, and basic cabinet rearrangement.',
  '{
    "about_text": "Relocating or setting up your home? Our professionals assist you in packing or unpacking clothes, linen, books, toys, kitchen items, and dry groceries cleanly, including folding and box labelling.",
    "included_features": [
      "Packing or unpacking clothes, shoes, books, toys & linens",
      "Packing or unpacking kitchen items & dry groceries",
      "Folding and organising items before packing",
      "Placing items into boxes, suitcases, or cupboards",
      "Labelling boxes (room-wise or item-wise)",
      "Light dusting or surface wipe before placing items",
      "Basic organisation using existing storage"
    ],
    "excluded_features": [
      "Heavy lifting or moving furniture",
      "Carrying boxes up or down stairs",
      "Handling jewellery, cash, documents, or valuables",
      "Packing fragile antiques or artwork",
      "Furniture dismantling or assembly",
      "Tools, packing materials, boxes, or tapes",
      "Decluttering advice or space planning",
      "Electrical, plumbing, or carpentry work",
      "Transporting items outside your home"
    ],
    "faqs": [
      {
        "question": "Do you supply cardboard boxes or tapes?",
        "answer": "No, packing supplies like boxes, tapes, wrappers, and scissors must be provided by the customer."
      },
      {
        "question": "Will you pack jewelry or cash?",
        "answer": "No, we strictly do not pack or handle jewelry, cash, credit cards, legal documents, or extremely high-value items."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Keep Packing Materials Ready", "desc": "Keep boxes, bags, tapes, and packing materials ready before the professional arrives." },
      { "step": 2, "title": "Pack Valuables Yourself", "desc": "Safely pack jewellery, cash, documents, and highly fragile items on your own." },
      { "step": 3, "title": "Set Priority Areas", "desc": "Decide which spaces like the wardrobe or kitchen should be handled first." },
      { "step": 4, "title": "Guide the Placement", "desc": "Stay available during the service to guide where items should be arranged." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Kitchen Prep',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  1,
  'Original Price: ₹125',
  'Raw kitchen preparation including washing, peeling, chopping vegetables, kneading dough, and cutting area cleaning.',
  '{
    "about_text": "Speed up your cooking process! We assist with washing, peeling, and chopping vegetables, kneading dough, sorting prepared items, and cleaning the cutting desk.",
    "included_features": [
      "Washing and peeling vegetables",
      "Chopping vegetables as per customer instruction",
      "Kneading dough using customer-provided flour and water",
      "Sorting prepared items into bowls/containers",
      "Basic cleaning of the cutting area after preparation"
    ],
    "excluded_features": [
      "Cooking or meal preparation",
      "Washing large quantities of utensils or kitchen cleaning",
      "Grinding or food processing using appliances",
      "Cutting meat or frozen items",
      "Preparing complex decorative cuts or restaurant-style presentation",
      "Arranging food inside refrigerator or kitchen storage"
    ],
    "faqs": [
      {
        "question": "Do you cook meals?",
        "answer": "No, our prep professionals assist with raw material preparation only and do not cook meals."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Kneading dough", "desc": "Dough is kneaded using customer-provided flour, water, and utensils." },
      { "step": 2, "title": "Vegetables preparation", "desc": "Vegetables are washed, peeled, and chopped as per your instruction." },
      { "step": 3, "title": "Cleaning up", "desc": "The kitchen prep area is cleaned up after all prep work is completed." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Plant Care',
  '1b330268-b401-4f56-8360-7a0be7470dae'::uuid, -- Gardening & Plant Care
  125,
  'Flat Rate',
  'Watering household plants, dry leaf pruning, weed removal, cleaning pots, and soil loosening with hand tools.',
  '{
    "about_text": "Give your house plants the care they deserve. Our professional waters plants, trims dry leaves, clears weeds, cleans pots, and loosens soil.",
    "included_features": [
      "Watering indoor & outdoor plants as per customer instructions",
      "Removing dry leaves and visible weeds",
      "Cleaning plant pots, trays & leaves",
      "Soil surface loosening (hand tools only)",
      "Rearranging plants as instructed",
      "Basic plant area cleanup",
      "Service covers household plants only",
      "Our professional will carry basic tools such as Scissors, Shovel, Five Teeth, Garden Trowel, Hand Weeder"
    ],
    "excluded_features": [
      "Gardening design or landscaping",
      "Pruning large trees or shrubs",
      "Chemicals, fertilisers must be provided by customer",
      "Repotting with new soil or pots",
      "Diagnosing plant diseases",
      "Terrace or society garden maintenance",
      "Helper will not decide plant treatment"
    ],
    "faqs": [
      {
        "question": "What tools do you bring?",
        "answer": "Our professional carries basic hand tools including scissors, a shovel, five teeth soil loosener, garden trowel, and hand weeders."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Identify Plants to Water", "desc": "Inform the professional which plants need watering and specific guidelines." },
      { "step": 2, "title": "Prepare Watering Tools", "desc": "Keep watering cans, hose pipes, or buckets available." },
      { "step": 3, "title": "Remove Nearby Decor", "desc": "Clear away personal decorative items nearby to prevent water damage." },
      { "step": 4, "title": "Highlight Fragile Plants", "desc": "Highlight any delicate or fragile plants that need gentler care." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Car Surface Cleaning',
  '6aa375c5-4a88-4427-9ee9-815aa2164b40'::uuid, -- Vehicle Wash & Detailing
  125,
  'Flat Rate',
  'Wash and clean car exterior surface, doors, mirrors, handles, and basic dashboard console wipe.',
  '{
    "about_text": "Keep your car shining. We wash the exterior surfaces, doors, handles, mirrors, and wipe the interior dashboard and door panels.",
    "included_features": [
      "Service includes one car only",
      "Actual time depends on vehicle size and dirt level (Available options: 30 mins or 60 mins)",
      "Exterior surface wash (water + cloth)",
      "Cleaning car doors, mirrors, and handles",
      "Dashboard, steering wheel & console wipe",
      "Cleaning door panels and cup holders"
    ],
    "excluded_features": [
      "Engine bay cleaning & Deep stain removal",
      "Polishing, waxing, detailing, seat shampooing or drying",
      "Pressure washing equipment or vacuuming",
      "Electrical or mechanical inspection",
      "Moving the car outside society premises",
      "Cleaning multiple vehicles",
      "Scratch removing, denting, painting, etc"
    ],
    "faqs": [
      {
        "question": "Do you clean the car interior seats?",
        "answer": "No, upholstery deep shampooing, seat washing, and carpet vacuuming are excluded."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Pre-Checks", "desc": "Park the car in an accessible area, remove valuables, and ensure water access." },
      { "step": 2, "title": "Start Cleaning", "desc": "Trained professionals carefully wash, clean, and wipe the surface to a shine." },
      { "step": 3, "title": "Final Checks", "desc": "A final dry wipe ensures the glass and console are streak-free." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Kitchen Cabinets Cleaning',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  597,
  'Flat Rate | 180 mins service duration',
  'Complete interior and exterior cleaning, dusting, and wet wiping of all kitchen cabinets.',
  '{
    "about_text": "Thorough kitchen cabinet cleaning. We empty the contents, dry dust and wet wipe all interior compartments, wipe exterior cabinet surfaces, and neatly rearrange your items.",
    "included_features": [
      "Service duration is 180 mins",
      "Interior cleaning",
      "Dry and wet wipe",
      "Emptying & rearranging cabinet stuff",
      "Exterior cleaning"
    ],
    "excluded_features": [
      "Deep oil or grease removal",
      "Washing of utensils or food items",
      "Cabinet repair or repainting",
      "Cement stains, rust stains, hard water stains"
    ],
    "faqs": [
      {
        "question": "Do you wash the dishes found inside?",
        "answer": "No, washing utensils is not included. We only dust, wipe, and rearrange existing items neatly."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dry Dusting", "desc": "All cabinet surfaces are dry-dusted to remove loose dirt and cobwebs." },
      { "step": 2, "title": "Exterior Cleaning", "desc": "The outer surfaces of all cabinets are wiped and cleaned for a polished look." },
      { "step": 3, "title": "Interior Cleaning", "desc": "All cabinet interiors are cleaned to remove dust, crumbs, and light stains." },
      { "step": 4, "title": "Rearranging", "desc": "Items are neatly organized and placed back inside the cabinets." },
      { "step": 5, "title": "Final Wipe", "desc": "All cleaned areas are given a final wipe for a spotless finish." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Fan Cleaning',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  1,
  'Original Price: ₹125',
  'Dust removal and wet wiping of ceiling fan blades and motor bodies, including floor cleanup.',
  '{
    "about_text": "Keep your fans clean and dirt-free. We dust and wet-wipe fan blades and exterior motor parts, ensuring any fallen dirt is swept from the floor.",
    "included_features": [
      "Dust removal from fan blades and motor body (exterior only)",
      "Wiping of fan blades and accessible parts",
      "Cleaning of fallen dust from floor and surrounding area"
    ],
    "excluded_features": [
      "Cleaning of other room surfaces, furniture, or walls",
      "Professional will not be carrying a ladder, please provide one",
      "Cleaning fans that require unsafe access or unstable ladder setup",
      "Disassembly of fan or motor cleaning",
      "Deep cleaning of internal fan parts",
      "Cleaning of exhaust/pedestal or table fans",
      "Moving heavy furniture to reach the fan"
    ],
    "faqs": [
      {
        "question": "Do you clean internal motor parts?",
        "answer": "No, we only dust and wipe the exterior blades and motor body casing. Disassembly is excluded."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Fan cleaning", "desc": "The ceiling fan is thoroughly dry-dusted to remove cobwebs and loose dust." },
      { "step": 2, "title": "Fan wiping", "desc": "Blades and exterior motor casing are wiped down using a damp microfiber cloth." },
      { "step": 3, "title": "Dirt removal", "desc": "Any remaining dirt or debris that has fallen is fully swept and cleaned from the floor." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Balcony Cleaning',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  1,
  'Original Price: ₹125',
  'Sweeping, mopping balcony floor, wiping railings, grills, parapet walls, and accessible surfaces.',
  '{
    "about_text": "Enjoy your outdoors in cleanliness. We sweep and mop the balcony floors, wipe railings/grills and parapets, and dry-dust light furniture.",
    "included_features": [
      "Sweeping and mopping of balcony floor",
      "Cleaning and wiping of balcony railings/grills",
      "Cleaning and wiping of balcony parapet/parapet wall",
      "Dusting of accessible balcony surfaces (tables/chairs - if light and reachable)"
    ],
    "excluded_features": [
      "Cleaning of balcony walls or ceiling",
      "Watering plants or gardening/plant care",
      "Cleaning terrace/roof areas or exterior building walls",
      "Moving heavy furniture or large plant pots"
    ],
    "faqs": [
      {
        "question": "Will you water my balcony plants?",
        "answer": "Plant watering is excluded. Please book our Plant Care service for plant watering and basic gardening assistance."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Surface cleaning", "desc": "All reachable surfaces, tables, chairs, and plant pots area are dry dusted." },
      { "step": 2, "title": "Parapet wall", "desc": "The parapet wall, railings, and grills are wiped and cleaned." },
      { "step": 3, "title": "Balcony floor", "desc": "The balcony floor is swept cleanly and mopped thoroughly." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Kitchen Cleaning',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning
  49,
  'Original Price: ₹150',
  'Wiping kitchen countertops, stove exterior, cabinet exterior, wall tiles, and sink cleaning.',
  '{
    "about_text": "Keep your kitchen surfaces spotless. We wipe kitchen slabs, cabinet exterior faces, stove exterior burners and knobs, kitchen wall tiles, and clean the sink.",
    "included_features": [
      "Wiping and cleaning kitchen countertops or slabs",
      "Cleaning exterior surfaces of kitchen cabinets (top and bottom)",
      "Cleaning exterior surfaces of the cooking stove (burners/knobs/drip trays)",
      "Wiping visible kitchen wall tiles",
      "Cleaning exterior of the sink"
    ],
    "excluded_features": [
      "Washing or soaking utensils and dishes",
      "Rearranging or storing utensils inside cabinets",
      "Taking out kitchen garbage or waste",
      "Cleaning interiors of appliances such as chimneys/microwaves/refrigerators/ovens or air fryers"
    ],
    "faqs": [
      {
        "question": "Does this include inside cabinet cleaning?",
        "answer": "No, this standard kitchen cleaning service covers cabinet exteriors only. Book Kitchen Cabinets Cleaning for interior service."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Cabinets cleaning", "desc": "Top cabinets exterior surfaces are wiped down first, followed by bottom cabinets." },
      { "step": 2, "title": "Kitchen tiles", "desc": "Visible wall tiles above the kitchen counter are thoroughly wiped." },
      { "step": 3, "title": "Kitchen slabs", "desc": "All kitchen countertops and slabs are wiped clean." },
      { "step": 4, "title": "Stove cleaning", "desc": "The cooking stove burners, knobs, and drip trays are cleaned." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Laundry',
  '8827db87-3f6e-4c09-9fc0-066042c5b3e0'::uuid, -- Laundry Services
  1,
  'Original Price: ₹125',
  'Washing clothes using your washing machine, adding detergent, and hanging them to dry.',
  '{
    "about_text": "Let us handle your laundry chores. We wash clothes using your automatic or semi-automatic machine, use detergent appropriately, tumble dry, and hang clothes to dry.",
    "included_features": [
      "Washing clothes using the customer''s washing machine",
      "Adding detergent in the correct compartment",
      "Selecting appropriate wash mode based on fabric type",
      "Hanging washed clothes for drying"
    ],
    "excluded_features": [
      "Hand-washing of delicate garments",
      "Ironing or folding clothes",
      "Arranging clothes inside wardrobes",
      "Stain treatment or special garment care",
      "Washing machine cleaning or repair"
    ],
    "faqs": [
      {
        "question": "Do you supply washing detergent?",
        "answer": "No, washing machine detergents, fabric softeners, and laundry clips must be provided by the customer."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Washing", "desc": "Clothes are loaded into your washing machine with the appropriate detergent and wash cycles." },
      { "step": 2, "title": "Drying", "desc": "Clothes are spin dried or tumble dried using your washing machine." },
      { "step": 3, "title": "Hanging", "desc": "Washed clothes are hung out on lines or racks to dry fully." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Window Cleaning',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  1,
  'Original Price: ₹125',
  'Dusting window mesh/screens, cleaning sills from inside, and sliding channel tracks cleaning.',
  '{
    "about_text": "Breathe fresh air through clean windows. We clear dust from meshes, wipe sills from inside, and sweep sliding channels.",
    "included_features": [
      "Surface dust removal from window mesh/screens",
      "Wiping window sills if accessible from inside",
      "Light cleaning of interior window tracks/sliding channels"
    ],
    "excluded_features": [
      "Exterior window glass outside cleaning",
      "Cleaning of any other surfaces (walls/furniture/balcony)",
      "Balcony/outside window access",
      "Removal of old stains/paint marks or hard deposits",
      "Deep scrubbing of tracks or grooves"
    ],
    "faqs": [
      {
        "question": "Do you clean window glass from outside?",
        "answer": "For professional safety reasons, we only wipe accessible glass and sills from the inside."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Window glass", "desc": "Interior window glass is dusted and wiped." },
      { "step": 2, "title": "Window mesh", "desc": "The window mesh is fully dusted and cleaned." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Ironing & Folding',
  '8827db87-3f6e-4c09-9fc0-066042c5b3e0'::uuid, -- Laundry Services
  1,
  'Original Price: ₹125',
  'Ironing and neat folding of daily wear clothes like shirts, t-shirts, and trousers.',
  '{
    "about_text": "Get your clothes pressed and ready to wear. Our professional iron daily wear garments carefully and fold them neatly.",
    "included_features": [
      "Ironing of daily wear clothes such as shirts/t-shirts/trousers and similar garments",
      "Neat folding of ironed clothes after completion"
    ],
    "excluded_features": [
      "Steam Ironing",
      "Blazers or coat sarees",
      "Party wear or delicate designer garments",
      "Bedsheets or curtains",
      "Washing or hand-washing of clothes",
      "Drying clothes (sun-dry or indoor drying)",
      "Arranging clothes inside wardrobe or cupboards",
      "Dirty clothes will not be pressed"
    ],
    "faqs": [
      {
        "question": "Do you offer steam ironing?",
        "answer": "No, this is a standard dry ironing service using a normal electric iron. Steam ironing is not included."
      },
      {
        "question": "Will you arrange clothes inside my cupboard?",
        "answer": "Wardrobe rearrangement is excluded. Clothes are neatly folded and handed over to you after ironing."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Ironing", "desc": "The clothes are cautiously ironed while adhering to all safety standards." },
      { "step": 2, "title": "Folding", "desc": "The ironed clothes are carefully handled and gently folded." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'After-Party Express Clean',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  149,
  'Original Price: ₹175 | 90 mins service time',
  '90 minutes express post-party cleanup including spill cleaning, trash disposal, kitchen resetting, and floor mopping.',
  '{
    "about_text": "Worry-free post-party cleanup. In 90 minutes, we clean spills, collect trash and bottles, reset kitchen counters, wipe stoves, wash dishes, and sweep/mop floors.",
    "included_features": [
      "90 mins service time",
      "Floor & spill cleanup",
      "Trash + bottle disposal",
      "Kitchen reset (counter, sink, stove top, utensils)",
      "Bathroom clean",
      "Living room tidy",
      "Full house floor sweeping & mopping"
    ],
    "excluded_features": [
      "Vomit cleaning, upholstery/appliance interiors, chimneys, or balcony exteriors",
      "Heavy grease or stains cleaning, removal of construction debris, and bulk waste",
      "Tasks outside the defined package scope and work beyond the booked time"
    ],
    "faqs": [
      {
        "question": "Will you handle biohazards or organic wastes like vomit?",
        "answer": "No, cleaning organic biohazard spills like vomit or animal waste is strictly excluded due to health and safety regulations."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Plan the Work", "desc": "Your professional plans the tasks as per your needs and the 90-minute time booked." },
      { "step": 2, "title": "Start Cleaning", "desc": "They''ll begin with the tasks you want like floor spill cleanup, bottle disposal, kitchen resetting, or bathroom tidying." },
      { "step": 3, "title": "Final Checks", "desc": "Before finishing, they''ll give a quick wipe to make sure everything looks clean and tidy." }
    ]
  }'::jsonb,
  true,
  null
),
(
  'Complete Wardrobe',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning
  497,
  'Flat Rate | Up to 3 hours of service included',
  'Thorough interior wardrobe cleaning, dusting shelves, drawers, handle cleaning, and folding clothes neatly.',
  '{
    "about_text": "A perfectly organized wardrobe awaits. We wipe down cabinet interiors, remove dust from shelves and drawers, clean external handles, fold your clothes, and rearrange them neatly.",
    "included_features": [
      "Up to 3 hours of service included",
      "Interior Cleaning",
      "Clothes rearrangement & organization",
      "Interior wardrobe cleaning",
      "Shelf & drawer dusting",
      "Handle & edge cleaning",
      "Exterior dry dusting"
    ],
    "excluded_features": [
      "Washing or cleaning clothes/personal items",
      "Removal of stubborn stains, mold or damage repair",
      "Moving heavy wardrobes or furniture",
      "Wet polishing or chemical treatment of surfaces"
    ],
    "faqs": [
      {
        "question": "Do you clean stains inside the wooden wardrobe?",
        "answer": "We wet and dry wipe to remove dust. Removing heavy mold, water damage, or deep permanent stains is not covered."
      }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dry Dusting", "desc": "All wardrobe surfaces are dry-dusted to remove dirt and cobwebs." },
      { "step": 2, "title": "Exterior Cleaning", "desc": "The outer surfaces of the wardrobe are wiped clean for a fresh look." },
      { "step": 3, "title": "Interior Cleaning", "desc": "Shelves, drawers, and corners are cleaned to remove dust and lint." },
      { "step": 4, "title": "Folding Clothes & Rearranging", "desc": "Clothes and items are neatly folded and arranged inside the wardrobe." },
      { "step": 5, "title": "Final Wipe", "desc": "A final wipe ensures every surface looks clean and well-organized." }
    ]
  }'::jsonb,
  true,
  null
);

-- Update service image URLs
UPDATE public.services SET image_url = '/assets/services/utensils.png' WHERE title = 'Utensils';
UPDATE public.services SET image_url = '/assets/services/bathroom_cleaning.png' WHERE title = 'Bathroom Cleaning';
UPDATE public.services SET image_url = '/assets/services/sweeping_mopping.png' WHERE title = 'Sweeping & Mopping';
UPDATE public.services SET image_url = '/assets/services/dusting_wiping.png' WHERE title = 'Dusting & Wiping';
UPDATE public.services SET image_url = '/assets/services/fridge_cleaning.png' WHERE title = 'Fridge Cleaning';
UPDATE public.services SET image_url = '/assets/services/pre_party_clean.png' WHERE title = 'Pre-Party Express Clean';
UPDATE public.services SET image_url = '/assets/services/packing_unpacking.png' WHERE title = 'Packing or Unpacking';
UPDATE public.services SET image_url = '/assets/services/kitchen_prep.png' WHERE title = 'Kitchen Prep';
UPDATE public.services SET image_url = '/assets/services/plant_care.png' WHERE title = 'Plant Care';
UPDATE public.services SET image_url = '/assets/services/car_cleaning.png' WHERE title = 'Car Surface Cleaning';
UPDATE public.services SET image_url = '/assets/services/cabinet_cleaning.png' WHERE title = 'Kitchen Cabinets Cleaning';
UPDATE public.services SET image_url = '/assets/services/fan_cleaning.png' WHERE title = 'Fan Cleaning';
UPDATE public.services SET image_url = '/assets/services/balcony_cleaning.png' WHERE title = 'Balcony Cleaning';
UPDATE public.services SET image_url = '/assets/services/kitchen_cleaning.png' WHERE title = 'Kitchen Cleaning';
UPDATE public.services SET image_url = '/assets/services/laundry.png' WHERE title = 'Laundry';
UPDATE public.services SET image_url = '/assets/services/window_cleaning.png' WHERE title = 'Window Cleaning';
UPDATE public.services SET image_url = '/assets/services/ironing_folding.png' WHERE title = 'Ironing & Folding';
UPDATE public.services SET image_url = '/assets/services/after_party_clean.png' WHERE title = 'After-Party Express Clean';
UPDATE public.services SET image_url = '/assets/services/wardrobe_cleaning.png' WHERE title = 'Complete Wardrobe';

