-- SQL Migration to add New Home Repairs and Grooming Services
-- Name: 20260629000000_add_new_home_and_salon_services.sql

-- 1. Seed New Category: Grooming & Wellness
INSERT INTO public.categories (id, category_name)
VALUES ('8fa6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid, 'Grooming & Wellness')
ON CONFLICT (id) DO UPDATE SET category_name = EXCLUDED.category_name;

-- 2. Seed New Subcategory: Men's Salon & Massage
INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
VALUES ('2cb6a6b5-0c7f-4b95-a204-0987c6543230'::uuid, 'Men''s Salon & Massage', 'content_cut', '8fa6c71c-30ad-4ef7-8c35-1d096a605f6e'::uuid)
ON CONFLICT (id) DO UPDATE SET 
  subcategory_name = EXCLUDED.subcategory_name, 
  icon_name = EXCLUDED.icon_name, 
  category_id = EXCLUDED.category_id;

-- 3. Seed Services
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
  'd186c52a-9bae-41e0-81f1-6be4409f0011'::uuid,
  '55700483-dbce-43f9-96ec-37960ccfbf39'::uuid, -- Wall Painting & Texturing
  'Painter Service',
  'Give your home or office a fresh new look with our professional painting services. Our experienced painters deliver smooth finishes using high-quality tools and materials for interior and exterior spaces.',
  99.00,
  199.00,
  true,
  'Renovation, Logistics & Events',
  'fixed',
  '/assets/services/sweeping_mopping.png',
  'Inspection Charge: ₹99 | Final quotation provided after site visit based on area, paint type, and labor.',
  '{
    "about_text": "Give your home or office a fresh new look with our professional painting services. Our experienced painters deliver smooth finishes using high-quality tools and materials for interior and exterior spaces.",
    "included_features": [
      "Site inspection and quotation",
      "Interior & exterior painting",
      "Wall putty and primer (if selected)",
      "Surface preparation",
      "Professional workmanship"
    ],
    "excluded_features": [
      "Paint material (unless included in package)",
      "Major wall repairs",
      "Waterproofing work",
      "Furniture shifting",
      "Electrical or plumbing work"
    ],
    "faqs": [
      { "question": "Do you provide paint?", "answer": "Available as per selected package." },
      { "question": "How is pricing calculated?", "answer": "Based on wall area, paint quality, and labor." },
      { "question": "Do you paint offices?", "answer": "Yes." },
      { "question": "Is waterproofing included?", "answer": "No, it''s a separate service." },
      { "question": "Do you offer texture painting?", "answer": "Yes, on request." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Painters", "desc": "Professional and background-checked painters." },
      { "icon": "palette", "title": "Quality Finish", "desc": "Smooth finishes with high-quality paint application tools." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Book Site Visit", "desc": "Schedule an inspection for precise area measurements." },
      { "step": 2, "title": "Get Quote & Paint", "desc": "Choose your paint brand and color to begin work." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0012'::uuid,
  '868f0644-cccc-479b-a8a5-2bb93b69d206'::uuid, -- Carpentry Services
  'Carpenter Service',
  'From furniture repairs to custom woodwork, our skilled carpenters provide reliable solutions for homes and offices.',
  99.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '/assets/services/dusting_wiping.png',
  'Inspection Charge: ₹99 | Final price depends on work scope.',
  '{
    "about_text": "From furniture repairs to custom woodwork, our skilled carpenters provide reliable solutions for homes and offices.",
    "included_features": [
      "Furniture repair",
      "Door and window repair",
      "Cabinet installation",
      "Shelving installation",
      "Basic woodwork"
    ],
    "excluded_features": [
      "Material cost (unless specified)",
      "Custom furniture manufacturing",
      "Glass work",
      "Electrical work",
      "Painting and polishing"
    ],
    "faqs": [
      { "question": "Can you repair old furniture?", "answer": "Yes." },
      { "question": "Do you install modular furniture?", "answer": "Yes." },
      { "question": "Is material included?", "answer": "Depends on the selected service." },
      { "question": "Do you make custom furniture?", "answer": "Available on request." },
      { "question": "Is polishing included?", "answer": "No, unless selected." }
    ],
    "why_choose_us": [
      { "icon": "handyman", "title": "Skilled Carpenters", "desc": "Highly experienced carpenters with precision tools." },
      { "icon": "build", "title": "Custom Woodwork", "desc": "Custom furniture modifications and repairs." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Select Problem", "desc": "Describe the repair or woodwork needed." },
      { "step": 2, "title": "Inspection & Fix", "desc": "The carpenter inspects and completes the repairs." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0013'::uuid,
  '5174492f-4edd-4e2e-99ff-d7b2d2a1cdd2'::uuid, -- Electrical Services
  'Electrician Service',
  'Professional electrical services for installation, repair, maintenance, and troubleshooting of residential and commercial electrical systems.',
  99.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '/assets/services/fan_cleaning.png',
  'Inspection Charge: ₹99 | Charges depend on the nature of work.',
  '{
    "about_text": "Professional electrical services for installation, repair, maintenance, and troubleshooting of residential and commercial electrical systems.",
    "included_features": [
      "Switch and socket repair",
      "Fan installation",
      "Light installation",
      "Wiring inspection",
      "Minor electrical repairs"
    ],
    "excluded_features": [
      "Major rewiring projects",
      "Electrical materials",
      "Generator installation",
      "Government electrical approvals",
      "Smart home automation setup"
    ],
    "faqs": [
      { "question": "Is emergency service available?", "answer": "Yes, subject to availability." },
      { "question": "Do you install ceiling fans?", "answer": "Yes." },
      { "question": "Are spare parts included?", "answer": "No." },
      { "question": "Can you fix power issues?", "answer": "Yes." },
      { "question": "Do you service commercial properties?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "bolt", "title": "Safety First", "desc": "Strict safety protocols followed during electrical repairs." },
      { "icon": "verified_user", "title": "Certified Electricians", "desc": "Background-checked and certified technicians." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Select Service", "desc": "Choose the electrical installations or issues." },
      { "step": 2, "title": "Professional Repair", "desc": "Certified electrician resolves your power/appliance issues." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0014'::uuid,
  'b43f26e5-4dc8-4640-860a-9e214f826d57'::uuid, -- Plumbing Services
  'Plumber Service',
  'Fast and reliable plumbing solutions for homes and offices, including leak repairs, installations, and maintenance.',
  99.00,
  199.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '/assets/services/bathroom_cleaning.png',
  'Inspection Charge: ₹99 | Final charges depend on the repair or installation.',
  '{
    "about_text": "Fast and reliable plumbing solutions for homes and offices, including leak repairs, installations, and maintenance.",
    "included_features": [
      "Tap repair",
      "Pipe leak repair",
      "Basin installation",
      "Toilet repair",
      "Water connection inspection"
    ],
    "excluded_features": [
      "Plumbing materials",
      "Civil work",
      "Water tank construction",
      "Drain excavation",
      "Bathroom renovation"
    ],
    "faqs": [
      { "question": "Do you fix leaking pipes?", "answer": "Yes." },
      { "question": "Can you install new taps?", "answer": "Yes." },
      { "question": "Is material included?", "answer": "No." },
      { "question": "Do you repair water heaters?", "answer": "Basic plumbing connections only." },
      { "question": "Is emergency plumbing available?", "answer": "Yes, subject to availability." }
    ],
    "why_choose_us": [
      { "icon": "water_damage", "title": "Quick Fixes", "desc": "Fast leak detection and pipe repairs to prevent damage." },
      { "icon": "build", "title": "Complete Installs", "desc": "Professional fitting of basins, taps, and toilets." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Describe Issue", "desc": "Specify leak location or installation requirement." },
      { "step": 2, "title": "Leaking Resolved", "desc": "The plumber inspects and resolves the issues quickly." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0015'::uuid,
  '547466e2-11ff-4f3d-ad9a-2695abd64d9d'::uuid, -- AC & Appliance Repair
  'AC Service & Repair',
  'Keep your air conditioner running efficiently with professional servicing, cleaning, gas charging, and repair services.',
  199.00,
  299.00,
  true,
  'Home Repairs & Maintenance',
  'fixed',
  '/assets/hero_ac_repair_1773410812102.png',
  'AC Inspection: ₹199 | General Service: ₹499 | Jet Deep Cleaning: ₹699 | Gas Refill / Repair: Quote After Inspection.',
  '{
    "about_text": "Keep your air conditioner running efficiently with professional servicing, cleaning, gas charging, and repair services.",
    "included_features": [
      "Filter cleaning",
      "Indoor unit cleaning",
      "Outdoor unit cleaning",
      "Performance inspection",
      "Basic maintenance"
    ],
    "excluded_features": [
      "Spare parts",
      "Gas refill charges",
      "PCB replacement",
      "Compressor replacement",
      "Major electrical repairs"
    ],
    "faqs": [
      { "question": "How often should AC be serviced?", "answer": "Every 6 months." },
      { "question": "Is gas refilling included?", "answer": "No." },
      { "question": "How long does servicing take?", "answer": "45–90 minutes." },
      { "question": "Do you repair all brands?", "answer": "Yes." },
      { "question": "Is warranty provided?", "answer": "On selected repair services." }
    ],
    "why_choose_us": [
      { "icon": "ac_unit", "title": "Expert Servicing", "desc": "Jet cleaning and performance checks for peak efficiency." },
      { "icon": "thermostat", "title": "Cooling Optimized", "desc": "Quick troubleshooting of compressor and gas issues." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Select Package", "desc": "Choose between general service, jet cleaning, or inspection." },
      { "step": 2, "title": "Hassle-Free Service", "desc": "Technician completes servicing or diagnoses repairs." }
    ]
  }'::jsonb
),
(
  'd186c52a-9bae-41e0-81f1-6be4409f0016'::uuid,
  '2cb6a6b5-0c7f-4b95-a204-0987c6543230'::uuid, -- Men's Salon & Massage
  'Men''s Salon & Massage',
  'Enjoy professional grooming and wellness services at your doorstep. Our trained male professionals provide hygienic salon and relaxation services in the comfort of your home.',
  199.00,
  299.00,
  true,
  'Grooming & Wellness',
  'fixed',
  '/assets/services/wardrobe_cleaning.png',
  'Haircut: ₹199 | Beard: ₹149 | Body Massage (60m): ₹999 | Body Massage (90m): ₹1399',
  '{
    "about_text": "Enjoy professional grooming and wellness services at your doorstep. Our trained male professionals provide hygienic salon and relaxation services in the comfort of your home. All grooming and massage services are strictly professional. Any inappropriate behavior, requests for intimate services, harassment, or misconduct will result in immediate termination of the service without refund, and the customer may be permanently blocked from using the platform.",
    "included_features": [
      "Professional male service provider",
      "Hygienic tools and equipment",
      "Disposable consumables where applicable",
      "Home service convenience",
      "Appointment-based service"
    ],
    "excluded_features": [
      "Medical or physiotherapy massage",
      "Sexual or intimate services",
      "Services for intoxicated customers",
      "Cosmetic surgery procedures",
      "Products not included in selected package"
    ],
    "faqs": [
      { "question": "Are professionals verified?", "answer": "Yes." },
      { "question": "Do I need to provide equipment?", "answer": "No." },
      { "question": "Is home service available?", "answer": "Yes." },
      { "question": "Are massage oils included?", "answer": "Yes, basic massage oils are included." },
      { "question": "Are any inappropriate services provided?", "answer": "No. We strictly offer professional grooming and wellness services only." }
    ],
    "why_choose_us": [
      { "icon": "content_cut", "title": "Professional Grooming", "desc": "Male grooming specialists delivering neat and clean results." },
      { "icon": "spa", "title": "Strict Professionalism", "desc": "100% professional and safe relaxation services at home." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Choose Service", "desc": "Select hair cutting, shaving, body massage, or packages." },
      { "step": 2, "title": "Groom at Home", "desc": "Stylist arrives at your home with clean disposables and equipment." }
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
