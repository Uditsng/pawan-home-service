-- SQL Migration to add Switch & Socket, Fan & Doorbell, and Inverter & Stabiliser Services
-- Name: 20260706030000_add_electrical_and_inverter_services.sql

-- 1. Create New Subcategories under 'Home Repairs & Maintenance'
-- '4f18fd15-29cd-4aff-b47f-64f68852df4b' is the category ID for 'Home Repairs & Maintenance'
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, 'Switch & Socket Services', 'power', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, 'Fan & Doorbell Services', 'mode_fan', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, 'Inverter & Stabiliser Services', 'battery_charging_full', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid)
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
-- 1. Switchbox Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0051'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Switchbox Installation',
  'Professional installation of a new switchbox or power outlet using your existing electrical connection. Perfect for new rooms, renovations, or replacing damaged switchboxes.',
  349.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹349 per Switchbox',
  '{
    "about_text": "Professional installation of a new switchbox or power outlet using your existing electrical connection. Perfect for new rooms, renovations, or replacing damaged switchboxes.",
    "included_features": [
      "Installation of one switchbox",
      "Electrical wiring connection",
      "Secure mounting and alignment",
      "Safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Switchbox and accessories",
      "New wiring installation",
      "Wall cutting or chasing",
      "Civil repair or painting",
      "Materials and spare parts"
    ],
    "faqs": [
      { "question": "Are switchbox materials included?", "answer": "No. Materials are charged separately or can be provided by the customer." },
      { "question": "Will the electrician test the installation?", "answer": "Yes." },
      { "question": "Can you install modular switchboxes?", "answer": "Yes." },
      { "question": "Do you install in new homes?", "answer": "Yes." },
      { "question": "Is wall cutting included?", "answer": "No." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Safety Standards", "desc": "Proper grounding and shock-protection routing." },
      { "icon": "verified_user", "title": "Certified Electricians", "desc": "Background-checked professionals for safe home setups." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Connection", "desc": "Electrican checks existing wiring and lines." },
      { "step": 2, "title": "Mounting", "desc": "The switchbox is securely screwed and aligned on the wall." },
      { "step": 3, "title": "Testing", "desc": "Testing sockets with load meters for safe operations." }
    ]
  }'::jsonb,
  'switchbox-installation',
  '/assets/services/dusting_wiping.png'
),
-- 2. AC Switchbox Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0052'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'AC Switchbox Installation',
  'Install a dedicated AC switchbox for safe and reliable power supply to your split or window air conditioner.',
  329.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹329 per Unit',
  '{
    "about_text": "Install a dedicated AC switchbox for safe and reliable power supply to your split or window air conditioner.",
    "included_features": [
      "Installation of one AC switchbox",
      "Electrical connection",
      "Safety inspection",
      "Functional testing",
      "Proper alignment"
    ],
    "excluded_features": [
      "AC switchbox",
      "MCB",
      "Wiring",
      "Wall cutting",
      "Civil work"
    ],
    "faqs": [
      { "question": "Does this include AC installation?", "answer": "No." },
      { "question": "Is MCB included?", "answer": "No." },
      { "question": "Can you install for split and window AC?", "answer": "Yes." },
      { "question": "Do you test after installation?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Only existing wiring connection." }
    ],
    "why_choose_us": [
      { "icon": "flash_on", "title": "High Load Calibration", "desc": "Dedicated AC lines for heavy current flow safety." },
      { "icon": "verified_user", "title": "Certified Electricians", "desc": "Insulated safety tools and standard MCB ratings wiring." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Load Check", "desc": "Determining power point wiring capability." },
      { "step": 2, "title": "Box Setup", "desc": "AC switchboard installation with custom socket/switch." },
      { "step": 3, "title": "Testing", "desc": "High voltage test check." }
    ]
  }'::jsonb,
  'ac-switchbox-installation',
  '/assets/services/dusting_wiping.png'
),
-- 3. Switchboard Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0053'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Switchboard Installation',
  'Professional installation of modular switchboards using existing concealed wiring for homes, offices, and commercial spaces.',
  279.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹279 per Unit',
  '{
    "about_text": "Professional installation of modular switchboards using existing concealed wiring for homes, offices, and commercial spaces.",
    "included_features": [
      "Install one switchboard",
      "Existing wiring connection",
      "Proper alignment",
      "Safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Switchboard",
      "Modular switches",
      "Socket modules",
      "Concealed box",
      "New wiring"
    ],
    "faqs": [
      { "question": "Are modular switchboards supported?", "answer": "Yes." },
      { "question": "Are switches included?", "answer": "No." },
      { "question": "Do you install metal switchboards?", "answer": "Yes." },
      { "question": "Is testing included?", "answer": "Yes." },
      { "question": "Is wall cutting included?", "answer": "No." }
    ],
    "why_choose_us": [
      { "icon": "grid_view", "title": "Clean Alignment", "desc": "Laser levelers used for perfect horizontal wall alignments." },
      { "icon": "verified_user", "title": "Neat Wiring", "desc": "Safe cable grouping and isolation logic within panels." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Wiring Checkup", "desc": "Isolating lines and verifying active phase lines." },
      { "step": 2, "title": "Board Assembly", "desc": "Fitting switches/sockets on plate and mounting base." },
      { "step": 3, "title": "Voltage Test", "desc": "Checking output on each socket switch point." }
    ]
  }'::jsonb,
  'switchboard-installation',
  '/assets/services/dusting_wiping.png'
),
-- 4. Smart Switch Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0054'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Smart Switch Installation',
  'Install Wi-Fi or touch-enabled smart switches for convenient remote control and home automation.',
  150.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹150 per Smart Switch',
  '{
    "about_text": "Install Wi-Fi or touch-enabled smart switches for convenient remote control and home automation.",
    "included_features": [
      "Install one smart switch",
      "Electrical wiring connection",
      "Basic pairing assistance",
      "Functional testing",
      "Safety inspection"
    ],
    "excluded_features": [
      "Smart switch",
      "Smart hub",
      "Router configuration",
      "Mobile app setup",
      "Internet troubleshooting"
    ],
    "faqs": [
      { "question": "Can you install all smart switch brands?", "answer": "Yes." },
      { "question": "Will you connect it to Wi-Fi?", "answer": "Basic pairing assistance is included." },
      { "question": "Is the smart switch included?", "answer": "No." },
      { "question": "Does it work with Alexa and Google Home?", "answer": "Supported devices can be paired." },
      { "question": "Do I need internet?", "answer": "Yes, for Wi-Fi functionality." }
    ],
    "why_choose_us": [
      { "icon": "smart_button", "title": "Smart Tech Experts", "desc": "Technicians who understand IoT phase/neutral wiring requirements." },
      { "icon": "verified_user", "title": "Pairing Support", "desc": "Basic app sync to ensure device connects to your Wi-Fi." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Phase Calibration", "desc": "Check for neutral wire availability (critical for smart switches)." },
      { "step": 2, "title": "Integration", "desc": "Wired setup and mounting smart switches into current plate." },
      { "step": 3, "title": "App Sync", "desc": "Help user trigger pairing mode on app." }
    ]
  }'::jsonb,
  'smart-switch-installation',
  '/assets/services/dusting_wiping.png'
),
-- 5. Smart Appliance Controller Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0055'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Smart Appliance Controller Installation',
  'Install smart appliance controllers for remote operation of lights, fans, geysers, and other compatible electrical appliances.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹199 per Controller',
  '{
    "about_text": "Install smart appliance controllers for remote operation of lights, fans, geysers, and other compatible electrical appliances.",
    "included_features": [
      "Controller installation",
      "Electrical connection",
      "Safety inspection",
      "Functional testing",
      "Basic setup assistance"
    ],
    "excluded_features": [
      "Smart controller",
      "Smart hub",
      "Internet setup",
      "Mobile app configuration",
      "Home automation integration"
    ],
    "faqs": [
      { "question": "Is the controller included?", "answer": "No." },
      { "question": "Which appliances are supported?", "answer": "Compatible appliances only." },
      { "question": "Will Wi-Fi be configured?", "answer": "Basic assistance only." },
      { "question": "Can multiple controllers be installed?", "answer": "Yes." },
      { "question": "Do you test after installation?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "settings_remote", "title": "Load Validation", "desc": "Wiring verified to match appliance peak wattage loads." },
      { "icon": "verified_user", "title": "Automation Safe", "desc": "Ensuring controller bypass switches operate normally." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Load", "desc": "Checking geyser or AC peak loads." },
      { "step": 2, "title": "Install", "desc": "Connecting smart appliance controller inline." },
      { "step": 3, "title": "Pairing", "desc": "Helping check remote/app operation." }
    ]
  }'::jsonb,
  'smart-appliance-controller-installation',
  '/assets/services/dusting_wiping.png'
),
-- 6. Wi-Fi Smart Switch Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0056'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Wi-Fi Smart Switch Installation',
  'Professional installation of Wi-Fi-enabled smart switch modules for convenient app-based control of your electrical appliances.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹199 per Unit',
  '{
    "about_text": "Professional installation of Wi-Fi-enabled smart switch modules for convenient app-based control of your electrical appliances.",
    "included_features": [
      "Smart switch module installation",
      "Wiring connection",
      "Functional testing",
      "Safety inspection",
      "Basic pairing assistance"
    ],
    "excluded_features": [
      "Smart switch module",
      "Router setup",
      "Internet troubleshooting",
      "App configuration",
      "Smart hub"
    ],
    "faqs": [
      { "question": "Is the Wi-Fi module included?", "answer": "No." },
      { "question": "Will you configure my app?", "answer": "Basic assistance only." },
      { "question": "Does it support voice assistants?", "answer": "Compatible devices do." },
      { "question": "Do you test before leaving?", "answer": "Yes." },
      { "question": "Is internet required?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "wifi", "title": "Seamless IoT Mount", "desc": "Neat inside-box concealed mounting for smart switch modules." },
      { "icon": "verified_user", "title": "Safety Insulated", "desc": "Module safety encapsulation checks to prevent wall panel shocks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Box Depth", "desc": "Verifying if switchbox has space for smart module." },
      { "step": 2, "title": "Concealed Install", "desc": "Wiring the Wi-Fi module behind physical switches." },
      { "step": 3, "title": "Network Sync", "desc": "Assisting with local smart app registration." }
    ]
  }'::jsonb,
  'wi-fi-smart-switch-installation',
  '/assets/services/dusting_wiping.png'
),
-- 7. Switch/Socket Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0057'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Switch/Socket Replacement',
  'Replace damaged, burnt, loose, or faulty switches and sockets with safe and properly functioning replacements.',
  109.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹109 per Unit',
  '{
    "about_text": "Replace damaged, burnt, loose, or faulty switches and sockets with safe and properly functioning replacements.",
    "included_features": [
      "Removal of old switch/socket",
      "Installation of new unit",
      "Wiring check",
      "Safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Switch or socket",
      "New wiring",
      "Wall repair",
      "Concealed box replacement",
      "Civil work"
    ],
    "faqs": [
      { "question": "Is the new switch included?", "answer": "No." },
      { "question": "Can burnt sockets be replaced?", "answer": "Yes." },
      { "question": "Do you test after replacement?", "answer": "Yes." },
      { "question": "Can multiple switches be replaced?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Only existing wiring." }
    ],
    "why_choose_us": [
      { "icon": "power", "title": "Shock Protection", "desc": "Proper termination of phase, neutral, and earth wires." },
      { "icon": "verified_user", "title": "Tight Terminals", "desc": "Eliminating sparking and heating caused by loose connections." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Isolate power", "desc": "Safe power cutout from MCB board." },
      { "step": 2, "title": "Unfit & Swap", "desc": "Removing old burnt switch/socket and fitting new brand model." },
      { "step": 3, "title": "Test Load", "desc": "Load verification check." }
    ]
  }'::jsonb,
  'switch-socket-replacement',
  '/assets/services/dusting_wiping.png'
),
-- 8. Switchboard/Switchbox Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0058'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd4'::uuid, -- Switch & Socket Services
  'Switchboard/Switchbox Repair',
  'Repair faulty switchboards, loose electrical connections, sparking switches, and minor electrical issues to restore safe operation.',
  110.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹110 per Unit',
  '{
    "about_text": "Repair faulty switchboards, loose electrical connections, sparking switches, and minor electrical issues to restore safe operation.",
    "included_features": [
      "Fault diagnosis",
      "Loose connection repair",
      "Minor electrical repairs",
      "Safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Spare parts",
      "Complete switchboard replacement",
      "New wiring installation",
      "Wall cutting",
      "Civil work"
    ],
    "faqs": [
      { "question": "Does this fix sparking switches?", "answer": "Yes, if caused by minor faults." },
      { "question": "Are spare parts included?", "answer": "No." },
      { "question": "Can damaged switchboards be repaired?", "answer": "Minor issues can be repaired; major damage may require replacement." },
      { "question": "Will the electrician inspect the wiring?", "answer": "Yes." },
      { "question": "Is replacement included?", "answer": "No, replacement is a separate service." }
    ],
    "why_choose_us": [
      { "icon": "query_builder", "title": "Quick Diagnostic", "desc": "Rapid multimeter trace of sparking/dead wire circuits." },
      { "icon": "verified_user", "title": "Safety Audit", "desc": "Earth leakage checks performed on repaired switchboards." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Trace spark", "desc": "Electrician isolates and tests points for sparking/shorting." },
      { "step": 2, "title": "Rewire & Tighten", "desc": "Loose lines are insulated, terminal connectors are replaced/tightened." },
      { "step": 3, "title": "Verify Output", "desc": "Safe load performance check." }
    ]
  }'::jsonb,
  'switchboard-switchbox-repair',
  '/assets/services/dusting_wiping.png'
),

