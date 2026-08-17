/**
 * ServiceIcon — Central resolver for subcategory icons.
 * Loads optimized SVG files locally from /public/icons.
 * No CDN, no internet required.
 */

import Image from "next/image";
import type { HTMLAttributes } from "react";

// Normalize database icon_name to clean local SVG filename
function normalizeIconName(name: string): string {
  if (!name) return "cleaning_services";
  
  const clean = name.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // Database / Legacy / Material Symbols
    water_drop: "water_drop",
    local_shipping: "local_shipping",
    celebration: "celebration",
    bed: "bed",
    pest_control: "pest_control",
    potted_plant: "potted_plant",
    directions_car: "directions_car",
    countertops: "countertops",
    ac_unit: "ac_unit",
    bathroom: "bathroom",
    format_paint: "format_paint",
    pest_control_rodent: "pest_control_rodent",
    plumbing: "plumbing",
    electrical_services: "electrical_services",
    cleaning_services: "cleaning_services",
    construction: "construction",
    water_damage: "water_damage",
    local_laundry_service: "local_laundry_service",
    bug_report: "bug_report",
    campaign: "campaign",
    shopping_bag: "shopping_bag",
    chair: "chair",
    diversity_3: "save_water",
    content_cut: "carpenter",
    leaf: "leaf",
    grid_on: "grid_on",
    videocam: "tv",
    kitchen: "kitchen",
    layers: "window",
    grid_view: "window",
    tv: "tv",
    power: "power",
    mode_fan: "fan",
    battery_charging_full: "power",
    electric_car: "directions_car",
    wallpaper: "window",
    meeting_room: "door",
    child_care: "save_water",
    blinds: "window",
    window: "window",
    wc: "wc",
    shower: "shower",
    texture: "texture",
    
    // Picker options / Lucide & Clean aliases mapping to SVGs
    sparkles: "cleaning_services",
    shirt: "local_laundry_service",
    wind: "ac_unit",
    droplets: "water_drop",
    brush: "cleaning_services",
    washing_machine: "washing_machine",
    bath: "bath",
    bug: "bug",
    shield: "pest_control",
    zap: "pest_control",
    flask: "pest_control",
    siren: "campaign",
    rat: "rat-svgrepo-com",
    wrench: "plumbing",
    hammer: "construction",
    plug: "power",
    lightbulb: "lightbulb",
    settings: "construction",
    cpu: "electrical_services",
    wifi: "electrical_services",
    bolt: "power",
    waves: "water_drop",
    pipette: "pipe",
    droplet: "water_drop",
    sofa: "sofa",
    lamp: "lightbulb",
    door: "door",
    paint: "format_paint",
    home: "door",
    frame: "window",
    armchair: "armchair",
    tree: "tree",
    flower: "flower",
    sun: "campaign",
    shovel: "construction",
    sprout: "sprout",
    air_vent: "air_vent",
    air_conditioner: "air-conditioner-svgrepo-com",
    aircon: "air-conditioner-svgrepo-com",
    cockroach: "cockroach-svgrepo-com",
    cockroaches: "cockroach-svgrepo-com",
    roach: "cockroach-svgrepo-com",
    ant: "ant-svgrepo-com",
    ants: "ant-svgrepo-com",
    bedbug: "bedbug-svgrepo-com",
    bedbugs: "bedbug-svgrepo-com",
    truck_inbound: "truck-inbound-svgrepo-com",
    showers_water: "showers-water-svgrepo-com",
    water_tap: "water-tap-plumber-svgrepo-com",
    chimney_fireplace: "chimney-fireplace-living-svgrepo-com",
    car_angled: "car-angled-front-left-svgrepo-com",
    refrigerator: "refrigerator",
    microwave: "microwave",
    thermometer: "ac_unit",
    package: "shopping_bag",
    truck: "truck-inbound-svgrepo-com",
    move: "truck-inbound-svgrepo-com",
    grid: "grid_on",
    gas_cylinder: "gas-cylinder",
    gas: "gas-cylinder",
    paint_bucket: "paint-bucket",
    paint_house: "house-paint-home-improvement-house-painting",
    delivery_rider: "delivery-rider-icon",
    fast_delivery: "fast-delivery-icon",
    fire_extinguisher: "fire-extinguisher-icon",
    fuel_container: "fuel-container-icon",
    auto_rickshaw: "auto-ricksaw",
    auto_ricksaw: "auto-ricksaw",
    rickshaw: "auto-ricksaw",
    bungalow_villa: "bungalow-villa",
    villa: "bungalow-villa",
    bungalow: "bungalow-villa",
    announcement: "announcement-color-icon",
    birthday_gift: "birthday-color-gift",
    birthday: "birthday",
    bride: "bride-color-icon",
    groom: "wedding-groom-color-icon",
    dog: "dog",
    pet: "dog",
    motorcycle: "motorcycle",
    bike: "motorcycle",
    cart: "cart",
    shopping_cart: "shopping-bag-cart",
    taxi: "taxi-cab-color-icon",
    cab: "taxi-cab-color-icon",
    tractor: "tractor",
    carpenter_work: "carpenter-work"
  };

  const resolved = map[clean] || clean;
  
  // Valid SVG files present in public/icons
  const validFiles = new Set([
    "ac_unit", "air-conditioner-svgrepo-com", "air_vent", "announcement-color-icon", "ant-svgrepo-com",
    "armchair", "auto-ricksaw", "bath", "bathroom-bath-svgrepo-com", "bathroom",
    "bathtub-bath-svgrepo-com", "bathtub", "battery_charging_full", "bed-svgrepo-com", "bed",
    "bedbug-svgrepo-com", "bell-svgrepo-com", "bell", "birthday-color-gift", "birthday",
    "blinds", "bride-color-icon", "bug", "bug_report", "bulb-svgrepo-com", "bulb",
    "bungalow-villa", "campaign", "car-angled-front-left-svgrepo-com", "car", "carpenter-svgrepo-com",
    "carpenter-work", "carpenter", "carpenter1", "carpet-svgrepo-com", "carpet", "cart",
    "celebration", "chair-svgrepo-com", "chair", "chimney-fireplace-living-svgrepo-com", "chimney",
    "cleaning_services", "cockroach-svgrepo-com", "construction", "cooler-svgrepo-com", "cooler",
    "cooling-fan-svgrepo-com", "cooling_fan", "countertops", "curtains-window-svgrepo-com", "curtains",
    "cutlery-fork-svgrepo-com", "cutlery", "delivery-rider-icon", "directions_car", "dog",
    "door-svgrepo-com", "door", "electric_car", "electrical_services", "electrician-svgrepo-com",
    "electrician", "fan-svgrepo-com", "fan", "fast-delivery-icon", "female_salon",
    "fire-extinguisher-icon", "flower", "fuel-container-icon", "gas-cylinder", "grid_on",
    "house-paint-home-improvement-house-painting", "kitchen", "leaf", "lightbulb", "lizard-svgrepo-com",
    "lizard", "local_laundry_service", "male_salon", "meeting_room", "microwave-svgrepo-com",
    "microwave", "mode_fan", "mop", "mosquito-svgrepo-com", "mosquito", "motorcycle",
    "paint-bucket", "party-svgrepo-com", "party", "pest_control", "pest_control_rodent",
    "pipe-svgrepo-com", "pipe", "plant-a-tree-svgrepo-com", "plant-a-tree", "plumber-svgrepo-com",
    "plumber", "plumbing", "potted_plant", "power", "rat-svgrepo-com", "rat",
    "refrigerator-freezer-svgrepo-com", "refrigerator", "save-water-svgrepo-com", "save_water",
    "shirt", "shopping-bag-cart", "shopping_bag", "shower", "showers-water-svgrepo-com",
    "sofa-svgrepo-com", "sofa", "solar", "sparkles", "spider-svgrepo-com", "spider",
    "sprout", "switch-svgrepo-com", "switch", "tap", "taxi-cab-color-icon",
    "television-tv-monitor-svgrepo-com", "television", "texture", "toilet-svgrepo-com (1)",
    "toilet-svgrepo-com", "toilet", "tractor", "tree", "truck-inbound-svgrepo-com", "tv",
    "vacuum-cleaner", "videocam", "wallpaper", "washbasin-svgrepo-com", "washbasin",
    "washing-machine-laundry-svgrepo-com", "washing_machine", "water-drop-svgrepo-com",
    "water-tap-plumber-svgrepo-com", "water_damage", "water_drop", "wc",
    "wedding-groom-color-icon", "window"
  ]);
  
  if (validFiles.has(resolved)) {
    return resolved;
  }
  return "cleaning_services";
}

