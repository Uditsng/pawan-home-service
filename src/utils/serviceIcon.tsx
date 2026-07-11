/**
 * ServiceIcon — Central resolver for subcategory icons.
 * Loads optimized SVG files locally from /public/icons.
 * No CDN, no internet required.
 */

import Image from "next/image";
import type { ComponentType, HTMLAttributes } from "react";

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
    
    // Picker options / Lucide names
    sparkles: "cleaning_services",
    shirt: "local_laundry_service",
    wind: "ac_unit",
    droplets: "water_drop",
    brush: "cleaning_services",
    washing_machine: "local_laundry_service",
    bath: "bathroom",
    bug: "pest_control",
    shield: "pest_control",
    zap: "power",
    flask: "pest_control",
    siren: "campaign",
    rat: "pest_control_rodent",
    wrench: "plumbing",
    hammer: "construction",
    plug: "power",
    lightbulb: "lightbulb",
    settings: "construction",
    cpu: "electrical_services",
    wifi: "electrical_services",
    bolt: "power",
    waves: "water_drop",
    pipette: "plumbing",
    droplet: "water_drop",
    sofa: "sofa",
    lamp: "lightbulb",
    door: "door",
    paint: "format_paint",
    home: "door",
    frame: "window",
    armchair: "chair",
    tree: "potted_plant",
    flower: "potted_plant",
    sun: "campaign",
    shovel: "construction",
    sprout: "potted_plant",
    air_vent: "ac_unit",
    refrigerator: "refrigerator",
    microwave: "kitchen",
    thermometer: "ac_unit",
    package: "local_shipping",
    truck: "local_shipping",
    move: "local_shipping",
    grid: "window"
  };

  const resolved = map[clean] || clean;
  
  // Valid SVG files present in public/icons
  const validFiles = new Set([
    "ac_unit", "air_vent", "armchair", "bath", "bathroom", "bathtub", "battery_charging_full",
    "bed", "bell", "blinds", "bug", "bug_report", "bulb", "campaign", "car", "carpenter",
    "carpet", "celebration", "chair", "chimney", "cleaning_services", "construction",
    "cooler", "cooling_fan", "countertops", "curtains", "cutlery", "directions_car",
    "door", "electric_car", "electrical_services", "electrician", "fan", "female_salon", "flower",
    "grid_on", "kitchen", "leaf", "lightbulb", "lizard", "local_laundry_service",
    "male_salon", "meeting_room", "microwave", "mode_fan", "mop", "mosquito", "party", "pest_control",
    "pest_control_rodent", "pipe", "plant-a-tree", "plumber", "plumbing", "potted_plant",
    "power", "rat", "refrigerator", "save_water", "shirt", "shopping_bag", "shower",
    "sofa", "solar", "sparkles", "spider", "sprout", "switch", "tap", "television", "texture",
    "toilet", "tree", "tv", "vacuum-cleaner", "videocam", "wallpaper", "washbasin",
    "washing_machine", "water_damage", "water_drop", "wc", "window"
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

/** Returns a wrapper component for backward compatibility. */
export function getServiceIcon(iconName: string): ComponentType<{ className?: string }> {
  return function DummyIcon({ className }: { className?: string }) {
    return <ServiceIconComponent iconName={iconName} className={className} />;
  };
}

/** All available icon entries for the admin picker (new names only). */
export const SERVICE_ICON_OPTIONS: { name: string; label: string; group: string }[] = [
  // Cleaning
  { name: "sparkles", label: "Sparkles / Deep Clean", group: "Cleaning" },
  { name: "shirt", label: "Laundry / Clothes", group: "Cleaning" },
  { name: "washing_machine", label: "Washing Machine", group: "Cleaning" },
  { name: "droplets", label: "Droplets / Wet Clean", group: "Cleaning" },
  { name: "brush", label: "Brush / Scrubbing", group: "Cleaning" },
  { name: "wind", label: "Air / Freshening", group: "Cleaning" },
  { name: "bath", label: "Bathroom / Bathtub", group: "Cleaning" },
  { name: "shower", label: "Shower / Bathroom", group: "Cleaning" },
  { name: "vacuum-cleaner", label: "Vacuum Cleaner / Floor Care", group: "Cleaning" },
  { name: "mop", label: "Mop / Sweeping", group: "Cleaning" },
  { name: "carpet", label: "Carpet Cleaning", group: "Cleaning" },
  // Pest Control
  { name: "bug", label: "Bug / Insects", group: "Pest Control" },
  { name: "bug_report", label: "Bug Report / Inspection", group: "Pest Control" },
  { name: "rat", label: "Rodent / Rat", group: "Pest Control" },
  { name: "shield", label: "Protection / Shield", group: "Pest Control" },
  { name: "zap", label: "Zap / Fumigation", group: "Pest Control" },
  { name: "flask", label: "Chemical / Flask", group: "Pest Control" },
  { name: "siren", label: "Alert / Emergency", group: "Pest Control" },
  { name: "mosquito", label: "Mosquito Control", group: "Pest Control" },
  { name: "spider", label: "Spider Control", group: "Pest Control" },
  { name: "lizard", label: "Lizard Control", group: "Pest Control" },
  // Repairs & Electrical
  { name: "wrench", label: "Wrench / Repair", group: "Repairs" },
  { name: "hammer", label: "Hammer / Carpentry", group: "Repairs" },
  { name: "plug", label: "Plug / Electrical", group: "Repairs" },
  { name: "lightbulb", label: "Lightbulb / Lighting", group: "Repairs" },
  { name: "bolt", label: "Bolt / Fastening", group: "Repairs" },
  { name: "cpu", label: "CPU / Electronics", group: "Repairs" },
  { name: "wifi", label: "WiFi / Network", group: "Repairs" },
  { name: "settings", label: "Settings / Maintenance", group: "Repairs" },
  { name: "electrician", label: "Electrician / Wiring", group: "Repairs" },
  { name: "carpenter", label: "Carpenter / Woodwork", group: "Repairs" },
  { name: "switch", label: "Switch / Socket", group: "Repairs" },
  { name: "bell", label: "Doorbell / Chime", group: "Repairs" },
  { name: "solar", label: "Solar Panel / System", group: "Repairs" },
  // Plumbing
  { name: "waves", label: "Waves / Water", group: "Plumbing" },
  { name: "droplet", label: "Droplet / Leak", group: "Plumbing" },
  { name: "pipette", label: "Pipette / Pipe", group: "Plumbing" },
  { name: "plumber", label: "Plumber / Pipe Repair", group: "Plumbing" },
  { name: "tap", label: "Tap / Faucet", group: "Plumbing" },
  { name: "toilet", label: "Toilet / Sanitation", group: "Plumbing" },
  { name: "bathtub", label: "Bathtub / Bath Fit", group: "Plumbing" },
  { name: "washbasin", label: "Washbasin / Sink", group: "Plumbing" },
  { name: "pipe", label: "Pipe / Water Tube", group: "Plumbing" },
  // Home & Furniture
  { name: "sofa", label: "Sofa / Upholstery", group: "Home & Furniture" },
  { name: "bed", label: "Bed / Bedroom", group: "Home & Furniture" },
  { name: "armchair", label: "Armchair / Seating", group: "Home & Furniture" },
  { name: "home", label: "Home / General", group: "Home & Furniture" },
  { name: "paint", label: "Paint / Painting", group: "Home & Furniture" },
  { name: "lamp", label: "Lamp / Lighting", group: "Home & Furniture" },
  { name: "door", label: "Door / Entry", group: "Home & Furniture" },
  { name: "frame", label: "Frame / Picture", group: "Home & Furniture" },
  { name: "curtains", label: "Curtains / Blinds", group: "Home & Furniture" },
  { name: "blinds", label: "Blinds / Window Cover", group: "Home & Furniture" },
  { name: "chimney", label: "Chimney / Kitchen Vent", group: "Home & Furniture" },
  { name: "cutlery", label: "Cutlery / Kitchenware", group: "Home & Furniture" },
  { name: "wallpaper", label: "Wallpaper / Wall Decor", group: "Home & Furniture" },
  // Garden
  { name: "leaf", label: "Leaf / Garden", group: "Garden & Outdoor" },
  { name: "tree", label: "Tree / Landscaping", group: "Garden & Outdoor" },
  { name: "flower", label: "Flower / Plants", group: "Garden & Outdoor" },
  { name: "sprout", label: "Sprout / Planting", group: "Garden & Outdoor" },
  { name: "shovel", label: "Shovel / Digging", group: "Garden & Outdoor" },
  { name: "sun", label: "Sun / Outdoor", group: "Garden & Outdoor" },
  { name: "plant-a-tree", label: "Plant a Tree / Forestry", group: "Garden & Outdoor" },
  // Appliances
  { name: "air_vent", label: "AC / Air Vent", group: "Appliances" },
  { name: "refrigerator", label: "Refrigerator / Fridge", group: "Appliances" },
  { name: "microwave", label: "Microwave / Oven", group: "Appliances" },
  { name: "tv", label: "TV / Electronics", group: "Appliances" },
  { name: "thermometer", label: "Thermometer / HVAC", group: "Appliances" },
  { name: "cooling_fan", label: "Cooling Fan / Air Flow", group: "Appliances" },
  { name: "cooler", label: "Cooler / Air Cooler", group: "Appliances" },
  { name: "television", label: "Television / LED TV", group: "Appliances" },
  // Moving
  { name: "package", label: "Package / Moving", group: "Moving & Logistics" },
  { name: "truck", label: "Truck / Transport", group: "Moving & Logistics" },
  { name: "move", label: "Move / Shifting", group: "Moving & Logistics" },
  { name: "grid", label: "Grid / Organization", group: "Moving & Logistics" },
  // Events & Celebration
  { name: "celebration", label: "Celebration / Event", group: "Events & Celebration" },
  { name: "party", label: "Party / Decor", group: "Events & Celebration" },
  // Salon & Beauty
  { name: "female_salon", label: "Female Salon / Grooming", group: "Salon & Beauty" },
  { name: "male_salon", label: "Male Salon / Grooming", group: "Salon & Beauty" },
];

export const ICON_GROUPS = [...new Set(SERVICE_ICON_OPTIONS.map((o) => o.group))];
