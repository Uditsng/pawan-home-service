-- SQL Migration to add Plumbing, Grouting, and Bathroom Fitting Services
-- Name: 20260706060000_add_plumbing_and_grouting_services.sql

-- 1. Create New Subcategories under 'Home Repairs & Maintenance' (Category ID: '4f18fd15-29cd-4aff-b47f-64f68852df4b')
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES
  ('b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, 'Tap & Mixer Services', 'water_drop', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, 'Toilet & Flush Services', 'wc', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, 'Basin, Sink & Drain Services', 'plumbing', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, 'Water Tank & Pump Services', 'water_damage', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d75'::uuid, 'Shower Installation & Fitting', 'shower', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid),
  ('b43f26e5-4dc8-4640-860a-9e214f826d76'::uuid, 'Tile & Grouting Services', 'texture', '4f18fd15-29cd-4aff-b47f-64f68852df4b'::uuid)
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
-- 1. Bath Accessory Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ae'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services (Accessory section)
  'Bath Accessory Installation',
  'Professional installation of bathroom accessories such as towel rods, towel rings, soap dispensers, shelves, robe hooks, tissue holders, and other wall-mounted fittings for a neat and organized bathroom.',
  148.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 148,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "accessories"
  }'::jsonb,
  '₹148 per unit',
  '{
    "about_text": "Professional installation of bathroom accessories such as towel rods, towel rings, soap dispensers, shelves, robe hooks, tissue holders, and other wall-mounted fittings for a neat and organized bathroom.",
    "included_features": [
      "Installation of one bathroom accessory",
      "Drilling and secure wall mounting",
      "Alignment and leveling",
      "Functional stability check",
      "Labour charges"
    ],
    "excluded_features": [
      "Bathroom accessory cost",
      "Tile or wall repairs",
      "Plumbing modifications",
      "Custom fabrication",
      "Material costs"
    ],
    "faqs": [
      { "question": "Which bathroom accessories can be installed?", "answer": "Towel rods, towel rings, soap dispensers, shelves, robe hooks, tissue holders, toothbrush holders, and similar fittings." },
      { "question": "Is drilling included?", "answer": "Yes. Standard drilling required for installation is included." },
      { "question": "Are accessories included in the service?", "answer": "No. Labour charges only." }
    ],
    "why_choose_us": [
      { "icon": "bathroom", "title": "Zero Tile Crack", "desc": "Using special carbide drill bits to drill safely through bathroom tiles." },
      { "icon": "verified_user", "title": "Rust Proof Mounting", "desc": "Mounting brackets secured to avoid loose/wobbly frames." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Plumbing Check", "desc": "Verifying that no internal pipes run behind drill spots." },
      { "step": 2, "title": "Drill & Plug", "desc": "Drilling and tapping wall plugs inside tile joints." },
      { "step": 3, "title": "Tighten Bracket", "desc": "Screwing hardware flat on wall and test loading." }
    ]
  }'::jsonb,
  'bath-accessory-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 2. Shower Installation (Wall-Mounted)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00af'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d75'::uuid, -- Shower Installation & Fitting
  'Shower Installation (Wall-Mounted)',
  'Professional installation of wall-mounted shower heads for reliable water flow, leak-free connections, and long-lasting performance.',
  159.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 159,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "showers"
  }'::jsonb,
  '₹159 per unit',
  '{
    "about_text": "Professional installation of wall-mounted shower heads for reliable water flow, leak-free connections, and long-lasting performance.",
    "included_features": [
      "Installation of one wall-mounted shower",
      "Secure plumbing connection",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Shower head",
      "Shower arm",
      "Pipe modifications",
      "Wall breaking or tiling work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the shower included?", "answer": "No. Customers need to provide the shower unit." },
      { "question": "Will leaks be checked after installation?", "answer": "Yes. The plumber tests all connections before completing the service." },
      { "question": "Can you install all brands?", "answer": "Yes, most standard wall-mounted shower models are supported." }
    ],
    "why_choose_us": [
      { "icon": "shower", "title": "Thread Sealing", "desc": "Teflon thread wraps applied to prevent wall-joint leaks." },
      { "icon": "verified_user", "title": "Leak Free", "desc": "Wrench adjustments to secure shower arm joints tightly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Wrap Thread", "desc": "Wrapping Teflon tape on the wall pipe threads." },
      { "step": 2, "title": "Mount Arm", "desc": "Screwing the shower arm and head securely." },
      { "step": 3, "title": "Flow Run", "desc": "Turning on mains to check leak-free water streams." }
    ]
  }'::jsonb,
  'shower-installation-wall-mounted',
  '/assets/services/bathroom_cleaning.png'
),
-- 3. Shower Installation (Handheld)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b0'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d75'::uuid, -- Shower Installation & Fitting
  'Shower Installation (Handheld)',
  'Professional installation of handheld shower sets with flexible hose connections for smooth operation and leak-free performance.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "showers"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of handheld shower sets with flexible hose connections for smooth operation and leak-free performance.",
    "included_features": [
      "Installation of one handheld shower",
      "Hose and bracket fitting",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Handheld shower set",
      "Plumbing modifications",
      "Pipe replacement",
      "Wall repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include the shower set?", "answer": "No. Labour charges only." },
      { "question": "Can handheld showers replace fixed showers?", "answer": "Yes, if the plumbing connections are compatible." },
      { "question": "Will water pressure be tested?", "answer": "Yes. Proper flow and leakage are checked after installation." }
    ],
    "why_choose_us": [
      { "icon": "settings_input_hdmi", "title": "Flexible Routing", "desc": "Placing bracket holder at ideal heights for children and adults." },
      { "icon": "verified_user", "title": "Leak Proof Gaskets", "desc": "Proper rubber washers inserted in hose coupling joints." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Mount Hook", "desc": "Drilling and fixing the shower cradle bracket on tiles." },
      { "step": 2, "title": "Hose Link", "desc": "Connecting flexible hose to angle valve with washers." },
      { "step": 3, "title": "Pressure Test", "desc": "Checking shower spray patterns and valve shutoffs." }
    ]
  }'::jsonb,
  'shower-installation-handheld',
  '/assets/services/bathroom_cleaning.png'
),
-- 4. Wash Basin Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b1'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Wash Basin Installation',
  'Professional installation of wash basins with secure mounting, plumbing connections, and leak testing for homes, offices, and commercial spaces.',
  459.00,
  699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 459,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "basins"
  }'::jsonb,
  '₹459 per unit',
  '{
    "about_text": "Professional installation of wash basins with secure mounting, plumbing connections, and leak testing for homes, offices, and commercial spaces.",
    "included_features": [
      "Installation of one wash basin",
      "Mounting and alignment",
      "Water inlet and waste outlet connection",
      "Leak inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Wash basin",
      "Tap or mixer installation",
      "Waste coupling",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the basin included?", "answer": "No. Customers need to provide the wash basin." },
      { "question": "Does this include tap installation?", "answer": "No. Tap installation is a separate service." },
      { "question": "Will all plumbing connections be tested?", "answer": "Yes. The basin is checked for leaks before completion." }
    ],
    "why_choose_us": [
      { "icon": "wash", "title": "Heavy Duty Brackets", "desc": "Ensuring wall mounting rag bolts hold ceramic weight loads securely." },
      { "icon": "verified_user", "title": "Silicon Seal borders", "desc": "Applying silicone sealant to back borders to prevent wall seepage." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Bolt Drill", "desc": "Level marking and drilling for heavy wall hanger bolts." },
      { "step": 2, "title": "Hang Basin", "desc": "Mounting basin and connecting waste line inlet hose." },
      { "step": 3, "title": "Seal & Check", "desc": "Silicon sealing edges and testing drainage outflow." }
    ]
  }'::jsonb,
  'wash-basin-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 5. Waste Pipe Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b2'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Waste Pipe Replacement',
  'Replacement of damaged or leaking wash basin or sink waste pipes to restore proper drainage and prevent water leakage.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "pipes"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Replacement of damaged or leaking wash basin or sink waste pipes to restore proper drainage and prevent water leakage.",
    "included_features": [
      "Removal of existing waste pipe",
      "Installation of one replacement waste pipe",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Waste pipe",
      "Drain blockage removal",
      "Plumbing modifications",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the waste pipe included?", "answer": "No. Labour charges only." },
      { "question": "Can leaking waste pipes be repaired instead of replaced?", "answer": "Minor issues may be repaired, but damaged pipes usually require replacement." },
      { "question": "Will leaks be checked?", "answer": "Yes. Every connection is tested before service completion." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Correct Pitching", "desc": "Ensuring corrugated pipes curve correctly to prevent foul smell trap bypass." },
      { "icon": "verified_user", "title": "Tight Couplers", "desc": "Checking gasket ring fits on waste coupling sockets." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Detach old pipe", "desc": "Unscrewing older cracked PVC waste pipes." },
      { "step": 2, "title": "Insert new pipe", "desc": "Screwing modular flexible waste pipe on coupling thread." },
      { "step": 3, "title": "Check flow", "desc": "Testing flow drainage limits." }
    ]
  }'::jsonb,
  'waste-pipe-replacement',
  '/assets/services/bathroom_cleaning.png'
),
-- 6. Sink Drainage Removal
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b3'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Sink Drainage Removal',
  'Professional removal of sink drain blockages caused by food waste, grease, soap residue, and other debris to restore smooth water flow.',
  209.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 209,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blockages"
  }'::jsonb,
  '₹209 per unit',
  '{
    "about_text": "Professional removal of sink drain blockages caused by food waste, grease, soap residue, and other debris to restore smooth water flow.",
    "included_features": [
      "Inspection of sink drain",
      "Manual blockage removal",
      "Drain cleaning",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Pipeline replacement",
      "Chemical drain cleaners",
      "Major plumbing repairs",
      "Underground drainage work",
      "Material costs"
    ],
    "faqs": [
      { "question": "What causes sink blockages?", "answer": "Food particles, grease, soap residue, and other debris are the most common causes." },
      { "question": "Will chemicals be used?", "answer": "Not unless specifically required and approved." },
      { "question": "What if the blockage is deep inside the pipeline?", "answer": "Additional plumbing work may be recommended if required." }
    ],
    "why_choose_us": [
      { "icon": "cleaning_services", "title": "Trap Cleaning", "desc": "Dismantling and flushing clean bottle traps and bend pipes." },
      { "icon": "verified_user", "title": "Clog Clearing", "desc": "Removing grease mud blockages completely for free flows." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Examine trap", "desc": "Locating clog section using sink overflow tests." },
      { "step": 2, "title": "Clear Clog", "desc": "Dismantling PVC traps and clearing food residues manually." },
      { "step": 3, "title": "Reassemble", "desc": "Reconnecting joints with thread seals." }
    ]
  }'::jsonb,
  'sink-drainage-removal',
  '/assets/services/kitchen_cleaning.png'
),
-- 7. Waste Coupling Installation (Wash Basin)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b4'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Waste Coupling Installation (Wash Basin)',
  'Professional installation of a wash basin waste coupling to ensure efficient drainage and leak-free performance.',
  149.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 149,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "couplings"
  }'::jsonb,
  '₹149 per unit',
  '{
    "about_text": "Professional installation of a wash basin waste coupling to ensure efficient drainage and leak-free performance.",
    "included_features": [
      "Installation of one basin waste coupling",
      "Leak inspection",
      "Drainage testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Waste coupling",
      "Basin installation",
      "Drain pipe replacement",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the waste coupling included?", "answer": "No." },
      { "question": "Will leaks be checked after installation?", "answer": "Yes." },
      { "question": "Can this be installed on all basins?", "answer": "Most standard wash basins are supported." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Leak Proof Gaskets", "desc": "Ensuring rubber sealing rings sit tight under the basin sink core." },
      { "icon": "verified_user", "title": "Rust Free Fittings", "desc": "Proper checkup of brass/stainless steel locking nuts." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Insert Coupling", "desc": "Fitting coupling cylinder with putty/washer into basin." },
      { "step": 2, "title": "Tighten back nut", "desc": "Screwing back nut under basin firmly." },
      { "step": 3, "title": "Leak Test", "desc": "Running wash tap to inspect joints." }
    ]
  }'::jsonb,
  'waste-coupling-installation-wash-basin',
  '/assets/services/bathroom_cleaning.png'
),
-- 8. Waste Coupling Installation (Kitchen Sink)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b5'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Waste Coupling Installation (Kitchen Sink)',
  'Professional installation of a kitchen sink waste coupling to ensure smooth drainage, prevent leakage, and maintain proper sink functionality.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "couplings"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of a kitchen sink waste coupling to ensure smooth drainage, prevent leakage, and maintain proper sink functionality.",
    "included_features": [
      "Installation of one sink waste coupling",
      "Drainage connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Waste coupling",
      "Sink installation",
      "Drain blockage removal",
      "Plumbing modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include the waste coupling?", "answer": "No. Labour charges only." },
      { "question": "Will the sink be tested after installation?", "answer": "Yes. Proper drainage and leak-free operation are verified." },
      { "question": "Can you replace an old waste coupling?", "answer": "Yes. Existing couplings can be removed and replaced with a new one." }
    ],
    "why_choose_us": [
      { "icon": "kitchen", "title": "Wide Basin Seals", "desc": "Properly aligning wide flange kitchen sink couplings." },
      { "icon": "verified_user", "title": "Zero Seepage", "desc": "Waterproofing compound checks around sink drain edges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Clean Hole", "desc": "Scraping old residues off the sink hole edges." },
      { "step": 2, "title": "Lock Coupling", "desc": "Screwing the coupling lock nut below." },
      { "step": 3, "title": "Flow check", "desc": "Water drainage flow check." }
    ]
  }'::jsonb,
  'waste-coupling-installation-kitchen-sink',
  '/assets/services/kitchen_cleaning.png'
),
-- 9. Bathroom Tile Grouting
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b6'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d76'::uuid, -- Tile & Grouting Services
  'Bathroom Tile Grouting',
  'Professional regrouting of bathroom floor and wall tiles to seal gaps, prevent water seepage, improve hygiene, and restore a clean, finished appearance.',
  1500.00,
  2499.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹1,500 fixed price',
  '{
    "about_text": "Professional regrouting of bathroom floor and wall tiles to seal gaps, prevent water seepage, improve hygiene, and restore a clean, finished appearance.",
    "included_features": [
      "Removal of loose or damaged grout (where required)",
      "Application of fresh grout",
      "Gap filling between tiles",
      "Basic surface cleaning after grouting",
      "Labour charges"
    ],
    "excluded_features": [
      "Grout material",
      "Tile replacement",
      "Waterproofing treatment",
      "Crack repair in tiles or walls",
      "Deep cleaning or polishing"
    ],
    "faqs": [
      { "question": "Why is tile grouting important?", "answer": "It prevents water seepage, mold growth, and tile loosening while improving the overall appearance." },
      { "question": "Is grout included in the price?", "answer": "No. Grout and other materials are charged separately unless mentioned." },
      { "question": "Can stained grout be replaced?", "answer": "Yes. Old or damaged grout can be removed and replaced." }
    ],
    "why_choose_us": [
      { "icon": "grid_on", "title": "Anti Seepage", "desc": "Waterproof epoxy or polymer grout application checks." },
      { "icon": "verified_user", "title": "Mildew Free", "desc": "Ensuring tight joint seals to prevent bathroom mold." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Scrape Joints", "desc": "Scraping older moldy/damaged grout lines." },
      { "step": 2, "title": "Grout Spread", "desc": "Squeegeeing fresh polymer grout mixture into joint lines." },
      { "step": 3, "title": "Sponge Clean", "desc": "Sponging off haze residues from tile faces." }
    ]
  }'::jsonb,
  'bathroom-tile-grouting',
  '/assets/services/bathroom_cleaning.png'
),
-- 10. Kitchen Tile Grouting
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b7'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d76'::uuid, -- Tile & Grouting Services
  'Kitchen Tile Grouting',
  'Professional kitchen tile grouting service to fill tile joints, improve durability, prevent moisture penetration, and give your kitchen a neat finish.',
  1000.00,
  1699.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '{}'::jsonb,
  '₹1,000 fixed price',
  '{
    "about_text": "Professional kitchen tile grouting service to fill tile joints, improve durability, prevent moisture penetration, and give your kitchen a neat finish.",
    "included_features": [
      "Regrouting of kitchen wall or floor tiles",
      "Gap filling",
      "Surface finishing",
      "Basic cleaning after completion",
      "Labour charges"
    ],
    "excluded_features": [
      "Grout material",
      "Tile replacement",
      "Waterproofing work",
      "Wall repairs",
      "Deep cleaning"
    ],
    "faqs": [
      { "question": "Can old grout be replaced?", "answer": "Yes. Loose or damaged grout can be removed before applying fresh grout." },
      { "question": "Will this stop water seepage?", "answer": "Proper grouting helps reduce water penetration through tile joints." },
      { "question": "Is the grout included?", "answer": "No. Materials are charged separately." }
    ],
    "why_choose_us": [
      { "icon": "kitchen", "title": "Stain Resistant", "desc": "Clean and tight grouting to resist cooking grease spots." },
      { "icon": "verified_user", "title": "Neat Margins", "desc": "Perfect flush joint fills matching tile profiles." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Clean Joints", "desc": "Vacuuming dirt and grease out of tile joints." },
      { "step": 2, "title": "Fill Gaps", "desc": "Applying grout compound into joints using float pads." },
      { "step": 3, "title": "Polish face", "desc": "Buffing tiles clean." }
    ]
  }'::jsonb,
  'kitchen-tile-grouting',
  '/assets/services/kitchen_cleaning.png'
),
-- 11. Shower Filter Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b8'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Shower Filter Installation',
  'Professional installation of shower water filters to help reduce impurities, chlorine, and sediments for a cleaner and more comfortable bathing experience.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 199,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "filters"
  }'::jsonb,
  '₹199 per unit',
  '{
    "about_text": "Professional installation of shower water filters to help reduce impurities, chlorine, and sediments for a cleaner and more comfortable bathing experience.",
    "included_features": [
      "Installation of one shower filter",
      "Leak inspection",
      "Water flow testing",
      "Secure fitting",
      "Labour charges"
    ],
    "excluded_features": [
      "Shower filter",
      "Plumbing modifications",
      "Pipe replacement",
      "Additional fittings",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the shower filter included?", "answer": "No. Customers need to provide the filter." },
      { "question": "Can all shower filters be installed?", "answer": "Most standard shower filters are supported." },
      { "question": "Will leaks be checked?", "answer": "Yes. The plumber tests all connections before completing the service." }
    ],
    "why_choose_us": [
      { "icon": "filter_alt", "title": "Bespoke Fit", "desc": "Connecting inline filters without dropping shower arm angles." },
      { "icon": "verified_user", "title": "Leak Free", "desc": "Tight thread sealing prevents water drip lines." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismount Head", "desc": "Unscrewing shower head and applying thread tape." },
      { "step": 2, "title": "Insert Filter", "desc": "Screwing inline shower filter body." },
      { "step": 3, "title": "Rehang Head", "desc": "Securing shower head to filter output and checking flow." }
    ]
  }'::jsonb,
  'shower-filter-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 12. Washing Machine Filter Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00b9'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Washing Machine Filter Installation',
  'Professional installation of washing machine inlet filters to help protect your appliance from dirt, sand, rust particles, and other water impurities.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "filters"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional installation of washing machine inlet filters to help protect your appliance from dirt, sand, rust particles, and other water impurities.",
    "included_features": [
      "Installation of one washing machine filter",
      "Secure plumbing connection",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Water filter",
      "Washing machine repairs",
      "Pipe modifications",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "Why should I install a washing machine filter?", "answer": "It helps protect internal components from dirt and sediment, improving appliance life." },
      { "question": "Is the filter included?", "answer": "No." },
      { "question": "Will the washing machine be tested?", "answer": "Yes. Water flow and leakage are checked after installation." }
    ],
    "why_choose_us": [
      { "icon": "filter", "title": "Appliance Care", "desc": "Filtering silt particles to prevent inlet valve blockages." },
      { "icon": "verified_user", "title": "Solid Connections", "desc": "Ensuring tap adapter locks do not spray leaks under water pressure." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Tap", "desc": "Uncoupling the washing machine inlet hose." },
      { "step": 2, "title": "Fit Filter", "desc": "Installing the filter cartridge onto tap outlet." },
      { "step": 3, "title": "Connect Hose", "desc": "Coupling inlet pipe to filter body and flow checking." }
    ]
  }'::jsonb,
  'washing-machine-filter-installation',
  '/assets/services/dusting_wiping.png'
),
-- 13. Drainage Cover Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ba'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Drainage Cover Installation',
  'Professional installation of drainage covers for bathrooms, balconies, kitchens, and utility areas to improve safety and prevent debris from entering the drainage system.',
  168.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 168,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "covers"
  }'::jsonb,
  '₹168 per unit',
  '{
    "about_text": "Professional installation of drainage covers for bathrooms, balconies, kitchens, and utility areas to improve safety and prevent debris from entering the drainage system.",
    "included_features": [
      "Installation of one drainage cover",
      "Proper fitting",
      "Alignment adjustment",
      "Stability inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Drain cover",
      "Drain cleaning",
      "Drain repairs",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the drain cover included?", "answer": "No. Labour charges only." },
      { "question": "Can stainless steel drain covers be installed?", "answer": "Yes, most standard drain covers are supported." },
      { "question": "Will the cover fit securely?", "answer": "Yes. The technician ensures a stable and proper fit." }
    ],
    "why_choose_us": [
      { "icon": "grid_on", "title": "Cockroach Trap Setup", "desc": "Fitting cockroach trap drain covers to block insect climbs." },
      { "icon": "verified_user", "title": "Flush Leveling", "desc": "Ensuring drain covers sit flush with floor tiles to prevent toe trips." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Clean Collar", "desc": "Scraping out old cement or grout from drain collars." },
      { "step": 2, "title": "Fit Frame", "desc": "Sealing the cover frame using white cement/sealants." },
      { "step": 3, "title": "Insert Grate", "desc": "Placing the inner grate panel." }
    ]
  }'::jsonb,
  'drainage-cover-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 14. Bathroom Drainage Removal