interface ServiceIconProps extends HTMLAttributes<HTMLImageElement> {
  iconName: string;
  width?: number;
  height?: number;
}

/**
 * Renders local SVG icon corresponding to the given iconName.
 * Handles both new picker names and legacy Material Symbol names.
 */
export function ServiceIconComponent({
  iconName,
  className,
  width = 48,
  height = 48,
  ...props
}: ServiceIconProps) {
  const normalizedName = normalizeIconName(iconName);
  
  return (
    <Image
      src={`/icons/${normalizedName}.svg`}
      alt={iconName}
      width={width}
      height={height}
      className={`${className || ""} object-contain`}
      loading="lazy"
      decoding="async"
      draggable={false}
      {...props}
    />
  );
}

/** All available icon entries for the admin picker (new names only). */
export const SERVICE_ICON_OPTIONS: { name: string; label: string; group: string }[] = [
  // Pest Control (High Demand)
  { name: "cockroach-svgrepo-com", label: "Cockroach Control", group: "Pest Control" },
  { name: "ant-svgrepo-com", label: "Ant Control", group: "Pest Control" },
  { name: "bedbug-svgrepo-com", label: "Bedbug Control", group: "Pest Control" },
  { name: "mosquito-svgrepo-com", label: "Mosquito Spray / Control", group: "Pest Control" },
  { name: "spider-svgrepo-com", label: "Spider & Web Removal", group: "Pest Control" },
  { name: "lizard-svgrepo-com", label: "Lizard Control", group: "Pest Control" },
  { name: "rat-svgrepo-com", label: "Rat & Rodent Control", group: "Pest Control" },
  { name: "bug_report", label: "Bug Inspection / Audit", group: "Pest Control" },
  { name: "bug", label: "Generic Bug / Insect", group: "Pest Control" },
  { name: "pest_control", label: "Pest Shield / Protection", group: "Pest Control" },
  { name: "pest_control_rodent", label: "Heavy Pest & Rodent", group: "Pest Control" },
  // Cleaning
  { name: "sparkles", label: "Sparkles / Deep Clean", group: "Cleaning" },
  { name: "vacuum-cleaner", label: "Vacuum Cleaner / Floor Care", group: "Cleaning" },
  { name: "mop", label: "Mop / Floor Sweeping", group: "Cleaning" },
  { name: "carpet", label: "Carpet Cleaning", group: "Cleaning" },
  { name: "cleaning_services", label: "Cleaning Bucket & Spray", group: "Cleaning" },
  { name: "shirt", label: "Laundry / Clothes", group: "Cleaning" },
  { name: "washing_machine", label: "Washing Machine", group: "Cleaning" },
  { name: "washing-machine-laundry-svgrepo-com", label: "Laundry Machine Pro", group: "Cleaning" },
  { name: "bath", label: "Bathroom / Bathing", group: "Cleaning" },
  { name: "bathroom-bath-svgrepo-com", label: "Bathroom Deep Clean", group: "Cleaning" },
  { name: "shower", label: "Shower / Washroom", group: "Cleaning" },
  { name: "showers-water-svgrepo-com", label: "Shower Flow & Hygiene", group: "Cleaning" },
  // Appliances
  { name: "air-conditioner-svgrepo-com", label: "Air Conditioner (AC)", group: "Appliances" },
  { name: "ac_unit", label: "AC Unit / Snowflake", group: "Appliances" },
  { name: "air_vent", label: "Air Vent / Duct", group: "Appliances" },
  { name: "cooling_fan", label: "Cooling Fan / Air Flow", group: "Appliances" },
  { name: "cooler-svgrepo-com", label: "Air Cooler Unit", group: "Appliances" },
  { name: "refrigerator-freezer-svgrepo-com", label: "Refrigerator & Freezer", group: "Appliances" },
  { name: "refrigerator", label: "Fridge General", group: "Appliances" },
  { name: "microwave-svgrepo-com", label: "Microwave Oven", group: "Appliances" },
  { name: "microwave", label: "Microwave Standard", group: "Appliances" },
  { name: "television-tv-monitor-svgrepo-com", label: "LED TV / Monitor", group: "Appliances" },
  { name: "tv", label: "Television Display", group: "Appliances" },
  // Repairs & Electrical
  { name: "electrician-svgrepo-com", label: "Electrician & Wiring", group: "Repairs" },
  { name: "electrical_services", label: "Electrical Service Plug", group: "Repairs" },
  { name: "gas-cylinder", label: "Gas Cylinder Refill / Service", group: "Repairs" },
  { name: "fuel-container-icon", label: "Fuel Canister Supply", group: "Repairs" },
  { name: "fire-extinguisher-icon", label: "Fire Extinguisher & Safety", group: "Repairs" },
  { name: "carpenter-svgrepo-com", label: "Carpenter / Wood Work", group: "Repairs" },
  { name: "carpenter-work", label: "Carpentry Crafting", group: "Repairs" },
  { name: "carpenter1", label: "Wood Cutting & Saw", group: "Repairs" },
  { name: "carpenter", label: "Carpentry Tools", group: "Repairs" },
  { name: "construction", label: "Construction & Repair", group: "Repairs" },
  { name: "lightbulb", label: "Lightbulb / Fixtures", group: "Repairs" },
  { name: "bulb-svgrepo-com", label: "Bulb & Lighting", group: "Repairs" },
  { name: "switch-svgrepo-com", label: "Electric Switch & Socket", group: "Repairs" },
  { name: "bell-svgrepo-com", label: "Doorbell / Siren", group: "Repairs" },
  { name: "solar", label: "Solar Panel / Green Energy", group: "Repairs" },
  { name: "power", label: "Power Socket / Plug", group: "Repairs" },
  // Plumbing
  { name: "water-tap-plumber-svgrepo-com", label: "Water Tap / Plumber", group: "Plumbing" },
  { name: "plumber-svgrepo-com", label: "Pipe Plumber Master", group: "Plumbing" },
  { name: "plumbing", label: "Plumbing Wrench & Pipe", group: "Plumbing" },
  { name: "tap", label: "Tap & Faucet", group: "Plumbing" },
  { name: "pipe-svgrepo-com", label: "Water Pipe Tube", group: "Plumbing" },
  { name: "pipe", label: "Drain / Pipe Fittings", group: "Plumbing" },
  { name: "washbasin-svgrepo-com", label: "Washbasin / Sink Fit", group: "Plumbing" },
  { name: "washbasin", label: "Washbasin Standard", group: "Plumbing" },
  { name: "bathtub-bath-svgrepo-com", label: "Bathtub Fitting & Leak", group: "Plumbing" },
  { name: "toilet-svgrepo-com", label: "Toilet & Closet Fitting", group: "Plumbing" },
  { name: "toilet", label: "Toilet Sanitation", group: "Plumbing" },
  { name: "wc", label: "WC Sign / Washroom", group: "Plumbing" },
  { name: "water_damage", label: "Water Damage Repair", group: "Plumbing" },
  { name: "water_drop", label: "Water Leak / Droplet", group: "Plumbing" },
  { name: "save-water-svgrepo-com", label: "Water Saver / Eco Tap", group: "Plumbing" },
  // Home & Furniture
  { name: "house-paint-home-improvement-house-painting", label: "House Painting & Roller", group: "Home & Furniture" },
  { name: "paint-bucket", label: "Paint Bucket & Wall Color", group: "Home & Furniture" },
  { name: "bungalow-villa", label: "Villa & Bungalow Property", group: "Home & Furniture" },
  { name: "sofa-svgrepo-com", label: "Sofa & Upholstery", group: "Home & Furniture" },
  { name: "sofa", label: "Sofa Standard", group: "Home & Furniture" },
  { name: "armchair", label: "Armchair & Lounge", group: "Home & Furniture" },
  { name: "bed-svgrepo-com", label: "Bed & Bedroom Fit", group: "Home & Furniture" },
  { name: "bed", label: "Bed Furniture", group: "Home & Furniture" },
  { name: "curtains-window-svgrepo-com", label: "Curtains & Window Drapes", group: "Home & Furniture" },
  { name: "curtains", label: "Curtains Standard", group: "Home & Furniture" },
  { name: "blinds", label: "Window Blinds", group: "Home & Furniture" },
  { name: "chimney-fireplace-living-svgrepo-com", label: "Chimney & Fireplace", group: "Home & Furniture" },
  { name: "chimney", label: "Kitchen Chimney", group: "Home & Furniture" },
  { name: "door-svgrepo-com", label: "Door & Gate Fitting", group: "Home & Furniture" },
  { name: "door", label: "Door Entry", group: "Home & Furniture" },
  { name: "cutlery-fork-svgrepo-com", label: "Cutlery & Diningware", group: "Home & Furniture" },
  { name: "cutlery", label: "Kitchen Cutlery", group: "Home & Furniture" },
  { name: "wallpaper", label: "Wallpaper & Texture", group: "Home & Furniture" },
  { name: "kitchen", label: "Kitchen Counter / Cabinets", group: "Home & Furniture" },
  { name: "countertops", label: "Countertops", group: "Home & Furniture" },
  // Garden & Outdoor
  { name: "dog", label: "Dog / Pet Grooming & Care", group: "Garden & Outdoor" },
  { name: "leaf", label: "Leaf & Plants", group: "Garden & Outdoor" },
  { name: "flower", label: "Flower & Garden Care", group: "Garden & Outdoor" },
  { name: "sprout", label: "Sprout & Sapling", group: "Garden & Outdoor" },
  { name: "tree", label: "Tree & Landscaping", group: "Garden & Outdoor" },
  { name: "plant-a-tree-svgrepo-com", label: "Plantation / Tree Care", group: "Garden & Outdoor" },
  { name: "potted_plant", label: "Potted Plant Care", group: "Garden & Outdoor" },
  // Moving & Logistics
  { name: "delivery-rider-icon", label: "Express Delivery Rider", group: "Moving & Logistics" },
  { name: "fast-delivery-icon", label: "Fast Dispatch / Courier", group: "Moving & Logistics" },
  { name: "auto-ricksaw", label: "Auto Rickshaw Transport", group: "Moving & Logistics" },
  { name: "taxi-cab-color-icon", label: "Taxi / Cab Ride", group: "Moving & Logistics" },
  { name: "motorcycle", label: "Motorcycle Rider", group: "Moving & Logistics" },
  { name: "tractor", label: "Tractor Heavy Transport", group: "Moving & Logistics" },
  { name: "cart", label: "Shopping Cart", group: "Moving & Logistics" },
  { name: "shopping-bag-cart", label: "Shopping Bag & Cart", group: "Moving & Logistics" },
  { name: "truck-inbound-svgrepo-com", label: "Transport Truck / Shifting", group: "Moving & Logistics" },
  { name: "car-angled-front-left-svgrepo-com", label: "Car Wash / Detailing", group: "Moving & Logistics" },
  { name: "directions_car", label: "Car Service", group: "Moving & Logistics" },
  { name: "electric_car", label: "Electric Car Care", group: "Moving & Logistics" },
  { name: "shopping_bag", label: "Shopping / Delivery Bag", group: "Moving & Logistics" },
  // Events & Salon
  { name: "birthday", label: "Birthday Cake", group: "Events & Celebration" },
  { name: "birthday-color-gift", label: "Birthday Gift & Box", group: "Events & Celebration" },
  { name: "announcement-color-icon", label: "Announcement Loudspeaker", group: "Events & Celebration" },
  { name: "bride-color-icon", label: "Bridal Salon & Bride", group: "Events & Celebration" },
  { name: "wedding-groom-color-icon", label: "Groom Grooming & Suit", group: "Events & Celebration" },
  { name: "party-svgrepo-com", label: "Party & Event Decor", group: "Events & Celebration" },
  { name: "celebration", label: "Celebration Fireworks", group: "Events & Celebration" },
  { name: "campaign", label: "Campaign / Megaphone", group: "Events & Celebration" },
  { name: "female_salon", label: "Female Salon & Spa", group: "Salon & Beauty" },
  { name: "male_salon", label: "Male Grooming / Salon", group: "Salon & Beauty" },
];

export const ICON_GROUPS = [...new Set(SERVICE_ICON_OPTIONS.map((o) => o.group))];
