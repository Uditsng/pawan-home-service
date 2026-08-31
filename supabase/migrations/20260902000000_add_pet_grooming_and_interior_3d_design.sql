-- SQL Migration to add 'Pet grooming' and 'Interior & 3D Design' Categories, Subcategories, and Services
-- Name: 20260902000000_add_pet_grooming_and_interior_3d_design.sql

-- 1. Create/Insert Categories
INSERT INTO public.categories (id, category_name) VALUES
  ('9ea6c71c-30ad-4ef7-8c35-1d096a605f6f'::uuid, 'Pet grooming'),
  ('aeb6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid, 'Interior & 3D Design')
ON CONFLICT (id) DO UPDATE SET category_name = EXCLUDED.category_name;

-- 2. Create/Insert Subcategories
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  -- Pet grooming subcategories
  ('1e9a7812-40ad-4ef7-8c35-1d096a605f01'::uuid, 'Pet Bath & Washing', 'pets', '9ea6c71c-30ad-4ef7-8c35-1d096a605f6f'::uuid),
  ('1e9a7812-40ad-4ef7-8c35-1d096a605f02'::uuid, 'Pet Haircut & Styling', 'content_cut', '9ea6c71c-30ad-4ef7-8c35-1d096a605f6f'::uuid),
  ('1e9a7812-40ad-4ef7-8c35-1d096a605f03'::uuid, 'Complete Pet Grooming Packages', 'cruelty_free', '9ea6c71c-30ad-4ef7-8c35-1d096a605f6f'::uuid),
  -- Interior & 3D Design subcategories
  ('2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, '3D Interior Room Design', 'view_in_ar', 'aeb6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('2f0b8923-50be-4f48-9d46-2e107b716002'::uuid, '3D Exterior Elevation', 'architecture', 'aeb6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid),
  ('2f0b8923-50be-4f48-9d46-2e107b716003'::uuid, '2D Architectural Drawings', 'square_foot', 'aeb6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 3. Insert Services
INSERT INTO public.services (
  id,
  subcategory_id,
  title,
  description,
  base_price,
  original_price,
  price_breakdown,
  category,
  slug,
  status,
  is_active,
  pricing_model,
  image_url,
  page_content
) VALUES

-- ----------------------------------------------------
-- PET GROOMING SERVICES
-- ----------------------------------------------------

-- 1. Spa Bath
(
  'b7a10293-81ef-4011-a5c1-111111111101'::uuid,
  '1e9a7812-40ad-4ef7-8c35-1d096a605f01'::uuid, -- Pet Bath & Washing
  'Spa Bath',
  'Give your pet a refreshing bath and professional blow dry for a clean and fresh feel.',
  799.00,
  1199.00,
  '₹799 starting price',
  'Pet grooming',
  'spa-bath',
  'published',
  true,
  'fixed',
  '/assets/services/pet_grooming.png',
  '{
    "about_text": "Give your pet a refreshing bath and professional blow dry for a clean and fresh feel.",
    "included_features": [
      "Pet Bath",
      "Professional Blow Dry"
    ],
    "excluded_features": [
      "Full Body Haircut",
      "Hair Trimming",
      "Hygiene Haircut"
    ],
    "faqs": [
      { "question": "What is included in the Spa Bath service?", "answer": "The service includes a refreshing pet bath followed by a professional blow dry." },
      { "question": "Does Spa Bath include a haircut?", "answer": "No. Haircut and hair trimming are not included in the Spa Bath package." },
      { "question": "Is blow drying included?", "answer": "Yes, professional blow drying is included." },
      { "question": "How much does the Spa Bath service cost?", "answer": "The Spa Bath package starts at ₹799." }
    ],
    "why_choose_us": [
      { "icon": "pets", "title": "Gentle Handling", "desc": "Certified pet groomers experienced in keeping pets calm and happy." },
      { "icon": "verified_user", "title": "Hygiene Guaranteed", "desc": "Pet-friendly pH-balanced shampoos and sanitized equipment used." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Setup", "desc": "Groomer sets up pet bathing workstation at your home." },
      { "step": 2, "title": "Refreshing Bath", "desc": "Warm water bath using gentle pet shampoo." },
      { "step": 3, "title": "Blow Dry & Fluff", "desc": "Professional low-noise blow drying and coat fluffing." }
    ]
  }'::jsonb
),

-- 2. Haircut
(
  'b7a10293-81ef-4011-a5c1-111111111102'::uuid,
  '1e9a7812-40ad-4ef7-8c35-1d096a605f02'::uuid, -- Pet Haircut & Styling
  'Haircut',
  'Give your pet a neat and well-groomed appearance with a full body haircut and trimming.',
  999.00,
  1499.00,
  '₹999 starting price',
  'Pet grooming',
  'pet-haircut',
  'published',
  true,
  'fixed',
  '/assets/services/pet_grooming.png',
  '{
    "about_text": "Give your pet a neat and well-groomed appearance with a full body haircut and trimming.",
    "included_features": [
      "Full Body Haircut",
      "Hair Trimming"
    ],
    "excluded_features": [
      "Bath",
      "Blow Dry",
      "Hygiene Haircut"
    ],
    "faqs": [
      { "question": "What is included in the Haircut service?", "answer": "The package includes a full body haircut and hair trimming." },
      { "question": "Does the Haircut package include a bath?", "answer": "No. Bathing is not included in this package." },
      { "question": "Does it include a blow dry?", "answer": "No. Blow drying is not included." },
      { "question": "How much does the Haircut service cost?", "answer": "The Haircut package starts at ₹999." }
    ],
    "why_choose_us": [
      { "icon": "content_cut", "title": "Precision Styling", "desc": "Breed-specific scissor trimming and professional coat styling." },
      { "icon": "verified_user", "title": "Safe Clippers", "desc": "Sanitized, low-vibration clippers to ensure your pet remains comfortable." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Coat Inspection", "desc": "Groomer checks coat length and owner preferences." },
      { "step": 2, "title": "Trim & Style", "desc": "Precision full body haircut and hair trimming." }
    ]
  }'::jsonb
),

-- 3. Basic Grooming
(
  'b7a10293-81ef-4011-a5c1-111111111103'::uuid,
  '1e9a7812-40ad-4ef7-8c35-1d096a605f03'::uuid, -- Complete Pet Grooming Packages
  'Basic Grooming',
  'Essential pet grooming with a hygiene haircut, refreshing bath, and professional blow dry.',
  1100.00,
  1599.00,
  '₹1,100 starting price',
  'Pet grooming',
  'basic-grooming',
  'published',
  true,
  'fixed',
  '/assets/services/pet_grooming.png',
  '{
    "about_text": "Essential pet grooming with a hygiene haircut, refreshing bath, and professional blow dry.",
    "included_features": [
      "Hygiene Haircut",
      "Pet Bath",
      "Professional Blow Dry"
    ],
    "excluded_features": [
      "Full Body Haircut",
      "Hair Trimming"
    ],
    "faqs": [
      { "question": "What is included in Basic Grooming?", "answer": "Basic Grooming includes a hygiene haircut, bath, and professional blow dry." },
      { "question": "Does Basic Grooming include a full body haircut?", "answer": "No. A full body haircut is not included in the Basic Grooming package." },
      { "question": "Is bathing included?", "answer": "Yes, a pet bath is included." },
      { "question": "How much does Basic Grooming cost?", "answer": "The Basic Grooming package starts at ₹1,100." }
    ],
    "why_choose_us": [
      { "icon": "pets", "title": "All-in-One Essential", "desc": "Combines hygiene trimming with complete bath and drying care." },
      { "icon": "verified_user", "title": "Doorstep Comfort", "desc": "Performed right inside your home with minimal stress for your pet." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Hygiene Clip", "desc": "Sanitary and paw pad area haircut." },
      { "step": 2, "title": "Shampoo Bath", "desc": "Deep coat wash with soothing pet shampoo." },
      { "step": 3, "title": "Blow Dry", "desc": "Full blow dry and final fur brushing." }
    ]
  }'::jsonb
),

-- 4. Full Grooming
(
  'b7a10293-81ef-4011-a5c1-111111111104'::uuid,
  '1e9a7812-40ad-4ef7-8c35-1d096a605f03'::uuid, -- Complete Pet Grooming Packages
  'Full Grooming',
  'A complete pet grooming makeover with a full body haircut, refreshing bath, and professional blow dry.',
  1300.00,
  1899.00,
  '₹1,300 starting price',
  'Pet grooming',
  'full-grooming',
  'published',
  true,
  'fixed',
  '/assets/services/pet_grooming.png',
  '{
    "about_text": "A complete pet grooming makeover with a full body haircut, refreshing bath, and professional blow dry.",
    "included_features": [
      "Full Body Haircut",
      "Pet Bath",
      "Professional Blow Dry"
    ],
    "excluded_features": [
      "Services not specifically listed in the package"
    ],
    "faqs": [
      { "question": "What is included in Full Grooming?", "answer": "Full Grooming includes a full body haircut, bath, and professional blow dry." },
      { "question": "Does Full Grooming include a bath?", "answer": "Yes, a refreshing pet bath is included." },
      { "question": "Does Full Grooming include blow drying?", "answer": "Yes, professional blow drying is included." },
      { "question": "How much does Full Grooming cost?", "answer": "The Full Grooming package starts at ₹1,300." },
      { "question": "Is Full Grooming a complete grooming package?", "answer": "It is the most comprehensive package among the listed grooming options and combines haircut, bath, and blow dry." }
    ],
    "why_choose_us": [
      { "icon": "cruelty_free", "title": "Complete Makeover", "desc": "Our most popular head-to-tail grooming solution for dogs and cats." },
      { "icon": "verified_user", "title": "Expert Stylists", "desc": "Handled by senior pet stylists with gentle care." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Haircut", "desc": "Full body haircut as per breed standard or owner choice." },
      { "step": 2, "title": "Bath & Conditioning", "desc": "Thorough bath with pet conditioner." },
      { "step": 3, "title": "Blow Dry & Finishing", "desc": "Blow drying, coat brushing, and final styling." }
    ]
  }'::jsonb
),

-- 5. Dry Bath
(
  'b7a10293-81ef-4011-a5c1-111111111105'::uuid,
  '1e9a7812-40ad-4ef7-8c35-1d096a605f01'::uuid, -- Pet Bath & Washing
  'Dry Bath',
  'A quick water-free pet freshening service using dry shampoo and professional blow dry.',
  399.00,
  599.00,
  '₹399 starting price*',
  'Pet grooming',
  'dry-bath',
  'published',
  true,
  'fixed',
  '/assets/services/pet_grooming.png',
  '{
    "about_text": "A quick water-free pet freshening service using dry shampoo and professional blow dry.",
    "included_features": [
      "Dry Shampoo Bath",
      "Professional Blow Dry"
    ],
    "excluded_features": [
      "Full Body Haircut",
      "Hair Trimming",
      "Regular Water Bath",
      "Hygiene Haircut"
    ],
    "faqs": [
      { "question": "What is a Dry Bath for pets?", "answer": "Dry Bath is a water-free grooming option that uses dry shampoo followed by a professional blow dry." },
      { "question": "Does Dry Bath require water?", "answer": "No. It is designed as a water-free bathing option." },
      { "question": "Does Dry Bath include a haircut?", "answer": "No. Haircut and trimming are not included." },
      { "question": "How much does Dry Bath cost?", "answer": "The Dry Bath package starts at ₹399*." },
      { "question": "Why does the Dry Bath price have an asterisk?", "answer": "The final price may depend on the applicable service conditions. The exact pricing note should be displayed clearly before booking." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Water-Free & Quick", "desc": "Ideal for pets averse to water, sick pets, or winter days." },
      { "icon": "verified_user", "title": "Deodorizing Formula", "desc": "Removes odor and leaves coat clean and fluffy instantly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dry Shampoo Application", "desc": "Application of waterless foam shampoo." },
      { "step": 2, "title": "Massage & Dry", "desc": "Gentle coat massage and professional blow dry." }
    ]
  }'::jsonb
),

-- ----------------------------------------------------
-- INTERIOR & 3D DESIGN SERVICES
-- ----------------------------------------------------

-- 6. Modular Kitchen (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222201'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, -- 3D Interior Room Design
  'Modular Kitchen (3D)',
  'Get a realistic 3D design of your modular kitchen to visualize the layout, furniture, and overall look before execution.',
  1000.00,
  1500.00,
  '₹1,000 starting price',
  'Interior & 3D Design',
  'modular-kitchen-3d',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "Get a realistic 3D design of your modular kitchen to visualize the layout, furniture, and overall look before execution.",
    "included_features": [
      "3D Modular Kitchen Design",
      "High-Quality 3D Render",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction or Installation",
      "Materials and Furniture",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What is included in the Modular Kitchen 3D Design service?", "answer": "It includes a professional 3D design of your modular kitchen with high-quality renders and basic revisions." },
      { "question": "Will I get a realistic view of my kitchen?", "answer": "Yes, the service provides 3D renders to help you visualize the proposed kitchen design." },
      { "question": "Does the service include kitchen installation?", "answer": "No. This service is for design and presentation only." },
      { "question": "How much does Modular Kitchen 3D Design cost?", "answer": "The service starts at ₹1,000." }
    ],
    "why_choose_us": [
      { "icon": "view_in_ar", "title": "Photorealistic 3D", "desc": "High-fidelity lighting and material renders." },
      { "icon": "countertops", "title": "Custom Cabinets & Layout", "desc": "Tailored to your exact kitchen dimensions and storage needs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Share Measurements", "desc": "Provide room dimensions and layout preferences." },
      { "step": 2, "title": "3D Drafting", "desc": "Architect creates initial 3D kitchen render." },
      { "step": 3, "title": "Review & Revisions", "desc": "Final presentation with basic revisions included." }
    ]
  }'::jsonb
),

-- 7. Bedroom (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222202'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, -- 3D Interior Room Design
  'Bedroom (3D)',
  'Visualize your bedroom with a professional 3D interior design created around your space and requirements.',
  1500.00,
  2200.00,
  '₹1,500 starting price',
  'Interior & 3D Design',
  'bedroom-3d',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "Visualize your bedroom with a professional 3D interior design created around your space and requirements.",
    "included_features": [
      "3D Bedroom Design",
      "High-Quality 3D Render",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction or Installation",
      "Materials and Furniture",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What does the Bedroom 3D Design service include?", "answer": "It includes a professional 3D bedroom design with high-quality renders and basic revisions." },
      { "question": "Can I see how my bedroom will look before execution?", "answer": "Yes. The 3D design helps you visualize the proposed bedroom interior." },
      { "question": "Does the service include furniture or construction?", "answer": "No. The service covers design and presentation only." },
      { "question": "How much does Bedroom 3D Design cost?", "answer": "The service starts at ₹1,500." }
    ],
    "why_choose_us": [
      { "icon": "bed", "title": "Space Optimization", "desc": "Smart wardrobe and bed placement planning." },
      { "icon": "palette", "title": "Color & Texture Match", "desc": "Harmonious wallpaper, headboard, and lighting concepts." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Briefing", "desc": "Share room dimensions and style preferences." },
      { "step": 2, "title": "3D Render Creation", "desc": "Design team builds photorealistic bedroom model." },
      { "step": 3, "title": "Delivery", "desc": "Receive full presentation & render views." }
    ]
  }'::jsonb
),

-- 8. Master Bedroom + Bathroom (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222203'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, -- 3D Interior Room Design
  'Master Bedroom + Bathroom (3D)',
  'Get a professional 3D design for your master bedroom and bathroom to visualize the complete interior concept.',
  2000.00,
  3000.00,
  '₹2,000 starting price',
  'Interior & 3D Design',
  'master-bedroom-bathroom-3d',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "Get a professional 3D design for your master bedroom and bathroom to visualize the complete interior concept.",
    "included_features": [
      "3D Master Bedroom Design",
      "3D Bathroom Design",
      "High-Quality 3D Renders",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction or Installation",
      "Materials and Furniture",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What is included in the Master Bedroom + Bathroom 3D service?", "answer": "The service includes 3D designs for both the master bedroom and bathroom." },
      { "question": "Will both spaces be shown in 3D?", "answer": "Yes. The package covers a 3D design for the master bedroom and bathroom." },
      { "question": "Does this package include construction work?", "answer": "No. It is a design service and does not include physical construction or installation." },
      { "question": "How much does the service cost?", "answer": "The service starts at ₹2,000." }
    ],
    "why_choose_us": [
      { "icon": "domain", "title": "Unified Suite Concept", "desc": "Coordinated theme between master bedroom and ensuite bathroom." },
      { "icon": "verified_user", "title": "High-Res Renders", "desc": "Multiple view angles for both room and bathroom." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Floor Measurements", "desc": "Provide bedroom and attached bathroom layouts." },
      { "step": 2, "title": "3D Suite Modeling", "desc": "Creation of combined 3D renders." },
      { "step": 3, "title": "Presentation", "desc": "Review presentation with revision option." }
    ]
  }'::jsonb
),

-- 9. Living Room (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222204'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, -- 3D Interior Room Design
  'Living Room (3D)',
  'Transform your living room vision into a professional 3D interior design with realistic visual presentation.',
  2000.00,
  2999.00,
  '₹2,000 starting price',
  'Interior & 3D Design',
  'living-room-3d',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "Transform your living room vision into a professional 3D interior design with realistic visual presentation.",
    "included_features": [
      "3D Living Room Design",
      "High-Quality 3D Render",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction or Installation",
      "Materials and Furniture",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What is included in the Living Room 3D Design?", "answer": "The service includes a professional 3D living room design with high-quality renders and basic revisions." },
      { "question": "Can I visualize the living room before starting the work?", "answer": "Yes. The 3D design allows you to preview the proposed living room concept." },
      { "question": "Does the service include furniture or interior execution?", "answer": "No. Furniture, materials, construction, and execution are not included." },
      { "question": "How much does Living Room 3D Design cost?", "answer": "The service starts at ₹2,000." }
    ],
    "why_choose_us": [
      { "icon": "chair", "title": "TV Unit & Seating Layout", "desc": "Optimal arrangement for sofas, accent walls, and media consoles." },
      { "icon": "lightbulb", "title": "Lighting & False Ceiling", "desc": "Visualizing chandeliers, LED strips, and ambient lighting." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Input Gathering", "desc": "Share living room dimensions & structural details." },
      { "step": 2, "title": "3D Render Generation", "desc": "Detailed 3D model with textures and furnishings." },
      { "step": 3, "title": "Final Output", "desc": "Receive renders and design presentation." }
    ]
  }'::jsonb
),

-- 10. Bathroom (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222205'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716001'::uuid, -- 3D Interior Room Design
  'Bathroom (3D)',
  'Visualize your bathroom with a detailed 3D interior design and professional presentation.',
  800.00,
  1200.00,
  '₹800 starting price',
  'Interior & 3D Design',
  'bathroom-3d',
  'published',
  true,
  'fixed',
  '/assets/services/bathroom_cleaning.png',
  '{
    "about_text": "Visualize your bathroom with a detailed 3D interior design and professional presentation.",
    "included_features": [
      "3D Bathroom Design",
      "High-Quality 3D Render",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction or Installation",
      "Materials and Fixtures",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What is included in the Bathroom 3D Design service?", "answer": "It includes a professional 3D bathroom design with high-quality renders and basic revisions." },
      { "question": "Can I see the proposed bathroom design before execution?", "answer": "Yes. The 3D render helps you visualize the proposed bathroom design." },
      { "question": "Does the service include bathroom construction?", "answer": "No. This is a design service only." },
      { "question": "How much does Bathroom 3D Design cost?", "answer": "The service starts at ₹800." }
    ],
    "why_choose_us": [
      { "icon": "bathtub", "title": "Tile & Fixture Visuals", "desc": "Preview tile patterns, vanity placements, and glass partitions." },
      { "icon": "verified_user", "title": "Compact Layout Plan", "desc": "Maximizing wet and dry area separation in small spaces." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Share Layout", "desc": "Provide bathroom measurements and plumbing points." },
      { "step": 2, "title": "3D Render", "desc": "Architect models tiles, vanity, and sanitary ware." },
      { "step": 3, "title": "Deliver Renders", "desc": "Receive high-res 3D presentation." }
    ]
  }'::jsonb
),

-- 11. House Elevation (3D)
(
  'c8b21304-92fa-5122-b6d2-222222222206'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716002'::uuid, -- 3D Exterior Elevation
  'House Elevation (3D)',
  'Create a professional 3D house elevation design to visualize the exterior appearance of your home.',
  5000.00,
  7500.00,
  '₹5,000 starting price',
  'Interior & 3D Design',
  'house-elevation-3d',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "Create a professional 3D house elevation design to visualize the exterior appearance of your home.",
    "included_features": [
      "3D House Elevation Design",
      "High-Quality 3D Render",
      "Basic Revisions",
      "Professional Presentation"
    ],
    "excluded_features": [
      "2D Working Drawing",
      "Physical Construction",
      "Construction Materials",
      "Execution of the Design"
    ],
    "faqs": [
      { "question": "What is a 3D House Elevation Design?", "answer": "It is a 3D visualization of your home''s exterior that helps you see how the finished elevation can look." },
      { "question": "What does the House Elevation 3D service include?", "answer": "It includes a professional 3D elevation design, high-quality render, and basic revisions." },
      { "question": "Does the service include construction?", "answer": "No. Construction and execution are not included." },
      { "question": "How much does House Elevation 3D Design cost?", "answer": "The service starts at ₹5,000." }
    ],
    "why_choose_us": [
      { "icon": "architecture", "title": "Modern Facade Visuals", "desc": "Realistic materials, stone cladding, glass, and exterior lighting." },
      { "icon": "verified_user", "title": "Architectural Grade", "desc": "Designed by experienced architectural rendering professionals." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Building Plan Share", "desc": "Provide front dimensions & story floorplan." },
      { "step": 2, "title": "3D Exterior Modeling", "desc": "3D modeling of building front & side elevation." },
      { "step": 3, "title": "Final 4K Renders", "desc": "Delivery of exterior elevation renders." }
    ]
  }'::jsonb
),

-- 12. 2D Working Drawing (Any Room)
(
  'c8b21304-92fa-5122-b6d2-222222222207'::uuid,
  '2f0b8923-50be-4f48-9d46-2e107b716003'::uuid, -- 2D Architectural Drawings
  '2D Working Drawing (Any Room)',
  'Get a professional 2D working drawing for a room whose 3D design has already been created. (PREREQUISITE: Only available for rooms with an existing PHS 3D design).',
  1000.00,
  1500.00,
  '₹1,000 starting price',
  'Interior & 3D Design',
  '2d-working-drawing-any-room',
  'published',
  true,
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '{
    "about_text": "IMPORTANT PREREQUISITE: This service is ONLY available for rooms whose 3D design has already been created with PHS Cleaning Company. Get a professional 2D working drawing containing exact dimensions and technical layout specs.",
    "included_features": [
      "2D Working Drawing",
      "Professional Presentation",
      "Basic Revisions",
      "Drawing for the Selected Room",
      "Prerequisite: Room must have an existing PHS 3D design"
    ],
    "excluded_features": [
      "3D Design",
      "Physical Construction or Installation",
      "Materials and Furniture",
      "Working Drawings for Rooms Without an Existing 3D Design"
    ],
    "faqs": [
      { "question": "What is included in the 2D Working Drawing service?", "answer": "The service provides a 2D working drawing for a selected room." },
      { "question": "Can I order a 2D drawing for any room?", "answer": "Yes, the service is available for any room whose 3D design has already been created." },
      { "question": "Do I need to have a 3D design first?", "answer": "Yes. According to the price list, the 2D working drawing is provided ONLY for a room for which the 3D design has already been created." },
      { "question": "Does this service include 3D design?", "answer": "No. 3D design is not included in this service." },
      { "question": "How much does a 2D Working Drawing cost?", "answer": "The service starts at ₹1,000." }
    ],
    "why_choose_us": [
      { "icon": "square_foot", "title": "Execution Ready", "desc": "Detailed dimensions and electrical/plumbing placement points for carpenters and contractors." },
      { "icon": "info", "title": "Strict Business Rule", "desc": "Ensures seamless translation from existing 3D render to physical working drawings." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "3D Design Verification", "desc": "Provide your previous PHS 3D design reference." },
      { "step": 2, "title": "2D Drafting", "desc": "Architect creates precise 2D dimensioned working drawings." },
      { "step": 3, "title": "Delivery", "desc": "Receive printable 2D blueprint layout." }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  original_price = EXCLUDED.original_price,
  price_breakdown = EXCLUDED.price_breakdown,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  pricing_model = EXCLUDED.pricing_model,
  image_url = EXCLUDED.image_url,
  page_content = EXCLUDED.page_content;
