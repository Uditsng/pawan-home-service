-- SQL Migration for Pest Control Services
-- Name: 20260624000001_add_pest_control_services.sql

-- Insert 11 Pest Control Services with complete page_content configurations into public.services
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
  '3a42ab12-612b-426b-87ea-31be29fb3e01',
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, -- General Pest Management
  'General Pest Control',
  'Protect your home and workplace from common pests with our professional General Pest Control Service. We use safe and effective treatments to eliminate crawling and flying insects while helping prevent future infestations.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/general_pest_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Protect your home and workplace from common pests with our professional General Pest Control Service. We use safe and effective treatments to eliminate crawling and flying insects while helping prevent future infestations.",
    "included_features": [
      "Complete property inspection",
      "Treatment for common household pests",
      "Indoor and outdoor spraying (where applicable)",
      "Professional pest control chemicals",
      "Basic prevention recommendations"
    ],
    "excluded_features": [
      "Severe termite infestations",
      "Structural repairs due to pest damage",
      "Multiple revisit treatments unless specified",
      "Cleaning after treatment",
      "Furniture dismantling"
    ],
    "faqs": [
      { "question": "How long does the treatment take?", "answer": "Usually 30–90 minutes depending on property size." },
      { "question": "Is it safe for children and pets?", "answer": "Yes, when used according to safety guidelines." },
      { "question": "How often should pest control be done?", "answer": "Every 3–6 months for best protection." },
      { "question": "Will all pests disappear immediately?", "answer": "Most pests reduce within 24–72 hours." },
      { "question": "Do I need to leave the house?", "answer": "Only in specific treatment situations advised by technicians." },
      { "question": "Is there any warranty?", "answer": "Warranty depends on the pest type and treatment selected." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Complete property inspection to detect pest activity." },
      { "step": 2, "title": "Treatment", "desc": "Application of safe and professional pest control chemicals." },
      { "step": 3, "title": "Guidance", "desc": "Providing core recommendations to prevent future infestations." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e02',
  '860d493a-51ff-45bc-bbd7-8132d4a081ac'::uuid, -- Termite Protection
  'Termite Treatment',
  'Professional anti-termite treatment designed to eliminate active termite colonies and protect your property from future termite attacks.',
  4.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/termite_treatment.png',
  'Rate: ₹4 per sq. ft. | 2 Years Warranty',
  '{
    "about_text": "Professional anti-termite treatment designed to eliminate active termite colonies and protect your property from future termite attacks.",
    "included_features": [
      "Detailed termite inspection",
      "Drilling and chemical injection where required",
      "Soil and wall treatment",
      "Professional anti-termite chemicals",
      "2-Year Service Warranty"
    ],
    "excluded_features": [
      "Repair of damaged woodwork",
      "Civil work restoration",
      "Waterproofing services",
      "Hidden structural modifications",
      "Areas inaccessible during treatment"
    ],
    "faqs": [
      { "question": "How long does termite treatment last?", "answer": "Up to 2 years under normal conditions." },
      { "question": "Can termites return?", "answer": "Proper treatment significantly reduces recurrence." },
      { "question": "Is drilling necessary?", "answer": "In many cases, yes, for effective treatment." },
      { "question": "How soon will termites die?", "answer": "Typically within a few days to weeks." },
      { "question": "Is it safe for homes?", "answer": "Yes, professional-grade chemicals are used safely." },
      { "question": "Is warranty provided?", "answer": "Yes, 2 years warranty." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Detailed Inspection", "desc": "Carefully inspecting the property to locate active colonies." },
      { "step": 2, "title": "Drilling & Injection", "desc": "Drilling and injecting termiticides into wood and walls where needed." },
      { "step": 3, "title": "Barrier Setup", "desc": "Creating a chemical barrier to prevent future termite intrusion." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e03',
  '88549b54-7d83-4bfa-8829-5377962e6b8f'::uuid, -- Bed Bug Extermination
  'Bed Bug Control',
  'Eliminate bed bugs hiding in beds, mattresses, furniture, and cracks with targeted professional treatment.',
  3.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/bed_bug_control.png',
  'Rate: ₹3 per sq. ft.',
  '{
    "about_text": "Eliminate bed bugs hiding in beds, mattresses, furniture, and cracks with targeted professional treatment.",
    "included_features": [
      "Bed bug inspection",
      "Mattress and furniture treatment",
      "Crack and crevice treatment",
      "Professional chemicals",
      "Infestation control guidance"
    ],
    "excluded_features": [
      "Mattress replacement",
      "Furniture repair",
      "Laundry services",
      "Deep cleaning services",
      "Structural modifications"
    ],
    "faqs": [
      { "question": "Are bed bugs visible?", "answer": "Yes, but they often hide in cracks and furniture." },
      { "question": "How many treatments are required?", "answer": "Depends on infestation severity." },
      { "question": "Can I sleep on my bed after treatment?", "answer": "Yes, after the recommended waiting period." },
      { "question": "Will eggs also be eliminated?", "answer": "Treatment targets both bugs and breeding areas." },
      { "question": "Are chemicals safe?", "answer": "Yes, when applied professionally." },
      { "question": "How can I prevent re-infestation?", "answer": "Maintain cleanliness and inspect luggage/furniture regularly." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Detailed check of beds, sheets, mattresses, and furniture." },
      { "step": 2, "title": "Targeted Treatment", "desc": "Spraying specific anti-bedbug chemicals directly on target areas." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e04',
  '08d11104-30f5-4cd6-a4a2-798c73088bd8'::uuid, -- Mosquito, Rodent & Crawling Insect Control
  'Mosquito Control',
  'Reduce mosquito populations around your property and create a safer environment for your family.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/mosquito_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Reduce mosquito populations around your property and create a safer environment for your family.",
    "included_features": [
      "Mosquito breeding area inspection",
      "Fogging/spraying treatment",
      "Outdoor treatment coverage",
      "Larvae control recommendations",
      "Professional pest control chemicals"
    ],
    "excluded_features": [
      "Municipal drainage treatment",
      "Permanent water body treatment",
      "Structural modifications",
      "Landscaping services",
      "Continuous monitoring"
    ],
    "faqs": [
      { "question": "How long does treatment remain effective?", "answer": "Several weeks depending on conditions." },
      { "question": "Does it remove all mosquitoes?", "answer": "It significantly reduces mosquito populations." },
      { "question": "Is fogging included?", "answer": "Where applicable." },
      { "question": "Is treatment safe?", "answer": "Yes, when safety instructions are followed." },
      { "question": "How often is treatment needed?", "answer": "Monthly or seasonal treatments are recommended." },
      { "question": "Can mosquitoes return?", "answer": "Yes, if breeding sources remain nearby." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Zone Mapping", "desc": "Locating mosquito breeding areas and adult resting zones." },
      { "step": 2, "title": "Fogging/Spraying", "desc": "Performing fogging and spraying to eliminate active populations." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e05',
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, -- General Pest Management
  'Pigeon Net Installation',
  'Protect balconies, windows, and open areas from pigeons with durable, high-quality bird netting.',
  15.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/pigeon_net_installation.png',
  'Rate: ₹15 per sq. ft.',
  '{
    "about_text": "Protect balconies, windows, and open areas from pigeons with durable, high-quality bird netting.",
    "included_features": [
      "Site inspection",
      "Premium pigeon net installation",
      "Professional fitting",
      "Durable UV-resistant net",
      "Installation support"
    ],
    "excluded_features": [
      "Civil modifications",
      "Iron framework fabrication",
      "Glass work",
      "Maintenance visits",
      "Damage due to misuse"
    ],
    "faqs": [
      { "question": "Is the net visible from outside?", "answer": "Minimal visibility with transparent options." },
      { "question": "Will pigeons be harmed?", "answer": "No, the system is bird-friendly." },
      { "question": "How long does the net last?", "answer": "Several years with proper care." },
      { "question": "Can it be installed on balconies?", "answer": "Yes." },
      { "question": "Is maintenance required?", "answer": "Minimal maintenance is needed." },
      { "question": "Is installation included?", "answer": "Yes, installation is included." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Area Inspection", "desc": "Inspecting balconies or windows to define measurements." },
      { "step": 2, "title": "Secure Installation", "desc": "Installing strong UV-resistant net with professional hooks." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e06',
  '860d493a-51ff-45bc-bbd7-8132d4a081ac'::uuid, -- Termite Protection
  'Pre-Construction Anti-Termite Treatment',
  'Long-term termite protection for new construction projects before flooring and foundation work are completed.',
  10.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/pre_construction_anti_termite.png',
  'Rate: ₹10 per sq. ft. | 10 Years Warranty',
  '{
    "about_text": "Long-term termite protection for new construction projects before flooring and foundation work are completed.",
    "included_features": [
      "Foundation soil treatment",
      "Pre-construction anti-termite barrier",
      "Professional chemicals",
      "Complete site coverage",
      "10-Year Warranty"
    ],
    "excluded_features": [
      "Post-construction treatment areas",
      "Civil repairs",
      "Waterproofing work",
      "Structural modifications",
      "Excavation work"
    ],
    "faqs": [
      { "question": "Why is pre-construction treatment important?", "answer": "It prevents termite infestation before construction is completed." },
      { "question": "Is it better than post-construction treatment?", "answer": "Yes, it provides stronger long-term protection." },
      { "question": "How long is the warranty?", "answer": "10 years." },
      { "question": "When should treatment be done?", "answer": "Before flooring and foundation completion." },
      { "question": "Is the chemical safe?", "answer": "Yes, when professionally applied." },
      { "question": "Is it mandatory for new buildings?", "answer": "Highly recommended for long-term protection." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Soil Treatment", "desc": "Applying termiticides to the foundation and sub-soil area." },
      { "step": 2, "title": "Chemical Barrier", "desc": "Establishing a continuous barrier prior to concrete slab laying." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e07',
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, -- General Pest Management
  'Cockroach Pest Control',
  'Professional cockroach control using gel baits and sprays to eliminate cockroaches from kitchens and rooms.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/cockroach_pest_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Professional cockroach control using gel baits and sprays to eliminate cockroaches from kitchens and rooms.",
    "included_features": [
      "Kitchen treatment",
      "Bathroom treatment",
      "Crack and crevice treatment",
      "Professional gel/spray application",
      "Prevention guidance"
    ],
    "excluded_features": [
      "Deep cleaning services",
      "Structural repairs",
      "Food storage management",
      "Plumbing repairs",
      "Re-infestation due to poor hygiene"
    ],
    "faqs": [
      { "question": "How long does treatment work?", "answer": "3–6 months." },
      { "question": "Is it safe?", "answer": "Yes." },
      { "question": "Can cockroaches return?", "answer": "Possible if hygiene is poor." },
      { "question": "Do I need to empty cabinets?", "answer": "Sometimes." },
      { "question": "How soon are results visible?", "answer": "Within days." },
      { "question": "Is kitchen treatment included?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Gel Application", "desc": "Applying advanced odorless gels in cabinetry, hinges, and cracks." },
      { "step": 2, "title": "Drain Spraying", "desc": "Spraying specialized chemicals in bathrooms, drains, and service areas." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e08',
  '08d11104-30f5-4cd6-a4a2-798c73088bd8'::uuid, -- Mosquito, Rodent & Crawling Insect Control
  'Fly Control',
  'Effective indoor and outdoor fly control spraying to eliminate flies and prevent breeding.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/fly_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Effective indoor and outdoor fly control spraying to eliminate flies and prevent breeding.",
    "included_features": [
      "Fly control treatment",
      "Entry point inspection",
      "Indoor spraying",
      "Outdoor treatment where applicable",
      "Prevention recommendations"
    ],
    "excluded_features": [
      "Garbage disposal services",
      "Drain cleaning",
      "Structural repairs",
      "Commercial food compliance work",
      "Landscaping"
    ],
    "faqs": [
      { "question": "How quickly does it work?", "answer": "Within 24–48 hours." },
      { "question": "Is it safe?", "answer": "Yes." },
      { "question": "Do flies return?", "answer": "If breeding sources remain." },
      { "question": "Can outdoor areas be treated?", "answer": "Yes." },
      { "question": "How often should treatment be repeated?", "answer": "As required." },
      { "question": "Does it eliminate breeding sites?", "answer": "It helps reduce them." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Site Inspection", "desc": "Identifying main breeding zones and entry points." },
      { "step": 2, "title": "Active Treatment", "desc": "Applying professional fly control spray in target zones." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e09',
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, -- General Pest Management
  'Ant Pest Control',
  'Targeted ant control to destroy ant nests and establish protective barriers against common household ants.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/ant_pest_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Targeted ant control to destroy ant nests and establish protective barriers against common household ants.",
    "included_features": [
      "Ant nest treatment",
      "Indoor treatment",
      "Outdoor treatment",
      "Professional chemicals",
      "Prevention guidance"
    ],
    "excluded_features": [
      "Structural repairs",
      "Garden redesign",
      "Tree treatment",
      "Deep cleaning services",
      "Permanent prevention guarantees"
    ],
    "faqs": [
      { "question": "How long does treatment take?", "answer": "30–60 minutes." },
      { "question": "Are chemicals safe?", "answer": "Yes." },
      { "question": "Will the colony be removed?", "answer": "Treatment targets colonies." },
      { "question": "Can ants return?", "answer": "Possible over time." },
      { "question": "Do I need multiple treatments?", "answer": "Severe cases may require it." },
      { "question": "Is outdoor treatment included?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Nest Location", "desc": "Finding ant trails and nest entrances." },
      { "step": 2, "title": "Baiting & Spraying", "desc": "Applying gel baits and defensive barriers." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e10',
  '4e0afde3-bb07-4a5b-bced-0fbac38d91d2'::uuid, -- General Pest Management
  'Spider Pest Control',
  'Web removal and spider control treatment to keep ceilings and corners spider-free.',
  1.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/spider_pest_control.png',
  'Rate: ₹1 per sq. ft.',
  '{
    "about_text": "Web removal and spider control treatment to keep ceilings and corners spider-free.",
    "included_features": [
      "Spider web removal treatment",
      "Corner and ceiling treatment",
      "Indoor spraying",
      "Entry point inspection",
      "Prevention advice"
    ],
    "excluded_features": [
      "Painting services",
      "Structural repairs",
      "Deep cleaning services",
      "Outdoor landscaping",
      "Pest-proof construction work"
    ],
    "faqs": [
      { "question": "Will spider webs disappear immediately?", "answer": "Yes." },
      { "question": "Are spiders dangerous?", "answer": "Most household spiders are harmless." },
      { "question": "How long does treatment last?", "answer": "Several months." },
      { "question": "Is treatment safe?", "answer": "Yes." },
      { "question": "Can spiders return?", "answer": "Over time, yes." },
      { "question": "Do you treat ceilings?", "answer": "Yes." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Web Clearing", "desc": "Clearing all active spider webs from walls and ceilings." },
      { "step": 2, "title": "Spraying", "desc": "Applying specialized defensive sprays in wall corners." }
    ]
  }'::jsonb
),
(
  '3a42ab12-612b-426b-87ea-31be29fb3e11',
  '08d11104-30f5-4cd6-a4a2-798c73088bd8'::uuid, -- Mosquito, Rodent & Crawling Insect Control
  'Lizard Pest Control',
  'Professional lizard control service to reduce lizard activity and improve hygiene and comfort in your home.',
  2.00,
  null,
  true,
  'Pest Control Services',
  'fixed',
  '/assets/services/lizard_pest_control.png',
  'Rate: ₹2 per sq. ft.',
  '{
    "about_text": "Professional lizard control service to reduce lizard activity and improve hygiene and comfort in your home.",
    "included_features": [
      "Lizard activity inspection",
      "Entry point identification",
      "Safe repellent treatment",
      "Wall and corner treatment",
      "Prevention recommendations"
    ],
    "excluded_features": [
      "Structural repairs",
      "Wall sealing work",
      "Pest-proof renovation work",
      "Electrical modifications",
      "Deep cleaning services"
    ],
    "faqs": [
      { "question": "Will all lizards disappear immediately?", "answer": "Activity reduces significantly after treatment." },
      { "question": "Is treatment safe for families?", "answer": "Yes, when guidelines are followed." },
      { "question": "How long does protection last?", "answer": "Several months depending on conditions." },
      { "question": "Why do lizards enter homes?", "answer": "Usually due to insects and entry gaps." },
      { "question": "Can lizards return?", "answer": "Possible if food sources remain." },
      { "question": "Do you seal wall gaps?", "answer": "No, structural repairs are excluded." }
    ],
    "why_choose_us": [
      { "icon": "verified_user", "title": "Verified Professionals", "desc": "Background-checked and certified home experts." },
      { "icon": "timer", "title": "On-Time Service", "desc": "We respect your schedule and arrive exactly on time." }
    ],
    "how_to_book_steps": [
      { "step": 1, "title": "Inspection", "desc": "Inspecting corners, window sills, and entry points." },
      { "step": 2, "title": "Repellent Spraying", "desc": "Applying safe lizard repellent sprays to target regions." }
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