-- 9. Fan Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0059'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Fan Installation',
  'Professional installation of ceiling fans, wall fans, exhaust fans, and BLDC fans with proper mounting, electrical connections, and performance testing for safe and reliable operation.',
  139.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Ceiling/Wall/Exhaust Fan: ₹139 | BLDC Fan: ₹189',
  '{
    "about_text": "Professional installation of ceiling fans, wall fans, exhaust fans, and BLDC fans with proper mounting, electrical connections, and performance testing for safe and reliable operation.",
    "included_features": [
      "Installation of one fan",
      "Secure mounting and alignment",
      "Electrical wiring connection",
      "Balancing and safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Fan unit",
      "Fan hook or mounting accessories",
      "Additional wiring",
      "Fan regulator",
      "Civil work or wall drilling beyond standard installation"
    ],
    "faqs": [
      { "question": "Which fan types do you install?", "answer": "Ceiling, wall, exhaust, pedestal, and BLDC fans." },
      { "question": "Are fan accessories included?", "answer": "No." },
      { "question": "Do you test the fan after installation?", "answer": "Yes." },
      { "question": "Can you install fans in new homes?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Only existing electrical connections." }
    ],
    "why_choose_us": [
      { "icon": "mode_fan", "title": "Wobble Free Mount", "desc": "Accurate downrod balancing prevents high-speed fan wobbling." },
      { "icon": "verified_user", "title": "BLDC Experts", "desc": "Trained to install remote receivers and BLDC circuits correctly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Assemble", "desc": "Assembling fan blades, motor housing, and canopy." },
      { "step": 2, "title": "Hang & Connect", "desc": "Securely mounting to ceiling hook and wiring." },
      { "step": 3, "title": "Balance Check", "desc": "Testing at high speed for smooth noise-free rotation." }
    ]
  }'::jsonb,
  'fan-installation',
  '/assets/services/fan_cleaning.png'
),
-- 10. Smart / BLDC Fan Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0060'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Smart / BLDC Fan Installation',
  'Professional installation of energy-efficient BLDC and smart fans with remote pairing, electrical connection, and performance testing.',
  139.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹139 per Fan',
  '{
    "about_text": "Professional installation of energy-efficient BLDC and smart fans with remote pairing, electrical connection, and performance testing.",
    "included_features": [
      "BLDC or smart fan installation",
      "Electrical connection",
      "Remote pairing assistance",
      "Safety inspection",
      "Performance testing"
    ],
    "excluded_features": [
      "Fan unit",
      "Remote control",
      "Wi-Fi configuration",
      "Mobile app setup",
      "New wiring"
    ],
    "faqs": [
      { "question": "Do you install all BLDC fan brands?", "answer": "Yes." },
      { "question": "Will you pair the remote?", "answer": "Yes." },
      { "question": "Is Wi-Fi setup included?", "answer": "Basic assistance only." },
      { "question": "Can you replace an old fan with a BLDC fan?", "answer": "Yes." },
      { "question": "Do you test before leaving?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "settings_remote", "title": "Remote Setup", "desc": "Ensuring the receiver pairs perfectly with fan remote." },
      { "icon": "verified_user", "title": "Energy Check", "desc": "Checking power factor compliance of BLDC controller." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mounting", "desc": "Assembling, mounting, and wiring the BLDC unit." },
      { "step": 2, "title": "Remote Sync", "desc": "Setting up remote controller frequencies." },
      { "step": 3, "title": "Testing", "desc": "Verifying remote controls (timer, speeds, reverse mode)." }
    ]
  }'::jsonb,
  'smart-bldc-fan-installation',
  '/assets/services/fan_cleaning.png'
),
-- 11. Fan Uninstallation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0061'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Fan Uninstallation',
  'Safe removal of ceiling, wall, exhaust, or BLDC fans during relocation, renovation, or replacement without damaging the electrical connection.',
  109.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹109 per Fan',
  '{
    "about_text": "Safe removal of ceiling, wall, exhaust, or BLDC fans during relocation, renovation, or replacement without damaging the electrical connection.",
    "included_features": [
      "Safe fan removal",
      "Electrical disconnection",
      "Secure handling of the fan",
      "Basic safety inspection",
      "Customer handover"
    ],
    "excluded_features": [
      "Reinstallation",
      "Transportation",
      "Wall or ceiling repair",
      "New installation",
      "Electrical modifications"
    ],
    "faqs": [
      { "question": "Can the same fan be reinstalled later?", "answer": "Yes." },
      { "question": "Is transportation included?", "answer": "No." },
      { "question": "Will wiring be disconnected safely?", "answer": "Yes." },
      { "question": "How long does it take?", "answer": "Usually 15–30 minutes." },
      { "question": "Do you uninstall all fan types?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "safe", "title": "Safe Disconnect", "desc": "Wire insulation and tapping to keep overhead lines safe." },
      { "icon": "verified_user", "title": "Damage Free", "desc": "Removing fan canopy and downrod without ceiling plaster damage." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Disconnect Wire", "desc": "Isolating lines and disconnecting electrical terminals." },
      { "step": 2, "title": "Unmount", "desc": "Unbolting cotter pin and hanging hook safely." },
      { "step": 3, "title": "Handover", "desc": "Handing over fan and downrod clean." }
    ]
  }'::jsonb,
  'fan-uninstallation',
  '/assets/services/fan_cleaning.png'
),
-- 12. Fan Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0062'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Fan Replacement',
  'Replace your old or damaged fan with a new one using the existing electrical connection for improved safety and performance.',
  239.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹239 per Fan',
  '{
    "about_text": "Replace your old or damaged fan with a new one using the existing electrical connection for improved safety and performance.",
    "included_features": [
      "Removal of old fan",
      "Installation of new fan",
      "Electrical connection",
      "Safety inspection",
      "Performance testing"
    ],
    "excluded_features": [
      "Fan unit",
      "Fan hook or accessories",
      "Additional wiring",
      "Regulator replacement",
      "Civil work"
    ],
    "faqs": [
      { "question": "Does this include a new fan?", "answer": "No." },
      { "question": "Can you replace any fan brand?", "answer": "Yes." },
      { "question": "Is testing included?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Existing wiring only." },
      { "question": "How long does replacement take?", "answer": "Approximately 30–45 minutes." }
    ],
    "why_choose_us": [
      { "icon": "swap_horiz", "title": "Direct Swap", "desc": "Efficient unmounting and mounting sequence to save time." },
      { "icon": "verified_user", "title": "Wiring Checkup", "desc": "Testing condenser/regulator voltage outputs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Old Fan", "desc": "Safe electrical cutoff and fan unmounting." },
      { "step": 2, "title": "Mount New Fan", "desc": "Fitting and hanging the new fan model." },
      { "step": 3, "title": "Operation Test", "desc": "Test control check." }
    ]
  }'::jsonb,
  'fan-replacement',
  '/assets/services/fan_cleaning.png'
),
-- 13. Fan Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0063'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Fan Repair',
  'Diagnose and repair ceiling, wall, exhaust, and BLDC fans experiencing speed issues, unusual noise, overheating, or power problems.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection Starts at ₹199',
  '{
    "about_text": "Diagnose and repair ceiling, wall, exhaust, and BLDC fans experiencing speed issues, unusual noise, overheating, or power problems.",
    "included_features": [
      "Complete fan inspection",
      "Fault diagnosis",
      "Minor repairs and adjustments",
      "Lubrication (where applicable)",
      "Performance testing"
    ],
    "excluded_features": [
      "Spare parts",
      "Capacitor replacement",
      "Motor rewinding",
      "Fan replacement",
      "Major electrical repairs"
    ],
    "faqs": [
      { "question": "What issues are covered?", "answer": "Low speed, noise, vibration, overheating, and power issues." },
      { "question": "Are spare parts included?", "answer": "No." },
      { "question": "Can the fan be repaired during the same visit?", "answer": "Yes, subject to fault and spare part availability." },
      { "question": "Is inspection adjustable?", "answer": "Yes, if you proceed with the repair." },
      { "question": "Do you repair BLDC fans?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Component Check", "desc": "Testing starting capacitor and bearing wear traces." },
      { "icon": "verified_user", "title": "On Site Repairs", "desc": "Immediate capacitor swaps and speed adjustments." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnose", "desc": "Technician tests voltage flow and starts capacitor test." },
      { "step": 2, "title": "Repair", "desc": "Aligning blades, lubing bearings, or swapping capacitors." },
      { "step": 3, "title": "Speed Test", "desc": "Testing rotational output." }
    ]
  }'::jsonb,
  'fan-repair',
  '/assets/services/fan_cleaning.png'
),
-- 14. Fan Regulator Repair / Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0064'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Fan Regulator Repair / Replacement',
  'Repair or replace faulty fan regulators to restore smooth speed control and reliable fan operation.',
  99.00,
  149.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹99 per Regulator',
  '{
    "about_text": "Repair or replace faulty fan regulators to restore smooth speed control and reliable fan operation.",
    "included_features": [
      "Regulator inspection",
      "Repair or replacement installation",
      "Wiring check",
      "Functional testing",
      "Safety inspection"
    ],
    "excluded_features": [
      "Fan regulator",
      "New wiring",
      "Switchboard replacement",
      "Civil work",
      "Smart regulator configuration"
    ],
    "faqs": [
      { "question": "Is the regulator included?", "answer": "No." },
      { "question": "Can electronic regulators be repaired?", "answer": "Yes, depending on the fault." },
      { "question": "Do you install smart regulators?", "answer": "Yes." },
      { "question": "Will you test speed settings?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Existing wiring only." }
    ],
    "why_choose_us": [
      { "icon": "tune", "title": "Perfect Speed Control", "desc": "Smooth step transitions without humming noises." },
      { "icon": "verified_user", "title": "Flush Fit", "desc": "Mounting regulators perfectly aligned with modular panels." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Isolate Board", "desc": "Safe power isolation on switchboard." },
      { "step": 2, "title": "Swap", "desc": "Unfitting old regulator module and wiring new replacement." },
      { "step": 3, "title": "Test Speeds", "desc": "Checking output on speeds 1 to 5." }
    ]
  }'::jsonb,
  'fan-regulator-repair-replacement',
  '/assets/services/fan_cleaning.png'
),
-- 15. Doorbell Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0065'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Doorbell Installation',
  'Professional installation of wired and wireless doorbells with secure mounting, wiring, and testing for reliable operation.',
  79.00,
  129.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹79 per Doorbell',
  '{
    "about_text": "Professional installation of wired and wireless doorbells with secure mounting, wiring, and testing for reliable operation.",
    "included_features": [
      "Doorbell installation",
      "Wiring connection (existing point)",
      "Secure mounting",
      "Functional testing",
      "Safety inspection"
    ],
    "excluded_features": [
      "Doorbell unit",
      "Batteries",
      "Additional wiring",
      "Wi-Fi setup for smart doorbells",
      "Civil work"
    ],
    "faqs": [
      { "question": "Do you install wireless doorbells?", "answer": "Yes." },
      { "question": "Are batteries included?", "answer": "No." },
      { "question": "Can you install smart doorbells?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Existing wiring only." },
      { "question": "Will you test the doorbell?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "notifications", "title": "Audible Testing", "desc": "Optimal buzzer position check for whole home sound coverage." },
      { "icon": "verified_user", "title": "Waterproof Push", "desc": "Push button mounted with weather protection sealant check." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mount chime", "desc": "Screwing the doorbell receiver unit inside." },
      { "step": 2, "title": "Connect Push", "desc": "Wiring the outdoor button switch safely." },
      { "step": 3, "title": "Test chime", "desc": "Ringing test verify." }
    ]
  }'::jsonb,
  'doorbell-installation',
  '/assets/services/dusting_wiping.png'
),
-- 16. Doorbell Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0066'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd5'::uuid, -- Fan & Doorbell Services
  'Doorbell Replacement',
  'Replace damaged or faulty doorbells with new wired or wireless units using the existing electrical connection.',
  89.00,
  149.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹89 per Doorbell',
  '{
    "about_text": "Replace damaged or faulty doorbells with new wired or wireless units using the existing electrical connection.",
    "included_features": [
      "Removal of old doorbell",
      "Installation of new doorbell",
      "Existing wiring connection",
      "Safety inspection",
      "Functional testing"
    ],
    "excluded_features": [
      "Doorbell unit",
      "Batteries",
      "Additional wiring",
      "Smart doorbell configuration",
      "Wall repair"
    ],
    "faqs": [
      { "question": "Is the new doorbell included?", "answer": "No." },
      { "question": "Can you replace wireless doorbells?", "answer": "Yes." },
      { "question": "Will the electrician test it after installation?", "answer": "Yes." },
      { "question": "Is smart doorbell setup included?", "answer": "Basic installation only." },
      { "question": "Can multiple doorbells be replaced in one visit?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "notifications_active", "title": "Neat Swap", "desc": "Removing old hardware without peeling wall paints." },
      { "icon": "verified_user", "title": "Wiring Check", "desc": "Replacing weak/burnt low-voltage doorbell wires." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Chime", "desc": "Safely disconnecting and unmounting the old receiver/switch." },
      { "step": 2, "title": "Fit New Unit", "desc": "Mounting and connecting the new bell unit." },
      { "step": 3, "title": "Test Bell", "desc": "Buzzer check." }
    ]
  }'::jsonb,
  'doorbell-replacement',
  '/assets/services/dusting_wiping.png'
),

