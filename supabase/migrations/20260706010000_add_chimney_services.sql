-- SQL Migration to add Chimney and Kitchen Services
-- Name: 20260706010000_add_chimney_services.sql

-- 1. Create 'Kitchen' Subcategory if it does not exist under 'Home Repairs & Maintenance'
-- '4f18fd15-29cd-4aff-b47f-64f68852df4b' is the category ID for 'Home Repairs & Maintenance'
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, 'Kitchen', 'kitchen', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 2. Insert or Update Services
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
  pricing_config,
  price_breakdown,
  page_content,
  slug,
  image_url
) VALUES 
-- Chimney Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0041'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Chimney Installation',
  'Get your kitchen chimney professionally installed by experienced technicians. We ensure secure mounting, proper duct alignment, electrical safety checks, and performance testing for hassle-free operation.',
  599.00,
  999.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Wall Mount: ₹599 | Island: ₹1499',
  '{
    "about_text": "Get your kitchen chimney professionally installed by experienced technicians. We ensure secure mounting, proper duct alignment, electrical safety checks, and performance testing for hassle-free operation.",
    "included_features": [
      "Professional chimney installation",
      "Secure wall or island mounting",
      "Alignment and leveling of chimney",
      "Electrical connection check",
      "Performance and suction testing after installation"
    ],
    "excluded_features": [
      "Chimney unit and accessories",
      "Duct pipe, clamps, bends, or extension kits",
      "Core cutting, civil work, or granite cutting",
      "New electrical wiring or socket installation",
      "Uninstallation of existing chimney (book separately)"
    ],
    "faqs": [
      { "question": "Which chimney types do you install?", "answer": "Wall-mounted and island kitchen chimneys." },
      { "question": "Are duct pipes included?", "answer": "No, duct pipes and accessories are charged separately if required." },
      { "question": "Is drilling included?", "answer": "Standard wall drilling is included. Core cutting or civil work is charged separately." },
      { "question": "Do you install all chimney brands?", "answer": "Yes, we install all major brands." },
      { "question": "How long does installation take?", "answer": "Typically 60–90 minutes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." },
      { "icon": "build", "title": "Perfect Alignment", "desc": "Precision leveling and mounting for smooth operation." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Book Visit", "desc": "Select your mounting type and schedule a time slot." },
      { "step": 2, "title": "Secure Mounting", "desc": "The technician mounts the chimney unit and aligns the ducting." },
      { "step": 3, "title": "Testing", "desc": "Suction and performance are fully tested before completion." }
    ]
  }'::jsonb,
  'chimney-installation',
  '/assets/services/kitchen_cleaning.png'
),
-- Chimney Uninstallation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0042'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Chimney Uninstallation',
  'Safely remove your kitchen chimney for relocation, replacement, or renovation without damaging the appliance or surrounding surfaces.',
  459.00,
  799.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Wall Mount: ₹459 | Island: ₹799',
  '{
    "about_text": "Safely remove your kitchen chimney for relocation, replacement, or renovation without damaging the appliance or surrounding surfaces.",
    "included_features": [
      "Safe chimney removal",
      "Electrical disconnection",
      "Removal of mounting hardware (where applicable)",
      "Basic inspection after removal",
      "Customer handover"
    ],
    "excluded_features": [
      "Transportation of chimney",
      "Installation at another location",
      "Wall repair or repainting",
      "Duct pipe removal from concealed areas",
      "New installation services"
    ],
    "faqs": [
      { "question": "Can the same chimney be reinstalled later?", "answer": "Yes, if it''s in good condition." },
      { "question": "Is transportation included?", "answer": "No." },
      { "question": "Do you uninstall island chimneys?", "answer": "Yes." },
      { "question": "Will the wall be repaired after removal?", "answer": "No, wall repairs are not included." },
      { "question": "How long does uninstallation take?", "answer": "Approximately 30–60 minutes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Safe Removal", "desc": "Careful unmounting to protect your walls and appliance." },
      { "icon": "timer", "title": "Prompt Service", "desc": "Fast and clean chimney dismantling in under an hour." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Schedule Visit", "desc": "Select the chimney type and schedule a convenient time slot." },
      { "step": 2, "title": "Disconnection", "desc": "The professional disconnects the power source and unmounts the unit." },
      { "step": 3, "title": "Handover", "desc": "We hand over the uninstalled chimney and hardware safely." }
    ]
  }'::jsonb,
  'chimney-uninstallation',
  '/assets/services/kitchen_cleaning.png'
),
-- Beyond Chimney Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0043'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Beyond Chimney Installation',
  'Need your chimney installed at a new location or in a kitchen requiring additional ducting or custom fittings? Our Beyond Chimney Installation service covers installations that require extra work beyond standard installation.',
  699.00,
  1199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '60cm: ₹699 | 90cm: ₹699',
  '{
    "about_text": "Need your chimney installed at a new location or in a kitchen requiring additional ducting or custom fittings? Our Beyond Chimney Installation service covers installations that require extra work beyond standard installation.",
    "included_features": [
      "Installation at a new location",
      "Wall or island chimney installation",
      "Basic alignment and leveling",
      "Performance testing after installation",
      "Professional installation by trained technicians"
    ],
    "excluded_features": [
      "Duct pipe, clamps, elbows, and accessories",
      "Core cutting or granite cutting",
      "False ceiling modifications",
      "Electrical wiring and new power points",
      "Civil work or kitchen modifications"
    ],
    "faqs": [
      { "question": "What is Beyond Chimney Installation?", "answer": "It is for installations requiring additional work beyond a standard replacement installation." },
      { "question": "Do you install island chimneys?", "answer": "Yes." },
      { "question": "Are additional materials included?", "answer": "No, they are charged separately if required." },
      { "question": "Can you extend the duct pipe?", "answer": "Yes, extension is available at additional cost." },
      { "question": "Do you install all major chimney brands?", "answer": "Yes, our technicians are trained to install all leading brands." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Custom Solutions", "desc": "Adapts to complex kitchen structures and new locations." },
      { "icon": "construction", "title": "Trained Pros", "desc": "Experienced in complex routing, ducting extensions, and layouts." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Choose Size", "desc": "Select variant according to your chimney size (60cm or 90cm)." },
      { "step": 2, "title": "Site Inspection & Setup", "desc": "The technician plans duct routing and mounts the chimney." },
      { "step": 3, "title": "Duct Extension & Test", "desc": "Pipes are routed/extended and suction functionality is tested." }
    ]
  }'::jsonb,
  'beyond-chimney-installation',
  '/assets/services/kitchen_cleaning.png'
),
-- Deep Chimney Service
(
  'd186c52a-9bae-41e0-81f1-6be4409f0044'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Deep Chimney Service',
  'Restore your kitchen chimney suction power with professional steam cleaning and degreasing to remove oil, grease, carbon deposits, and food residue.',
  1199.00,
  1999.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Wall Mount: ₹1199 | Island: ₹1499',
  '{
    "about_text": "Restore your kitchen chimney''s suction power with our professional Deep Chimney Service. Using advanced steam cleaning and degreasing techniques, we remove stubborn grease, oil, carbon deposits, and food residue from filters and accessible internal components to improve performance and kitchen hygiene.",
    "included_features": [
      "Deep steam cleaning of chimney",
      "Filter cleaning and degreasing",
      "Removal of oil, grease, and carbon deposits",
      "Cleaning of accessible internal components",
      "Exterior body and panel cleaning",
      "Suction and performance testing"
    ],
    "excluded_features": [
      "Motor or blower repairs",
      "PCB or electrical repairs",
      "Spare parts replacement",
      "Duct pipe cleaning beyond accessible area",
      "Chimney installation or uninstallation"
    ],
    "faqs": [
      { "question": "How often should a chimney be deep cleaned?", "answer": "Every 3–6 months, depending on cooking frequency." },
      { "question": "Does deep cleaning improve suction?", "answer": "Yes, removing grease buildup helps restore airflow and suction efficiency." },
      { "question": "Are chemicals safe?", "answer": "Yes, we use appliance-safe cleaning solutions and steam technology." },
      { "question": "Are spare parts included?", "answer": "No, any replacement parts are charged separately after approval." },
      { "question": "Which chimney brands do you service?", "answer": "We service all major kitchen chimney brands." }
    ],
    "why_choose_us": [
      { "icon": "cleaning_services", "title": "Steam Cleaning Tech", "desc": "Advanced degreasing and sanitizing steam to dissolve heavy buildup." },
      { "icon": "insights", "title": "Restores Airflow", "desc": "Clearing filter grease instantly improves suction power." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Book Service", "desc": "Select wall mount or island mount chimney service." },
      { "step": 2, "title": "Dismantling & Steam Misting", "desc": "Filters and components are disassembled and steam misted and degreased." },
      { "step": 3, "title": "Assembly & Test", "desc": "Reassembly and post-clean testing to ensure maximum suction." }
    ]
  }'::jsonb,
  'deep-chimney-service',
  '/assets/services/kitchen_cleaning.png'
),
-- Chimney Repair Check-up
(
  'd186c52a-9bae-41e0-81f1-6be4409f0045'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Chimney Repair Check-up',
  'Inspect noise, suction loss, or starting issues. Get an exact fault diagnosis and transparent repair estimate from certified technicians.',
  160.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Wall Mount: ₹160 | Island: ₹160',
  '{
    "about_text": "Is your chimney making noise, not starting, or losing suction? Our certified technicians inspect your chimney, identify the exact fault, and provide a transparent repair estimate before any repair work begins.",
    "included_features": [
      "Complete chimney inspection",
      "Motor and blower diagnosis",
      "Electrical and switch inspection",
      "Suction performance testing",
      "Transparent repair quotation"
    ],
    "excluded_features": [
      "Spare parts and replacement components",
      "Motor or PCB replacement",
      "Deep chimney cleaning",
      "Installation or uninstallation services",
      "Major repair charges"
    ],
    "faqs": [
      { "question": "What issues are inspected?", "answer": "Low suction, unusual noise, power issues, auto-switch faults, vibration, and unknown performance problems." },
      { "question": "Are repair charges included?", "answer": "No, inspection covers diagnosis only. Repairs are quoted separately." },
      { "question": "Can repairs be completed on the same visit?", "answer": "Yes, subject to spare part availability and your approval." },
      { "question": "Do you inspect all chimney brands?", "answer": "Yes." },
      { "question": "Is there a warranty after repair?", "answer": "Yes, applicable warranty is provided on repairs and PHS-supplied spare parts." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Expert Diagnostics", "desc": "Certified experts to identify complex motor, blower, or PCB issues." },
      { "icon": "verified_user", "title": "Transparent Quotes", "desc": "No hidden costs. Get exact repair quotes before we touch anything." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Request Check-up", "desc": "Book an inspection visit for your wall or island chimney." },
      { "step": 2, "title": "Complete Inspection", "desc": "Technician tests switches, blower, and motor health." },
      { "step": 3, "title": "Estimate & Repair", "desc": "Review repair options and estimate to proceed with fixing." }
    ]
  }'::jsonb,
  'chimney-repair-check-up',
  '/assets/services/kitchen_cleaning.png'
),
-- Deep Chimney & Gas Stove Service
(
  'd186c52a-9bae-41e0-81f1-6be4409f0046'::uuid,
  'e8f9c2de-9bae-41e0-81f1-6be4409fb220'::uuid, -- Kitchen subcategory
  'Deep Chimney & Gas Stove Service',
  'Keep your entire cooking area clean with our combo service: deep steam cleaning of kitchen chimney and professional gas stove servicing.',
  1499.00,
  2499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Wall Mount: ₹1499 | Island: ₹1749',
  '{
    "about_text": "Keep your entire cooking area clean with our combo service. This package includes deep steam cleaning of your kitchen chimney and professional gas stove servicing to remove grease, carbon deposits, and improve appliance performance.",
    "included_features": [
      "Deep chimney steam cleaning",
      "Chimney filter cleaning",
      "Gas stove burner cleaning",
      "Nozzle and burner unclogging",
      "Grease and carbon removal",
      "Performance testing of both appliances",
      "Final cleanup after service"
    ],
    "excluded_features": [
      "Spare parts replacement",
      "Chimney motor or PCB repairs",
      "Gas leakage repair",
      "Chimney installation or uninstallation",
      "Gas pipeline modifications"
    ],
    "faqs": [
      { "question": "What is included in this combo service?", "answer": "Deep chimney cleaning along with complete gas stove servicing in a single visit." },
      { "question": "Does the service improve chimney suction and burner flame?", "answer": "Yes, cleaning removes grease and blockages that affect performance." },
      { "question": "Are repairs included?", "answer": "No. If any repair is required, the technician will provide a quotation before proceeding." },
      { "question": "How long does the combo service take?", "answer": "Typically 60–90 minutes, depending on appliance condition." },
      { "question": "Can I book this service for any chimney or gas stove brand?", "answer": "Yes, we service all major chimney and gas stove brands." }
    ],
    "why_choose_us": [
      { "icon": "cleaning_services", "title": "Complete Combo Cleaning", "desc": "Deep steam cleans both chimney filters and burner channels in one visit." },
      { "icon": "restaurant", "title": "Flame & Suction Restore", "desc": "Clearing carbon blockages restores yellow/weak gas flames and improves airflow." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Schedule Combo", "desc": "Select chimney type and book a combo slot." },
      { "step": 2, "title": "Appliance Servicing", "desc": "Burners are unclogged and chimney is steam misted and degreased." },
      { "step": 3, "title": "Testing & Cleanup", "desc": "Both appliances are flame-tested and suction-tested, followed by workspace cleanup." }
    ]
  }'::jsonb,
  'deep-chimney-and-gas-stove-service',
  '/assets/services/kitchen_cleaning.png'
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
  pricing_config = EXCLUDED.pricing_config,
  price_breakdown = EXCLUDED.price_breakdown,
  page_content = EXCLUDED.page_content,
  slug = EXCLUDED.slug,
  image_url = EXCLUDED.image_url;

-- 3. Seed Service Variants
INSERT INTO public.service_variants (id, service_id, title, description, price, original_price, duration_minutes) VALUES
  -- Chimney Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0041'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0041'::uuid, 'Wall Mount Installation', 'Standard mounting on concrete/brick wall with duct alignment.', 599.00, 999.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0042'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0041'::uuid, 'Island Installation', 'Ceiling suspension/island mounting for open kitchen configurations.', 1499.00, 2499.00, 120),

  -- Chimney Uninstallation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0043'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0042'::uuid, 'Wall Mount Uninstallation', 'Safe dismantling of wall-mounted kitchen chimney.', 459.00, 799.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0044'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0042'::uuid, 'Island Uninstallation', 'Safe removal of ceiling-mounted island kitchen chimney.', 799.00, 1299.00, 60),

  -- Beyond Chimney Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0045'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0043'::uuid, '60cm Chimney Installation', 'Advanced chimney installation for 60cm kitchen chimneys in custom settings.', 699.00, 1099.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0046'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0043'::uuid, '90cm Chimney Installation', 'Advanced chimney installation for 90cm kitchen chimneys in custom settings.', 699.00, 1099.00, 90),

  -- Deep Chimney Service Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0047'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0044'::uuid, 'Wall Mount Deep Service', 'Steam cleaning and complete degreasing of wall-mounted chimney.', 1199.00, 1999.00, 120),
  ('e186c52a-9bae-41e0-81f1-6be4409f0048'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0044'::uuid, 'Island Deep Service', 'Steam cleaning and complete degreasing of island chimney.', 1499.00, 2499.00, 150),

  -- Chimney Repair Check-up Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0049'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0045'::uuid, 'Wall Mount Repair Check-up', 'Fault diagnosis and inspection for wall-mounted chimneys.', 160.00, 299.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0050'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0045'::uuid, 'Island Repair Check-up', 'Fault diagnosis and inspection for island chimneys.', 160.00, 299.00, 45),

  -- Deep Chimney & Gas Stove Service Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0051'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0046'::uuid, 'Wall Mount Combo Service', 'Deep steam chimney cleaning (wall mount) and gas stove service.', 1499.00, 2499.00, 120),
  ('e186c52a-9bae-41e0-81f1-6be4409f0052'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0046'::uuid, 'Island Combo Service', 'Deep steam chimney cleaning (island mount) and gas stove service.', 1749.00, 2999.00, 150)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_minutes = EXCLUDED.duration_minutes;
