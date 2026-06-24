-- SQL Migration for Additional Cleaning Services
-- Name: 20260624000002_add_cleaning_services.sql

-- Insert 9 new cleaning services with complete page_content configurations into public.services
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
  image_url,
  price_breakdown,
  page_content
) VALUES 
(
  'd186c52a-9bae-41e0-81f1-6be4409f0001',
  '7f3a32c4-1a49-4885-a32b-98a9878daac6'::uuid, -- Water Tank Cleaning
  'Water Tank Cleaning',
  'Keep your water safe and hygienic with our professional water tank cleaning service. We remove sludge, dirt, algae, and contaminants to improve water quality and maintain a healthy environment.',
  399.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/bathroom_cleaning.png',
  'Starting at ₹399 per tank',
  '{
    "about_text": "Keep your water safe and hygienic with our professional water tank cleaning service. We remove sludge, dirt, algae, and contaminants to improve water quality and maintain a healthy environment.",
    "included_features": [
      "Tank inspection",
      "Sludge and dirt removal",
      "Internal scrubbing and cleaning",
      "Water drainage assistance",
      "Final hygiene check"
    ],
    "excluded_features": [
      "Tank repair work",
      "Plumbing repairs",
      "Motor repairs",
      "Water refilling charges",
      "Structural modifications"
    ],
    "faqs": [
      { "question": "How often should a water tank be cleaned?", "answer": "Every 6 months is recommended." },
      { "question": "Is chemical cleaning used?", "answer": "Safe cleaning methods are used based on tank condition." },
      { "question": "How long does cleaning take?", "answer": "Usually 1–3 hours." },
      { "question": "Do I need to empty the tank beforehand?", "answer": "Our team will guide you during booking." },
      { "question": "Is underground tank cleaning included?", "answer": "Yes, depending on accessibility." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Assessing the tank condition and checking water level." },
      { "step": 2, "title": "Cleaning", "desc": "Removing sludge, scrubbing walls, and disinfecting." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0002',
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care (Carpet Cleaning)
  'Carpet Cleaning',
  'Professional carpet cleaning that removes dust, stains, odors, and allergens while restoring freshness and appearance.',
  15.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/sweeping_mopping.png',
  '₹15 per sq. ft.',
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
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0003',
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care (Sofa Cleaning)
  'Sofa Cleaning',
  'Deep cleaning service for fabric and upholstered sofas to remove dirt, stains, bacteria, and unpleasant odors.',
  150.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/dusting_wiping.png',
  '₹150 per seat',
  '{
    "about_text": "Deep cleaning service for fabric and upholstered sofas to remove dirt, stains, bacteria, and unpleasant odors.",
    "included_features": [
      "Vacuum cleaning",
      "Foam/shampoo treatment",
      "Stain treatment (basic)",
      "Dust extraction",
      "Odor reduction"
    ],
    "excluded_features": [
      "Leather restoration",
      "Permanent stain guarantee",
      "Fabric repair",
      "Cushion replacement",
      "Color restoration"
    ],
    "faqs": [
      { "question": "How is sofa seating counted?", "answer": "Each seating position is considered one seat." },
      { "question": "How long does drying take?", "answer": "Usually 4–6 hours." },
      { "question": "Can old stains be removed?", "answer": "Depends on stain condition." },
      { "question": "Is cleaning safe for fabric sofas?", "answer": "Yes." },
      { "question": "How often should sofas be cleaned?", "answer": "Every 6 months is recommended." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Vacuuming", "desc": "Extracting loose dust and debris from sofa upholstery." },
      { "step": 2, "title": "Shampooing", "desc": "Applying active foam shampoo to dissolve dirt and extracting it." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0004',
  '89ae8ba2-9da2-45ac-9467-8c3a594d3830'::uuid, -- Full Home Deep Cleaning
  'Deep Cleaning',
  'Complete deep cleaning service for homes, apartments, offices, and commercial spaces covering hard-to-reach areas and accumulated dirt.',
  4.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/sweeping_mopping.png',
  '₹4 per sq. ft.',
  '{
    "about_text": "Complete deep cleaning service for homes, apartments, offices, and commercial spaces covering hard-to-reach areas and accumulated dirt.",
    "included_features": [
      "Floor deep cleaning",
      "Dusting of accessible surfaces",
      "Kitchen cleaning",
      "Bathroom cleaning",
      "Cobweb removal"
    ],
    "excluded_features": [
      "Painting work",
      "Pest control",
      "Exterior facade cleaning",
      "Waterproofing services",
      "Renovation work"
    ],
    "faqs": [
      { "question": "What is included in deep cleaning?", "answer": "A thorough cleaning of major living spaces." },
      { "question": "How long does it take?", "answer": "Depends on area size." },
      { "question": "Is kitchen cleaning included?", "answer": "Yes." },
      { "question": "Do I need to provide cleaning materials?", "answer": "No." },
      { "question": "Is same-day booking available?", "answer": "Subject to availability." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Assessing client needs and outlining deep cleaning checkpoints." },
      { "step": 2, "title": "Intense Cleaning", "desc": "Scrubbing floors, detailing kitchen/bathrooms, dusting, and wiping." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0005',
  '8f9c2dee-9bae-41e0-81f1-6be4409fb218'::uuid, -- Kitchen Cleaning (Chimney Cleaning)
  'Chimney Cleaning',
  'Remove grease, oil deposits, smoke residue, and blockages from your kitchen chimney for better performance and hygiene.',
  499.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/kitchen_cleaning.png',
  '₹499 per chimney',
  '{
    "about_text": "Remove grease, oil deposits, smoke residue, and blockages from your kitchen chimney for better performance and hygiene.",
    "included_features": [
      "Filter cleaning",
      "Oil and grease removal",
      "Exterior cleaning",
      "Basic suction check",
      "Internal accessible cleaning"
    ],
    "excluded_features": [
      "Motor replacement",
      "Electrical repairs",
      "Spare parts replacement",
      "PCB repair",
      "Chimney installation"
    ],
    "faqs": [
      { "question": "How often should a chimney be cleaned?", "answer": "Every 3–6 months." },
      { "question": "Is filter cleaning included?", "answer": "Yes." },
      { "question": "Will suction improve after cleaning?", "answer": "In most cases, yes." },
      { "question": "Do you repair chimneys?", "answer": "Repair services are separate." },
      { "question": "How long does cleaning take?", "answer": "45–90 minutes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Dismantling", "desc": "Carefully removing chimney filters and parts for washing." },
      { "step": 2, "title": "Degreasing", "desc": "Scrubbing grease and carbon deposits with professional degreaser." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0006',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning (Office Cleaning)
  'Office Cleaning',
  'Comprehensive office cleaning service designed to maintain a clean, healthy, and professional workplace.',
  4.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/dusting_wiping.png',
  '₹4 per sq. ft.',
  '{
    "about_text": "Comprehensive office cleaning service designed to maintain a clean, healthy, and professional workplace.",
    "included_features": [
      "Floor cleaning",
      "Desk dusting",
      "Common area cleaning",
      "Washroom cleaning",
      "Cobweb removal"
    ],
    "excluded_features": [
      "IT equipment cleaning",
      "Data center cleaning",
      "Pest control",
      "Exterior glass cleaning",
      "Industrial cleaning"
    ],
    "faqs": [
      { "question": "Can cleaning be done after office hours?", "answer": "Yes." },
      { "question": "Do you clean large offices?", "answer": "Yes." },
      { "question": "Are cleaning chemicals provided?", "answer": "Yes." },
      { "question": "Is restroom cleaning included?", "answer": "Yes." },
      { "question": "Do you offer recurring contracts?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Tidying", "desc": "Organizing spaces and dusting desks and keyboards." },
      { "step": 2, "title": "Sanitization", "desc": "Deep cleaning office restrooms and common pantries." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0007',
  '75d160e8-4791-4f0a-8c88-779647d346e3'::uuid, -- General Cleaning (Home Cleaning)
  'Home Cleaning',
  'Complete cleaning service for apartments, villas, and independent houses to maintain a spotless and hygienic living space.',
  4.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/sweeping_mopping.png',
  '₹4 per sq. ft.',
  '{
    "about_text": "Complete cleaning service for apartments, villas, and independent houses to maintain a spotless and hygienic living space.",
    "included_features": [
      "Floor cleaning",
      "Dusting",
      "Kitchen cleaning",
      "Bathroom cleaning",
      "Cobweb removal"
    ],
    "excluded_features": [
      "Pest control",
      "Painting work",
      "Waterproofing work",
      "Appliance repair",
      "Renovation services"
    ],
    "faqs": [
      { "question": "What areas are covered?", "answer": "Living rooms, bedrooms, kitchen, and bathrooms." },
      { "question": "Are cleaning supplies included?", "answer": "Yes." },
      { "question": "How long does cleaning take?", "answer": "Depends on property size." },
      { "question": "Is balcony cleaning included?", "answer": "Yes, if accessible." },
      { "question": "Do you offer move-in cleaning?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Preparation", "desc": "Initial setup, dusting corners and removing cobwebs." },
      { "step": 2, "title": "Full Mop & Wash", "desc": "Cleaning kitchens, bathrooms, and mopping floors." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0008',
  'fafe1e8f-82c7-4646-b056-587c3eba013f'::uuid, -- Sofa & Upholstery Care (Chair Cleaning)
  'Chair Cleaning',
  'Professional cleaning service for office chairs, dining chairs, and upholstered seating.',
  30.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/dusting_wiping.png',
  '₹30 per chair',
  '{
    "about_text": "Professional cleaning service for office chairs, dining chairs, and upholstered seating.",
    "included_features": [
      "Dust removal",
      "Fabric cleaning",
      "Stain treatment (basic)",
      "Odor reduction",
      "Surface sanitization"
    ],
    "excluded_features": [
      "Chair repair",
      "Cushion replacement",
      "Leather restoration",
      "Structural welding work",
      "Color restoration"
    ],
    "faqs": [
      { "question": "Is office chair cleaning available?", "answer": "Yes." },
      { "question": "Are fabric chairs supported?", "answer": "Yes." },
      { "question": "Can stains be removed completely?", "answer": "Depends on stain type." },
      { "question": "Is drying required?", "answer": "Yes, a few hours may be needed." },
      { "question": "Do you clean dining chairs?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Pre-treatment", "desc": "Dust removal and basic stain targeting." },
      { "step": 2, "title": "Fabric Shampooing", "desc": "Applying upholstery shampoo to scrub and extract dirt." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0009',
  '6aa375c5-4a88-4427-9ee9-815aa2164b40'::uuid, -- Vehicle Wash & Detailing (Car Cleaning)
  'Car Cleaning',
  'Quick and affordable car cleaning service to keep your vehicle looking clean, fresh, and presentable.',
  99.00,
  null,
  true,
  'Cleaning & Housekeeping',
  'fixed',
  '/assets/services/car_cleaning.png',
  '₹99 per car',
  '{
    "about_text": "Quick and affordable car cleaning service to keep your vehicle looking clean, fresh, and presentable.",
    "included_features": [
      "Exterior wash",
      "Basic interior cleaning",
      "Dashboard wiping",
      "Glass cleaning",
      "Tyre cleaning"
    ],
    "excluded_features": [
      "Car polishing",
      "Ceramic coating",
      "Engine cleaning",
      "Denting and painting",
      "Interior detailing"
    ],
    "faqs": [
      { "question": "Does the service include vacuum cleaning?", "answer": "Basic interior cleaning is included." },
      { "question": "Is doorstep service available?", "answer": "Yes, subject to location." },
      { "question": "How long does cleaning take?", "answer": "Approximately 30–45 minutes." },
      { "question": "Are cleaning materials included?", "answer": "Yes." },
      { "question": "Is water required at the location?", "answer": "Depending on the cleaning method selected." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Exterior Wash", "desc": "Rinsing and shampooing the car body, cleaning tyres." },
      { "step": 2, "title": "Interior Wipe", "desc": "Wiping dashboard, consoles, and window glass from inside." }
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
  price_breakdown = EXCLUDED.price_breakdown,
  page_content = EXCLUDED.page_content;
