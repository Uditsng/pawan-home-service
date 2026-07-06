-- SQL Migration to add AC Services
-- Name: 20260706020000_add_ac_services.sql

-- 1. Insert or Update Services
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
-- AC Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0047'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'AC Installation',
  'Get your new air conditioner professionally installed by certified AC technicians. We ensure secure installation, proper electrical and drainage connections, vacuum testing, and complete performance checks for efficient cooling.',
  799.00,
  1299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Window AC Installation: ₹799 | Split AC Installation: ₹1499',
  '{
    "about_text": "Get your new air conditioner professionally installed by certified AC technicians. We ensure secure installation, proper electrical and drainage connections, vacuum testing, and complete performance checks for efficient cooling.",
    "included_features": [
      "Professional AC installation",
      "Indoor & outdoor unit mounting (Split AC)",
      "Window AC fitting (Window AC)",
      "Drain pipe and electrical connection check",
      "Performance and cooling test after installation"
    ],
    "excluded_features": [
      "Copper pipe, drain pipe, brackets, or wiring",
      "Outdoor unit stand",
      "Core cutting or wall drilling beyond standard installation",
      "Gas charging or gas refilling",
      "Civil work or electrical modifications"
    ],
    "faqs": [
      { "question": "Do you install all AC brands?", "answer": "Yes, we install all major Split and Window AC brands." },
      { "question": "Are installation materials included?", "answer": "No. Copper pipes, brackets, drain pipes, and wiring are charged separately if required." },
      { "question": "Is gas refilling included?", "answer": "No." },
      { "question": "How long does installation take?", "answer": "Approximately 2–3 hours for Split AC and 45–90 minutes for Window AC." },
      { "question": "Do you test the AC after installation?", "answer": "Yes, complete performance and cooling tests are performed." }
    ],
    "why_choose_us": [
      { "icon": "ac_unit", "title": "Certified Technicians", "desc": "AC experts trained for LG, Daikin, Voltas, Samsung, etc." },
      { "icon": "verified_user", "title": "Quality Mounting", "desc": "Secure, vibration-free indoor and outdoor unit mounting." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Select AC Type", "desc": "Select Split AC or Window AC installation and schedule your visit." },
      { "step": 2, "title": "Professional Mounting", "desc": "Technician mounts units, connects wiring, and checks alignment." },
      { "step": 3, "title": "Performance Test", "desc": "AC is vacuum tested and checked for optimal cooling." }
    ]
  }'::jsonb,
  'ac-installation',
  '/assets/hero_ac_repair_1773410812102.png'
),
-- AC Uninstallation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0048'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'AC Uninstallation',
  'Safely uninstall your Split or Window AC during relocation, replacement, or renovation. Our technicians carefully disconnect the unit while minimizing the risk of damage.',
  649.00,
  1099.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Split AC Uninstallation: ₹649 | Window AC Uninstallation: ₹699',
  '{
    "about_text": "Safely uninstall your Split or Window AC during relocation, replacement, or renovation. Our technicians carefully disconnect the unit while minimizing the risk of damage.",
    "included_features": [
      "Safe AC removal",
      "Indoor & outdoor unit disconnection (Split AC)",
      "Window AC removal",
      "Basic inspection after removal",
      "Customer handover"
    ],
    "excluded_features": [
      "Reinstallation at another location",
      "Transportation of AC unit",
      "Gas recovery or gas refilling",
      "Wall repair or civil work",
      "New installation"
    ],
    "faqs": [
      { "question": "Will the AC be damaged during removal?", "answer": "No. Our technicians follow safe uninstallation procedures." },
      { "question": "Is transportation included?", "answer": "No." },
      { "question": "Can the same AC be reinstalled later?", "answer": "Yes." },
      { "question": "How long does uninstallation take?", "answer": "30–60 minutes for Window AC and 45–90 minutes for Split AC." },
      { "question": "Do you uninstall all AC brands?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "disabled_by_default", "title": "Safe Dismantling", "desc": "Pre-pumping gas and clean disconnections to protect components." },
      { "icon": "timer", "title": "Quick Service", "desc": "Technicians dismantle Split or Window units safely and on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Schedule Service", "desc": "Select Split or Window AC uninstallation and set a date." },
      { "step": 2, "title": "Pump Down & Removal", "desc": "Gas is locked/pumped down and units are cleanly unmounted." },
      { "step": 3, "title": "Handover", "desc": "We safely hand over the AC unit and fittings." }
    ]
  }'::jsonb,
  'ac-uninstallation',
  '/assets/hero_ac_repair_1773410812102.png'
),
-- AC Repair Check-up
(
  'd186c52a-9bae-41e0-81f1-6be4409f0049'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'AC Repair Check-up',
  'Is your AC not cooling, leaking water, making unusual noises, or showing power issues? Our certified technicians will inspect your air conditioner, diagnose the exact problem, and provide a transparent repair quotation.',
  299.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'AC Repair Check-up: ₹299',
  '{
    "about_text": "Is your AC not cooling, leaking water, making unusual noises, or showing power issues? Our certified technicians will inspect your air conditioner, diagnose the exact problem, and provide a transparent repair quotation before any work begins.",
    "included_features": [
      "Complete AC inspection",
      "Cooling performance diagnosis",
      "Gas pressure inspection",
      "Water leakage inspection",
      "Electrical and PCB diagnosis",
      "Transparent repair quotation"
    ],
    "excluded_features": [
      "Gas refilling charges",
      "Compressor replacement",
      "PCB, capacitor, fan motor, or sensor replacement",
      "Spare parts and accessories",
      "Major repair charges"
    ],
    "faqs": [
      { "question": "Is gas refilling included in ₹299?", "answer": "No. The ₹299 fee covers inspection and diagnosis only. Gas refilling is charged separately if required." },
      { "question": "Can the inspection fee be adjusted?", "answer": "Yes. The inspection fee is adjusted against the final repair bill if you approve the repair." },
      { "question": "Can my AC be repaired during the same visit?", "answer": "Yes, if the required spare parts are available and you approve the quotation." },
      { "question": "Which AC brands do you repair?", "answer": "We repair all major brands including LG, Daikin, Voltas, Blue Star, Carrier, Hitachi, Samsung, Panasonic, Lloyd, Whirlpool, Haier, IFB, and many more." },
      { "question": "How long does the inspection take?", "answer": "Typically 20–40 minutes, depending on the issue." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Accurate Diagnosis", "desc": "Testing cooling path, compressor load, and gas pressure." },
      { "icon": "verified_user", "title": "Fee Adjustment", "desc": "Inspection fee is waived or adjusted if you proceed with repairs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Book Check-up", "desc": "Book AC inspection online and specify the issue." },
      { "step": 2, "title": "On-Site Diagnosis", "desc": "Technician tests motor, electrical line, and gas pressure." },
      { "step": 3, "title": "Quote & Repair", "desc": "Get a quote and proceed with same-day fix (subject to parts)." }
    ]
  }'::jsonb,
  'ac-repair-check-up',
  '/assets/hero_ac_repair_1773410812102.png'
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

-- 2. Seed Service Variants
INSERT INTO public.service_variants (id, service_id, title, description, price, original_price, duration_minutes) VALUES
  -- AC Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0053'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0047'::uuid, 'Split AC Installation', 'Mounting indoor & outdoor units, piping connection, and leak test.', 1499.00, 1999.00, 150),
  ('e186c52a-9bae-41e0-81f1-6be4409f0054'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0047'::uuid, 'Window AC Installation', 'Precise window mounting, sealing gaps, and testing airflow.', 799.00, 1199.00, 90),

  -- AC Uninstallation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0055'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0048'::uuid, 'Split AC Uninstallation', 'Safe dismantling of indoor and outdoor Split AC units.', 649.00, 999.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0056'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0048'::uuid, 'Window AC Uninstallation', 'Safe dismantling and removal of Window AC unit.', 699.00, 1099.00, 60),

  -- AC Repair Check-up Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0057'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0049'::uuid, 'AC Repair Check-up', 'Complete diagnostics and troubleshooting. Repair quoted on-site.', 299.00, 499.00, 45)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_minutes = EXCLUDED.duration_minutes;

-- 3. Deactivate legacy AC Installation & Uninstallation service and its variants
UPDATE public.services SET is_active = false WHERE id = 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid;
UPDATE public.service_variants SET is_active = false WHERE service_id = 'd186c52a-9bae-41e0-81f1-6be4409f0025'::uuid;