-- 17. Inverter Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0067'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Inverter Installation',
  'Professional inverter installation for homes and offices with secure electrical connections, battery setup, and performance testing. Suitable for new installations and replacements.',
  485.00,
  799.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Single Battery: ₹485 | Double Battery: ₹575',
  '{
    "about_text": "Professional inverter installation for homes and offices with secure electrical connections, battery setup, and performance testing. Suitable for new installations and replacements.",
    "included_features": [
      "Inverter installation",
      "Battery connection",
      "Electrical wiring connection",
      "Safety inspection",
      "Performance testing"
    ],
    "excluded_features": [
      "Inverter and battery",
      "Battery stand or trolley",
      "Additional wiring",
      "New MCB or changeover switch",
      "Civil work"
    ],
    "faqs": [
      { "question": "Does the service include battery installation?", "answer": "Yes, battery connection is included." },
      { "question": "Are wiring materials included?", "answer": "No." },
      { "question": "Can you install all inverter brands?", "answer": "Yes." },
      { "question": "Do you test the inverter after installation?", "answer": "Yes." },
      { "question": "Is wall mounting included?", "answer": "Only if supported by the inverter model." }
    ],
    "why_choose_us": [
      { "icon": "battery_charging_full", "title": "Load Balancing", "desc": "Splitting home circuits into backup and non-backup routes safely." },
      { "icon": "verified_user", "title": "Terminal Greasing", "desc": "Applying petroleum jelly to terminals to prevent sulfate buildup." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Circuit Check", "desc": "Tracing main DB lines and back lines." },
      { "step": 2, "title": "Battery Wire", "desc": "Connecting battery cables with heavy washers." },
      { "step": 3, "title": "Mains Setup", "desc": "Connecting mains supply and testing load cutoffs." }
    ]
  }'::jsonb,
  'inverter-installation',
  '/assets/services/dusting_wiping.png'
),
-- 18. Inverter Uninstallation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0068'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Inverter Uninstallation',
  'Safely uninstall your inverter and battery setup for relocation, replacement, or maintenance without damaging the equipment.',
  485.00,
  799.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Single Battery: ₹485 | Double Battery: ₹575',
  '{
    "about_text": "Safely uninstall your inverter and battery setup for relocation, replacement, or maintenance without damaging the equipment.",
    "included_features": [
      "Safe inverter removal",
      "Battery disconnection",
      "Electrical disconnection",
      "Safety inspection",
      "Customer handover"
    ],
    "excluded_features": [
      "Transportation",
      "Reinstallation",
      "Wall repair",
      "Wiring modifications",
      "Battery disposal"
    ],
    "faqs": [
      { "question": "Is transportation included?", "answer": "No." },
      { "question": "Can the same inverter be reinstalled later?", "answer": "Yes." },
      { "question": "Will batteries be disconnected safely?", "answer": "Yes." },
      { "question": "How long does uninstallation take?", "answer": "Usually 30–60 minutes." },
      { "question": "Do you uninstall all inverter brands?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "safety_divider", "title": "Arc Protection", "desc": "Careful battery terminal extraction to prevent terminal spark-arcs." },
      { "icon": "verified_user", "title": "Bypass Mains", "desc": "Restoring home power through direct bypass line connection." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Power Off", "desc": "Turning off and disconnecting battery charging mains." },
      { "step": 2, "title": "Mains Bypass", "desc": "Connecting direct phase line so household lights run without inverter." },
      { "step": 3, "title": "Dismantle", "desc": "Unmounting inverter and battery safely." }
    ]
  }'::jsonb,
  'inverter-uninstallation',
  '/assets/services/dusting_wiping.png'
),
-- 19. Stabiliser Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f0069'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Stabiliser Installation',
  'Professional installation of voltage stabilisers for ACs, refrigerators, televisions, and other appliances to ensure safe and stable power supply.',
  179.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹179 per Stabiliser',
  '{
    "about_text": "Professional installation of voltage stabilisers for ACs, refrigerators, televisions, and other appliances to ensure safe and stable power supply.",
    "included_features": [
      "Stabiliser installation",
      "Electrical connection",
      "Safety inspection",
      "Voltage check",
      "Functional testing"
    ],
    "excluded_features": [
      "Stabiliser unit",
      "New wiring",
      "MCB installation",
      "Wall drilling beyond standard installation",
      "Electrical modifications"
    ],
    "faqs": [
      { "question": "Which appliances are supported?", "answer": "ACs, refrigerators, TVs, washing machines, and other compatible appliances." },
      { "question": "Is the stabiliser included?", "answer": "No." },
      { "question": "Do you test voltage after installation?", "answer": "Yes." },
      { "question": "Can you install all stabiliser brands?", "answer": "Yes." },
      { "question": "Is wiring included?", "answer": "Only existing wiring connections." }
    ],
    "why_choose_us": [
      { "icon": "electric_meter", "title": "Voltage Verification", "desc": "Input and output voltages validated using multimeters." },
      { "icon": "verified_user", "title": "Load Optimization", "desc": "Verifying appliance amperage matches stabiliser capacities." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Position", "desc": "Determining wall mount or flat surface layout near appliance." },
      { "step": 2, "title": "Connect", "desc": "Wiring the stabiliser into appliance power circuit." },
      { "step": 3, "title": "Check", "desc": "Testing voltage regulation capability." }
    ]
  }'::jsonb,
  'stabiliser-installation',
  '/assets/services/dusting_wiping.png'
),
-- 20. Inverter Fuse Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f0070'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Inverter Fuse Replacement',
  'Replace damaged or blown inverter fuses to restore safe power backup and protect your inverter from electrical faults.',
  129.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹129 per Fuse',
  '{
    "about_text": "Replace damaged or blown inverter fuses to restore safe power backup and protect your inverter from electrical faults.",
    "included_features": [
      "Fuse inspection",
      "Fuse replacement",
      "Electrical safety check",
      "Functional testing",
      "Basic performance verification"
    ],
    "excluded_features": [
      "Fuse cost (if premium type required)",
      "Internal PCB repair",
      "Battery replacement",
      "Major inverter repairs",
      "Wiring modifications"
    ],
    "faqs": [
      { "question": "Is the fuse included?", "answer": "Standard replacement is included where applicable. Premium fuses may be charged separately." },
      { "question": "Can a blown fuse indicate another problem?", "answer": "Yes. Our technician will inspect the inverter for underlying faults." },
      { "question": "Will the inverter be tested?", "answer": "Yes." },
      { "question": "How long does replacement take?", "answer": "Approximately 15–30 minutes." },
      { "question": "Do you replace all inverter fuse types?", "answer": "Yes, subject to availability." }
    ],
    "why_choose_us": [
      { "icon": "hardware", "title": "Correct Amperage", "desc": "Ensuring replacement fuse matches precise manufacturer ratings." },
      { "icon": "verified_user", "title": "Safety Diagnostic", "desc": "Investigating if overload or short-circuit blew the fuse." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Safety Test", "desc": "Checking circuit shortings before fuse replacement." },
      { "step": 2, "title": "Extract & Swap", "desc": "Replacing the glass/blade fuse module." },
      { "step": 3, "title": "Verify Backup", "desc": "Checking battery discharge output." }
    ]
  }'::jsonb,
  'inverter-fuse-replacement',
  '/assets/services/dusting_wiping.png'
),
-- 21. Inverter Servicing
(
  'd186c52a-9bae-41e0-81f1-6be4409f0071'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Inverter Servicing',
  'Improve inverter performance and battery life with professional preventive maintenance, including terminal cleaning, dust removal, distilled water top-up, and safety inspection.',
  249.00,
  399.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Single Battery: ₹249 | Double Battery: ₹419',
  '{
    "about_text": "Improve inverter performance and battery life with professional preventive maintenance, including terminal cleaning, dust removal, distilled water top-up, and safety inspection.",
    "included_features": [
      "Internal dust cleaning",
      "Battery terminal cleaning",
      "Distilled water top-up (where applicable)",
      "Electrical safety inspection",
      "Performance testing"
    ],
    "excluded_features": [
      "Battery replacement",
      "Inverter repair",
      "PCB replacement",
      "Spare parts",
      "Acid leakage repair"
    ],
    "faqs": [
      { "question": "How often should an inverter be serviced?", "answer": "Every 6–12 months." },
      { "question": "Is distilled water included?", "answer": "Yes, for compatible lead-acid batteries." },
      { "question": "Does servicing improve backup?", "answer": "Regular servicing helps maintain optimal performance." },
      { "question": "Are lithium batteries serviced?", "answer": "Only applicable maintenance is performed." },
      { "question": "Is repair included?", "answer": "No, repairs are charged separately." }
    ],
    "why_choose_us": [
      { "icon": "water", "title": "Distilled Top Up", "desc": "Replenishing battery electrolyte levels to improve life cycles." },
      { "icon": "verified_user", "title": "Anti Oxidation", "desc": "Cleaning terminal crusts to ensure optimal charging current flow." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dust Clean", "desc": "Blowing off dust from inverter blower vents." },
      { "step": 2, "title": "Acid Check", "desc": "Checking battery cells water levels and topping up." },
      { "step": 3, "title": "Terminal Care", "desc": "Sanding and terminal greasing." }
    ]
  }'::jsonb,
  'inverter-servicing',
  '/assets/services/dusting_wiping.png'
),
-- 22. Inverter Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f0072'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Inverter & Stabiliser Services
  'Inverter Repair',
  'Experiencing power backup issues, beeping, charging problems, or inverter faults? Our technicians inspect your inverter, identify the issue, and provide a transparent repair quotation before starting any repair work.',
  210.00,
  349.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  'Inspection Starts from ₹210',
  '{
    "about_text": "Experiencing power backup issues, beeping, charging problems, or inverter faults? Our technicians inspect your inverter, identify the issue, and provide a transparent repair quotation before starting any repair work.",
    "included_features": [
      "Complete inverter inspection",
      "Fault diagnosis",
      "Battery charging inspection",
      "Electrical safety check",
      "Transparent repair quotation"
    ],
    "excluded_features": [
      "Spare parts",
      "PCB replacement",
      "Battery replacement",
      "Fuse replacement (book separately)",
      "Major electrical modifications"
    ],
    "faqs": [
      { "question": "What problems do you inspect?", "answer": "Charging issues, no backup, continuous beeping, power faults, and unknown issues." },
      { "question": "Are repair charges included?", "answer": "No. Inspection covers diagnosis only." },
      { "question": "Can repairs be completed during the same visit?", "answer": "Yes, subject to spare part availability and your approval." },
      { "question": "Is the inspection fee adjustable?", "answer": "Yes, if you proceed with the repair." },
      { "question": "Which inverter brands do you repair?", "answer": "We repair all major inverter brands including Luminous, Microtek, Exide, Livguard, V-Guard, Amaron, Genus, Sukam, and many others." }
    ],
    "why_choose_us": [
      { "icon": "construction", "title": "Expert Diagnostics", "desc": "Calibrating charge controllers, relays, and battery specific gravities." },
      { "icon": "verified_user", "title": "Adjustable Fee", "desc": "Inspection fee is adjusted against the repair bill if you proceed." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspect Board", "desc": "Checking relay trigger lines and PCB indicators." },
      { "step": 2, "title": "Battery Discharge Test", "desc": "Running discharge test to evaluate cell capacities." },
      { "step": 3, "title": "Quote Estimation", "desc": "Providing details of repair costs." }
    ]
  }'::jsonb,
  'inverter-repair',
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

