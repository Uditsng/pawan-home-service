-- SQL Migration to add New Services with Dynamic Pricing (Service Engine V2)
-- Name: 20260702223000_add_new_services.sql

-- 1. Create New Subcategories if they do not exist
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('4e0afde3-bb07-4a5b-bced-0fbac38d91d3'::uuid, 'Bird Netting & Control', 'grid_on', 'aa721151-4604-4c9d-ae07-68960a5f8564'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd3'::uuid, 'CCTV & Security Systems', 'videocam', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('55700483-dbce-43f9-96ec-37960ccfbf40'::uuid, 'Modular Kitchen & Renovations', 'kitchen', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('37680277-a2fa-4b0c-9d22-31254a2c3f0b'::uuid, 'Ceiling & Partition Work', 'layers', 'c38e7aa3-7d2d-4a90-8c65-1e8982551e5e'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d58'::uuid, 'Masonry & Tiles', 'grid_view', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid)
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
-- Carpet Cleaning (Migrate/Upsert to Area-based slabs)
(
  'd186c52a-9bae-41e0-81f1-6be4409f0002'::uuid,
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care
  'Carpet Cleaning',
  'Professional carpet cleaning that removes dust, stains, odors, and allergens while restoring freshness and appearance.',
  15.00,
  25.00,
  true,
  'Cleaning & Housekeeping',
  'area',
  '{
    "min_area": 100,
    "max_area": 2000,
    "price_per_sqft": 15,
    "area_pricing_mode": "flat",
    "area_slabs": [
      { "min": 100, "max": 300, "rate": 15 },
      { "min": 301, "max": 700, "rate": 12 },
      { "min": 701, "max": 2000, "rate": 10 }
    ]
  }'::jsonb,
  '₹15/sqft (100-300 sqft) | ₹12/sqft (301-700 sqft) | ₹10/sqft (701+ sqft)',
  '{
    "about_text": "Professional carpet cleaning that removes dust, stains, odors, and allergens while restoring freshness and appearance.",
    "included_features": [
      "Vacuum cleaning",
      "Stain treatment (basic)",
      "Deep shampoo cleaning",
      "Dust and dirt removal",
      "Odor reduction treatment"
    ],
    "excluded_features": [
      "Permanent stain removal guarantee",
      "Carpet repair services",
      "Moving heavy furniture",
      "Water damage restoration",
      "Specialized fabric restoration"
    ],
    "faqs": [
      { "question": "How long does drying take?", "answer": "Typically 4–8 hours." },
      { "question": "Are stains removed completely?", "answer": "Results depend on stain type and age." },
      { "question": "Is the cleaning safe for children and pets?", "answer": "Yes." },
      { "question": "How often should carpets be cleaned?", "answer": "Every 6–12 months." },
      { "question": "Do you clean office carpets?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Vacuuming", "desc": "Removing dry soil and loose particles from carpet fibers." },
      { "step": 2, "title": "Shampooing", "desc": "Deep shampooing and extracting dirt with specialized machines." }
    ]
  }'::jsonb,
  'carpet-cleaning',
  '/assets/services/sweeping_mopping.png'
),
-- Mattress Cleaning
(
  'd186c52a-9bae-41e0-81f1-6be4409f0017'::uuid,
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care
  'Mattress Cleaning',
  'Thorough sanitization and deep cleaning of mattresses to remove dust mites, sweat stains, odors, and allergens.',
  299.00,
  499.00,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '{}'::jsonb,
  'Single Bed: ₹299 | Double Bed: ₹499 | King Size: ₹599',
  '{
    "about_text": "Sanitization and deep cleaning of mattresses utilizing professional extraction machines and sanitizing agents to ensure a healthy sleeping surface.",
    "included_features": [
      "Deep vacuuming to extract dust and dust mites",
      "Eco-friendly shampooing for stain reduction",
      "Sanitization and germ-kill spray",
      "Deodorization to remove sweat/musty odors"
    ],
    "excluded_features": [
      "Guaranteed removal of old blood, oil, or rust stains",
      "Immediate drying (requires 4-6 hours natural air drying)",
      "Mattress cover washing"
    ],
    "faqs": [
      { "question": "Is the mattress dry immediately?", "answer": "No, it takes 4-6 hours to dry completely depending on ventilation." },
      { "question": "Does it remove all stains?", "answer": "It removes most organic stains; older deep-set stains might fade but not disappear completely." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "sanitizer", "title": "Deep Sanitization", "desc": "Germ-kill spray to eliminate dust mites and pathogens." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Vacuuming", "desc": "Extracting loose dust and allergens." },
      { "step": 2, "title": "Shampooing", "desc": "Applying active foam shampoo to treat stains." }
    ]
  }'::jsonb,
  'mattress-cleaning',
  '/assets/services/dusting_wiping.png'
),
-- Curtain Cleaning
(
  'd186c52a-9bae-41e0-81f1-6be4409f0018'::uuid,
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care
  'Curtain Cleaning',
  'Dry cleaning and vacuuming of curtains to remove accumulated dust, pet hair, and odors without taking them down.',
  99.00,
  149.00,
  true,
  'Cleaning & Housekeeping',
  'quantity',
  '{
    "price_per_unit": 99,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "panels"
  }'::jsonb,
  '₹99 per curtain panel',
  '{
    "about_text": "Clean curtains make a room feel fresh. We vacuum and dry-clean your curtains on-site without the hassle of dismantling them.",
    "included_features": [
      "Dry vacuuming of curtain panels",
      "On-site dry-solvent stain spray",
      "Steam sanitization",
      "Odor removal treatment"
    ],
    "excluded_features": [
      "Machine washing or dry-cleaning off-site",
      "Shrinkage repair",
      "Cleaning delicate/ancient fabrics (silk/velvet is handled dry-vacuum only)"
    ],
    "faqs": [
      { "question": "Do you take curtains down?", "answer": "No, we clean them while hanging to prevent shrinkage and damage." },
      { "question": "What is a panel?", "answer": "A single curtain sheet/panel is counted as one unit." }
    ],
    "why_choose_us": [
      { "icon": "local_laundry_service", "title": "On-Site Cleaning", "desc": "No need to take curtains down or send them away." },
      { "icon": "verified_user", "title": "Expert Care", "desc": "Safe solvents to prevent damage and color fading." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Vacuuming", "desc": "Extracting loose dust from curtain layers." },
      { "step": 2, "title": "Steam Sanitization", "desc": "Steam processing to sanitize and remove wrinkles." }
    ]
  }'::jsonb,
  'curtain-cleaning',
  '/assets/services/sweeping_mopping.png'
),
-- RO Service & Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0019'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'RO Service & Repair',
  'Professional maintenance, filter replacement, and repair services for water purifiers of all brands.',
  399.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Service: ₹399 | Repair: ₹299 | Complete Filter Replacement: ₹1499',
  '{
    "about_text": "Ensure clean drinking water with our expert RO services. We cover basic servicing, repair of motor/PCB, and filter cartridge replacement for all major brands.",
    "included_features": [
      "TDS and water quality check",
      "Filter cleaning & inner tank sanitization",
      "Overall electrical and leakage diagnosis"
    ],
    "excluded_features": [
      "Spare parts costs (unless included in the filter replacement package)",
      "Plumbing modifications outside the water purifier unit"
    ],
    "faqs": [
      { "question": "How often should RO filters be replaced?", "answer": "Generally every 9 to 12 months based on usage and TDS levels." },
      { "question": "Are spare parts warranted?", "answer": "Yes, we offer a 90-day warranty on all replaced spare parts." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Multi-Brand Experts", "desc": "Certified experts for Kent, Aquaguard, Pureit, etc." },
      { "icon": "verified_user", "title": "Genuine Spares", "desc": "We use only 100% brand-approved filter cartridges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "TDS testing and leak inspection." },
      { "step": 2, "title": "Service / Repair", "desc": "Filter replacement or repairing parts." }
    ]
  }'::jsonb,
  'ro-service-and-repair',
  '/assets/services/kitchen_cleaning.png'
),
-- Washing Machine Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0020'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'Washing Machine Repair',
  'Prompt diagnosis and repair of top-load, front-load, and semi-automatic washing machines.',
  249.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection: ₹249 | Standard Repair: ₹899 | Major Repair: ₹1799',
  '{
    "about_text": "Resolve spinner, draining, leakage, or power issues in your washing machine. Our professionals diagnose and repair top-load, front-load, and semi-automatic units on-site.",
    "included_features": [
      "Detailed diagnosis of fault",
      "Wiring check and sensor inspection",
      "Water drainage check"
    ],
    "excluded_features": [
      "Spare parts like drain pumps, drum bearings, or motors (quoted separately)",
      "Civil work or carpentry adjustments"
    ],
    "faqs": [
      { "question": "Is the inspection fee waived?", "answer": "Yes, if you choose to go ahead with the repair service." }
    ],
    "why_choose_us": [
      { "icon": "local_laundry_service", "title": "All Models Covered", "desc": "Top load, front load, and semi-automatic expertise." },
      { "icon": "verified_user", "title": "90-Day Warranty", "desc": "Warranty on replaced parts and workmanship." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Book Visit", "desc": "Schedule a diagnostic visit." },
      { "step": 2, "title": "Get Quote & Repair", "desc": "Review repair quote and proceed with fix." }
    ]
  }'::jsonb,
  'washing-machine-repair',
  '/assets/services/laundry.png'
),
-- Refrigerator Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0021'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'Refrigerator Repair',
  'Expert troubleshooting and repairs for single-door, double-door, and side-by-side refrigerators.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection: ₹299 | Gas Charging: ₹1899 | Compressor Replacement: ₹3499',
  '{
    "about_text": "Resolve cooling failures, loud noises, door gasket issues, or thermostat faults in your refrigerator. We repair single-door, double-door, and premium side-by-side units.",
    "included_features": [
      "Thermostat & relay diagnostic check",
      "Capacitor & compressor wiring check",
      "Gasket seal evaluation"
    ],
    "excluded_features": [
      "Physical compressor unit or condenser coils (quoted based on brand specs)",
      "Repainting or body dent repair"
    ],
    "faqs": [
      { "question": "Do you do gas charging at home?", "answer": "Yes, our technicians carry gas cylinders and vacuum pumps to recharge gas on-site." }
    ],
    "why_choose_us": [
      { "icon": "ac_unit", "title": "Cooling Restored", "desc": "Expert gas charging and compressor fixes." },
      { "icon": "verified_user", "title": "Certified Technicians", "desc": "Experienced appliance repair professionals." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnosis", "desc": "Checking thermostat, wiring, and gas pressure." },
      { "step": 2, "title": "Resolve Issue", "desc": "Repairing wiring or charging gas." }
    ]
  }'::jsonb,
  'refrigerator-repair',
  '/assets/services/fridge_cleaning.png'
),
-- Microwave Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0022'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'Microwave Repair',
  'Professional repair services for solo, grill, and convection microwave ovens.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection: ₹199 | Magnetron Replace: ₹1299 | Touchpad Repair: ₹799',
  '{
    "about_text": "Fix heating issues, display faults, or rotating plate errors. We service and repair solo, grill, and convection microwave ovens at your home.",
    "included_features": [
      "Door switch and interlock diagnostics",
      "High voltage capacitor and diode checks",
      "Control board inspections"
    ],
    "excluded_features": [
      "Replacement parts like magnetrons, control panel touchpads, or glass turntables"
    ],
    "faqs": [
      { "question": "Why is my microwave running but not heating?", "answer": "This is usually caused by a failed magnetron or diode, which our technician can test and replace." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Electrical Safety", "desc": "Microwaves hold high voltage; our pros ensure strict safety protocols." },
      { "icon": "verified_user", "title": "Quick Turnaround", "desc": "Most common microwave faults fixed in under an hour." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnostics", "desc": "Testing magnetron, transformer, and safety switches." },
      { "step": 2, "title": "Repair & Test", "desc": "Replacing parts and conducting radiation leak checks." }
    ]
  }'::jsonb,
  'microwave-repair',
  '/assets/services/kitchen_cleaning.png'
),
-- Geyser Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0023'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'Geyser Repair',
  'Safe and reliable repair, heating element replacement, and servicing for instant and storage geysers.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection: ₹199 | Heating Element: ₹899 | Thermostat Repair: ₹499',
  '{
    "about_text": "Resolve no heating, low heating, water leakage, or auto-cutoff failure in your geyser. Safe installations and repairs by certified experts.",
    "included_features": [
      "Thermostat calibration check",
      "Heating element scaling check",
      "Safety valve testing"
    ],
    "excluded_features": [
      "Geyser tanks, heating element parts, or inlet-outlet connection pipes"
    ],
    "faqs": [
      { "question": "What causes water to not heat?", "answer": "A burned-out heating element or a faulty thermostat is the primary cause." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Safety Guaranteed", "desc": "Earthing checks and water-electrical isolation verification." },
      { "icon": "verified_user", "title": "Experienced Pros", "desc": "Trained experts handling water heater repairs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Power diagnostics and leakage checks." },
      { "step": 2, "title": "Element Replacement", "desc": "Installing new heating elements or thermostats." }
    ]
  }'::jsonb,
  'geyser-repair',
  '/assets/services/bathroom_cleaning.png'
),
-- TV Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0024'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'TV Repair',
  'Diagnostics and repairs for LED, LCD, and Smart TVs of all screen sizes.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection: ₹299 | Backlight Repair: ₹1499 | Motherboard Repair: ₹999',
  '{
    "about_text": "Resolve display failures, lines on screen, no audio, power failure, or smart TV software faults. Diagnostics and board repairs by experts.",
    "included_features": [
      "Voltage level testing on power board",
      "Display backlight testing",
      "HDMI/ports and software diagnostics"
    ],
    "excluded_features": [
      "Cost of new display panels (quoted based on manufacturer prices if replacement is feasible)"
    ],
    "faqs": [
      { "question": "Do you repair cracked screens?", "answer": "Cracked screens require a panel replacement which is often close to the price of a new TV. We will provide a quotation." }
    ],
    "why_choose_us": [
      { "icon": "tv", "title": "Smart TV Experts", "desc": "Software updates, screen backlight, and board level repair." },
      { "icon": "verified_user", "title": "In-Home Diagnosis", "desc": "Diagnostics performed directly at your convenience." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnose TV", "desc": "Troubleshooting power, display, and audio paths." },
      { "step": 2, "title": "Board Repair", "desc": "Soldering or replacing parts on the motherboard/power card." }
    ]
  }'::jsonb,
  'tv-repair',
  '/assets/services/dusting_wiping.png'
),
-- AC Installation & Uninstallation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'AC Installation & Uninstallation',
  'Professional mounting, unmounting, piping, and installation of Split and Window ACs.',
  399.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Window AC Uninstall: ₹399 | Window AC Install: ₹599 | Split AC Uninstall: ₹599 | Split AC Install: ₹1199',
  '{
    "about_text": "Get your AC installed or uninstalled cleanly. Our experts handle brackets mounting, outdoor unit placement, copper piping layout, and gas leak checks.",
    "included_features": [
      "Indoor & outdoor unit mounting/unmounting",
      "Core drilling in wall for piping (Split AC)",
      "Gas pressure checks after setup"
    ],
    "excluded_features": [
      "Copper piping and electrical wires (billed per meter)",
      "AC outdoor unit bracket stand (billed extra if required)",
      "Drain pipe extensions"
    ],
    "faqs": [
      { "question": "Are materials included?", "answer": "No, copper pipes, brackets, and cables are billed extra based on actual length used." }
    ],
    "why_choose_us": [
      { "icon": "ac_unit", "title": "Clean Mounting", "desc": "Leak-proof piping and precise bracket alignment." },
      { "icon": "verified_user", "title": "Safety Verified", "desc": "Expert technicians equipped with heavy duty drills and safety ropes." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mounting", "desc": "Mounting brackets and placing indoor/outdoor units." },
      { "step": 2, "title": "Connection", "desc": "Laying pipes, cabling, vacuuming, and testing cooling." }
    ]
  }'::jsonb,
  'ac-installation-and-uninstallation',
  '/assets/hero_ac_repair_1773410812102.png'
),
-- Bird Net Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0026'::uuid,
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d3'::uuid, -- Bird Netting & Control
  'Bird Net Installation',
  'Durable and heavy-duty pigeon/bird net installation for balconies, windows, and open spaces.',
  35.00,
  50.00,
  true,
  'Pest Control Services',
  'area',
  '{
    "min_area": 50,
    "max_area": 2000,
    "price_per_sqft": 35,
    "area_pricing_mode": "flat",
    "area_slabs": [
      { "min": 50, "max": 200, "rate": 35 },
      { "min": 201, "max": 500, "rate": 30 },
      { "min": 501, "max": 2000, "rate": 25 }
    ]
  }'::jsonb,
  '₹35/sqft (50-200 sqft) | ₹30/sqft (201-500 sqft) | ₹25/sqft (501+ sqft)',
  '{
    "about_text": "Block pigeons and birds from entering your balcony or windows. We install UV-resistant, high-strength nylon/HDPE nets with durable metal anchors.",
    "included_features": [
      "High quality HDPE/nylon bird net",
      "Steel wire frame and stainless steel hooks/anchors",
      "Professional rope-access technicians for high-rise balconies"
    ],
    "excluded_features": [
      "Cleaning heavily deposited bird droppings before setup (optional add-on)",
      "Window frame structural repairs"
    ],
    "faqs": [
      { "question": "Does the net block light and air?", "answer": "No, the net is thin and highly translucent, allowing 95% light and air transmission." },
      { "question": "How long does the net last?", "answer": "Our premium HDPE nets are UV resistant and last up to 3 to 5 years." }
    ],
    "why_choose_us": [
      { "icon": "grid_on", "title": "UV Resistant Net", "desc": "High strength, long lasting HDPE netting." },
      { "icon": "verified_user", "title": "Balcony Experts", "desc": "Technicians trained in high-rise rope access safety." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Area Measurement", "desc": "Measuring net boundary in square feet." },
      { "step": 2, "title": "Hook & Wire Layout", "desc": "Drilling and fixing stainless steel hooks & tension wire." },
      { "step": 3, "title": "Net Fixing", "desc": "Securing and stretching the bird net onto the wire framework." }
    ]
  }'::jsonb,
  'bird-net-installation',
  '/assets/services/pigeon_net_installation.png'
),
-- Rodent Control
(
  'd186c52a-9bae-41e0-81f1-6be4409f0027'::uuid,
  '08d11104-30f5-4cd6-a4a2-798c73088bd8'::uuid, -- Mosquito, Rodent & Crawling Insect Control
  'Rodent Control',
  'Effective baiting and trapping service to eliminate rats and mice from residential and commercial properties.',
  1.50,
  2.50,
  true,
  'Pest Control Services',
  'area',
  '{
    "min_area": 200,
    "max_area": 5000,
    "price_per_sqft": 1.5,
    "area_pricing_mode": "flat",
    "area_slabs": [
      { "min": 200, "max": 1000, "rate": 1.5 },
      { "min": 1001, "max": 2500, "rate": 1.2 },
      { "min": 2501, "max": 5000, "rate": 1.0 }
    ]
  }'::jsonb,
  '₹1.5/sqft (200-1000 sqft) | ₹1.2/sqft (1001-2500 sqft) | ₹1.0/sqft (2501+ sqft)',
  '{
    "about_text": "Eliminate rats, mice, and rodents from your home, attic, or business premises. We use secure bait stations, glue traps, and chemical cakes to manage infestations safely.",
    "included_features": [
      "Thorough search for entry holes and runways",
      "Placement of child-safe bait stations and glue boards",
      "Rodenticide cake application in ducts and pipes"
    ],
    "excluded_features": [
      "Sealing cracks, conduits, or constructing metal meshes (quoted separately)",
      "Carpet or dry-clean sanitization of areas soiled by rodents"
    ],
    "faqs": [
      { "question": "Are the baits safe for pets?", "answer": "We place baits in locked tamper-resistant stations to keep them out of reach of pets." }
    ],
    "why_choose_us": [
      { "icon": "pest_control_rodent", "title": "Bait Stations", "desc": "Locked, child and pet-resistant baiting systems." },
      { "icon": "verified_user", "title": "Entry Detection", "desc": "We find and report rodent runways and entry points." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Detecting nesting locations and active paths." },
      { "step": 2, "title": "Traps & Baits", "desc": "Deploying bait stations, tracking powder, and sticky traps." }
    ]
  }'::jsonb,
  'rodent-control',
  '/assets/services/general_pest_control.png'
),
-- Fan & Light Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0028'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd2'::uuid, -- Electrical Services
  'Fan & Light Installation',
  'Quick and professional mounting and connection of ceiling fans, wall fans, LED lights, and chandeliers.',
  150.00,
  250.00,
  true,
  'Home Repairs & Maintenance',
  'hourly',
  '{
    "price_per_hour": 150,
    "min_hours": 1,
    "max_hours": 8
  }'::jsonb,
  '₹150 per hour (Minimum 1 hour charge)',
  '{
    "about_text": "Mount, wire, and install your electrical fixtures safely. We mount ceiling fans, exhaust fans, LED tubes, downlights, and fancy wall lights.",
    "included_features": [
      "Fixtures mounting on existing hooks & brackets",
      "Wiring connections and electrical check",
      "Taping and insulation checks"
    ],
    "excluded_features": [
      "Providing the fans, light fixtures, or chandeliers (supplied by customer)",
      "New electrical point wiring from the main board (billed extra)",
      "Civil work or painting"
    ],
    "faqs": [
      { "question": "Do you bring fans or lights?", "answer": "No, the customer must purchase and keep the fans/lights ready before the professional arrives." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Safety Compliance", "desc": "Insulated tools and strict testing of point earthing." },
      { "icon": "verified_user", "title": "On-Time Arrival", "desc": "Quick fixture installations to save your time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mounting Check", "desc": "Verifying existing fan hooks and wiring points." },
      { "step": 2, "title": "Installation", "desc": "Connecting wiring and mounting the fan/light safely." }
    ]
  }'::jsonb,
  'fan-and-light-installation',
  '/assets/services/fan_cleaning.png'
),
-- Door Lock Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0029'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Door Lock Installation',
  'Secure installation and replacement of cylindrical locks, mortise locks, and smart electronic locks on doors.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Standard Installation: ₹299 | Smart/Electronic Lock: ₹899',
  '{
    "about_text": "Improve your home security. We install cylindrical locks, heavy duty mortise locks, deadbolts, and modern electronic/smart door locks.",
    "included_features": [
      "Precise cutting/drilling in wooden door frames",
      "Fitting lock cylinder, latch plate, and handle",
      "Testing keys and smooth locking latch alignment"
    ],
    "excluded_features": [
      "Cost of lock hardware (supplied by customer)",
      "Door frame replacement or major repair work"
    ],
    "faqs": [
      { "question": "Can you install digital smart locks?", "answer": "Yes, we have specialized carpenters to calibrate and install biometric/smart door locks." }
    ],
    "why_choose_us": [
      { "icon": "key", "title": "Precise Alignment", "desc": "Perfect lock alignment prevents door frame damage." },
      { "icon": "verified_user", "title": "Expert Carpenters", "desc": "Experienced pros equipped with specialized drills." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Calibrating Frame", "desc": "Measuring and marking lock/handle heights on the door." },
      { "step": 2, "title": "Drilling & Fitting", "desc": "Mortising/drilling door and fitting latch, cylinder, and handle." }
    ]
  }'::jsonb,
  'door-lock-installation',
  '/assets/services/dusting_wiping.png'
),
-- CCTV Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0030'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd3'::uuid, -- CCTV & Security Systems
  'CCTV Installation',
  'Complete setup, cabling, camera mounting, DVR/NVR configuration, and mobile integration for CCTV security.',
  999.00,
  1499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '1-2 Cameras: ₹999 | 3-4 Cameras: ₹1899 | 8 Cameras System: ₹3499',
  '{
    "about_text": "Secure your property with CCTV installation. We mount dome/bullet cameras, run cables, configure DVRs/NVRs, and configure online mobile viewing.",
    "included_features": [
      "Camera mounting and angle adjustment",
      "DVR/NVR configuration and hard disk installation",
      "Wiring conduit routing and connectors crimping",
      "Configuring app viewing on mobile phones"
    ],
    "excluded_features": [
      "CCTV cameras, DVR, cables, power supply, and monitor (customer supplied)",
      "Civil wall cutting/plastering for concealed wiring (surface casing only)"
    ],
    "faqs": [
      { "question": "Do you configure remote viewing?", "answer": "Yes, as long as a working internet connection/Wi-Fi is available on-site." }
    ],
    "why_choose_us": [
      { "icon": "security", "title": "Mobile App Sync", "desc": "Watch your security cameras remotely on your smartphone." },
      { "icon": "verified_user", "title": "Conduit Wiring", "desc": "Cables routed in PVC casings to protect them from weather." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Camera Placement", "desc": "Identifying optimal camera locations for maximum coverage." },
      { "step": 2, "title": "Cabling & Mounting", "desc": "Routing cables and mounting bullet/dome cameras." },
      { "step": 3, "title": "NVR Setup & Sync", "desc": "Connecting NVR, setting up recording rules, and syncing to phone." }
    ]
  }'::jsonb,
  'cctv-installation',
  '/assets/services/wardrobe_cleaning.png'
),
-- Modular Kitchen Work
(
  'd186c52a-9bae-41e0-81f1-6be4409f0031'::uuid,
  '55700483-dbce-43f9-96ec-37960ccfbf40'::uuid, -- Modular Kitchen & Renovations
  'Modular Kitchen Work',
  'Custom design, repair, panel installation, hinge replacement, and full modular kitchen renovation services.',
  299.00,
  499.00,
  true,
  'Renovation, Logistics & Events',
  'inspection',
  '{
    "inspection_fee": 299
  }'::jsonb,
  'Base Inspection Charge: ₹299 (Final quote shared after site visit)',
  '{
    "about_text": "Upgrade your kitchen with modular baskets, soft-close hinges, overhead cabinets, and custom counter works. We provide site inspections and detailed 3D/cost layouts.",
    "included_features": [
      "Detailed site visit & dimension measurement",
      "Material, layout, and finish consultation",
      "Providing a detailed cost estimation quotation"
    ],
    "excluded_features": [
      "Any actual labor or materials until the custom quote is reviewed and approved by the customer"
    ],
    "faqs": [
      { "question": "What is the inspection fee used for?", "answer": "It covers the designer/technician visiting charge. It is adjusted in the final bill if you book the modular kitchen work." }
    ],
    "why_choose_us": [
      { "icon": "kitchen", "title": "Custom Designs", "desc": "Get tailored cabinet layouts to maximize storage space." },
      { "icon": "verified_user", "title": "Soft Close fittings", "desc": "We use premium soft-close hinges and heavy duty baskets." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Design Consultation", "desc": "Designer visits your home to take measurements and discuss layouts." },
      { "step": 2, "title": "Get Quotation", "desc": "Receive a detailed breakdown of materials, accessories, and labor." },
      { "step": 3, "title": "Execution", "desc": "Carpenters fabricate, assemble, and align modular cabinets on-site." }
    ]
  }'::jsonb,
  'modular-kitchen-work',
  '/assets/services/kitchen_cleaning.png'
),
-- False Ceiling
(
  'd186c52a-9bae-41e0-81f1-6be4409f0032'::uuid,
  '37680277-a2fa-4b0c-9d22-31254a2c3f0b'::uuid, -- Ceiling & Partition Work
  'False Ceiling',
  'Designer gypsum, POP, or PVC false ceiling installation for modern lighting and thermal insulation.',
  90.00,
  130.00,
  true,
  'Renovation, Logistics & Events',
  'area',
  '{
    "min_area": 100,
    "max_area": 5000,
    "price_per_sqft": 90,
    "area_pricing_mode": "flat",
    "area_slabs": [
      { "min": 100, "max": 500, "rate": 90 },
      { "min": 501, "max": 1000, "rate": 80 },
      { "min": 1001, "max": 5000, "rate": 75 }
    ]
  }'::jsonb,
  '₹90/sqft (100-500 sqft) | ₹80/sqft (501-1000 sqft) | ₹75/sqft (1001+ sqft)',
  '{
    "about_text": "Give your ceilings a modern editorial look. We install gypsum, PVC, or POP false ceilings with precise metal framing to support LED downlights and cove lighting.",
    "included_features": [
      "G.I. metal channel ceiling grid framework",
      "Fixing premium gypsum/POP boards and joint taping",
      "Cutting cutouts for lights & fan points",
      "Smoothing and plastering joints ready for paint"
    ],
    "excluded_features": [
      "Painting false ceiling (available as paint add-on)",
      "LED downlights, COB spots, or cove strip lights wiring (electrical point charges apply)"
    ],
    "faqs": [
      { "question": "What is the minimum area?", "answer": "We require a minimum ceiling size of 100 square feet to service." }
    ],
    "why_choose_us": [
      { "icon": "layers", "title": "Gypsum board", "desc": "We use moisture and heat-resistant premium gypsum." },
      { "icon": "verified_user", "title": "Trained Installers", "desc": "Grid alignment and levels checked using laser markers." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Grid Framework", "desc": "Securing galvanized iron rods and channels to the slab." },
      { "step": 2, "title": "Board Mounting", "desc": "Screwing gypsum sheets and cutting holes for electrical points." },
      { "step": 3, "title": "Jointing & Putty", "desc": "Applying jointing tape and wall putty to create a seamless surface." }
    ]
  }'::jsonb,
  'false-ceiling',
  '/assets/services/sweeping_mopping.png'
),
-- Tiles & Masonry Work
(
  'd186c52a-9bae-41e0-81f1-6be4409f0033'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d58'::uuid, -- Masonry & Tiles
  'Tiles & Masonry Work',
  'Wall and floor tile installation, grout repair, plastering, and custom masonry work for homes and offices.',
  40.00,
  60.00,
  true,
  'Home Repairs & Maintenance',
  'area',
  '{
    "min_area": 50,
    "max_area": 2000,
    "price_per_sqft": 40,
    "area_pricing_mode": "flat",
    "area_slabs": [
      { "min": 50, "max": 200, "rate": 40 },
      { "min": 201, "max": 500, "rate": 35 },
      { "min": 501, "max": 2000, "rate": 30 }
    ]
  }'::jsonb,
  '₹40/sqft (50-200 sqft) | ₹35/sqft (201-500 sqft) | ₹30/sqft (501+ sqft)',
  '{
    "about_text": "Get new tiles laid or concrete floors repaired. We lay wall tiles, floor vitrified tiles, marble floors, and handle wall plastering/brickwork repairs.",
    "included_features": [
      "Cement mortar leveling base preparation",
      "Laying vitrified, ceramic, or mosaic tiles",
      "Epoxy or standard grout filling between tile gaps",
      "Cleaning and washing tiled surface"
    ],
    "excluded_features": [
      "Supply of tiles, stones, or designer marble (customer supplied)",
      "Major debris removal (debris bagging is included, shifting tractor is extra)"
    ],
    "faqs": [
      { "question": "Who provides cement and sand?", "answer": "Cement and sand are standard materials that our masonry professional can supply and bill to you at cost." }
    ],
    "why_choose_us": [
      { "icon": "grid_view", "title": "Zero Lippage", "desc": "Tile spacers and levellers used to ensure an absolutely flat floor." },
      { "icon": "verified_user", "title": "Masonry Experts", "desc": "Experienced builders executing durable plastering and tiling." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Screed Leveling", "desc": "Preparing raw concrete and laying cement-sand screed level." },
      { "step": 2, "title": "Tiling", "desc": "Applying tile adhesive and laying tiles with spacers." },
      { "step": 3, "title": "Grouting & Cleaning", "desc": "Filling joint lines with epoxy/cement grout and sponge cleaning." }
    ]
  }'::jsonb,
  'tiles-and-masonry-work',
  '/assets/services/bathroom_cleaning.png'
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
  -- Mattress Cleaning Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0011'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0017'::uuid, 'Single Bed Mattress', 'Deep cleaning & sanitization of 1 single size mattress (one side only or both depending on stain depth).', 299.00, 499.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0012'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0017'::uuid, 'Double Bed Mattress', 'Deep cleaning & sanitization of 1 double size mattress.', 499.00, 799.00, 120),
  ('e186c52a-9bae-41e0-81f1-6be4409f0013'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0017'::uuid, 'King Size Mattress', 'Deep cleaning & sanitization of 1 premium king size mattress.', 599.00, 999.00, 150),

  -- RO Service & Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0014'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0019'::uuid, 'Standard RO Service', 'Water TDS checking, filter cleanup, and inside tank cleaning/deodorization.', 399.00, 599.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0015'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0019'::uuid, 'RO Repair & Troubleshooting', 'Diagnostic visit to locate pump/PCB or water flow failures. Spare parts billed extra.', 299.00, 399.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0016'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0019'::uuid, 'RO Filter & Membrane Replacement', 'Full set replacement including sediment, carbon filter, pre-filter, and RO membrane.', 1499.00, 2499.00, 90),

  -- Washing Machine Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0017'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0020'::uuid, 'Diagnostic & Inspection', 'On-site diagnosis of washing machine faults. Inspection fee waived if repaired.', 249.00, 399.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0018'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0020'::uuid, 'Standard Repair (Drain Pump/Belt)', 'Replacing drain pump, drive belt, or door switch safety latch.', 899.00, 1299.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0019'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0020'::uuid, 'Major Repair (Motor/Drum)', 'Drum re-alignment, bearings replacement, or motor capacitor/carbon replacement.', 1799.00, 2999.00, 120),

  -- Refrigerator Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0020'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0021'::uuid, 'Diagnostic & Inspection', 'Overall refrigerator inspection and checking cooling/wiring path.', 299.00, 499.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0021'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0021'::uuid, 'Gas Charging', 'Flushing the cooling loop, vacuuming, and recharging refrigerant gas.', 1899.00, 2499.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0022'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0021'::uuid, 'Compressor Replacement', 'Unmounting faulty compressor, brazing new unit, and testing loop. Part cost extra.', 3499.00, 4999.00, 120),

  -- Microwave Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0023'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0022'::uuid, 'Diagnostic & Inspection', 'Microwave oven inspection and electrical wiring diagnostics.', 199.00, 299.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0024'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0022'::uuid, 'Magnetron Replacement', 'Replacing the primary heating component (magnetron) with 90-day warranty.', 1299.00, 1999.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0025'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0022'::uuid, 'Touchpad & Display Repair', 'Replacing or repairing the control panel touchpad membrane or display board.', 799.00, 1199.00, 90),

  -- Geyser Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0026'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0023'::uuid, 'Diagnostic & Inspection', 'Checking geyser thermal cutoff, wiring, and safety valves.', 199.00, 299.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0027'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0023'::uuid, 'Heating Element Replacement', 'Installing a new high-density heating element (part cost included).', 899.00, 1499.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0023'::uuid, 'Thermostat & Sensor Repair', 'Replacing faulty geyser thermostat or thermal sensor switches.', 499.00, 799.00, 60),

  -- TV Repair Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0029'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0024'::uuid, 'Diagnostic & Inspection', 'On-site smart TV panel and power board diagnostics.', 299.00, 499.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0030'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0024'::uuid, 'Backlight Replacement', 'Replacing the internal LED backlights to fix sound-on, black-screen issues.', 1499.00, 2499.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0031'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0024'::uuid, 'Power/Motherboard Repair', 'Component-level capacitor/IC soldering or replacement on TV main board.', 999.00, 1699.00, 90),

  -- AC Installation & Uninstallation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0032'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid, 'Window AC Uninstallation', 'Unmounting Window AC unit cleanly and packing cord/screws.', 399.00, 599.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0033'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid, 'Window AC Installation', 'Precise window mounting, sealing gaps, and testing airflow.', 599.00, 899.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0034'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid, 'Split AC Uninstallation', 'Pumping down refrigerant gas, disconnecting pipes, and unmounting Split units.', 599.00, 899.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0035'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid, 'Split AC Installation', 'Mounting indoor & outdoor units, core wall drilling, piping connection, and leak test.', 1199.00, 1799.00, 150),

  -- Door Lock Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0036'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0029'::uuid, 'Standard Door Lock', 'Installing standard knob locks, latches, mortise locks or deadbolts.', 299.00, 499.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0037'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0029'::uuid, 'Smart/Electronic Lock', 'Specialized routing/chiselling and installation of biometric & digital pin locks.', 899.00, 1499.00, 90),

  -- CCTV Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0038'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0030'::uuid, '1-2 CCTV Cameras Setup', 'Mounting and laying casing/wires for up to 2 security cameras and NVR sync.', 999.00, 1499.00, 120),
  ('e186c52a-9bae-41e0-81f1-6be4409f0039'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0030'::uuid, '3-4 CCTV Cameras Setup', 'Mounting and casing/wiring connection for up to 4 security cameras and sync.', 1899.00, 2799.00, 180),
  ('e186c52a-9bae-41e0-81f1-6be4409f0040'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0030'::uuid, '8 CCTV Cameras System Setup', 'Complete commercial-grade cabling, conduit laying, and setup for 8 cameras.', 3499.00, 4999.00, 300)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_minutes = EXCLUDED.duration_minutes;

-- 4. Seed Duration Pricing for Hourly Fan & Light Installation Service
INSERT INTO public.service_duration_pricing (service_id, duration_minutes, price, original_price, is_active) VALUES
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 60, 150.00, 250.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 120, 300.00, 500.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 180, 450.00, 750.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 240, 600.00, 1000.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 300, 750.00, 1250.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 360, 900.00, 1500.00, true),
  ('d186c52a-9bae-41e0-81f1-6be4409f0028'::uuid, 480, 1200.00, 2000.00, true)
ON CONFLICT (service_id, duration_minutes) DO UPDATE SET
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  is_active = EXCLUDED.is_active;

-- Ensure all new services have their slug populated using fallback if any are NULL
UPDATE public.services SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
