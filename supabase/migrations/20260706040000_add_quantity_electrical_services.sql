-- SQL Migration to add quantity-based Electrical & Inverter Services
-- Name: 20260706040000_add_quantity_electrical_services.sql

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
-- Bulb/Tube Light Holder Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0073'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Bulb/Tube Light Holder Installation',
  'Professional installation or replacement of bulb holders and tube light holders for safe, reliable, and long-lasting electrical connections. Labour charges only.',
  109.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 109,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "holders"
  }'::jsonb,
  '₹109 per unit',
  '{
    "about_text": "Professional installation or replacement of bulb holders and tube light holders for safe, reliable, and long-lasting electrical connections. Labour charges only.",
    "included_features": [
      "Installation of one bulb or tube light holder",
      "Removal of old holder (if applicable)",
      "Secure electrical wiring connection",
      "Functional testing after installation",
      "Basic safety inspection of the connection"
    ],
    "excluded_features": [
      "Holder, bulb, tube light, or other materials",
      "New wiring or concealed wiring work",
      "Switchboard modifications",
      "Civil work such as wall cutting or drilling",
      "Repairs to damaged electrical circuits"
    ],
    "faqs": [
      { "question": "Does the price include the holder?", "answer": "No. The service covers labour charges only. Materials are charged separately if required." },
      { "question": "Can you replace a damaged holder?", "answer": "Yes. Our professional can safely remove the old holder and install a new one." },
      { "question": "Will the electrician test the holder?", "answer": "Yes. The holder is tested after installation to ensure proper operation." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Safety Insulated", "desc": "Wired with heavy duty insulation checks to prevent current leaks." },
      { "icon": "verified_user", "title": "Expert Alignments", "desc": "Clean and straight mounting on wall block plates." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Isolate Line", "desc": "Safely cutting off power from the switchboard." },
      { "step": 2, "title": "Mounting", "desc": "Unfitting old holder and screwing the new holder unit." },
      { "step": 3, "title": "Testing", "desc": "Testing connection with bulb/tube lighting." }
    ]
  }'::jsonb,
  'bulb-tube-light-holder-installation',
  '/assets/services/dusting_wiping.png'
),
-- CFL to LED Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0074'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'CFL to LED Replacement',
  'Upgrade your old CFL lights to energy-efficient LED lighting with professional installation for improved brightness, lower electricity bills, and longer lifespan.',
  169.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "lights"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Upgrade your old CFL lights to energy-efficient LED lighting with professional installation for improved brightness, lower electricity bills, and longer lifespan.",
    "included_features": [
      "Removal of one CFL fitting or bulb",
      "Installation of compatible LED fitting or bulb",
      "Electrical connection check",
      "Functional testing after replacement",
      "Safe handling during installation"
    ],
    "excluded_features": [
      "Cost of LED bulbs or fixtures",
      "New wiring installation",
      "Switchboard repairs",
      "Ceiling modifications",
      "Decorative lighting installation"
    ],
    "faqs": [
      { "question": "Do I need to purchase the LED light separately?", "answer": "Yes. The service includes labour only unless materials are added to your booking." },
      { "question": "Can all CFL lights be replaced with LEDs?", "answer": "Most can, but compatibility depends on the existing fixture. The electrician will inspect before installation." },
      { "question": "Will this reduce electricity consumption?", "answer": "Yes. LED lights consume significantly less electricity than traditional CFL bulbs." }
    ],
    "why_choose_us": [
      { "icon": "eco", "title": "Energy Saving", "desc": "LEDs lower power consumption by up to 60-80% compared to CFLs." },
      { "icon": "verified_user", "title": "Clean Fittings", "desc": "Mounting new compatible LED drivers neatly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Old Fitting", "desc": "Dismantling old CFL frame or bulbs." },
      { "step": 2, "title": "Fit LED Driver", "desc": "Connecting LED choke and mounting base plate." },
      { "step": 3, "title": "Illumination Test", "desc": "Checking light distribution and intensity." }
    ]
  }'::jsonb,
  'cfl-to-led-replacement',
  '/assets/services/dusting_wiping.png'
),
-- Single-Pole MCB Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0075'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services (MCB section)
  'Single-Pole MCB Installation',
  'Professional installation of a single-pole Miniature Circuit Breaker (MCB) to provide protection against overloads and short circuits in individual electrical circuits.',
  119.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 119,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "units"
  }'::jsonb,
  '₹119 per unit',
  '{
    "about_text": "Professional installation of a single-pole Miniature Circuit Breaker (MCB) to provide protection against overloads and short circuits in individual electrical circuits.",
    "included_features": [
      "Installation of one single-pole MCB",
      "Secure electrical connections",
      "Circuit testing after installation",
      "Basic safety inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of MCB",
      "Distribution board modifications",
      "Wiring replacement",
      "Additional accessories",
      "Electrical fault diagnosis"
    ],
    "faqs": [
      { "question": "What is a single-pole MCB used for?", "answer": "It protects individual electrical circuits such as lighting or power outlets from overload and short circuits." },
      { "question": "Is the MCB included in the price?", "answer": "No. The service includes labour only." },
      { "question": "Will power be turned off during installation?", "answer": "Yes. Power is temporarily disconnected to ensure safe installation." }
    ],
    "why_choose_us": [
      { "icon": "shield", "title": "Overload Protection", "desc": "Ensuring circuit protection triggers safely during voltage spikes." },
      { "icon": "verified_user", "title": "Distribution Box Experts", "desc": "Fitted neatly on standard DIN rails." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Isolate Main DB", "desc": "Power cutoff to electrical panel board." },
      { "step": 2, "title": "DIN Rail Mounting", "desc": "Clipping Single-Pole MCB and connecting phase line." },
      { "step": 3, "title": "Short Test", "desc": "Traced circuit load testing check." }
    ]
  }'::jsonb,
  'single-pole-mcb-installation',
  '/assets/services/dusting_wiping.png'
),
-- Double-Pole MCB Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0076'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services (MCB section)
  'Double-Pole MCB Installation',
  'Safe installation of a double-pole MCB for circuits requiring isolation of both phase and neutral connections, commonly used for high-power appliances.',
  150.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 150,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "units"
  }'::jsonb,
  '₹150 per unit',
  '{
    "about_text": "Safe installation of a double-pole MCB for circuits requiring isolation of both phase and neutral connections, commonly used for high-power appliances.",
    "included_features": [
      "Installation of one double-pole MCB",
      "Proper phase and neutral connections",
      "Circuit testing",
      "Safety inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of MCB",
      "Distribution board upgrades",
      "Wiring replacement",
      "Electrical repairs",
      "Additional electrical accessories"
    ],
    "faqs": [
      { "question": "Where is a double-pole MCB commonly used?", "answer": "It is typically used for appliances such as geysers, air conditioners, and other high-load electrical equipment." },
      { "question": "Is the MCB supplied by PHS?", "answer": "No. Materials are charged separately unless included in your booking." },
      { "question": "Will the installation affect other circuits?", "answer": "Only temporary power isolation is required during installation." }
    ],
    "why_choose_us": [
      { "icon": "security", "title": "Double Isolation", "desc": "Cuts off both Phase and Neutral for maximum high-load safety." },
      { "icon": "verified_user", "title": "Amperage Matched", "desc": "Electrician checks to ensure MCB matches appliance rating (e.g. 25A/32A)." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Load Check", "desc": "Checking geyser or AC wire thickness." },
      { "step": 2, "title": "Mount Double-Pole", "desc": "Mounting unit on DB panel and routing phase and neutral wires." },
      { "step": 3, "title": "Check Terminal", "desc": "Tension checks on screw terminals to avoid heating." }
    ]
  }'::jsonb,
  'double-pole-mcb-installation',
  '/assets/services/dusting_wiping.png'
),
-- MCB/Fuse Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0077'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services (MCB section)
  'MCB/Fuse Replacement',
  'Replacement of faulty or damaged MCBs and electrical fuses to restore safe and reliable power distribution in your home or office.',
  109.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 109,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "units"
  }'::jsonb,
  '₹109 per unit',
  '{
    "about_text": "Replacement of faulty or damaged MCBs and electrical fuses to restore safe and reliable power distribution in your home or office.",
    "included_features": [
      "Removal of defective MCB or fuse",
      "Installation of replacement unit",
      "Functional testing",
      "Basic electrical safety inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of replacement MCB or fuse",
      "Electrical fault diagnosis",
      "Wiring repairs",
      "Distribution board replacement",
      "Major electrical troubleshooting"
    ],
    "faqs": [
      { "question": "Why does an MCB trip frequently?", "answer": "Frequent tripping may indicate overload, short circuit, or an electrical fault that requires inspection." },
      { "question": "Is the replacement MCB included?", "answer": "No. Only labour charges are included." },
      { "question": "Can you replace old ceramic fuses with MCBs?", "answer": "Yes, if your electrical panel supports the upgrade." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Fault Finding", "desc": "We check the line to verify why the MCB/fuse blew or failed." },
      { "icon": "verified_user", "title": "Quick Fix", "desc": "Immediate switch/fuse module replacement to restore power." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Trace Trip", "desc": "Testing line resistance to check short circuits." },
      { "step": 2, "title": "Replace Module", "desc": "Extracting damaged MCB/fuse and clipping new one." },
      { "step": 3, "title": "Restore Power", "desc": "Powering up and verifying circuit stability." }
    ]
  }'::jsonb,
  'mcb-fuse-replacement',
  '/assets/services/dusting_wiping.png'
),
-- Submeter Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0078'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services (MCB section)
  'Submeter Installation',
  'Professional installation of an electrical submeter for monitoring electricity consumption in individual rooms, rental units, offices, or commercial spaces.',
  319.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 319,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "units"
  }'::jsonb,
  '₹319 per unit',
  '{
    "about_text": "Professional installation of an electrical submeter for monitoring electricity consumption in individual rooms, rental units, offices, or commercial spaces.",
    "included_features": [
      "Installation of one electrical submeter",
      "Secure electrical connections",
      "Meter mounting",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of submeter",
      "Government approvals or registration",
      "Additional wiring",
      "Distribution board modifications",
      "Civil work"
    ],
    "faqs": [
      { "question": "What is a submeter used for?", "answer": "It measures electricity consumption separately for a specific area or tenant." },
      { "question": "Does this include the meter?", "answer": "No. The service covers installation only." },
      { "question": "Can it be installed in rental properties?", "answer": "Yes. Submeters are commonly installed in rental homes and commercial units." }
    ],
    "why_choose_us": [
      { "icon": "analytics", "title": "Accurate Reading", "desc": "Calibrated terminal connections to ensure correct phase consumption logs." },
      { "icon": "verified_user", "title": "Secure Enclosure", "desc": "Electricians ensure meter wiring is sealed and insulated." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Line Splitting", "desc": "Identifying output load lines for the specific tenant/room." },
      { "step": 2, "title": "Mount Meter", "desc": "Mounting the submeter box and connecting incoming/outgoing circuits." },
      { "step": 3, "title": "Calibration check", "desc": "Checking indicator light blinks under active load." }
    ]
  }'::jsonb,
  'submeter-installation',
  '/assets/services/dusting_wiping.png'
),
-- 3-Phase Changeover Switch Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0079'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services (MCB section)
  '3-Phase Changeover Switch Installation',
  'Professional installation of a 3-phase changeover switch for safe switching between different power sources in residential, commercial, and industrial electrical systems.',
  329.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 329,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "switches"
  }'::jsonb,
  '₹329 per unit',
  '{
    "about_text": "Professional installation of a 3-phase changeover switch for safe switching between different power sources in residential, commercial, and industrial electrical systems.",
    "included_features": [
      "Installation of one 3-phase changeover switch",
      "Secure electrical connections",
      "Functional testing",
      "Safety inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Cost of changeover switch",
      "Generator installation",
      "Distribution panel modifications",
      "Additional wiring",
      "Civil work or fabrication"
    ],
    "faqs": [
      { "question": "What is a 3-phase changeover switch?", "answer": "It allows safe switching between two different power sources, such as mains electricity and a generator." },
      { "question": "Is this suitable for homes?", "answer": "It is generally used in homes or businesses with a 3-phase electrical supply." },
      { "question": "Does this service include the switch?", "answer": "No. The listed price covers installation labour only." }
    ],
    "why_choose_us": [
      { "icon": "swap_calls", "title": "Safe Phase Switching", "desc": "Heavy-duty contact changeovers to prevent phase short circuits." },
      { "icon": "verified_user", "title": "Insulated Housing", "desc": "Metal enclosure box earth checkups to secure operators." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "DB Check", "desc": "Electrician traces 3 phases (R, Y, B) and neutral wire lines." },
      { "step": 2, "title": "Wire Changeover", "desc": "Connecting main grid line and backup generator lines into switch inputs." },
      { "step": 3, "title": "Throw test", "desc": "Testing changeover switch throwing actions under full load." }
    ]
  }'::jsonb,
  '3-phase-changeover-switch-installation',
  '/assets/services/dusting_wiping.png'
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
