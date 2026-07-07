-- SQL Migration to add Handyman and Home Services
-- Name: 20260706050000_add_handyman_and_home_services.sql

-- 1. Create New Subcategories under 'Home Repairs & Maintenance' (Category ID: '4f18fd15-29cd-4aff-b47f-64f68852df4b')
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd7'::uuid, 'EV Charger Installation', 'electric_car', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, 'Hanging & Mounting Services', 'wallpaper', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, 'Cupboard & Drawer Services', 'kitchen', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, 'Door Services', 'meeting_room', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cddb'::uuid, 'Child Safety & Proofing', 'child_care', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, 'Curtain & Blinds Services', 'blinds', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cddd'::uuid, 'Window Services', 'window', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 2. Insert or Update Handyman Services
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
-- 1. EV Charger Installation (2-Wheeler)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0080'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd7'::uuid, -- EV Charger Installation subcategory
  'EV Charger Installation (2-Wheeler)',
  'Professional installation of a 2-wheeler EV charger at your preferred location for safe, reliable, and efficient home charging. Labour charges only.',
  750.00,
  1199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹750 per unit',
  '{
    "about_text": "Professional installation of a 2-wheeler EV charger at your preferred location for safe, reliable, and efficient home charging. Labour charges only.",
    "included_features": [
      "Installation of one 2-wheeler EV charger",
      "Secure wall mounting (if required)",
      "Electrical connection to existing power point",
      "Basic safety inspection",
      "Functional testing after installation"
    ],
    "excluded_features": [
      "EV charger cost",
      "New wiring or concealed wiring",
      "MCB or distribution board upgrades",
      "Civil work such as wall cutting or drilling beyond standard installation",
      "Electrical accessories and materials"
    ],
    "faqs": [
      { "question": "Is the charger included in the service?", "answer": "No. The service includes installation labour only." },
      { "question": "Can you install any brand of EV charger?", "answer": "Yes. Our professionals can install most compatible 2-wheeler EV chargers." },
      { "question": "Do I need a dedicated power socket?", "answer": "A dedicated electrical point is recommended for safe charging. Additional electrical work is charged separately if required." }
    ],
    "why_choose_us": [
      { "icon": "electric_car", "title": "EV Safe Wiring", "desc": "Proper load testing to support long charging cycles." },
      { "icon": "verified_user", "title": "Expert Electricians", "desc": "Insulated safety gear and correct grounding alignment." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Line Test", "desc": "Testing stability of the electrical outlet." },
      { "step": 2, "title": "Mounting", "desc": "Screwing the charger dock/holder onto the wall." },
      { "step": 3, "title": "Safety Run", "desc": "Verifying charging current flow." }
    ]
  }'::jsonb,
  'ev-charger-installation-2-wheeler',
  '/assets/services/dusting_wiping.png'
),
-- 2. Room Heater Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0081'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'Room Heater Repair',
  'Diagnosis and repair of electric room heaters to restore safe heating performance. Suitable for most household heater brands and models.',
  309.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 309,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "heaters"
  }'::jsonb,
  '₹309 per unit',
  '{
    "about_text": "Diagnosis and repair of electric room heaters to restore safe heating performance. Suitable for most household heater brands and models.",
    "included_features": [
      "Inspection and fault diagnosis",
      "Repair of minor electrical or mechanical issues",
      "Functional testing after repair",
      "Labour charges"
    ],
    "excluded_features": [
      "Spare parts and components",
      "Heating element replacement",
      "Major internal damage repairs",
      "Product replacement",
      "Home electrical wiring repairs"
    ],
    "faqs": [
      { "question": "Does the price include spare parts?", "answer": "No. Any replacement parts are charged separately after approval." },
      { "question": "Can all heater brands be repaired?", "answer": "Yes, we service most popular room heater brands, subject to spare part availability." },
      { "question": "What if the heater cannot be repaired?", "answer": "Our professional will explain the issue and recommend the most suitable solution." }
    ],
    "why_choose_us": [
      { "icon": "wb_sunny", "title": "Quick Diagnostics", "desc": "Multimeter trace of coils, thermal fuses, and switches." },
      { "icon": "verified_user", "title": "Safety Grounding", "desc": "Ensuring heater chassis doesn''t leak current." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismantle", "desc": "Technician disassembles body to trace cutoffs." },
      { "step": 2, "title": "Replace & Fix", "desc": "Replacing dead switches or rewiring terminal links." },
      { "step": 3, "title": "Heat Test", "desc": "Load verification and safety run." }
    ]
  }'::jsonb,
  'room-heater-repair',
  '/assets/hero_ac_repair_1773410812102.png'
),
-- 3. Ceiling-Mounted Clothes Hanger Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0082'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Ceiling-Mounted Clothes Hanger Installation',
  'Professional installation of ceiling-mounted clothes drying hangers for secure, space-saving, and convenient indoor laundry drying.',
  550.00,
  899.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 550,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hangers"
  }'::jsonb,
  '₹550 per unit',
  '{
    "about_text": "Professional installation of ceiling-mounted clothes drying hangers for secure, space-saving, and convenient indoor laundry drying.",
    "included_features": [
      "Installation of one ceiling-mounted clothes hanger",
      "Secure mounting using existing hardware",
      "Alignment and stability check",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Clothes hanger unit",
      "Additional brackets or fasteners",
      "Ceiling repair or civil work",
      "Custom fabrication",
      "Electrical work"
    ],
    "faqs": [
      { "question": "Is the clothes hanger included?", "answer": "No. The service covers installation only." },
      { "question": "Can it be installed on concrete ceilings?", "answer": "Yes, provided the ceiling is suitable for secure mounting." },
      { "question": "Will the technician check its stability?", "answer": "Yes. The hanger is tested before service completion." }
    ],
    "why_choose_us": [
      { "icon": "ceiling", "title": "Secure Drilling", "desc": "Deep anchoring screws used to support heavy wet laundry weights." },
      { "icon": "verified_user", "title": "Smooth Pull System", "desc": "Precise pulley line routing for easy height adjustments." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Marking", "desc": "Measuring and marking drill points on ceiling." },
      { "step": 2, "title": "Anchoring", "desc": "Drilling and fixing the pulley wheels and frame." },
      { "step": 3, "title": "Pulley Test", "desc": "Running individual clothes rod lines to check smooth action." }
    ]
  }'::jsonb,
  'ceiling-mounted-clothes-hanger-installation',
  '/assets/services/dusting_wiping.png'
),
-- 4. Wall/Door Hanger Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0083'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Wall/Door Hanger Installation',
  'Installation of wall or door-mounted hangers for clothes, bags, towels, keys, or other household accessories with secure and accurate fitting.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hangers"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Installation of wall or door-mounted hangers for clothes, bags, towels, keys, or other household accessories with secure and accurate fitting.",
    "included_features": [
      "Installation of one wall or door hanger",
      "Drilling and mounting",
      "Alignment check",
      "Secure fitting",
      "Labour charges"
    ],
    "excluded_features": [
      "Hanger or hook",
      "Decorative wall repairs",
      "Glass or marble drilling (if not feasible)",
      "Custom hardware",
      "Painting or finishing work"
    ],
    "faqs": [
      { "question": "Is drilling included?", "answer": "Yes. Standard drilling required for installation is included." },
      { "question": "Can it be installed on tiles?", "answer": "Yes, where installation is technically feasible." },
      { "question": "Are mounting screws included?", "answer": "Only standard installation labour is included. Materials may be charged separately if required." }
    ],
    "why_choose_us": [
      { "icon": "hardware", "title": "Precise Leveling", "desc": "Ensuring the hanger bar is mounted perfectly flat." },
      { "icon": "verified_user", "title": "Tile Care", "desc": "Special carbide drill tips used for tiled walls to prevent cracks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Position", "desc": "Deciding height and checking for plumbing behind wall." },
      { "step": 2, "title": "Drill & Plug", "desc": "Drilling clean holes and inserting wall anchors." },
      { "step": 3, "title": "Mount Hanger", "desc": "Screwing the hanger unit flat on wall." }
    ]
  }'::jsonb,
  'wall-door-hanger-installation',
  '/assets/services/dusting_wiping.png'
),
-- 5. Bed Support Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0084'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Bed Support Repair',
  'Repair of damaged or weakened bed support structures to restore stability, comfort, and safe everyday use.',
  459.00,
  699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 459,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "beds"
  }'::jsonb,
  '₹459 per unit',
  '{
    "about_text": "Repair of damaged or weakened bed support structures to restore stability, comfort, and safe everyday use.",
    "included_features": [
      "Inspection of bed support",
      "Tightening or repairing support structure",
      "Minor reinforcement work",
      "Stability testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Wooden or metal replacement parts",
      "Welding work",
      "Complete bed reconstruction",
      "Upholstery work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can noisy beds be repaired?", "answer": "Yes. Loose or unstable supports causing noise can often be repaired." },
      { "question": "Are replacement parts included?", "answer": "No. Any required materials are charged separately." },
      { "question": "Will the bed become stable after repair?", "answer": "Our professional will restore stability wherever repair is technically possible." }
    ],
    "why_choose_us": [
      { "icon": "handyman", "title": "Sturdy Joints", "desc": "Replacing weak nails with heavy duty structural wood screws." },
      { "icon": "verified_user", "title": "Creak Elimination", "desc": "Adding support blocks to stop ply friction noises." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Joint Scan", "desc": "Removing mattress and checking structural support planks." },
      { "step": 2, "title": "Drill & Tighten", "desc": "Reinforcing joints with metal brackets and glue." },
      { "step": 3, "title": "Weight Test", "desc": "Testing stability under load." }
    ]
  }'::jsonb,
  'bed-support-repair',
  '/assets/services/dusting_wiping.png'
),
-- 6. Bed Legs/Headboard Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0085'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Bed Legs/Headboard Repair',
  'Professional repair of loose, damaged, or unstable bed legs and headboards to improve structural strength and extend furniture life.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "units"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Professional repair of loose, damaged, or unstable bed legs and headboards to improve structural strength and extend furniture life.",
    "included_features": [
      "Inspection of bed legs or headboard",
      "Tightening loose fittings",
      "Minor repairs and adjustments",
      "Stability testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Replacement legs or headboard",
      "Carpentry reconstruction",
      "Polishing or painting",
      "Upholstery repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can cracked bed legs be repaired?", "answer": "Minor damage can often be repaired. Severely damaged parts may require replacement." },
      { "question": "Does the service include replacement parts?", "answer": "No. Replacement materials are charged separately." },
      { "question": "Can you repair all bed types?", "answer": "Yes. Most wooden and engineered wood beds can be serviced depending on their condition." }
    ],
    "why_choose_us": [
      { "icon": "carpentry", "title": "Sturdy Mounting", "desc": "Clamping loose headboard brackets and fixing leg mounts." },
      { "icon": "verified_user", "title": "Joint Alignment", "desc": "Ensuring legs sit completely vertical for perfect load bearing." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Examine mount", "desc": "Checking leg socket adapters and headboard bolts." },
      { "step": 2, "title": "Brace Joint", "desc": "Adding wood plugs, tightening structural lag screws." },
      { "step": 3, "title": "Balance Run", "desc": "Confirming zero wobble when side force is applied." }
    ]
  }'::jsonb,
  'bed-legs-headboard-repair',
  '/assets/services/dusting_wiping.png'
),
-- 7. Cupboard Hinge Installation (Up to 2 Hinges)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0086'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Cupboard Hinge Installation (Up to 2 Hinges)',
  'Professional installation of up to two cupboard hinges for smooth door movement, proper alignment, and long-lasting performance. Labour charges only.',
  179.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 179,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hinges"
  }'::jsonb,
  '₹179 per unit',
  '{
    "about_text": "Professional installation of up to two cupboard hinges for smooth door movement, proper alignment, and long-lasting performance. Labour charges only.",
    "included_features": [
      "Installation of up to 2 cupboard hinges",
      "Door alignment and adjustment",
      "Tightening of fittings",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of hinges",
      "Replacement of damaged cupboard panels",
      "Wood repair or reconstruction",
      "Polishing or painting",
      "Custom carpentry work"
    ],
    "faqs": [
      { "question": "Are the hinges included in the price?", "answer": "No. Labour charges only. Hinges can be provided by the customer or purchased separately." },
      { "question": "Can you install soft-close hinges?", "answer": "Yes, we install both standard and soft-close hinges." },
      { "question": "Will the cupboard door be aligned properly?", "answer": "Yes. Alignment is checked and adjusted during installation." }
    ],
    "why_choose_us": [
      { "icon": "auto_repair", "title": "Door Alignment", "desc": "Adjusting hinge screws so cabinet doors shut completely flush." },
      { "icon": "verified_user", "title": "Soft Close Specialists", "desc": "Experienced in setting up hydraulic/modular hinges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drill Cup", "desc": "Measuring and cutting hinge cups into cabinet door panels." },
      { "step": 2, "title": "Mount Hinge", "desc": "Screwing hinge base plate to cabinet side panels." },
      { "step": 3, "title": "Alignment Adjust", "desc": "Adjusting depth and side screws for a clean gap fit." }
    ]
  }'::jsonb,
  'cupboard-hinge-installation-up-to-2-hinges',
  '/assets/services/kitchen_cleaning.png'
),
-- 8. Drawer Channel Repair (One Set)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0087'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Drawer Channel Repair (One Set)',
  'Repair of one drawer channel to restore smooth opening and closing by fixing loose fittings, minor misalignment, or movement issues.',
  168.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 168,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "channels"
  }'::jsonb,
  '₹168 per unit',
  '{
    "about_text": "Repair of one drawer channel to restore smooth opening and closing by fixing loose fittings, minor misalignment, or movement issues.",
    "included_features": [
      "Inspection of one drawer channel",
      "Tightening and adjustment",
      "Minor repair work",
      "Smooth operation testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Replacement drawer channels",
      "Drawer reconstruction",
      "Wood repair",
      "Additional hardware",
      "Material costs"
    ],
    "faqs": [
      { "question": "When should I choose repair instead of replacement?", "answer": "If the channel is loose or slightly misaligned but not damaged, repair is usually sufficient." },
      { "question": "Will the drawer slide smoothly after repair?", "answer": "Yes, provided the existing channel is repairable." },
      { "question": "Are spare parts included?", "answer": "No." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Wobble Fix", "desc": "Straightening bent tracks and tightening mounting anchors." },
      { "icon": "verified_user", "title": "Smooth Glide", "desc": "Track cleaning and lubrication to ensure effortless glides." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspect Track", "desc": "Pulling out drawer and checking wheel/runner clearances." },
      { "step": 2, "title": "Realign Track", "desc": "Screwing rails securely into plumb line alignment." },
      { "step": 3, "title": "Glide Check", "desc": "Opening/closing drawer with weight load." }
    ]
  }'::jsonb,
  'drawer-channel-repair-one-set',
  '/assets/services/kitchen_cleaning.png'
),
-- 9. Drawer Channel Replacement (One Set)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0088'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Drawer Channel Replacement (One Set)',
  'Replacement of one damaged or worn-out drawer channel for smooth, quiet, and reliable drawer movement.',
  249.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 249,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "channels"
  }'::jsonb,
  '₹249 per unit',
  '{
    "about_text": "Replacement of one damaged or worn-out drawer channel for smooth, quiet, and reliable drawer movement.",
    "included_features": [
      "Removal of old drawer channel",
      "Installation of one new channel set",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of drawer channel",
      "Drawer repair",
      "Cabinet repair",
      "Woodwork modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the new channel included?", "answer": "No. The service covers installation labour only." },
      { "question": "Can soft-close channels be installed?", "answer": "Yes, compatible soft-close channels can be installed." },
      { "question": "Will both sides be replaced?", "answer": "Yes. One complete channel set includes both left and right channels." }
    ],
    "why_choose_us": [
      { "icon": "sync", "title": "Exact Fits", "desc": "Matching rail lengths and load weight capacities." },
      { "icon": "verified_user", "title": "Telescopic Rails", "desc": "Trained to install metal ball-bearing runner slides perfectly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismantle Rails", "desc": "Unscrewing damaged channels from cabinet frame and drawer." },
      { "step": 2, "title": "Mount New Set", "desc": "Leveling and screwing the new left and right channels." },
      { "step": 3, "title": "Roll Check", "desc": "Ensuring drawer locks and rolls smoothly." }
    ]
  }'::jsonb,
  'drawer-channel-replacement-one-set',
  '/assets/services/kitchen_cleaning.png'
),
-- 10. Cupboard Handle Installation/Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0089'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Cupboard Handle Installation/Replacement',
  'Installation or replacement of cupboard handles for secure grip, improved functionality, and a refreshed furniture appearance.',
  89.00,
  149.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 89,
    "min_qty": 1,
    "max_qty": 100,
    "unit_name": "handles"
  }'::jsonb,
  '₹89 per unit',
  '{
    "about_text": "Installation or replacement of cupboard handles for secure grip, improved functionality, and a refreshed furniture appearance.",
    "included_features": [
      "Installation or replacement of one cupboard handle",
      "Proper alignment",
      "Tightening of fittings",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of handle",
      "Additional drilling beyond standard fitting",
      "Cupboard repairs",
      "Wood filling or polishing",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the handle included?", "answer": "No. Customers may provide the handle or purchase one separately." },
      { "question": "Can you replace old handles with modern ones?", "answer": "Yes, provided the fitting dimensions are compatible." },
      { "question": "Will old screw holes be repaired?", "answer": "No. Cosmetic repairs are not included." }
    ],
    "why_choose_us": [
      { "icon": "check", "title": "Perfect Alignment", "desc": "Ensuring handle screws are fully vertical or horizontal." },
      { "icon": "verified_user", "title": "No Scratches", "desc": "Drilled cleanly without splintering cabinet laminates." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Measure holes", "desc": "Checking center-to-center hole distances for the new handle." },
      { "step": 2, "title": "Mount", "desc": "Screwing the door handle tight to prevent future looseness." },
      { "step": 3, "title": "Check", "desc": "Pull test." }
    ]
  }'::jsonb,
  'cupboard-handle-installation-replacement',
  '/assets/services/kitchen_cleaning.png'
),
-- 11. Cupboard Lock Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f008a'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Cupboard Lock Installation',
  'Professional installation of a new cupboard lock for improved security and smooth everyday operation.',
  249.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 249,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹249 per unit',
  '{
    "about_text": "Professional installation of a new cupboard lock for improved security and smooth everyday operation.",
    "included_features": [
      "Installation of one cupboard lock",
      "Lock alignment",
      "Functional testing with keys",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of lock",
      "Modification of cupboard structure",
      "Duplicate keys",
      "Lock repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the lock included?", "answer": "No. Labour charges only." },
      { "question": "Can you install any brand of lock?", "answer": "Yes, most standard cupboard locks can be installed." },
      { "question": "Will you check if the lock works properly?", "answer": "Yes. The lock is fully tested after installation." }
    ],
    "why_choose_us": [
      { "icon": "lock", "title": "Secure Core", "desc": "Cutting clean plug holes in timber panels to insert lock cores." },
      { "icon": "verified_user", "title": "Latch Alignment", "desc": "Aligning drawer lock bolts to strike plates perfectly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drill Cylinder", "desc": "Cutting hole for lock barrel." },
      { "step": 2, "title": "Fit Latch", "desc": "Mounting strike plate inside cupboard frame." },
      { "step": 3, "title": "Test Keys", "desc": "Testing lock throwing actions with keys." }
    ]
  }'::jsonb,
  'cupboard-lock-installation',
  '/assets/services/kitchen_cleaning.png'
),
-- 12. Cupboard Lock Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f008b'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Cupboard Lock Replacement',
  'Replacement of old, damaged, or faulty cupboard locks to restore security and ensure smooth locking performance.',
  169.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Replacement of old, damaged, or faulty cupboard locks to restore security and ensure smooth locking performance.",
    "included_features": [
      "Removal of existing lock",
      "Installation of replacement lock",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of replacement lock",
      "Cupboard repairs",
      "Duplicate keys",
      "Wood modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can I replace my old lock without changing the cupboard?", "answer": "Yes. Most standard locks can be replaced directly." },
      { "question": "Are new keys provided?", "answer": "Only if they are included with the lock supplied by the customer." },
      { "question": "Does this include the lock?", "answer": "No." }
    ],
    "why_choose_us": [
      { "icon": "autorenew", "title": "Direct Swap", "desc": "Replacing core cylinders using existing holes." },
      { "icon": "verified_user", "title": "Striker Fit", "desc": "Adjusting drawer clearances to avoid latch jamming." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Unscrew Old Lock", "desc": "Removing back plate screws and lock cylinder." },
      { "step": 2, "title": "Fit Replacement", "desc": "Fitting and screwing the new matching lock." },
      { "step": 3, "title": "Lock Check", "desc": "Testing multiple lock/unlock rotations." }
    ]
  }'::jsonb,
  'cupboard-lock-replacement',
  '/assets/services/kitchen_cleaning.png'
),
-- 13. Cupboard Lock Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f008c'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd9'::uuid, -- Cupboard & Drawer Services
  'Cupboard Lock Repair',
  'Repair of jammed, loose, or malfunctioning cupboard locks to restore smooth locking and unlocking without unnecessary replacement.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Repair of jammed, loose, or malfunctioning cupboard locks to restore smooth locking and unlocking without unnecessary replacement.",
    "included_features": [
      "Inspection of lock mechanism",
      "Minor lock repair",
      "Tightening and adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Lock replacement",
      "New keys",
      "Major lock damage",
      "Cupboard modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "When should I choose repair instead of replacement?", "answer": "If the lock is sticking or loose but not severely damaged, repair is usually sufficient." },
      { "question": "Can broken keys be removed?", "answer": "This depends on the lock condition and may require additional work." },
      { "question": "Will the lock work like new after repair?", "answer": "Minor issues can usually be resolved, but severely damaged locks may need replacement." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Unjam Mechanism", "desc": "Clearing internal spring faults and applying graphite lubes." },
      { "icon": "verified_user", "title": "Wobble Tighten", "desc": "Tightening loose lock cores to restore firm latch throws." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnose Sticking", "desc": "Checking if key sticks due to dirt or alignment." },
      { "step": 2, "title": "Lube & Tighten", "desc": "Lubricating cylinder pins and securing mounting screws." },
      { "step": 3, "title": "Functional Run", "desc": "Verifying latch locks smoothly." }
    ]
  }'::jsonb,
  'cupboard-lock-repair',
  '/assets/services/kitchen_cleaning.png'
),
-- 14. Door Accessory Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f008d'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Accessory Installation',
  'Professional installation of one door accessory such as a latch, safety chain, door stopper, or magnetic door catcher for improved security and convenience.',
  129.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 129,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "accessories"
  }'::jsonb,
  '₹129 per unit',
  '{
    "about_text": "Professional installation of one door accessory such as a latch, safety chain, door stopper, or magnetic door catcher for improved security and convenience.",
    "included_features": [
      "Installation of one door accessory",
      "Drilling and secure mounting",
      "Alignment and adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of accessory",
      "Door repairs or modifications",
      "Painting or polishing",
      "Custom fabrication",
      "Civil work"
    ],
    "faqs": [
      { "question": "Which accessories can be installed?", "answer": "Door latches, safety chains, magnetic door catchers, and door stoppers." },
      { "question": "Is the accessory included?", "answer": "No. Labour charges only." },
      { "question": "Can you install accessories on metal doors?", "answer": "Yes, wherever technically feasible." }
    ],
    "why_choose_us": [
      { "icon": "hardware", "title": "Secure Mounting", "desc": "Ensuring stoppers and chains are anchored deeply into doors and walls." },
      { "icon": "verified_user", "title": "Perfect Alignment", "desc": "Ensuring catchers align flush with door magnet cores." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Position Stopper", "desc": "Marking exact spot for floor/wall stopper to protect wall paint." },
      { "step": 2, "title": "Drill & Anchors", "desc": "Drilling and inserting wall plugs." },
      { "step": 3, "title": "Install", "desc": "Screwing the accessory securely in place." }
    ]
  }'::jsonb,
  'door-accessory-installation',
  '/assets/services/dusting_wiping.png'
),
-- 15. Peephole Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f008e'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Peephole Installation',
  'Install a door peephole to improve home security and identify visitors safely without opening the door.',
  179.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 179,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "peepholes"
  }'::jsonb,
  '₹179 per unit',
  '{
    "about_text": "Install a door peephole to improve home security and identify visitors safely without opening the door.",
    "included_features": [
      "Installation of one peephole",
      "Precision drilling (if required)",
      "Secure fitting",
      "Alignment and visibility check",
      "Labour charges"
    ],
    "excluded_features": [
      "Peephole cost",
      "Decorative door repairs",
      "Door painting",
      "Major door modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the peephole included?", "answer": "No." },
      { "question": "Can it be installed on wooden and metal doors?", "answer": "Yes, subject to door compatibility." },
      { "question": "Will drilling damage my door?", "answer": "No. Professional tools are used for a clean installation." }
    ],
    "why_choose_us": [
      { "icon": "visibility", "title": "Clean Hole Cut", "desc": "Drilling without splintering front or back veneer/laminate." },
      { "icon": "verified_user", "title": "Wide View Setup", "desc": "Ensuring lens barrel is mounted flat for complete wide angle optics." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mark Height", "desc": "Marking standard eye level height on main door." },
      { "step": 2, "title": "Precision Drill", "desc": "Drilling a clean straight hole through wooden door." },
      { "step": 3, "title": "Fit Optics", "desc": "Inserting peephole barrels and threading together firmly." }
    ]
  }'::jsonb,
  'peephole-installation',
  '/assets/services/dusting_wiping.png'
),
-- 16. Wooden Door Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f008f'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Wooden Door Installation',
  'Professional installation of a wooden door with accurate alignment, secure fitting, and smooth opening and closing. Labour charges only.',
  699.00,
  1099.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 699,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹699 per unit',
  '{
    "about_text": "Professional installation of a wooden door with accurate alignment, secure fitting, and smooth opening and closing. Labour charges only.",
    "included_features": [
      "Installation of one wooden door",
      "Door alignment",
      "Basic hinge fitting",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Door frame installation",
      "Door cost",
      "Lock and handle installation",
      "Painting or polishing",
      "Civil or masonry work"
    ],
    "faqs": [
      { "question": "Does this include the door?", "answer": "No. Customers need to provide the door." },
      { "question": "Can you install engineered wood doors?", "answer": "Yes." },
      { "question": "Will the door be aligned properly?", "answer": "Yes. Proper alignment and operation are checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "door_front", "title": "Perfect Plumb", "desc": "Aligning hinge chisels to prevent door drops and wall friction." },
      { "icon": "verified_user", "title": "Precise Trimming", "desc": "Electric planners used for clean edge trims where floor gaps are tight." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Hinge Mortising", "desc": "Chiseling door margins for flush hinge fits." },
      { "step": 2, "title": "Hang Door", "desc": "Screwing hinges into frame and hanging door." },
      { "step": 3, "title": "Gap Adjustment", "desc": "Planing bottom or sides if door drags on floor." }
    ]
  }'::jsonb,
  'wooden-door-installation',
  '/assets/services/dusting_wiping.png'
),
-- 17. Major Wooden Door Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0090'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Major Wooden Door Repair',
  'Repair heavily damaged wooden doors with loose joints, structural damage, alignment issues, or other major functional problems.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Repair heavily damaged wooden doors with loose joints, structural damage, alignment issues, or other major functional problems.",
    "included_features": [
      "Inspection of door",
      "Major carpentry repair",
      "Structural adjustments",
      "Door alignment",
      "Labour charges"
    ],
    "excluded_features": [
      "Door replacement",
      "Locks and accessories",
      "Painting or polishing",
      "Replacement wood",
      "Material costs"
    ],
    "faqs": [
      { "question": "What is considered a major repair?", "answer": "Structural damage, severe misalignment, broken sections, or major fitting issues." },
      { "question": "Are replacement materials included?", "answer": "No." },
      { "question": "Can badly damaged doors always be repaired?", "answer": "Our professional will inspect and recommend repair or replacement based on the condition." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Structural Restores", "desc": "Repairing split lock zones and reinforcing weak frames." },
      { "icon": "verified_user", "title": "Door Realignment", "desc": "Re-shifting hinge positions to fix severe door sagging issues." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Assess frame", "desc": "Checking frame levels and door wood condition." },
      { "step": 2, "title": "Glue & Brace", "desc": "Refitting panel joints using industrial adhesive and wood dowels." },
      { "step": 3, "title": "Rehang", "desc": "Fixing hinges and checking door closing." }
    ]
  }'::jsonb,
  'major-wooden-door-repair',
  '/assets/services/dusting_wiping.png'
),
-- 18. Minor Wooden Door Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0091'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Minor Wooden Door Repair',
  'Repair minor wooden door issues such as sticking, slight misalignment, loose fittings, or difficulty in opening and closing.',
  179.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 179,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹179 per unit',
  '{
    "about_text": "Repair minor wooden door issues such as sticking, slight misalignment, loose fittings, or difficulty in opening and closing.",
    "included_features": [
      "Inspection",
      "Minor adjustment",
      "Tightening fittings",
      "Alignment correction",
      "Labour charges"
    ],
    "excluded_features": [
      "Major carpentry work",
      "Door replacement",
      "Lock replacement",
      "Painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "My door rubs against the floor. Can this be fixed?", "answer": "Yes, if caused by minor alignment issues." },
      { "question": "Does this include hinge replacement?", "answer": "No." },
      { "question": "Will the door close smoothly after repair?", "answer": "Yes, wherever the issue is minor and repairable." }
    ],
    "why_choose_us": [
      { "icon": "handyman", "title": "Quick Fixes", "desc": "Planing swelling wood edges for humid season closures." },
      { "icon": "verified_user", "title": "Fast Tuneup", "desc": "Immediate screw replacements and hinge adjustments." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Locate Friction", "desc": "Finding exactly where door rubs frame/floor." },
      { "step": 2, "title": "Sand / Plane", "desc": "Planing the tight wood spots." },
      { "step": 3, "title": "Test Latch", "desc": "Testing lock strike alignment." }
    ]
  }'::jsonb,
  'minor-wooden-door-repair',
  '/assets/services/dusting_wiping.png'
),
-- 19. Door Hinge Installation (Up to 4 Hinges)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0092'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Hinge Installation (Up to 4 Hinges)',
  'Professional installation of up to four door hinges for secure mounting and smooth door movement.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hinges"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Professional installation of up to four door hinges for secure mounting and smooth door movement.",
    "included_features": [
      "Installation of up to 4 hinges",
      "Alignment adjustment",
      "Tightening of fittings",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Hinge cost",
      "Door trimming",
      "Door repairs",
      "Painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "Are hinges included?", "answer": "No." },
      { "question": "Can soft-close hinges be installed?", "answer": "If compatible with the door design, yes." },
      { "question": "Will the door alignment be checked?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "construction", "title": "Load Balancing", "desc": "Correct hinge placement to support door weights." },
      { "icon": "verified_user", "title": "Flush Fit", "desc": "Neat frame mortises so hinges close flat." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Chisel Mortise", "desc": "Cutting exact depth recess in wood frame." },
      { "step": 2, "title": "Screw Hinges", "desc": "Fitting screws into door and frame." },
      { "step": 3, "title": "Swing check", "desc": "Testing for smooth door swings." }
    ]
  }'::jsonb,
  'door-hinge-installation-up-to-4-hinges',
  '/assets/services/dusting_wiping.png'
),
-- 20. Door Hinge Installation (With Dismantling)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0093'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Hinge Installation (With Dismantling)',
  'Complete door hinge replacement involving dismantling the door, installing new hinges, and reassembling for proper alignment and smooth operation.',
  319.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 319,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hinges"
  }'::jsonb,
  '₹319 per unit',
  '{
    "about_text": "Complete door hinge replacement involving dismantling the door, installing new hinges, and reassembling for proper alignment and smooth operation.",
    "included_features": [
      "Door dismantling",
      "Installation of hinges",
      "Reinstallation of door",
      "Alignment adjustment",
      "Labour charges"
    ],
    "excluded_features": [
      "Hinge cost",
      "Door repairs",
      "Door trimming",
      "Painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "When is dismantling required?", "answer": "When hinges cannot be safely replaced while the door remains installed." },
      { "question": "Does this include new hinges?", "answer": "No." },
      { "question": "Will the door be reinstalled correctly?", "answer": "Yes, including alignment and testing." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Safe Dismantle", "desc": "Unhanging heavy main doors safely without damaging jamb frames." },
      { "icon": "verified_user", "title": "Precision Rehang", "desc": "Ensuring the door hangs level with zero drag." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismantle Door", "desc": "Unscrewing older hinges and unhanging door." },
      { "step": 2, "title": "Hinge Mortising", "desc": "Chiseling clean slots for the new hinge flaps." },
      { "step": 3, "title": "Rehang & Verify", "desc": "Hanging door and adjusting margins." }
    ]
  }'::jsonb,
  'door-hinge-installation-with-dismantling',
  '/assets/services/dusting_wiping.png'
),
-- 21. Door Lock Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0094'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Lock Installation',
  'Professional installation of a new wooden door lock to improve home security with precise fitting and reliable operation.',
  569.00,
  899.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 569,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹569 per unit',
  '{
    "about_text": "Professional installation of a new wooden door lock to improve home security with precise fitting and reliable operation.",
    "included_features": [
      "Installation of one door lock",
      "Lock alignment",
      "Functional testing",
      "Basic fitting adjustments",
      "Labour charges"
    ],
    "excluded_features": [
      "Lock cost",
      "Smart lock setup",
      "Door modifications beyond standard fitting",
      "Duplicate keys",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can you install digital locks?", "answer": "This service is for standard mechanical locks only." },
      { "question": "Is the lock included?", "answer": "No." },
      { "question": "Will keys be tested?", "answer": "Yes, after installation." }
    ],
    "why_choose_us": [
      { "icon": "lock_open", "title": "Precision Cuts", "desc": "Clean hole saw and chisel cuts on door edge faces." },
      { "icon": "verified_user", "title": "Latch Alignment", "desc": "Striker plates mounted flush with frames to avoid rattle." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drill Mortise", "desc": "Drilling lock cylinder cylinder hole." },
      { "step": 2, "title": "Insert Lock", "desc": "Inserting lock body and screwing handle plates." },
      { "step": 3, "title": "Latch Strike Setup", "desc": "Routing frame and fixing striker plate." }
    ]
  }'::jsonb,
  'door-lock-installation',
  '/assets/services/dusting_wiping.png'
),
-- 22. Door Lock Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0095'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Lock Replacement',
  'Replace worn-out, damaged, or outdated wooden door locks with professional installation for improved security and smooth operation.',
  449.00,
  699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 449,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹449 per unit',
  '{
    "about_text": "Replace worn-out, damaged, or outdated wooden door locks with professional installation for improved security and smooth operation.",
    "included_features": [
      "Removal of existing lock",
      "Installation of replacement lock",
      "Lock alignment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of new lock",
      "Smart lock installation",
      "Door repairs",
      "Duplicate keys",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can I replace my existing lock with a different brand?", "answer": "Yes, if it is compatible with the door." },
      { "question": "Is the new lock included?", "answer": "No." },
      { "question": "Will the old lock be removed?", "answer": "Yes, removal is included before installing the new one." }
    ],
    "why_choose_us": [
      { "icon": "autorenew", "title": "Direct Lock Swap", "desc": "Clean lock swaps using existing mortise slots where possible." },
      { "icon": "verified_user", "title": "Latch Tuning", "desc": "Striker plates repositioned to ensure smooth latches." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Unfit old lock", "desc": "Removing old handles and core latch body." },
      { "step": 2, "title": "Mount new lock", "desc": "Fitting new cylinder body and faceplates." },
      { "step": 3, "title": "Latch Test", "desc": "Testing latch action under full latch shut." }
    ]
  }'::jsonb,
  'door-lock-replacement',
  '/assets/services/dusting_wiping.png'
),
-- 23. Door Lock Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0096'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Door Lock Repair',
  'Professional repair of wooden door locks that are jammed, loose, difficult to operate, or not locking properly. Restore your door''s security without unnecessary lock replacement.',
  259.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 259,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "locks"
  }'::jsonb,
  '₹259 per unit',
  '{
    "about_text": "Professional repair of wooden door locks that are jammed, loose, difficult to operate, or not locking properly. Restore your door''s security without unnecessary lock replacement.",
    "included_features": [
      "Inspection of one door lock",
      "Minor lock repair and adjustments",
      "Tightening of lock fittings",
      "Lubrication (if required)",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "New lock or lock components",
      "Smart lock repairs",
      "Duplicate keys",
      "Door modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can a jammed lock be repaired?", "answer": "Yes, if the internal mechanism is repairable." },
      { "question": "Are replacement parts included?", "answer": "No. Any required parts are charged separately after approval." },
      { "question": "What if the lock cannot be repaired?", "answer": "Our professional will recommend a suitable replacement." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Jammed Core Fixes", "desc": "Unjamming springs, latch bolts, and lubricating cylinders." },
      { "icon": "verified_user", "title": "Tight Fittings", "desc": "Securing sagging door handle mounts to prevent core strain." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Verify Jam", "desc": "Checking if jam is due to key, alignment, or cylinder rust." },
      { "step": 2, "title": "Lube & Repair", "desc": "Applying lubricant or adjusting internal springs/screws." },
      { "step": 3, "title": "Lock Test", "desc": "Verifying lock throws smoothly." }
    ]
  }'::jsonb,
  'door-lock-repair',
  '/assets/services/dusting_wiping.png'
),
-- 24. Mesh Grill Door Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0097'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Mesh Grill Door Repair',
  'Repair damaged mesh grill doors by fixing loose frames, hinges, handles, alignment issues, or minor mesh damage to restore smooth operation.',
  269.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 269,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹269 per unit',
  '{
    "about_text": "Repair damaged mesh grill doors by fixing loose frames, hinges, handles, alignment issues, or minor mesh damage to restore smooth operation.",
    "included_features": [
      "Inspection of one mesh grill door",
      "Minor repairs and adjustments",
      "Alignment correction",
      "Tightening of fittings",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Complete mesh replacement",
      "New grill door",
      "Welding work",
      "Lock replacement",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can bent mesh doors be repaired?", "answer": "Minor bends and alignment issues can usually be repaired." },
      { "question": "Is welding included?", "answer": "No. Welding work is not part of this service." },
      { "question": "Can damaged mesh be replaced?", "answer": "Major mesh replacement may require an additional service." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Door Realignment", "desc": "Replacing weak hinges to prevent mesh door sagging." },
      { "icon": "verified_user", "title": "Tight Frames", "desc": "Securing frame corners with brackets to stop rattling noises." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Hinge", "desc": "Examining if mesh door sits straight in frame." },
      { "step": 2, "title": "Realign & Screw", "desc": "Adjusting hinges and reinforcing loose mesh corners." },
      { "step": 3, "title": "Latch check", "desc": "Ensuring the door magnet latch clicks shut." }
    ]
  }'::jsonb,
  'mesh-grill-door-repair',
  '/assets/services/dusting_wiping.png'
),
-- 25. Mesh Grill Door Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0098'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Mesh Grill Door Replacement',
  'Replacement of damaged mesh grill doors with proper fitting, alignment, and secure installation for improved safety and ventilation.',
  449.00,
  699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 449,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹449 per unit',
  '{
    "about_text": "Replacement of damaged mesh grill doors with proper fitting, alignment, and secure installation for improved safety and ventilation.",
    "included_features": [
      "Removal of existing mesh grill door",
      "Installation of replacement grill door",
      "Alignment and adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Mesh grill door cost",
      "Welding or fabrication",
      "Civil work",
      "Lock installation",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the new grill door included?", "answer": "No. Customers need to provide the replacement door." },
      { "question": "Can existing fittings be reused?", "answer": "Yes, if they are in good condition." },
      { "question": "Will the door be aligned properly?", "answer": "Yes. Proper operation is checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "swap_horiz", "title": "Quick Replacements", "desc": "Clean removal of old frame and fitting the new door unit." },
      { "icon": "verified_user", "title": "Breeze Fit", "desc": "Ensuring door frame leaves no gaps for mosquitoes/insects." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Unfit Old Frame", "desc": "Dismantling old screen/mesh door frame." },
      { "step": 2, "title": "Mount New Frame", "desc": "Aligning and hanging the new mesh frame door." },
      { "step": 3, "title": "Shut Test", "desc": "Testing hinge swing and lock pins." }
    ]
  }'::jsonb,
  'mesh-grill-door-replacement',
  '/assets/services/dusting_wiping.png'
),
-- 26. Overhead Door Closer Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0099'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Overhead Door Closer Installation',
  'Professional installation of an overhead door closer to ensure smooth, controlled, and automatic door closing while reducing wear and improving safety.',
  269.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 269,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "closers"
  }'::jsonb,
  '₹269 per unit',
  '{
    "about_text": "Professional installation of an overhead door closer to ensure smooth, controlled, and automatic door closing while reducing wear and improving safety.",
    "included_features": [
      "Installation of one overhead door closer",
      "Mounting and alignment",
      "Closing speed adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Door closer unit",
      "Door repairs",
      "Door modifications",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the door closer included?", "answer": "No. Labour charges only." },
      { "question": "Can closing speed be adjusted?", "answer": "Yes. The technician will adjust it for smooth operation." },
      { "question": "Is it suitable for wooden and metal doors?", "answer": "Yes, depending on compatibility." }
    ],
    "why_choose_us": [
      { "icon": "speed", "title": "Double Speed Calibration", "desc": "Adjusting latch speed and closing speed valves individually." },
      { "icon": "verified_user", "title": "Heavy Duty Mount", "desc": "Ensuring anchor brackets support the hydraulic spring forces." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mark Template", "desc": "Aligning mounting plate template on door and frame." },
      { "step": 2, "title": "Drill & Mount", "desc": "Drilling pilot holes, mounting closer body and linking arm." },
      { "step": 3, "title": "Speed Adjust", "desc": "Turning valve screws to calibrate soft-closing." }
    ]
  }'::jsonb,
  'overhead-door-closer-installation',
  '/assets/services/dusting_wiping.png'
),
-- 27. Wall-Mounted Door Closer Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f009a'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Wall-Mounted Door Closer Installation',
  'Installation of a wall-mounted door closer for controlled automatic door closing in homes, offices, and commercial spaces.',
  499.00,
  799.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 499,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "closers"
  }'::jsonb,
  '₹499 per unit',
  '{
    "about_text": "Installation of a wall-mounted door closer for controlled automatic door closing in homes, offices, and commercial spaces.",
    "included_features": [
      "Installation of one wall-mounted door closer",
      "Secure mounting",
      "Alignment adjustment",
      "Closing speed calibration",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Door closer unit",
      "Door repairs",
      "Civil work",
      "Electrical work",
      "Material costs"
    ],
    "faqs": [
      { "question": "What''s the difference between an overhead and wall-mounted door closer?", "answer": "Wall-mounted models use an external arm mechanism and are suitable for various door types." },
      { "question": "Is drilling included?", "answer": "Yes. Standard drilling required for installation is included." },
      { "question": "Can it be installed on metal doors?", "answer": "Yes, if technically feasible." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Multi Surface Mount", "desc": "Expert anchors used for concrete, hollow block, or partition walls." },
      { "icon": "verified_user", "title": "Hydraulic Calibrate", "desc": "Calibrating the arm tension to ensure door doesn''t slam shut." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Align Base", "desc": "Leveling the closer frame along wall and door top margin." },
      { "step": 2, "title": "Screwing", "desc": "Fixing wall anchors and mounting bracket screws." },
      { "step": 3, "title": "Tension test", "desc": "Opening door and checking automatic return speed." }
    ]
  }'::jsonb,
  'wall-mounted-door-closer-installation',
  '/assets/services/dusting_wiping.png'
),
-- 28. Wooden Sliding Door Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f009b'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdda'::uuid, -- Door Services
  'Wooden Sliding Door Repair',
  'Professional repair of wooden sliding doors experiencing jamming, difficult movement, damaged rollers, or alignment issues for smooth and reliable operation.',
  369.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 369,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "doors"
  }'::jsonb,
  '₹369 per unit',
  '{
    "about_text": "Professional repair of wooden sliding doors experiencing jamming, difficult movement, damaged rollers, or alignment issues for smooth and reliable operation.",
    "included_features": [
      "Inspection of one sliding door",
      "Roller and track adjustment",
      "Alignment correction",
      "Minor repair work",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Replacement rollers or tracks",
      "Sliding door replacement",
      "Glass replacement",
      "Wood reconstruction",
      "Material costs"
    ],
    "faqs": [
      { "question": "My sliding door is difficult to open. Can it be repaired?", "answer": "Yes. Most movement and alignment issues can be resolved through repair." },
      { "question": "Are replacement rollers included?", "answer": "No. Spare parts are charged separately if required." },
      { "question": "Will the door slide smoothly after repair?", "answer": "Yes, provided there is no major structural damage." }
    ],
    "why_choose_us": [
      { "icon": "roller_skating", "title": "Roller Re-align", "desc": "Adjusting track carriage rollers so door slides with light touch." },
      { "icon": "verified_user", "title": "Track Cleaning", "desc": "Vacuuming dirt and applying silicone lubricants for noise-free slides." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Door", "desc": "Carefully lifting door off sliding track rails." },
      { "step": 2, "title": "Adjust Rollers", "desc": "Tightening carriage height screws or lubing rollers." },
      { "step": 3, "title": "Rehang & Test", "desc": "Hanging door back on rail and checking slide travel." }
    ]
  }'::jsonb,
  'wooden-sliding-door-repair',
  '/assets/services/dusting_wiping.png'
),
-- 29. Bathroom Holder & Hanger Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f009c'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Bathroom Holder & Hanger Installation',
  'Professional installation of bathroom holders and hangers such as towel rods, towel rings, robe hooks, soap holders, tissue holders, and other bathroom accessories for a neat and functional space.',
  129.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 129,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "accessories"
  }'::jsonb,
  '₹129 per unit',
  '{
    "about_text": "Professional installation of bathroom holders and hangers such as towel rods, towel rings, robe hooks, soap holders, tissue holders, and other bathroom accessories for a neat and functional space.",
    "included_features": [
      "Installation of one bathroom accessory",
      "Drilling and secure wall mounting",
      "Alignment and leveling",
      "Functional stability check",
      "Labour charges"
    ],
    "excluded_features": [
      "Bathroom accessory cost",
      "Tile replacement or repair",
      "Concealed plumbing or electrical work",
      "Custom fabrication",
      "Material costs"
    ],
    "faqs": [
      { "question": "Which accessories can be installed?", "answer": "Towel rods, towel rings, robe hooks, soap dishes, tissue holders, toothbrush holders, and similar bathroom fittings." },
      { "question": "Is drilling included?", "answer": "Yes. Standard drilling required for installation is included." },
      { "question": "Are accessories included in the service?", "answer": "No. Labour charges only." }
    ],
    "why_choose_us": [
      { "icon": "bathroom", "title": "Zero Tile Crack", "desc": "Using special diamond tipped tile drill bits to protect bathroom tiles." },
      { "icon": "verified_user", "title": "Rust Proof Screws", "desc": "Mounting with high-grade stainless steel screws to prevent rust streaks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Spot Check", "desc": "Verifying water pipes behind bathroom wall." },
      { "step": 2, "title": "Tile Drill", "desc": "Drilling holes cleanly and tapping wall plugs in." },
      { "step": 3, "title": "Secure Fit", "desc": "Screwing holder brackets and locking accessory." }
    ]
  }'::jsonb,
  'bathroom-holder-hanger-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 30. Wall Decor Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f009d'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Wall Decor Installation',
  'Professional installation of photo frames, paintings, clocks, decorative mirrors, wall art, and other wall décor with accurate alignment and secure mounting.',
  129.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 129,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "items"
  }'::jsonb,
  '₹129 per unit',
  '{
    "about_text": "Professional installation of photo frames, paintings, clocks, decorative mirrors, wall art, and other wall décor with accurate alignment and secure mounting.",
    "included_features": [
      "Installation of one wall décor item",
      "Drilling and wall mounting",
      "Alignment and leveling",
      "Secure fitting",
      "Labour charges"
    ],
    "excluded_features": [
      "Wall décor item",
      "Large gallery wall arrangements",
      "Glass handling beyond standard installation",
      "Wall repair or painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can you install large paintings?", "answer": "Yes, provided suitable mounting hardware is available." },
      { "question": "Will the décor be perfectly level?", "answer": "Yes. Proper alignment is checked before completion." },
      { "question": "Is mounting hardware included?", "answer": "Standard installation labour is included. Additional hardware is chargeable if required." }
    ],
    "why_choose_us": [
      { "icon": "wallpaper", "title": "Precision Alignment", "desc": "Using bubble level meters to ensure décor is completely straight." },
      { "icon": "verified_user", "title": "No Split Plaster", "desc": "Clean drilling to prevent cracking on wall textures." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mark Height", "desc": "Finding perfect visual midpoint." },
      { "step": 2, "title": "Wall Plug", "desc": "Drilling and tapping screw sleeves." },
      { "step": 3, "title": "Hang Art", "desc": "Hanging the frame/decor piece and checking balance." }
    ]
  }'::jsonb,
  'wall-decor-installation',
  '/assets/services/dusting_wiping.png'
),
-- 31. Bathroom Mirror Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f009e'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Bathroom Mirror Installation',
  'Safe and precise installation of bathroom mirrors with secure mounting for long-lasting stability and an elegant finish.',
  139.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "mirrors"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Safe and precise installation of bathroom mirrors with secure mounting for long-lasting stability and an elegant finish.",
    "included_features": [
      "Installation of one bathroom mirror",
      "Secure wall mounting",
      "Alignment and leveling",
      "Stability inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Mirror cost",
      "Mirror replacement",
      "Wall repair",
      "Custom framing",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can mirrors be installed on tiled walls?", "answer": "Yes, where technically feasible." },
      { "question": "Is drilling included?", "answer": "Yes." },
      { "question": "Does the service include the mirror?", "answer": "No. Customers need to provide the mirror." }
    ],
    "why_choose_us": [
      { "icon": "crop_portrait", "title": "Safe Handling", "desc": "Technicians trained in lifting and securing fragile glass mirrors." },
      { "icon": "verified_user", "title": "Sturdy Anchors", "desc": "High quality drywall/concrete anchors to hold mirror weights safely." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Level Mark", "desc": "Finding wall center and height." },
      { "step": 2, "title": "Drill Tile", "desc": "Drilling through tile joints/face cleanly." },
      { "step": 3, "title": "Mount Mirror", "desc": "Hanging mirror bracket/frame and inspecting stability." }
    ]
  }'::jsonb,
  'bathroom-mirror-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 32. Glass Shelf Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f009f'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Glass Shelf Installation',
  'Professional installation of glass shelves in bathrooms, kitchens, bedrooms, or living spaces with secure mounting and accurate alignment.',
  139.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "shelves"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional installation of glass shelves in bathrooms, kitchens, bedrooms, or living spaces with secure mounting and accurate alignment.",
    "included_features": [
      "Installation of one glass shelf",
      "Bracket fitting",
      "Wall drilling",
      "Alignment and stability check",
      "Labour charges"
    ],
    "excluded_features": [
      "Glass shelf",
      "Shelf brackets",
      "Wall repairs",
      "Glass cutting",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the glass shelf included?", "answer": "No." },
      { "question": "Can shelves be installed on tiled walls?", "answer": "Yes, using suitable installation techniques." },
      { "question": "Will the shelf be tested after installation?", "answer": "Yes. Stability is checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "grid_on", "title": "Bracket Align", "desc": "Ensuring left/right shelf clamps sit perfectly parallel." },
      { "icon": "verified_user", "title": "Tile Care", "desc": "Precision drilling to prevent tile micro-cracks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mark Bracket", "desc": "Leveling the shelf brackets." },
      { "step": 2, "title": "Drill Holes", "desc": "Drilling and tapping sleeve anchors." },
      { "step": 3, "title": "Fit Shelf", "desc": "Clamping the glass panel and locking bracket set screws." }
    ]
  }'::jsonb,
  'glass-shelf-installation',
  '/assets/services/dusting_wiping.png'
),
-- 33. Wooden Shelf Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a0'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd8'::uuid, -- Hanging & Mounting Services
  'Wooden Shelf Installation',
  'Professional installation of wooden wall shelves for books, décor, storage, and display with secure mounting and proper alignment.',
  289.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 289,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "shelves"
  }'::jsonb,
  '₹289 per unit',
  '{
    "about_text": "Professional installation of wooden wall shelves for books, décor, storage, and display with secure mounting and proper alignment.",
    "included_features": [
      "Installation of one wooden shelf",
      "Wall drilling",
      "Bracket installation (if applicable)",
      "Alignment and leveling",
      "Labour charges"
    ],
    "excluded_features": [
      "Wooden shelf",
      "Shelf brackets",
      "Custom carpentry",
      "Painting or polishing",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can floating shelves be installed?", "answer": "Yes, if compatible mounting hardware is available." },
      { "question": "Does the service include the shelf?", "answer": "No." },
      { "question": "Can heavy shelves be installed?", "answer": "Yes, subject to wall strength and suitable hardware." }
    ],
    "why_choose_us": [
      { "icon": "shelves", "title": "Heavy Duty Plugs", "desc": "Using long toggle bolts/plugs for solid load support." },
      { "icon": "verified_user", "title": "Level Alignment", "desc": "Checking shelf faces with bubble meters to ensure books don''t slide." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mark Studs", "desc": "Checking wall strength/stud alignment." },
      { "step": 2, "title": "Drill Wall", "desc": "Drilling and fixing heavy bracket channels." },
      { "step": 3, "title": "Mount Shelf", "desc": "Locking the wooden board to brackets." }
    ]
  }'::jsonb,
  'wooden-shelf-installation',
  '/assets/services/dusting_wiping.png'
),
-- 34. Corner Guard / Safety Lock Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a1'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddb'::uuid, -- Child Safety & Proofing
  'Corner Guard / Safety Lock Installation',
  'Install child safety corner guards and safety locks on furniture and cabinets to help create a safer home environment for children and elderly family members.',
  299.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "sets"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Install child safety corner guards and safety locks on furniture and cabinets to help create a safer home environment for children and elderly family members.",
    "included_features": [
      "Installation of one set of safety accessories",
      "Secure fitting",
      "Position adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Safety products",
      "Furniture repair",
      "Cabinet modifications",
      "Replacement of damaged accessories",
      "Material costs"
    ],
    "faqs": [
      { "question": "What safety products can be installed?", "answer": "Corner guards, cabinet locks, drawer locks, and similar child safety accessories." },
      { "question": "Are the safety accessories included?", "answer": "No. Customers need to provide them." },
      { "question": "Will installation damage my furniture?", "answer": "Installation is performed carefully according to the accessory type." }
    ],
    "why_choose_us": [
      { "icon": "child_care", "title": "Baby Proofing", "desc": "Strategic placement of latch locks out of baby reach heights." },
      { "icon": "verified_user", "title": "Surface Safety", "desc": "Clean adhesive application to avoid peeling furniture veneers." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Clean Surface", "desc": "Degreasing wood/glass surfaces for maximum bond strength." },
      { "step": 2, "title": "Apply Locks", "desc": "Mounting cabinet latches or soft bumper edges." },
      { "step": 3, "title": "Bond Check", "desc": "Testing latch lock clicks." }
    ]
  }'::jsonb,
  'corner-guard-safety-lock-installation',
  '/assets/services/dusting_wiping.png'
),
-- 35. Bed Fence Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a2'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddb'::uuid, -- Child Safety & Proofing
  'Bed Fence Installation',
  'Professional installation of bed safety fences to help prevent children from accidentally rolling off the bed during sleep.',
  299.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "fences"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Professional installation of bed safety fences to help prevent children from accidentally rolling off the bed during sleep.",
    "included_features": [
      "Installation of one bed fence",
      "Secure attachment",
      "Stability inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Bed fence",
      "Bed modifications",
      "Replacement parts",
      "Furniture repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can bed fences be installed on all beds?", "answer": "They are compatible with most standard beds, subject to design." },
      { "question": "Is the bed fence included?", "answer": "No." },
      { "question": "Will it be securely fitted?", "answer": "Yes. The installation is tested before completion." }
    ],
    "why_choose_us": [
      { "icon": "safety_check", "title": "Anti Tip Setup", "desc": "Securing under-mattress strap anchors to prevent fence tips." },
      { "icon": "verified_user", "title": "Smooth Fold Run", "desc": "Ensuring the swing down lock switches operate smoothly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Slide Base", "desc": "Inserting fence support frames under the mattress." },
      { "step": 2, "title": "Strap Check", "desc": "Tightening safety straps to the opposite bed frame edge." },
      { "step": 3, "title": "Fold Test", "desc": "Verifying lock buttons." }
    ]
  }'::jsonb,
  'bed-fence-installation',
  '/assets/services/dusting_wiping.png'
),
-- 36. Safety Gate Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a3'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddb'::uuid, -- Child Safety & Proofing
  'Safety Gate Installation',
  'Professional installation of child and pet safety gates at staircases, doorways, or room entrances for enhanced household safety.',
  699.00,
  1099.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 699,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "gates"
  }'::jsonb,
  '₹699 per unit',
  '{
    "about_text": "Professional installation of child and pet safety gates at staircases, doorways, or room entrances for enhanced household safety.",
    "included_features": [
      "Installation of one safety gate",
      "Secure mounting",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Safety gate",
      "Staircase modifications",
      "Civil work",
      "Wall repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can the gate be installed on staircases?", "answer": "Yes, if the installation area is suitable." },
      { "question": "Is the safety gate included?", "answer": "No. The service covers labour charges only." },
      { "question": "Will the gate be checked after installation?", "answer": "Yes. The technician ensures it opens, closes, and locks properly before completing the service." }
    ],
    "why_choose_us": [
      { "icon": "child_friendly", "title": "Sturdy Gate Rails", "desc": "Adjusting safety pressure pads so gates stay firmly locked against side forces." },
      { "icon": "verified_user", "title": "Safety Latches", "desc": "Setting double-latch childproof locking switches correctly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Align Gate", "desc": "Placing gate in corridor/doorway center." },
      { "step": 2, "title": "Tighten Pads", "desc": "Adjusting pressure bolt knobs until frame locks firm." },
      { "step": 3, "title": "Latch Check", "desc": "Testing automatic shut latch operation." }
    ]
  }'::jsonb,
  'safety-gate-installation',
  '/assets/services/dusting_wiping.png'
),
-- 37. Plastic Buffer Installation (Up to 4)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a4'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Plastic Buffer Installation (Up to 4)',
  'Professional installation of up to four furniture buffers to reduce noise, prevent scratches, and protect doors, drawers, cabinets, and furniture from impact damage.',
  119.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 119,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "sets"
  }'::jsonb,
  '₹119 per unit',
  '{
    "about_text": "Professional installation of up to four furniture buffers to reduce noise, prevent scratches, and protect doors, drawers, cabinets, and furniture from impact damage.",
    "included_features": [
      "Installation of up to 4 plastic buffers",
      "Surface cleaning before installation",
      "Proper alignment and positioning",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Plastic buffers",
      "Furniture repairs",
      "Replacement of damaged fittings",
      "Custom modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Where can plastic buffers be installed?", "answer": "They can be installed on cupboard doors, drawers, cabinets, furniture, and similar surfaces." },
      { "question": "Are the buffers included?", "answer": "No. Customers need to provide the buffers unless purchased separately." },
      { "question": "Will they reduce noise while closing doors?", "answer": "Yes. Buffers help minimize impact noise and protect furniture." }
    ],
    "why_choose_us": [
      { "icon": "minimize", "title": "Cabinet Cushion", "desc": "Clean and neat buffer alignments." },
      { "icon": "verified_user", "title": "Impact Dampening", "desc": "Properly placed buffers damp door slamming sounds." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Wipe edge", "desc": "Wiping off dust from cabinet door margins." },
      { "step": 2, "title": "Bond buffer", "desc": "Sticking silicon/plastic buffers firmly." },
      { "step": 3, "title": "Slam check", "desc": "Testing door closures." }
    ]
  }'::jsonb,
  'plastic-buffer-installation-up-to-4',
  '/assets/services/dusting_wiping.png'
),
-- 38. Chair Wheels Fitting
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a5'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Chair Wheels Fitting',
  'Professional fitting or replacement of office chair wheels for smooth movement, improved stability, and enhanced comfort.',
  119.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 119,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "chairs"
  }'::jsonb,
  '₹119 per unit',
  '{
    "about_text": "Professional fitting or replacement of office chair wheels for smooth movement, improved stability, and enhanced comfort.",
    "included_features": [
      "Installation of one set of chair wheels",
      "Removal of old wheels (if applicable)",
      "Compatibility check",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Chair wheels",
      "Chair frame repair",
      "Hydraulic mechanism repair",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does the service include chair wheels?", "answer": "No. Labour charges only." },
      { "question": "Can all office chairs be serviced?", "answer": "Most standard office chairs are supported, subject to wheel compatibility." },
      { "question": "Will all wheels be checked after installation?", "answer": "Yes. Smooth movement and stability are verified." }
    ],
    "why_choose_us": [
      { "icon": "refresh", "title": "Smooth Casters", "desc": "Fitting nylon or polyurethane casters to protect floors." },
      { "icon": "verified_user", "title": "Stem Fit check", "desc": "Ensuring caster stems snap firmly into chair base sockets." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Pull Old Wheels", "desc": "Extracting damaged/jammed caster wheels." },
      { "step": 2, "title": "Check Socket", "desc": "Cleaning dirt from socket stems." },
      { "step": 3, "title": "Snap In", "desc": "Pushing the new caster wheels in until locked." }
    ]
  }'::jsonb,
  'chair-wheels-fitting',
  '/assets/services/dusting_wiping.png'
),
-- 39. Curtain Blinds Measurement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a6'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, -- Curtain & Blinds Services
  'Curtain Blinds Measurement',
  'Accurate on-site measurement for curtain blinds to ensure a perfect fit before purchase or installation.',
  119.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 119,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "windows"
  }'::jsonb,
  '₹119 per unit',
  '{
    "about_text": "Accurate on-site measurement for curtain blinds to ensure a perfect fit before purchase or installation.",
    "included_features": [
      "Measurement of one window or opening",
      "Width and height measurement",
      "Installation suitability assessment",
      "Measurement guidance",
      "Labour charges"
    ],
    "excluded_features": [
      "Blind installation",
      "Product supply",
      "Consultation for custom fabrication",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is installation included?", "answer": "No. This service is only for measurements." },
      { "question": "Will I receive accurate dimensions?", "answer": "Yes. Measurements are taken using professional tools." },
      { "question": "Can measurements be taken for motorised blinds?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "straighten", "title": "Laser Precision", "desc": "Accurate height/width logs to avoid fabric gaps." },
      { "icon": "verified_user", "title": "Mount Assess", "desc": "Checking if wall or ceiling mount is better for window depth." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Measure Width", "desc": "Checking frame margin offsets." },
      { "step": 2, "title": "Measure Drop", "desc": "Logging vertical drop heights." },
      { "step": 3, "title": "Clearance check", "desc": "Ensuring handle/crank lines won''t jam." }
    ]
  }'::jsonb,
  'curtain-blinds-measurement',
  '/assets/services/dusting_wiping.png'
),
-- 40. Curtain Rod Installation (2 Brackets)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a7'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, -- Curtain & Blinds Services
  'Curtain Rod Installation (2 Brackets)',
  'Professional installation of curtain rods using up to two wall brackets for secure support and smooth curtain operation.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "rods"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of curtain rods using up to two wall brackets for secure support and smooth curtain operation.",
    "included_features": [
      "Installation of one curtain rod",
      "Mounting of up to 2 brackets",
      "Wall drilling",
      "Alignment and leveling",
      "Labour charges"
    ],
    "excluded_features": [
      "Curtain rod",
      "Brackets",
      "Curtains",
      "Wall repair",
      "Material costs"
    ],
    "faqs": [
      { "question": "Are the rod and brackets included?", "answer": "No." },
      { "question": "Can rods be installed on concrete walls?", "answer": "Yes, wherever technically feasible." },
      { "question": "Will the rod be level after installation?", "answer": "Yes. Proper alignment is part of the service." }
    ],
    "why_choose_us": [
      { "icon": "linear_scale", "title": "Bubble Leveling", "desc": "Ensuring curtain rods sit perfectly horizontal." },
      { "icon": "verified_user", "title": "Sturdy Brackets", "desc": "Anchor screws designed to hold heavy blackout curtains." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Level Mark", "desc": "Marking bracket positions above window frame." },
      { "step": 2, "title": "Drill & Plug", "desc": "Drilling and tapping plastic anchors." },
      { "step": 3, "title": "Fit Rod", "desc": "Securing brackets and dropping curtain rod in." }
    ]
  }'::jsonb,
  'curtain-rod-installation-2-brackets',
  '/assets/services/dusting_wiping.png'
),
-- 41. Shower Curtain Rod Installation (2 Brackets)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a8'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, -- Curtain & Blinds Services
  'Shower Curtain Rod Installation (2 Brackets)',
  'Professional installation of shower curtain rods with secure mounting for smooth curtain operation and reliable everyday use.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "rods"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of shower curtain rods with secure mounting for smooth curtain operation and reliable everyday use.",
    "included_features": [
      "Installation of one shower curtain rod",
      "Mounting of up to 2 brackets",
      "Wall drilling",
      "Alignment check",
      "Labour charges"
    ],
    "excluded_features": [
      "Shower curtain rod",
      "Curtain",
      "Wall repair",
      "Custom fittings",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can it be installed on bathroom tiles?", "answer": "Yes, using suitable drilling techniques." },
      { "question": "Is the rod included?", "answer": "No." },
      { "question": "Will the installation damage the tiles?", "answer": "Professional tools are used to minimize the risk of damage." }
    ],
    "why_choose_us": [
      { "icon": "shower", "title": "Moisture Proof", "desc": "Using stainless fasteners to prevent shower humidity rust." },
      { "icon": "verified_user", "title": "Zero Tile Damage", "desc": "Glass/tile drill bits prevent bathroom tile splintering." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drill Tile", "desc": "Drilling holes cleanly through tile face." },
      { "step": 2, "title": "Secure Bracket", "desc": "Fixing brackets to walls." },
      { "step": 3, "title": "Fit Rod", "desc": "Mounting rod and checking pull tension." }
    ]
  }'::jsonb,
  'shower-curtain-rod-installation-2-brackets',
  '/assets/services/dusting_wiping.png'
),
-- 42. Motorised Blinds Fitting (Up to 5 ft)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00a9'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, -- Curtain & Blinds Services
  'Motorised Blinds Fitting (Up to 5 ft)',
  'Professional installation of motorised window blinds up to 5 feet wide, ensuring secure mounting, smooth operation, and proper alignment.',
  339.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 339,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blinds"
  }'::jsonb,
  '₹339 per unit',
  '{
    "about_text": "Professional installation of motorised window blinds up to 5 feet wide, ensuring secure mounting, smooth operation, and proper alignment.",
    "included_features": [
      "Installation of one motorised blind (up to 5 ft)",
      "Wall or ceiling mounting",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Motorised blind",
      "Electrical wiring",
      "Smart home integration",
      "Remote programming",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is electrical wiring included?", "answer": "No. Existing electrical connections should be available." },
      { "question": "Can smart blinds be installed?", "answer": "Yes, provided installation requirements are met." },
      { "question": "Does the service include the blinds?", "answer": "No." }
    ],
    "why_choose_us": [
      { "icon": "settings_remote", "title": "Motor Alignment", "desc": "Ensuring blind roller barrel rolls straight without fabric binding." },
      { "icon": "verified_user", "title": "Bracket Strength", "desc": "Mounting heavy motorised metal rollers securely." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Ceiling Mount", "desc": "Screwing heavy duty spring bracket clips." },
      { "step": 2, "title": "Insert Roller", "desc": "Clicking blind barrel into brackets and connecting power." },
      { "step": 3, "title": "Limit setup", "desc": "Helping check motor travel limits." }
    ]
  }'::jsonb,
  'motorised-blinds-fitting-up-to-5-ft',
  '/assets/services/dusting_wiping.png'
),
-- 43. Non-Motorised Blinds Fitting (Up to 5 ft)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00aa'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddc'::uuid, -- Curtain & Blinds Services
  'Non-Motorised Blinds Fitting (Up to 5 ft)',
  'Professional fitting of manual roller, Roman, Venetian, or zebra blinds up to 5 feet wide for smooth operation and a clean finish.',
  189.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 189,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blinds"
  }'::jsonb,
  '₹189 per unit',
  '{
    "about_text": "Professional fitting of manual roller, Roman, Venetian, or zebra blinds up to 5 feet wide for smooth operation and a clean finish.",
    "included_features": [
      "Installation of one blind (up to 5 ft)",
      "Wall or ceiling mounting",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Blind",
      "Wall repairs",
      "Custom fittings",
      "Material costs",
      "Blind alterations"
    ],
    "faqs": [
      { "question": "Which types of blinds can be installed?", "answer": "Roller, Roman, Venetian, Zebra, and most standard manual blinds." },
      { "question": "Are the blinds included?", "answer": "No." },
      { "question": "Can blinds be ceiling mounted?", "answer": "Yes, wherever technically feasible." }
    ],
    "why_choose_us": [
      { "icon": "blinds", "title": "Smooth Pulls", "desc": "Checking pull cord chains to make sure blinds lock at any height." },
      { "icon": "verified_user", "title": "Clean Fits", "desc": "Ensuring equal gaps on left and right window edges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Bracket Install", "desc": "Screwing mounting brackets onto wall frame." },
      { "step": 2, "title": "Click Blind", "desc": "Mounting the blind headrail onto brackets." },
      { "step": 3, "title": "Cord Check", "desc": "Testing vertical pull operation." }
    ]
  }'::jsonb,
  'non-motorised-blinds-fitting-up-to-5-ft',
  '/assets/services/dusting_wiping.png'
),
-- 44. Window AC Frame Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ab'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddd'::uuid, -- Window Services
  'Window AC Frame Installation',
  'Professional installation of a window AC support frame to provide a secure base for safe and stable air conditioner installation.',
  329.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 329,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "frames"
  }'::jsonb,
  '₹329 per unit',
  '{
    "about_text": "Professional installation of a window AC support frame to provide a secure base for safe and stable air conditioner installation.",
    "included_features": [
      "Installation of one window AC frame",
      "Secure mounting",
      "Alignment check",
      "Stability inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "AC frame",
      "Window AC installation",
      "Masonry work",
      "Welding",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include AC installation?", "answer": "No. This service is only for installing the support frame." },
      { "question": "Is the frame included?", "answer": "No." },
      { "question": "Will the frame support the AC safely?", "answer": "Yes. Proper stability is checked after installation." }
    ],
    "why_choose_us": [
      { "icon": "window", "title": "Heavy Duty Mount", "desc": "Anchored firmly using anchor bolts to bear AC weights." },
      { "icon": "verified_user", "title": "Outward Tilt", "desc": "Ensuring a slight outward tilt to allow proper AC water drain." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Position", "desc": "Leveling the iron brackets inside window sill." },
      { "step": 2, "title": "Anchor", "desc": "Drilling and bolting support arms into concrete sill." },
      { "step": 3, "title": "Stability Test", "desc": "Checking load tolerance." }
    ]
  }'::jsonb,
  'window-ac-frame-installation',
  '/assets/services/window_cleaning.png'
),
-- 45. Window Closing (Post AC Removal)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ac'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddd'::uuid, -- Window Services
  'Window Closing (Post AC Removal)',
  'Close and secure window openings left after removing a window air conditioner to improve safety, insulation, and appearance.',
  169.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "windows"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Close and secure window openings left after removing a window air conditioner to improve safety, insulation, and appearance.",
    "included_features": [
      "Closing of one window opening",
      "Basic fitting adjustments",
      "Alignment check",
      "Labour charges"
    ],
    "excluded_features": [
      "Glass replacement",
      "New window panels",
      "Civil work",
      "Painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include a new window panel?", "answer": "No. Only labour is included." },
      { "question": "Can damaged windows be repaired during this service?", "answer": "Major repairs require a separate service." },
      { "question": "Will the opening be properly sealed?", "answer": "Basic closure and fitting are included. Additional sealing materials are charged separately if required." }
    ],
    "why_choose_us": [
      { "icon": "close", "title": "Draft Seal", "desc": "Blocking air gaps to restore room air conditioning insulation." },
      { "icon": "verified_user", "title": "Security Check", "desc": "Ensuring window locks snap tight after board closing." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Unfit bracket", "desc": "Dismantling old AC wooden boards/filler sheets." },
      { "step": 2, "title": "Fit panel", "desc": "Mounting board or sliding glass panes into tracks." },
      { "step": 3, "title": "Lock check", "desc": "Checking final closure seals." }
    ]
  }'::jsonb,
  'window-closing-post-ac-removal',
  '/assets/services/window_cleaning.png'
),
-- 46. Window Hinge Installation (Up to 4 Hinges)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ad'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cddd'::uuid, -- Window Services
  'Window Hinge Installation (Up to 4 Hinges)',
  'Professional installation of up to four window hinges to restore smooth opening, secure closing, and proper alignment of wooden or metal windows.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hinges"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of up to four window hinges to restore smooth opening, secure closing, and proper alignment of wooden or metal windows.",
    "included_features": [
      "Installation of up to 4 window hinges",
      "Alignment adjustment",
      "Tightening of fittings",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Window hinges",
      "Window repairs",
      "Glass replacement",
      "Painting",
      "Material costs"
    ],
    "faqs": [
      { "question": "Are the hinges included?", "answer": "No. Labour charges only." },
      { "question": "Can hinges be installed on aluminium windows?", "answer": "Yes, where compatible." },
      { "question": "Will the window alignment be checked?", "answer": "Yes. The window is tested to ensure smooth opening and closing." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Wind Resist Setup", "desc": "Securing hinges tight to prevent windows rattling during storms." },
      { "icon": "verified_user", "title": "Alignment Check", "desc": "Ensuring perfect closure latch alignment." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Chisel", "desc": "Recessing wood frame spots for flush fit." },
      { "step": 2, "title": "Screw", "desc": "Screwing window hinges into shutter and frame." },
      { "step": 3, "title": "Swing check", "desc": "Testing swing path." }
    ]
  }'::jsonb,
  'window-hinge-installation-up-to-4-hinges',
  '/assets/services/window_cleaning.png'
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
  -- EV Charger Installation (2-Wheeler)
  ('e186c52a-9bae-41e0-81f1-6be4409f0090'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0080'::uuid, 'EV Charger Installation (2-Wheeler)', 'Professional installation of 2-wheeler EV charger mounting and wiring.', 750.00, 1199.00, 90)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_minutes = EXCLUDED.duration_minutes;
