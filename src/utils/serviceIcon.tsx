/**
 * ServiceIcon — Central resolver for subcategory icons.
 * icon_name values stored in DB map to Lucide React SVG components.
 * No CDN, no internet required — all icons are bundled.
 *
 * Supports both:
 * - New names (used by the admin picker, e.g. "bug", "sparkles", "wrench")
 * - Legacy Material Symbol names (already in DB, e.g. "bug_report", "cleaning_services")
 */

import {
  // Cleaning
  Sparkles, Shirt, Wind, Droplets, Brush, WashingMachine, Bath, ShowerHead,
  // Pest Control
  Bug, Shield, Zap, FlaskConical, Siren, Rat,
  // Repairs & Electrical
  Wrench, Hammer, Plug, Lightbulb, Settings, Cpu, Wifi, Bolt,
  // Plumbing
  Waves, Pipette, Droplet,
  // Home & Furniture
  Sofa, BedDouble, Lamp, DoorOpen, PaintRoller, Home, Frame, Armchair,
  // Garden & Outdoor
  Leaf, TreePine, Flower2, Sun, Shovel, Sprout,
  // Appliances
  Tv, Refrigerator, AirVent, Microwave, Thermometer,
  // Moving & Logistics
  Package, Truck, MoveHorizontal, LayoutGrid,
  // Misc
  Star, Heart, Clock, MapPin, Phone, Camera, Car, Scissors,
  // Fallback
  CircleHelp,
  type LucideProps,
} from "lucide-react";
import type { FC } from "react";

// Maps icon_name (stored in DB) → Lucide component
// Includes BOTH new picker names AND legacy Material Symbol names for backward compatibility
const ICON_MAP: Record<string, FC<LucideProps>> = {
  // ── NEW PICKER NAMES ──────────────────────────────────────────────────────

  // Cleaning
  sparkles: Sparkles,
  shirt: Shirt,
  wind: Wind,
  droplets: Droplets,
  brush: Brush,
  washing_machine: WashingMachine,
  bath: Bath,
  shower: ShowerHead,
  // Pest Control
  bug: Bug,
  shield: Shield,
  zap: Zap,
  flask: FlaskConical,
  siren: Siren,
  rat: Rat,
  // Repairs
  wrench: Wrench,
  hammer: Hammer,
  plug: Plug,
  lightbulb: Lightbulb,
  settings: Settings,
  cpu: Cpu,
  wifi: Wifi,
  bolt: Bolt,
  // Plumbing
  waves: Waves,
  pipette: Pipette,
  droplet: Droplet,
  // Home & Furniture
  sofa: Sofa,
  bed: BedDouble,
  lamp: Lamp,
  door: DoorOpen,
  paint: PaintRoller,
  home: Home,
  frame: Frame,
  armchair: Armchair,
  // Garden
  leaf: Leaf,
  tree: TreePine,
  flower: Flower2,
  sun: Sun,
  shovel: Shovel,
  sprout: Sprout,
  // Appliances
  tv: Tv,
  refrigerator: Refrigerator,
  air_vent: AirVent,
  microwave: Microwave,
  thermometer: Thermometer,
  // Moving & Logistics
  package: Package,
  truck: Truck,
  move: MoveHorizontal,
  grid: LayoutGrid,

  // ── LEGACY MATERIAL SYMBOLS ALIASES (backward compatibility with DB) ──────

  // Pest / Insects
  bug_report: Bug,
  pest_control: Bug,
  pest_control_rodent: Rat,
  rodent_control: Rat,
  // Cleaning
  cleaning_services: Sparkles,
  dry_cleaning: Shirt,
  local_laundry_service: WashingMachine,
  laundry: WashingMachine,
  mop: Brush,
  soap: Droplets,
  water_drop: Droplet,
  shower_head: ShowerHead,
  bathtub: Bath,
  // Home Repair / Handyman
  home_repair_service: Wrench,
  handyman: Wrench,
  build: Hammer,
  construction: Hammer,
  carpenter: Hammer,
  hardware: Wrench,
  plumbing: Pipette,
  water_damage: Droplet,
  // Electrical
  electrical_services: Plug,
  power: Plug,
  bolt_lightning: Bolt,
  // Furniture & Interior
  chair: Armchair,
  weekend: Sofa,
  bed_room: BedDouble,
  bedroom_parent: BedDouble,
  king_bed: BedDouble,
  single_bed: BedDouble,
  door_back: DoorOpen,
  window: Frame,
  format_paint: PaintRoller,
  brush_alt: Brush,
  palette: PaintRoller,
  // Appliances
  kitchen: Microwave,
  microwave_gen: Microwave,
  kitchen_appliances: Microwave,
  ac_unit: AirVent,
  hvac: AirVent,
  air_purifier: AirVent,
  device_thermostat: Thermometer,
  tv_gen: Tv,
  monitor: Tv,
  refrigerator_gen: Refrigerator,
  // Garden / Outdoor
  yard: Leaf,
  eco: Leaf,
  park: TreePine,
  nature: TreePine,
  grass: Leaf,
  forest: TreePine,
  local_florist: Flower2,
  // Moving / Logistics
  local_shipping: Truck,
  moving: Package,
  inventory: Package,
  // General / Other
  house: Home,
  roofing: Home,
  house_siding: Home,
  cottage: Home,
  villa: Home,
  star: Star,
  favorite: Heart,
  schedule: Clock,
  alarm: Clock,
  location_on: MapPin,
  phone: Phone,
  photo_camera: Camera,
  directions_car: Car,
  content_cut: Scissors,
};