(
  'd186c52a-9bae-41e0-81f1-6be4409f00bb'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Bathroom Drainage Removal',
  'Professional removal of bathroom drain blockages caused by hair, soap residue, dirt, and other debris to restore smooth water flow and prevent water accumulation.',
  409.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 409,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blockages"
  }'::jsonb,
  '₹409 per unit',
  '{
    "about_text": "Professional removal of bathroom drain blockages caused by hair, soap residue, dirt, and other debris to restore smooth water flow and prevent water accumulation.",
    "included_features": [
      "Drain inspection",
      "Manual blockage removal",
      "Drain cleaning",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Underground pipeline cleaning",
      "Drain replacement",
      "Major plumbing repairs",
      "Chemical drain treatment",
      "Material costs"
    ],
    "faqs": [
      { "question": "What causes bathroom drain blockages?", "answer": "Hair, soap scum, dirt, and other debris commonly block bathroom drains." },
      { "question": "Will chemicals be used?", "answer": "No. Mechanical cleaning methods are generally used unless otherwise required." },
      { "question": "What if the blockage is deep inside the pipeline?", "answer": "Additional plumbing work may be recommended after inspection." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Deep Drain Snake", "desc": "Steel snake cables used to hook and draw hair clogs out." },
      { "icon": "verified_user", "title": "Trap Restore", "desc": "Flushing multi-trap points to clear built-up soap mud." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Grate", "desc": "Unfitting drain cover grate." },
      { "step": 2, "title": "Snake Clog", "desc": "Inserting drain snake to break up sediment and extract hair clogs." },
      { "step": 3, "title": "Water Flush", "desc": "High pressure water flush." }
    ]
  }'::jsonb,
  'bathroom-drainage-removal',
  '/assets/services/bathroom_cleaning.png'
),
-- 15. Balcony Drainage Removal
(
  'd186c52a-9bae-41e0-81f1-6be4409f00bc'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Balcony Drainage Removal',
  'Professional removal of balcony drain blockages caused by leaves, mud, dust, and debris to restore proper rainwater drainage and prevent waterlogging.',
  309.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 309,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blockages"
  }'::jsonb,
  '₹309 per unit',
  '{
    "about_text": "Professional removal of balcony drain blockages caused by leaves, mud, dust, and debris to restore proper rainwater drainage and prevent waterlogging.",
    "included_features": [
      "Drain inspection",
      "Removal of blockage",
      "Drain cleaning",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Underground drainage repairs",
      "Drain replacement",
      "Civil work",
      "Pressure jet cleaning",
      "Material costs"
    ],
    "faqs": [
      { "question": "What usually blocks balcony drains?", "answer": "Leaves, mud, dust, and outdoor debris are the most common causes." },
      { "question": "Will standing water be removed?", "answer": "Yes, as part of the blockage removal process where feasible." },
      { "question": "Does this include drain repair?", "answer": "No. The service only covers blockage removal and cleaning." }
    ],
    "why_choose_us": [
      { "icon": "waves", "title": "Mud Extraction", "desc": "Clearing thick storm mud and leaf residues from open rain drains." },
      { "icon": "verified_user", "title": "Prevent Floods", "desc": "Ensuring balcony drain capacity handles heavy rainwater falls." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Examine Outlet", "desc": "Checking output rainwater drop pipes." },
      { "step": 2, "title": "Hook Debris", "desc": "Manual extraction of packed leaves and dry dirt." },
      { "step": 3, "title": "Flush Test", "desc": "Pouring water to check clear drainage flow." }
    ]
  }'::jsonb,
  'balcony-drainage-removal',
  '/assets/services/dusting_wiping.png'
),
-- 16. Toilet Seat Cover Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00bd'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Toilet Seat Cover Replacement',
  'Professional replacement of damaged, loose, or worn-out toilet seat covers for improved hygiene, comfort, and everyday usability. Suitable for most western toilets.',
  148.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 148,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "covers"
  }'::jsonb,
  '₹148 per unit',
  '{
    "about_text": "Professional replacement of damaged, loose, or worn-out toilet seat covers for improved hygiene, comfort, and everyday usability. Suitable for most western toilets.",
    "included_features": [
      "Removal of existing toilet seat cover",
      "Installation of one new toilet seat cover",
      "Alignment adjustment",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Toilet seat cover",
      "Toilet repairs",
      "Hinges or mounting hardware (if required)",
      "Toilet replacement",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the toilet seat cover included?", "answer": "No. Customers need to provide the replacement seat." },
      { "question": "Can soft-close seat covers be installed?", "answer": "Yes, if compatible with your toilet model." },
      { "question": "Will the old seat be removed?", "answer": "Yes. Removal is included before installing the new seat." }
    ],
    "why_choose_us": [
      { "icon": "wc", "title": "Hygiene Swap", "desc": "Clean extraction of rusted hinge bolts." },
      { "icon": "verified_user", "title": "Wobble Free Mount", "desc": "Aligning and tightening expansion bolts so seat doesn''t shift." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Unbolt seat", "desc": "Removing older nylon/metal lock nuts below ceramic rims." },
      { "step": 2, "title": "Insert Bolts", "desc": "Mounting new hinge anchors into toilet slots." },
      { "step": 3, "title": "Align Cover", "desc": "Adjusting seat position and tightening lock nuts." }
    ]
  }'::jsonb,
  'toilet-seat-cover-replacement',
  '/assets/services/bathroom_cleaning.png'
),
-- 17. Flush Tank Repair (External PVC)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00be'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Flush Tank Repair (External PVC)',
  'Repair external PVC flush tanks experiencing leakage, weak flushing, continuous water flow, or filling issues to restore proper operation.',
  99.00,
  149.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 99,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹99 per unit',
  '{
    "about_text": "Repair external PVC flush tanks experiencing leakage, weak flushing, continuous water flow, or filling issues to restore proper operation.",
    "included_features": [
      "Inspection of external PVC flush tank",
      "Minor repairs and adjustments",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Spare parts",
      "Flush tank replacement",
      "Water supply line replacement",
      "Wall modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does the service include spare parts?", "answer": "No. Replacement parts are charged separately." },
      { "question": "Can leaking flush tanks be repaired?", "answer": "Yes, most common leakage issues can be repaired." },
      { "question": "What if the tank is badly damaged?", "answer": "The plumber may recommend a replacement." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Siphon Calibration", "desc": "Adjusting ball valve floats and siphon handles." },
      { "icon": "verified_user", "title": "Seepage Cutoff", "desc": "Stopping drip leaks from bottom washer seals." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Open Cover", "desc": "Removing PVC tank lid to check valve trigger." },
      { "step": 2, "title": "Adjust Float", "desc": "Resetting float rod limits or replacing washers." },
      { "step": 3, "title": "Flush Test", "desc": "Testing siphon flush strength." }
    ]
  }'::jsonb,
  'flush-tank-repair-external-pvc',
  '/assets/services/bathroom_cleaning.png'
),
-- 18. Flush Tank Repair (Concealed)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00bf'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Flush Tank Repair (Concealed)',
  'Professional repair of concealed flush tanks to resolve leakage, flushing issues, or internal mechanism faults without unnecessary replacement.',
  169.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Professional repair of concealed flush tanks to resolve leakage, flushing issues, or internal mechanism faults without unnecessary replacement.",
    "included_features": [
      "Inspection of concealed flush tank",
      "Minor repairs and adjustments",
      "Functional testing",
      "Leak inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Spare parts",
      "Concealed cistern replacement",
      "Tile removal",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can concealed flush tanks be repaired without breaking tiles?", "answer": "Many common issues can be repaired through the access panel." },
      { "question": "Are spare parts included?", "answer": "No." },
      { "question": "What if internal components are damaged?", "answer": "Replacement parts may be required at an additional cost." }
    ],
    "why_choose_us": [
      { "icon": "dns", "title": "Access Panel Repair", "desc": "Expert repairs through the actuator push-plate slot without wall damage." },
      { "icon": "verified_user", "title": "Valve Calibration", "desc": "Dismantling and cleaning float and flush valves." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismount Plate", "desc": "Removing flush push button panel." },
      { "step": 2, "title": "Access Valves", "desc": "Reaching in to service inlet float valve assembly." },
      { "step": 3, "title": "Test Seals", "desc": "Verifying water level cutoff limits." }
    ]
  }'::jsonb,
  'flush-tank-repair-concealed',
  '/assets/services/bathroom_cleaning.png'
),
-- 19. Flush Tank Repair (External Ceramic)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c0'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Flush Tank Repair (External Ceramic)',
  'Repair external ceramic flush tanks suffering from leakage, improper flushing, continuous water flow, or filling problems for smooth and efficient operation.',
  299.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Repair external ceramic flush tanks suffering from leakage, improper flushing, continuous water flow, or filling problems for smooth and efficient operation.",
    "included_features": [
      "Inspection of ceramic flush tank",
      "Minor repairs",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Ceramic tank replacement",
      "Spare parts",
      "Water supply pipe replacement",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can cracked ceramic tanks be repaired?", "answer": "Minor issues can be repaired, but cracked tanks usually require replacement." },
      { "question": "Are replacement parts included?", "answer": "No." },
      { "question": "Will leaks be checked?", "answer": "Yes. All plumbing connections are tested after repair." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Dual Flush Fixes", "desc": "Repairing ceramic dual push-button plunger assemblies." },
      { "icon": "verified_user", "title": "Gasket Refits", "desc": "Replacing tank-to-bowl donut gaskets to stop leaks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspect Inside", "desc": "Uncoupling lid and diagnosing plunger seals." },
      { "step": 2, "title": "Fit Washer", "desc": "Tightening bolts or replacing washers inside cistern." },
      { "step": 3, "title": "Test Flush", "desc": "Checking water seals and refill cutoff." }
    ]
  }'::jsonb,
  'flush-tank-repair-external-ceramic',
  '/assets/services/bathroom_cleaning.png'
),
-- 20. Western Toilet Repair (Floor Mounted)
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c1'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Western Toilet Repair (Floor Mounted)',
  'Professional repair of floor-mounted western toilets to fix leakage, loose fittings, flushing problems, instability, or drainage-related issues.',
  799.00,
  1199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 799,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹799 per unit',
  '{
    "about_text": "Professional repair of floor-mounted western toilets to fix leakage, loose fittings, flushing problems, instability, or drainage-related issues.",
    "included_features": [
      "Toilet inspection",
      "Minor plumbing repairs",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Toilet replacement",
      "Flush tank replacement",
      "Spare parts",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "What issues can be repaired?", "answer": "Loose fittings, leakage, flushing issues, and minor plumbing faults." },
      { "question": "Are replacement parts included?", "answer": "No." },
      { "question": "What if the toilet is damaged beyond repair?", "answer": "Our plumber will recommend replacement if necessary." }
    ],
    "why_choose_us": [
      { "icon": "gavel", "title": "Stability Restore", "desc": "Refixing loose base anchors using white cement or silicon." },
      { "icon": "verified_user", "title": "Floor Leak Checks", "desc": "Inspecting floor wax ring gaskets to stop waste outlet leaks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Diagnose Leaks", "desc": "Checking if water pools at base or outlet pipe." },
      { "step": 2, "title": "Tighten Base", "desc": "Replacing rusty anchor bolts and resealing base gaps." },
      { "step": 3, "title": "Flush Check", "desc": "Testing multiple flushes to verify no leaks." }
    ]
  }'::jsonb,
  'western-toilet-repair-floor-mounted',
  '/assets/services/bathroom_cleaning.png'
),
-- 21. Toilet Pot Blockage Removal
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c2'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Toilet Pot Blockage Removal',
  'Professional removal of toilet blockages caused by paper, waste buildup, foreign objects, or other obstructions to restore proper drainage.',
  1299.00,
  1999.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "blockages"
  }'::jsonb,
  '₹1,299 per unit',
  '{
    "about_text": "Professional removal of toilet blockages caused by paper, waste buildup, foreign objects, or other obstructions to restore proper drainage.",
    "included_features": [
      "Toilet blockage inspection",
      "Mechanical blockage removal",
      "Drain cleaning",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Sewer line repairs",
      "Underground drainage work",
      "Toilet replacement",
      "Chemical treatment",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can severely blocked toilets be cleared?", "answer": "Yes. Most common toilet blockages can be removed using professional tools." },
      { "question": "Will chemicals be used?", "answer": "Generally, mechanical cleaning methods are preferred." },
      { "question": "What if the blockage is in the main sewer line?", "answer": "Additional plumbing work may be required." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Toilet Closet Auger", "desc": "Using specialized vinyl-coated toilet augers to clear clogs without scratching ceramic bowl rims." },
      { "icon": "verified_user", "title": "Clog Extraction", "desc": "Breaking down tough blockages safely inside the U-trap." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Trap Check", "desc": "Running diagnostic water fills to locate U-trap blockage." },
      { "step": 2, "title": "Auger Run", "desc": "Inserting toilet auger and rotating to break up obstruction." },
      { "step": 3, "title": "Flush Clear", "desc": "Verifying free siphon flow." }
    ]
  }'::jsonb,
  'toilet-pot-blockage-removal',
  '/assets/services/bathroom_cleaning.png'
),
-- 22. Jet Spray Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c3'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Jet Spray Installation',
  'Professional installation of health faucets (jet sprays) with secure plumbing connections for leak-free performance and convenient daily use.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "sprays"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional installation of health faucets (jet sprays) with secure plumbing connections for leak-free performance and convenient daily use.",
    "included_features": [
      "Installation of one jet spray",
      "Hose connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Jet spray",
      "Angle valve replacement",
      "Plumbing modifications",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the jet spray included?", "answer": "No." },
      { "question": "Will leaks be checked after installation?", "answer": "Yes." },
      { "question": "Can any brand of jet spray be installed?", "answer": "Most standard models are supported." }
    ],
    "why_choose_us": [
      { "icon": "spray", "title": "Sealed Fittings", "desc": "Using high-grade washers inside hose ends to stop drips." },
      { "icon": "verified_user", "title": "Bracket Mount", "desc": "Mounting the jet spray wall holder perfectly aligned on tiles." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Connect Hose", "desc": "Connecting flexible hose to angle valve with washers." },
      { "step": 2, "title": "Mount Holder", "desc": "Drilling tile and securing bracket holder." },
      { "step": 3, "title": "Pressure Check", "desc": "Testing spray trigger and valve shutoffs." }
    ]
  }'::jsonb,
  'jet-spray-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 23. Flush Tank Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c4'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Flush Tank Replacement',
  'Professional replacement of damaged or non-functional flush tanks with proper plumbing connections, alignment, and leak testing.',
  549.00,
  799.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 549,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹549 per unit',
  '{
    "about_text": "Professional replacement of damaged or non-functional flush tanks with proper plumbing connections, alignment, and leak testing.",
    "included_features": [
      "Removal of existing flush tank",
      "Installation of replacement flush tank",
      "Water connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Flush tank",
      "Water supply line replacement",
      "Toilet replacement",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the flush tank included?", "answer": "No." },
      { "question": "Can both PVC and ceramic tanks be replaced?", "answer": "Yes, depending on compatibility." },
      { "question": "Will flushing be tested?", "answer": "Yes. Complete functionality is checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "autorenew", "title": "Clean Swap", "desc": "Uncoupling wall/coupled tanks without breaking ceramics." },
      { "icon": "verified_user", "title": "Flush Calibration", "desc": "Ensuring new valves shut off water inflow at exact limits." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismount old tank", "desc": "Isolating inlet tap and unscrewing tank bracket." },
      { "step": 2, "title": "Mount new tank", "desc": "Screwing the replacement tank and connecting flush bend pipe." },
      { "step": 3, "title": "Flush test", "desc": "Running water test." }
    ]
  }'::jsonb,
  'flush-tank-replacement',
  '/assets/services/bathroom_cleaning.png'
),
-- 24. Indian Toilet Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c5'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Indian Toilet Installation',
  'Professional installation of Indian-style toilets with secure plumbing connections, proper alignment, and leak-free operation. Labour charges only.',
  1699.00,
  2499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1699,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "toilets"
  }'::jsonb,
  '₹1,699 per unit',
  '{
    "about_text": "Professional installation of Indian-style toilets with secure plumbing connections, proper alignment, and leak-free operation. Labour charges only.",
    "included_features": [
      "Installation of one Indian toilet pan",
      "Alignment and positioning",
      "Plumbing connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Indian toilet pan",
      "Flush tank",
      "Floor breaking or tiling work",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include the toilet pan?", "answer": "No." },
      { "question": "Is masonry work included?", "answer": "No. Civil work is excluded." },
      { "question": "Will the toilet be tested after installation?", "answer": "Yes. Water flow and leakage are checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "hardware", "title": "P Trap Alignment", "desc": "Ensuring P-trap sits level to maintain correct water seal depth." },
      { "icon": "verified_user", "title": "Sealed Connections", "desc": "Cement sealant checks around ceramic collar joints." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Align Pan", "desc": "Placing ceramic pan level on prepared base." },
      { "step": 2, "title": "P-Trap Link", "desc": "Connecting waste pipe outlet to P-trap with seals." },
      { "step": 3, "title": "Leak Test", "desc": "Pouring test water buckets to verify joints." }
    ]
  }'::jsonb,
  'indian-toilet-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 25. Western Toilet Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c6'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Western Toilet Installation',
  'Professional installation of western toilets with secure plumbing connections, accurate alignment, and leak-free performance for homes and commercial spaces.',
  1499.00,
  2199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1499,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "toilets"
  }'::jsonb,
  '₹1,499 per unit',
  '{
    "about_text": "Professional installation of western toilets with secure plumbing connections, accurate alignment, and leak-free performance for homes and commercial spaces.",
    "included_features": [
      "Installation of one western toilet",
      "Plumbing connection",
      "Alignment adjustment",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Western toilet",
      "Flush tank (unless integrated)",
      "Civil work",
      "Floor modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does the service include the toilet?", "answer": "No." },
      { "question": "Can wall-mounted toilets be installed?", "answer": "This service is intended for standard compatible installations. Specialized wall-mounted systems may require additional work." },
      { "question": "Will leaks be checked?", "answer": "Yes. All plumbing connections are tested after installation." }
    ],
    "why_choose_us": [
      { "icon": "gavel", "title": "Floor Anchor Plumb", "desc": "Precision drilling to mount floor anchor bolts level." },
      { "icon": "verified_user", "title": "Silicone Sealing", "desc": "Applying clean anti-fungal silicone bead along toilet floor edges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drill Holes", "desc": "Positioning toilet and drilling floor anchor spots." },
      { "step": 2, "title": "Wax Ring Mount", "desc": "Fitting wax gasket onto waste outlet." },
      { "step": 3, "title": "Bolt Down", "desc": "Securing floor bolts, connecting inlet line and testing." }
    ]
  }'::jsonb,
  'western-toilet-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 26. Western Toilet Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c7'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d72'::uuid, -- Toilet & Flush Services
  'Western Toilet Replacement',
  'Professional replacement of old or damaged western toilets with proper removal, installation, plumbing connections, and leak testing.',
  1699.00,
  2499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1699,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "toilets"
  }'::jsonb,
  '₹1,699 per unit',
  '{
    "about_text": "Professional replacement of old or damaged western toilets with proper removal, installation, plumbing connections, and leak testing.",
    "included_features": [
      "Removal of existing western toilet",
      "Installation of replacement toilet",
      "Plumbing connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "New western toilet",
      "Civil work",
      "Floor repairs",
      "Flush tank (unless integrated)",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the new toilet included?", "answer": "No. Customers need to provide the replacement toilet." },
      { "question": "Will the old toilet be removed?", "answer": "Yes. Removal is included." },
      { "question": "Is disposal of the old toilet included?", "answer": "No. Disposal can be arranged separately if required." }
    ],
    "why_choose_us": [
      { "icon": "autorenew", "title": "Seamless Swap", "desc": "Removing old cement bases cleanly without cracking floor tiles." },
      { "icon": "verified_user", "title": "Fresh Seals", "desc": "Installing new outlet sleeve connectors to prevent floor water leaks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismount old", "desc": "Uncoupling water supply line and breaking old floor cement seal." },
      { "step": 2, "title": "Base clean", "desc": "Scraping old cement and aligning outlet pipeline." },
      { "step": 3, "title": "Mount & Seal", "desc": "Bolting the replacement toilet and grouting edges." }
    ]
  }'::jsonb,
  'western-toilet-replacement',
  '/assets/services/bathroom_cleaning.png'
),
-- 27. Tap Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c8'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Tap Repair',
  'Professional repair of leaking, dripping, loose, or low-pressure taps to restore smooth water flow and prevent water wastage. Suitable for most kitchen, bathroom, and utility taps.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "taps"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional repair of leaking, dripping, loose, or low-pressure taps to restore smooth water flow and prevent water wastage. Suitable for most kitchen, bathroom, and utility taps.",
    "included_features": [
      "Inspection of one tap",
      "Minor repairs and adjustments",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "New tap",
      "Cartridge, spindle, or internal spare parts",
      "Pipe replacement",
      "Wall breaking or plumbing modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "What tap problems can be repaired?", "answer": "Leaking taps, dripping water, loose handles, low water flow, and minor operational issues." },
      { "question": "Are spare parts included?", "answer": "No. Replacement parts are charged separately after approval." },
      { "question": "What if the tap cannot be repaired?", "answer": "Our plumber may recommend tap replacement if repair is not feasible." }
    ],
    "why_choose_us": [
      { "icon": "water_drop", "title": "Drip Stoppage", "desc": "Replacing worn internal washers or spindles to stop faucet drips." },
      { "icon": "verified_user", "title": "Aerator Clean", "desc": "Clearing salt scales from aerator grills to restore water pressure." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspect Drip", "desc": "Testing if water leaks from spout, thread, or handle." },
      { "step": 2, "title": "Replace Spindle", "desc": "Dismantling handle and replacing worn washers/spindles." },
      { "step": 3, "title": "Test Flow", "desc": "Running tap to check flow." }
    ]
  }'::jsonb,
  'tap-repair',
  '/assets/services/bathroom_cleaning.png'
),
-- 28. Water Mixer Tap Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f00c9'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Water Mixer Tap Repair',
  'Professional repair of hot and cold water mixer taps to resolve leakage, handle issues, poor water flow, or temperature control problems.',
  299.00,
  449.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "taps"
  }'::jsonb,
  '₹299 per unit',
  '{
    "about_text": "Professional repair of hot and cold water mixer taps to resolve leakage, handle issues, poor water flow, or temperature control problems.",
    "included_features": [
      "Inspection of one mixer tap",
      "Minor repairs and adjustments",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Mixer cartridge",
      "Spare parts",
      "Complete mixer replacement",
      "Pipe modifications",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can leaking mixer taps be repaired?", "answer": "Yes. Most common leakage and handle issues can be repaired." },
      { "question": "Is the mixer cartridge included?", "answer": "No. Replacement parts are charged separately." },
      { "question": "Will both hot and cold water functions be checked?", "answer": "Yes. The plumber tests both water lines before completing the service." }
    ],
    "why_choose_us": [
      { "icon": "tune", "title": "Cartridge Repairs", "desc": "Replacing internal ceramic cartridges to fix hot/cold mix ratios." },
      { "icon": "verified_user", "title": "Diverter Servicing", "desc": "Servicing shower-to-tap diverter pins to restore smooth clicks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Handle", "desc": "Uncoupling mixer handle and dome cap." },
      { "step": 2, "title": "Replace Cartridge", "desc": "Removing locking nut and inserting new ceramic cartridge." },
      { "step": 3, "title": "Check Mix", "desc": "Verifying both hot and cold lines are mixing leak-free." }
    ]
  }'::jsonb,
  'water-mixer-tap-repair',
  '/assets/services/bathroom_cleaning.png'
),
-- 29. Tap Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ca'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Tap Installation',
  'Professional installation of bathroom, kitchen, garden, or utility taps with secure plumbing connections and leak-free performance.',
  129.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 129,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "taps"
  }'::jsonb,
  '₹129 per unit',
  '{
    "about_text": "Professional installation of bathroom, kitchen, garden, or utility taps with secure plumbing connections and leak-free performance.",
    "included_features": [
      "Installation of one tap",
      "Plumbing connection",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Tap",
      "Angle valve replacement",
      "Pipe modifications",
      "Wall breaking",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the tap included?", "answer": "No. Customers need to provide the tap." },
      { "question": "Can all brands be installed?", "answer": "Yes. Most standard tap brands are supported." },
      { "question": "Will the tap be tested after installation?", "answer": "Yes. Water flow and leakage are checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "add_circle", "title": "Thread Sealing", "desc": "Applying Teflon wraps to wall flange joints to prevent inside wall seepage." },
      { "icon": "verified_user", "title": "Clean Fits", "desc": "Screwed straight and aligned flat against wall flanges." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Isolate Main", "desc": "Turning off bathroom inlet valves." },
      { "step": 2, "title": "Fit Tap", "desc": "Screwing the tap body with teflon tape." },
      { "step": 3, "title": "Flow Test", "desc": "Flow leak inspection." }
    ]
  }'::jsonb,
  'tap-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 30. Water Mixer Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00cb'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Water Mixer Installation',
  'Professional installation of bathroom or kitchen water mixer taps with proper plumbing connections, leak testing, and smooth hot and cold water operation.',
  419.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 419,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "taps"
  }'::jsonb,
  '₹419 per unit',
  '{
    "about_text": "Professional installation of bathroom or kitchen water mixer taps with proper plumbing connections, leak testing, and smooth hot and cold water operation.",
    "included_features": [
      "Installation of one mixer tap",
      "Hot and cold water connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Water mixer",
      "Flexible connection hoses",
      "Plumbing modifications",
      "Wall breaking",
      "Material costs"
    ],
    "faqs": [
      { "question": "Does this include the mixer tap?", "answer": "No. Labour charges only." },
      { "question": "Can wall-mounted and deck-mounted mixers be installed?", "answer": "Yes, depending on your plumbing setup." },
      { "question": "Will both water lines be tested?", "answer": "Yes. The plumber checks proper operation of both hot and cold water supplies." }
    ],
    "why_choose_us": [
      { "icon": "tune", "title": "Double Connection Fit", "desc": "Connecting both hot and cold lines securely using flex hoses." },
      { "icon": "verified_user", "title": "Wall Offset Setup", "desc": "Using crank brass adapters to align wall-mounted mixers completely straight." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Fit offset", "desc": "Screwing offset crank connectors into wall outlets." },
      { "step": 2, "title": "Mount Mixer", "desc": "Mounting mixer body and checking parallel alignments." },
      { "step": 3, "title": "Temperature check", "desc": "Running hot/cold check." }
    ]
  }'::jsonb,
  'water-mixer-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 31. Water Nozzle Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00cc'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Water Nozzle Installation',
  'Professional installation of water nozzles, bib nozzles, hose nozzles, or utility water outlets for secure connections and reliable water flow.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "nozzles"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional installation of water nozzles, bib nozzles, hose nozzles, or utility water outlets for secure connections and reliable water flow.",
    "included_features": [
      "Installation of one water nozzle",
      "Leak inspection",
      "Water flow testing",
      "Tightening and alignment",
      "Labour charges"
    ],
    "excluded_features": [
      "Water nozzle",
      "Hose pipe",
      "Pipe modifications",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the nozzle included?", "answer": "No. Customers need to provide the nozzle." },
      { "question": "Can garden water nozzles be installed?", "answer": "Yes. Most standard water nozzles are supported." },
      { "question": "Will leaks be checked?", "answer": "Yes. Every installation is tested before completion." }
    ],
    "why_choose_us": [
      { "icon": "settings", "title": "Tight Coupling", "desc": "Teflon tapes applied to ensure no thread leaks." },
      { "icon": "verified_user", "title": "Hose Locks", "desc": "Clamping utility/garden nozzle adapters securely." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Tape Thread", "desc": "Applying teflon sealant to inlet threads." },
      { "step": 2, "title": "Screw Nozzle", "desc": "Screwing the brass/plastic nozzle onto the line outlet." },
      { "step": 3, "title": "Test Stream", "desc": "Flow pressure check." }
    ]
  }'::jsonb,
  'water-nozzle-installation',
  '/assets/services/bathroom_cleaning.png'
),
-- 32. Tap Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00cd'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Tap Replacement',
  'Professional replacement of old, damaged, or leaking taps with new ones for improved water flow, reliable performance, and a refreshed appearance.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "taps"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional replacement of old, damaged, or leaking taps with new ones for improved water flow, reliable performance, and a refreshed appearance.",
    "included_features": [
      "Removal of existing tap",
      "Installation of replacement tap",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "New tap",
      "Angle valve replacement",
      "Pipe modifications",
      "Wall repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the replacement tap included?", "answer": "No. Customers need to provide the new tap." },
      { "question": "Will the old tap be removed?", "answer": "Yes. Removal is included before installing the replacement tap." },
      { "question": "Can you replace kitchen and bathroom taps?", "answer": "Yes. We replace most standard kitchen, bathroom, wash basin, and utility taps." }
    ],
    "why_choose_us": [
      { "icon": "swap_horiz", "title": "Direct Swap", "desc": "Dismantling old tap cores cleanly without scratching wall flanges." },
      { "icon": "verified_user", "title": "Sealed Thread", "desc": "Ensuring new tap thread locks have zero leaks." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Remove Old Tap", "desc": "Uncoupling older corroded wall tap." },
      { "step": 2, "title": "Fit Replacement", "desc": "Screwing in the new tap with teflon seals." },
      { "step": 3, "title": "Test flow", "desc": "Drain and flow check." }
    ]
  }'::jsonb,
  'tap-replacement',
  '/assets/services/bathroom_cleaning.png'
),
-- 33. Water Tank Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f00ce'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Water Tank Repair',
  'Professional repair of leaking, damaged, or malfunctioning water tanks to restore safe water storage and prevent water loss. Suitable for overhead and underground water tanks.',
  169.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Professional repair of leaking, damaged, or malfunctioning water tanks to restore safe water storage and prevent water loss. Suitable for overhead and underground water tanks.",
    "included_features": [
      "Inspection of one water tank",
      "Minor leakage and fitting repairs",
      "Basic sealing and adjustments",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Waterproofing treatment",
      "Major crack repairs",
      "Water tank replacement",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "What types of water tanks can be repaired?", "answer": "Overhead plastic tanks, loft tanks, and underground water tanks." },
      { "question": "Are repair materials included?", "answer": "No. Any required materials are charged separately after approval." },
      { "question": "Can large cracks be repaired?", "answer": "Major structural damage may require tank replacement." }
    ],
    "why_choose_us": [
      { "icon": "build", "title": "Joint Leak Fix", "desc": "Replacing damaged inlet/outlet tank connectors and washers." },
      { "icon": "verified_user", "title": "Bypass setup", "desc": "Isolating tank line during repairs to ensure household water runs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check leak", "desc": "Tracing leak to connection ports or body crack." },
      { "step": 2, "title": "Seal Joint", "desc": "Uncoupling joint connectors, cleaning surface and replacing gaskets." },
      { "step": 3, "title": "Refill check", "desc": "Refilling water to test seals." }
    ]
  }'::jsonb,
  'water-tank-repair',
  '/assets/services/dusting_wiping.png'
),
-- 34. Overhead Water Tank Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00cf'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Overhead Water Tank Installation',
  'Professional installation of overhead water tanks with secure placement, plumbing connections, and leak testing for reliable water storage.',
  649.00,
  999.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 649,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹649 per unit',
  '{
    "about_text": "Professional installation of overhead water tanks with secure placement, plumbing connections, and leak testing for reliable water storage.",
    "included_features": [
      "Installation of one overhead water tank",
      "Water inlet and outlet connections",
      "Alignment and positioning",
      "Leak inspection",
      "Labour charges"
    ],
    "excluded_features": [
      "Water tank",
      "Tank stand or platform",
      "Pipe extensions",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the water tank included?", "answer": "No. Customers need to provide the tank." },
      { "question": "Can tanks of all brands be installed?", "answer": "Yes, most standard plastic water tanks are supported." },
      { "question": "Will all plumbing connections be tested?", "answer": "Yes. Leak-free operation is verified before completion." }
    ],
    "why_choose_us": [
      { "icon": "water_damage", "title": "Union Joint Setup", "desc": "Fitting check union valves for easy future tank uncouplings." },
      { "icon": "verified_user", "title": "Float Valve Fit", "desc": "Installing auto shutoff float balls to prevent roof water overflows." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Level Base", "desc": "Placing tank level on stand/loft slab." },
      { "step": 2, "title": "Pipe Connection", "desc": "Drilling connection ports and fitting inlet/outlet union pipes." },
      { "step": 3, "title": "Check flow", "desc": "Pressure and overflow tests." }
    ]
  }'::jsonb,
  'overhead-water-tank-installation',
  '/assets/services/dusting_wiping.png'
),
-- 35. Loft Water Tank Cleaning
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d0'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Loft Water Tank Cleaning',
  'Professional cleaning of loft-mounted water tanks to remove dirt, sludge, algae, and contaminants, helping maintain clean and hygienic water storage.',
  1099.00,
  1699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1099,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹1,099 per unit',
  '{
    "about_text": "Professional cleaning of loft-mounted water tanks to remove dirt, sludge, algae, and contaminants, helping maintain clean and hygienic water storage.",
    "included_features": [
      "Tank inspection",
      "Sludge and sediment removal",
      "Internal cleaning",
      "Basic rinse",
      "Labour charges"
    ],
    "excluded_features": [
      "Chemical disinfection",
      "Tank repairs",
      "Plumbing repairs",
      "Water tank replacement",
      "Material costs"
    ],
    "faqs": [
      { "question": "How often should water tanks be cleaned?", "answer": "Every 6 to 12 months is generally recommended." },
      { "question": "Is chemical cleaning included?", "answer": "No. Additional treatment can be provided separately if required." },
      { "question": "Will sludge be completely removed?", "answer": "Yes, wherever accessible." }
    ],
    "why_choose_us": [
      { "icon": "cleaning_services", "title": "Enclosed Cleans", "desc": "Specialized techniques to vacuum clean hard to reach indoor loft tanks." },
      { "icon": "verified_user", "title": "Silt Clearance", "desc": "Removing layers of bottom clay mud for clean water flow." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dewatering", "desc": "Draining out tank water." },
      { "step": 2, "title": "Manual Scrub", "desc": "Scrubbing internal walls and vacuuming out mud mud layers." },
      { "step": 3, "title": "Rinse out", "desc": "Clean water rinsing and refilling." }
    ]
  }'::jsonb,
  'loft-water-tank-cleaning',
  '/assets/services/dusting_wiping.png'
),
-- 36. Open Overhead Water Tank Cleaning
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d1'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd6'::uuid, -- Water Tank & Pump Services
  'Open Overhead Water Tank Cleaning',
  'Professional cleaning of open overhead water tanks to remove accumulated dirt, algae, leaves, and sediment for cleaner water storage.',
  799.00,
  1299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 799,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹799 per unit',
  '{
    "about_text": "Professional cleaning of open overhead water tanks to remove accumulated dirt, algae, leaves, and sediment for cleaner water storage.",
    "included_features": [
      "Tank inspection",
      "Sludge removal",
      "Internal cleaning",
      "Basic rinsing",
      "Labour charges"
    ],
    "excluded_features": [
      "Tank repair",
      "Waterproofing",
      "Disinfection chemicals",
      "Plumbing repairs",
      "Material costs"
    ],
    "faqs": [
      { "question": "Why do open tanks require frequent cleaning?", "answer": "Open tanks are more exposed to dust, leaves, insects, and algae growth." },
      { "question": "Is disinfection included?", "answer": "No. It can be provided separately if required." },
      { "question": "Will the tank be emptied before cleaning?", "answer": "Yes, where required and feasible." }
    ],
    "why_choose_us": [
      { "icon": "wb_sunny", "title": "Algae Removal", "desc": "Thorough scrubbing to remove thick green algae layers caused by sunlight." },
      { "icon": "verified_user", "title": "Sediment Vacuum", "desc": "Vacuuming loose clay dust off the tank bottom." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Drain", "desc": "Emptying the water tank." },
      { "step": 2, "title": "Scrub & Wash", "desc": "High pressure wall washing and bottom mud suction." },
      { "step": 3, "title": "Rinse Check", "desc": "Sanitary rinse before refilling." }
    ]
  }'::jsonb,
  'open-overhead-water-tank-cleaning',
  '/assets/services/dusting_wiping.png'
),
-- 37. Underground Water Tank Cleaning
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d2'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Underground Water Tank Cleaning',
  'Professional cleaning of underground water storage tanks to remove sludge, sediment, and contaminants, ensuring hygienic water storage.',
  1299.00,
  1999.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 1299,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "tanks"
  }'::jsonb,
  '₹1,299 per unit',
  '{
    "about_text": "Professional cleaning of underground water storage tanks to remove sludge, sediment, and contaminants, ensuring hygienic water storage.",
    "included_features": [
      "Tank inspection",
      "Sludge removal",
      "Internal cleaning",
      "Basic rinse",
      "Labour charges"
    ],
    "excluded_features": [
      "Tank repairs",
      "Waterproofing",
      "Disinfection chemicals",
      "Dewatering pumps",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is underground tank cleaning different from overhead tanks?", "answer": "Yes. Underground tanks usually require more extensive cleaning due to sediment accumulation." },
      { "question": "Is chemical treatment included?", "answer": "No." },
      { "question": "How long does cleaning take?", "answer": "The duration depends on tank size and contamination level." }
    ],
    "why_choose_us": [
      { "icon": "layers", "title": "Heavy Sludge Suction", "desc": "Clearing thick layers of ground mud and silt using pumps." },
      { "icon": "verified_user", "title": "Confined Space Safe", "desc": "Trained experts equipped with safety gear for sump entries." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Sump Dewater", "desc": "Pumping out deep standing sump water." },
      { "step": 2, "title": "Floor Scrub", "desc": "High pressure wall washing and mud sludge suction." },
      { "step": 3, "title": "Sanitary Rinse", "desc": "Basic sanitizing flush." }
    ]
  }'::jsonb,
  'underground-water-tank-cleaning',
  '/assets/services/dusting_wiping.png'
),
-- 38. Pipeline Leakage Repair
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d3'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Pipeline Leakage Repair',
  'Professional repair of leaking water pipelines to prevent water wastage, reduce property damage, and restore proper water flow.',
  309.00,
  499.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 309,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹309 per unit',
  '{
    "about_text": "Professional repair of leaking water pipelines to prevent water wastage, reduce property damage, and restore proper water flow.",
    "included_features": [
      "Inspection of leaking pipeline",
      "Minor leakage repair",
      "Leak testing",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Pipe replacement",
      "Concealed pipeline excavation",
      "Wall breaking",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Can concealed pipe leaks be repaired?", "answer": "Yes, but additional civil work may be required depending on the leak location." },
      { "question": "Are replacement pipes included?", "answer": "No." },
      { "question": "Will water pressure be checked?", "answer": "Yes. The pipeline is tested after repair." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Leak Detection", "desc": "Multimeter pressure drop tests to pinpoint line leaks." },
      { "icon": "verified_user", "title": "Solvent Weld", "desc": "Using high-grade UPVC/CPVC solvent cements for strong joints." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Trace Leak", "desc": "Checking walls for damp spots and lines for drip points." },
      { "step": 2, "title": "Cut & Coupler", "desc": "Cutting out leaking PVC segment and gluing replacement coupler." },
      { "step": 3, "title": "Pressure run", "desc": "Testing joint under pump pressure." }
    ]
  }'::jsonb,
  'pipeline-leakage-repair',
  '/assets/services/dusting_wiping.png'
),
-- 39. Water Meter Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d4'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Water Meter Installation',
  'Professional installation of residential or commercial water meters for accurate water usage monitoring and reliable plumbing connections.',
  399.00,
  599.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 399,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "meters"
  }'::jsonb,
  '₹399 per unit',
  '{
    "about_text": "Professional installation of residential or commercial water meters for accurate water usage monitoring and reliable plumbing connections.",
    "included_features": [
      "Installation of one water meter",
      "Plumbing connection",
      "Leak inspection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Water meter",
      "Government approvals",
      "Pipe modifications",
      "Civil work",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the water meter included?", "answer": "No. Customers need to provide the meter." },
      { "question": "Can digital water meters be installed?", "answer": "Yes, if compatible with the existing plumbing system." },
      { "question": "Will leaks be checked after installation?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "electric_meter", "title": "Accurate Flow", "desc": "Aligning meter horizontally to prevent measurement drifts." },
      { "icon": "verified_user", "title": "Check Valve Fit", "desc": "Installing non-return valves to avoid reading reverse flows." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Cut Pipe", "desc": "Dismantling pipe section to insert meter nipples." },
      { "step": 2, "title": "Mount Meter", "desc": "Gasketing couplings and tightening meter thread nuts." },
      { "step": 3, "title": "Check dials", "desc": "Testing dial ticks under flow." }
    ]
  }'::jsonb,
  'water-meter-installation',
  '/assets/services/dusting_wiping.png'
),
-- 40. Motor Air Cavity Removal
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d5'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Motor Air Cavity Removal',
  'Professional removal of air locks from water pumps and motors to restore proper water flow and improve pumping performance.',
  169.00,
  249.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 169,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "repairs"
  }'::jsonb,
  '₹169 per unit',
  '{
    "about_text": "Professional removal of air locks from water pumps and motors to restore proper water flow and improve pumping performance.",
    "included_features": [
      "Inspection of water motor",
      "Air lock removal",
      "Motor priming (where applicable)",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Motor repair",
      "Motor replacement",
      "Electrical repairs",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "What is an air cavity (air lock)?", "answer": "It is trapped air inside the pump or pipeline that prevents normal water flow." },
      { "question": "Can this fix a motor that isn''t pumping water?", "answer": "If the issue is caused by an air lock, yes." },
      { "question": "Will the motor be tested after service?", "answer": "Yes. Water flow is checked before completion." }
    ],
    "why_choose_us": [
      { "icon": "flash_on", "title": "Air Lock Bleed", "desc": "Releasing air via pump casing bleeder bolts safely." },
      { "icon": "verified_user", "title": "Priming Checks", "desc": "Ensuring the foot valve retains water column correctly." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Check Suction", "desc": "Running motor briefly to detect dry spin sounds." },
      { "step": 2, "title": "Priming Sump", "desc": "Filling pump casing with priming water and bleeding air cavity." },
      { "step": 3, "title": "Pump Test", "desc": "Confirming water lift to roof tanks." }
    ]
  }'::jsonb,
  'motor-air-cavity-removal',
  '/assets/services/dusting_wiping.png'
),
-- 41. Motor Installation / Replacement
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d6'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d74'::uuid, -- Water Tank & Pump Services
  'Motor Installation / Replacement',
  'Professional installation or replacement of domestic water pump motors with proper plumbing, electrical connections, and performance testing.',
  449.00,
  699.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 449,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "motors"
  }'::jsonb,
  '₹449 per unit',
  '{
    "about_text": "Professional installation or replacement of domestic water pump motors with proper plumbing, electrical connections, and performance testing.",
    "included_features": [
      "Installation or replacement of one water motor",
      "Plumbing reconnection",
      "Basic electrical connection",
      "Functional testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Water motor",
      "Pipe modifications",
      "Electrical wiring",
      "Pump controller installation",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the motor included?", "answer": "No. Customers need to provide the motor." },
      { "question": "Can old motors be replaced with new ones?", "answer": "Yes. Existing motors can be removed and replaced." },
      { "question": "Will water pressure be checked after installation?", "answer": "Yes. The motor is tested for proper operation and water flow." }
    ],
    "why_choose_us": [
      { "icon": "power", "title": "Safe Electricals", "desc": "Insulated wiring connections checked against moisture contacts." },
      { "icon": "verified_user", "title": "Firm Base Fit", "desc": "Bolting the pump motor firmly to floor blocks to reduce vibration." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Base Setup", "desc": "Level positioning on foundation block." },
      { "step": 2, "title": "Plumb Union", "desc": "Connecting incoming and outgoing lines with union joints." },
      { "step": 3, "title": "Wiring & Prime", "desc": "Connecting electrical terminals, priming and test running." }
    ]
  }'::jsonb,
  'motor-installation-replacement',
  '/assets/services/dusting_wiping.png'
),
-- 42. Washing Machine Inlet Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d7'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d73'::uuid, -- Basin, Sink & Drain Services
  'Washing Machine Inlet Installation',
  'Professional installation of a washing machine water inlet connection for a secure, leak-free water supply. Suitable for both fully automatic and semi-automatic washing machines.',
  200.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 200,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "installations"
  }'::jsonb,
  '₹200 per unit',
  '{
    "about_text": "Professional installation of a washing machine water inlet connection for a secure, leak-free water supply. Suitable for both fully automatic and semi-automatic washing machines.",
    "included_features": [
      "Installation of one washing machine inlet connection",
      "Water inlet pipe connection",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Washing machine inlet hose",
      "Tap installation or replacement",
      "Plumbing modifications",
      "Electrical connections",
      "Material costs"
    ],
    "faqs": [
      { "question": "Is the inlet hose included in the service?", "answer": "No. Customers need to provide the inlet hose unless purchased separately." },
      { "question": "Can this service be used for all washing machine brands?", "answer": "Yes. We install inlet connections for most major washing machine brands." },
      { "question": "Will the connection be checked for leaks?", "answer": "Yes. The plumber tests all connections before completing the service." }
    ],
    "why_choose_us": [
      { "icon": "settings", "title": "Secure Adapter Mount", "desc": "Screwing multi fit tap adapters tight to prevent hose drops." },
      { "icon": "verified_user", "title": "Leak Proof Gaskets", "desc": "Verifying the washer seating inside washing machine inlet hose collar." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Fit adapter", "desc": "Clamping multi nozzle adapter onto washing machine tap." },
      { "step": 2, "title": "Link Hose", "desc": "Screwing inlet hose end to washing machine rear port." },
      { "step": 3, "title": "Flow run", "desc": "Checking leak-free flows." }
    ]
  }'::jsonb,
  'washing-machine-inlet-installation',
  '/assets/services/dusting_wiping.png'
),
-- 43. Connection Hose Installation
(
  'd186c52a-9bae-41e0-81f1-6be4409f00d8'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d71'::uuid, -- Tap & Mixer Services
  'Connection Hose Installation',
  'Professional installation of flexible connection hoses for taps, wash basins, water heaters, toilets, washing machines, and other plumbing fixtures to ensure secure and leak-free water connections.',
  139.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'quantity',
  '{
    "price_per_unit": 139,
    "min_qty": 1,
    "max_qty": 50,
    "unit_name": "hoses"
  }'::jsonb,
  '₹139 per unit',
  '{
    "about_text": "Professional installation of flexible connection hoses for taps, wash basins, water heaters, toilets, washing machines, and other plumbing fixtures to ensure secure and leak-free water connections.",
    "included_features": [
      "Installation of one flexible connection hose",
      "Secure plumbing connection",
      "Leak inspection",
      "Water flow testing",
      "Labour charges"
    ],
    "excluded_features": [
      "Flexible connection hose",
      "Tap or fixture replacement",
      "Plumbing modifications",
      "Spare parts",
      "Material costs"
    ],
    "faqs": [
      { "question": "What types of connection hoses can be installed?", "answer": "Flexible braided hoses for wash basins, taps, geysers, toilets, washing machines, and similar plumbing fixtures." },
      { "question": "Is the hose included in the price?", "answer": "No. Labour charges only." },
      { "question": "Will the connection be tested after installation?", "answer": "Yes. The plumber checks for proper water flow and ensures there are no leaks." }
    ],
    "why_choose_us": [
      { "icon": "plumbing", "title": "Braided Hose Setup", "desc": "Ensuring the flexible braided lines do not pinch or kink." },
      { "icon": "verified_user", "title": "Drip Free washer", "desc": "Aligning rubber washers to ensure a tight connection." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Connect Tap", "desc": "Screwing hose end onto the tap or geyser nipple." },
      { "step": 2, "title": "Connect Valve", "desc": "Screwing the other end onto the wall angle valve." },
      { "step": 3, "title": "Leak Test", "desc": "Opening angle valve to verify dry connections." }
    ]
  }'::jsonb,
  'connection-hose-installation',
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