-- 3. Seed Service Variants
INSERT INTO public.service_variants (id, service_id, title, description, price, original_price, duration_minutes) VALUES
  -- 1. Switchbox Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0061'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0051'::uuid, 'Switchbox Installation', 'Standard switchbox/power outlet mounting and connection.', 349.00, 499.00, 45),
  
  -- 2. AC Switchbox Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0062'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0052'::uuid, 'AC Switchbox Installation', 'Dedicated AC switchbox installation.', 329.00, 499.00, 45),
  
  -- 3. Switchboard Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0063'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0053'::uuid, 'Switchboard Installation', 'Modular switchboard mounting and connection.', 279.00, 399.00, 45),
  
  -- 4. Smart Switch Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0064'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0054'::uuid, 'Smart Switch Installation', 'Smart switch installation & pairing assistance.', 150.00, 249.00, 30),
  
  -- 5. Smart Appliance Controller Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0065'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0055'::uuid, 'Smart Appliance Controller Installation', 'Smart controller inline wiring & setup.', 199.00, 299.00, 45),
  
  -- 6. Wi-Fi Smart Switch Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0066'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0056'::uuid, 'Wi-Fi Smart Switch Installation', 'Concealed Wi-Fi smart switch module installation.', 199.00, 299.00, 45),
  
  -- 7. Switch/Socket Replacement
  ('e186c52a-9bae-41e0-81f1-6be4409f0067'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0057'::uuid, 'Switch/Socket Replacement', 'Replacing old/sparking switch or socket module.', 109.00, 199.00, 30),
  
  -- 8. Switchboard/Switchbox Repair
  ('e186c52a-9bae-41e0-81f1-6be4409f0068'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0058'::uuid, 'Switchboard/Switchbox Repair', 'Sparking/loose connection diagnosis & terminal repair.', 110.00, 199.00, 45),

  -- 9. Fan Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0069'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0059'::uuid, 'Ceiling Fan Installation', 'Standard ceiling fan assembly, hanging, and wiring.', 139.00, 249.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0070'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0059'::uuid, 'Wall Fan Installation', 'Wall bracket mounting, fan assembly, and wiring.', 139.00, 249.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0071'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0059'::uuid, 'Exhaust Fan Installation', 'Exhaust fan wall/window mounting and connection.', 139.00, 249.00, 45),
  ('e186c52a-9bae-41e0-81f1-6be4409f0072'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0059'::uuid, 'BLDC Fan Installation', 'Energy-efficient BLDC fan assembly, mount, and receiver pairing.', 189.00, 299.00, 60),

  -- 10. Smart / BLDC Fan Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0073'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0060'::uuid, 'Smart / BLDC Fan Installation', 'Concealed smart fan setup & remote sync check.', 139.00, 249.00, 60),

  -- 11. Fan Uninstallation
  ('e186c52a-9bae-41e0-81f1-6be4409f0074'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0061'::uuid, 'Fan Uninstallation', 'Safe dismantling of ceiling, wall, or exhaust fan.', 109.00, 199.00, 30),

  -- 12. Fan Replacement
  ('e186c52a-9bae-41e0-81f1-6be4409f0075'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0062'::uuid, 'Fan Replacement', 'Removing old fan and installing new fan unit.', 239.00, 399.00, 45),

  -- 13. Fan Repair
  ('e186c52a-9bae-41e0-81f1-6be4409f0076'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0063'::uuid, 'Fan Repair Inspection', 'Tracing noise, speed issues, starts capacitor replacement.', 199.00, 299.00, 45),

  -- 14. Fan Regulator Repair / Replacement
  ('e186c52a-9bae-41e0-81f1-6be4409f0077'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0064'::uuid, 'Fan Regulator Replacement', 'Replacing old damaged regulator with new step module.', 99.00, 149.00, 30),

  -- 15. Doorbell Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0078'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0065'::uuid, 'Doorbell Installation', 'Wired/wireless doorbell receiver and push button install.', 79.00, 129.00, 30),

  -- 16. Doorbell Replacement
  ('e186c52a-9bae-41e0-81f1-6be4409f0079'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0066'::uuid, 'Doorbell Replacement', 'Removing old bell and wiring/configuring new doorbell.', 89.00, 149.00, 30),

  -- 17. Inverter Installation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0080'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0067'::uuid, 'Single Battery Inverter Installation', 'Mounting and wiring a single battery backup inverter system.', 485.00, 799.00, 90),
  ('e186c52a-9bae-41e0-81f1-6be4409f0081'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0067'::uuid, 'Double Battery Inverter Installation', 'Mounting and wiring a double battery backup inverter system.', 575.00, 899.00, 120),

  -- 18. Inverter Uninstallation Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0082'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0068'::uuid, 'Single Battery Inverter Uninstallation', 'Safe dismantling of single battery inverter system.', 485.00, 799.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0083'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0068'::uuid, 'Double Battery Inverter Uninstallation', 'Safe dismantling of double battery inverter system.', 575.00, 899.00, 90),

  -- 19. Stabiliser Installation
  ('e186c52a-9bae-41e0-81f1-6be4409f0084'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0069'::uuid, 'Stabiliser Installation', 'Stabiliser wall mounting and load check setup.', 179.00, 299.00, 45),

  -- 20. Inverter Fuse Replacement
  ('e186c52a-9bae-41e0-81f1-6be4409f0085'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0070'::uuid, 'Inverter Fuse Replacement', 'Safe fuse tracing and swap replacement.', 129.00, 199.00, 30),

  -- 21. Inverter Servicing Variants
  ('e186c52a-9bae-41e0-81f1-6be4409f0086'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0071'::uuid, 'Single Battery Inverter Service', 'Water top-up and terminal cleaning for single battery system.', 249.00, 399.00, 60),
  ('e186c52a-9bae-41e0-81f1-6be4409f0087'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0071'::uuid, 'Double Battery Inverter Service', 'Water top-up and terminal cleaning for double battery system.', 419.00, 599.00, 90),

  -- 22. Inverter Repair
  ('e186c52a-9bae-41e0-81f1-6be4409f0088'::uuid, 'd186c52a-9bae-41e0-81f1-6be4409f0072'::uuid, 'Inverter Repair Inspection', 'Complete diagnostics on PCB, charging lines, and battery cells.', 210.00, 349.00, 45)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  duration_minutes = EXCLUDED.duration_minutes;