interface ServiceIconProps extends LucideProps {
  iconName: string;
}

/**
 * Renders the Lucide icon corresponding to the given icon_name.
 * Handles both new picker names and legacy Material Symbol names.
 * Falls back to CircleHelp if the icon_name is not recognized.
 */
export function ServiceIconComponent({ iconName, ...props }: ServiceIconProps) {
  const Icon = ICON_MAP[iconName] ?? CircleHelp;
  return <Icon {...props} />;
}

/** Returns the Lucide component for a given icon_name. */
export function getServiceIcon(iconName: string): FC<LucideProps> {
  return ICON_MAP[iconName] ?? CircleHelp;
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
  // Pest Control
  { name: "bug", label: "Bug / Insects", group: "Pest Control" },
  { name: "rat", label: "Rodent / Rat", group: "Pest Control" },
  { name: "shield", label: "Protection / Shield", group: "Pest Control" },
  { name: "zap", label: "Zap / Fumigation", group: "Pest Control" },
  { name: "flask", label: "Chemical / Flask", group: "Pest Control" },
  { name: "siren", label: "Alert / Emergency", group: "Pest Control" },
  // Repairs & Electrical
  { name: "wrench", label: "Wrench / Repair", group: "Repairs" },
  { name: "hammer", label: "Hammer / Carpentry", group: "Repairs" },
  { name: "plug", label: "Plug / Electrical", group: "Repairs" },
  { name: "lightbulb", label: "Lightbulb / Lighting", group: "Repairs" },
  { name: "bolt", label: "Bolt / Fastening", group: "Repairs" },
  { name: "cpu", label: "CPU / Electronics", group: "Repairs" },
  { name: "wifi", label: "WiFi / Network", group: "Repairs" },
  { name: "settings", label: "Settings / Maintenance", group: "Repairs" },
  // Plumbing
  { name: "waves", label: "Waves / Water", group: "Plumbing" },
  { name: "droplet", label: "Droplet / Leak", group: "Plumbing" },
  { name: "pipette", label: "Pipette / Pipe", group: "Plumbing" },
  // Home & Furniture
  { name: "sofa", label: "Sofa / Upholstery", group: "Home & Furniture" },
  { name: "bed", label: "Bed / Bedroom", group: "Home & Furniture" },
  { name: "armchair", label: "Armchair / Seating", group: "Home & Furniture" },
  { name: "home", label: "Home / General", group: "Home & Furniture" },
  { name: "paint", label: "Paint / Painting", group: "Home & Furniture" },
  { name: "lamp", label: "Lamp / Lighting", group: "Home & Furniture" },
  { name: "door", label: "Door / Entry", group: "Home & Furniture" },
  { name: "frame", label: "Frame / Picture", group: "Home & Furniture" },
  // Garden
  { name: "leaf", label: "Leaf / Garden", group: "Garden & Outdoor" },
  { name: "tree", label: "Tree / Landscaping", group: "Garden & Outdoor" },
  { name: "flower", label: "Flower / Plants", group: "Garden & Outdoor" },
  { name: "sprout", label: "Sprout / Planting", group: "Garden & Outdoor" },
  { name: "shovel", label: "Shovel / Digging", group: "Garden & Outdoor" },
  { name: "sun", label: "Sun / Outdoor", group: "Garden & Outdoor" },
  // Appliances
  { name: "air_vent", label: "AC / Air Vent", group: "Appliances" },
  { name: "refrigerator", label: "Refrigerator / Fridge", group: "Appliances" },
  { name: "microwave", label: "Microwave / Oven", group: "Appliances" },
  { name: "tv", label: "TV / Electronics", group: "Appliances" },
  { name: "thermometer", label: "Thermometer / HVAC", group: "Appliances" },
  // Moving
  { name: "package", label: "Package / Moving", group: "Moving & Logistics" },
  { name: "truck", label: "Truck / Transport", group: "Moving & Logistics" },
  { name: "move", label: "Move / Shifting", group: "Moving & Logistics" },
  { name: "grid", label: "Grid / Organization", group: "Moving & Logistics" },
];

export const ICON_GROUPS = [...new Set(SERVICE_ICON_OPTIONS.map((o) => o.group))];
