// ============================================================
// Shared TypeScript Interfaces — Source of Truth
// ============================================================

/** Booking status state machine (Auto-Assign Model):
 *  pending → confirmed (auto-assigned) → in_progress → completed
 *  confirmed → cancelled
 *  confirmed → reassigned (partner rejected → new partner found)
 *  pending (no partner found — admin handles manually)
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'accepted'
  | 'professional_en_route'
  | 'professional_arrived'
  | 'otp_pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'reassigned'
  | 'expired'
  | 'refunded';

export type CancelledBy = 'USER' | 'PARTNER' | 'SYSTEM';

export type EventType =
  | 'BOOKING_CREATED'
  | 'PARTNER_AUTO_ASSIGNED'
  | 'PARTNER_REJECTED'
  | 'PARTNER_REASSIGNED'
  | 'JOB_OFFERED'
  | 'JOB_ACCEPTED'
  | 'JOB_DECLINED'
  | 'JOB_STARTED'
  | 'JOB_COMPLETED'
  | 'JOB_CANCELLED';

// ─── Core Models ─────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'customer' | 'partner' | 'admin';
  status: 'active' | 'pending' | 'offline' | 'busy' | 'suspended';
  created_at: string;
  updated_at: string | null;
  avatar_url: string | null;
}

export interface PartnerProfile extends Profile {
  rating_avg: number;
  rating_count: number;
  jobs_offered_count: number;
  jobs_accepted_count: number;
  jobs_cancelled_count: number;
  acceptance_rate: number;
  cancellation_rate: number;
  last_assigned_at: string | null;
  is_available: boolean;
}

export type PricingModel = 'fixed' | 'hourly' | 'area' | 'quantity' | 'inspection' | 'distance' | 'hybrid';

export interface ServicePageContent {
  about_text?: string;
  included_features?: string[];
  excluded_features?: string[];
  faqs?: { question: string; answer: string }[];
  why_choose_us?: { icon: string; title: string; desc: string }[];
  how_to_book_steps?: { step: number; title: string; desc: string }[];
  packages?: { id: string; title: string; price: number; original_price?: number }[];
  form_fields?: Record<string, unknown>[];
}

export interface Service {
  id: string;
  category: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  is_active: boolean;
  status?: 'draft' | 'published';
  created_at: string;
  page_content: ServicePageContent | null;
  pricing_model?: PricingModel;
  slug?: string;
  long_description?: string | null;
  banner_url?: string | null;
  seo_metadata?: Record<string, unknown> | null;
  is_featured?: boolean;
  priority?: number;
  estimated_duration?: number | null;
  gst_applicable?: boolean;
  tags?: string[];
  keywords?: string[];
  preparation_instructions?: string | null;
  warranty?: string | null;
  revisit_policy?: string | null;
  cancellation_policy?: string | null;
  pricing_config?: Record<string, unknown> | null;
  form_fields?: Record<string, unknown>[] | null;
  scheduling_config?: Record<string, unknown> | null;
  availability_config?: Record<string, unknown> | null;
  policy_config?: Record<string, unknown> | null;
  requirements_config?: Record<string, unknown> | null;
}

export interface Booking {
  id: string;
  service_id: string;
  customer_id: string;
  partner_id: string | null;
  order_id: string | null;         // null for legacy single-service bookings
  status: BookingStatus;
  total_amount: number;
  city: string | null;
  area: string | null;             // colony/locality for dispatch matching
  pincode: string | null;
  address: string | null;
  broadcast_tier: number;
  last_broadcast_at: string | null;
  scheduled_date: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  cancellation_reason: string | null;
  arrival_otp_verified?: boolean | null;
  arrival_otp_expires_at?: string | null;
  completion_otp_verified?: boolean | null;
  completion_otp_expires_at?: string | null;
  pricing_model?: PricingModel;
  selected_duration_minutes?: number | null;
  base_price?: number | null;
  final_price?: number | null;
  notified_30m_remaining?: boolean | null;
  notified_time_completed?: boolean | null;
  meeting_location?: string | null;
  destination?: string | null;
  expected_bags?: number | null;
}

// ─── Cart & Orders ───────────────────────────────────────────

export interface CartItem {
  serviceId: string;
  title: string;
  iconName: string;
  basePrice: number;
  subcategoryName: string;
  categorySlug: string;
  pricingModel?: PricingModel;
  selectedDuration?: number;
  selectedPackages?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  address: string | null;
  city: string | null;
  pincode: string | null;
  scheduled_date: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrderWithBookings extends Order {
  bookings: (Booking & { services: { title: string; category?: string } | null })[];
}

// ─── Joined / Enriched Models ────────────────────────────────

export interface BookingWithDetails extends Booking {
  services: { title: string; category?: string; pricing_model?: PricingModel } | null;
  customer: { full_name: string } | null;
  partner: { full_name: string; avatar_url: string | null; phone: string | null } | null;
}

// ─── Supporting Tables ───────────────────────────────────────

export interface Review {
  id: string;
  booking_id: string;
  partner_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  quality_rating: number | null;
  behaviour_rating: number | null;
  timeliness_rating: number | null;
  value_rating: number | null;
  review_tags: string[];
  review_images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithCustomer extends Review {
  customer: { full_name: string; avatar_url: string | null } | null;
  booking: { services: { title: string } | null } | null;
}

export interface JobOffer {
  id: string;
  booking_id: string;
  partner_id: string;
  offered_at: string;
}

export interface JobDecline {
  id: string;
  booking_id: string;
  partner_id: string;
  created_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: EventType;
  actor: CancelledBy | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Auto-Assign Related ────────────────────────────────────

export interface PartnerService {
  id: string;
  partner_id: string;
  service_id: string;
  created_at: string;
}

export interface PartnerServiceArea {
  id: string;
  partner_id: string;
  pincode: string;
  city: string | null;
  created_at: string;
}

export interface BookingRejection {
  id: string;
  booking_id: string;
  partner_id: string;
  reason: string | null;
  created_at: string;
}

// ─── Booking Extensions ──────────────────────────────────────

export type ExtensionStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'payment_pending'
  | 'paid'
  | 'active'
  | 'completed';

export interface BookingExtension {
  id: string;
  booking_id: string;
  requested_by_partner_id: string | null;
  additional_minutes: number;
  additional_amount: number;
  status: ExtensionStatus;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── Notification Types ─────────────────────────────────────

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'partner_assigned'
  | 'partner_reassigned'
  | 'new_job_offer'
  | 'service_started'
  | 'service_completed'
  | 'booking_cancelled'
  | 'review_received'
  | 'general'
  | 'extension_requested'
  | 'extension_approved'
  | 'extension_rejected'
  | 'extension_payment_pending'
  | 'extension_paid'
  | 'extension_activated'
  | 'time_remaining_30m'
  | 'time_completed';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata: Record<string, unknown>;
  is_read: boolean;
  booking_id?: string | null;
  role?: string | null;
  created_at: string;
}

export interface NotificationToken {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: 'web' | 'android' | 'ios';
  last_seen: string;
  created_at: string;
}

// ─── Service Engine Dynamic Modules Typings ──────────────────

export interface ServiceVariant {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  duration_minutes: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ServiceAddon {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_required: boolean;
  max_quantity: number;
  is_active: boolean;
  created_at: string;
}

export interface ServicePricingRuleConditions {
  days_of_week?: number[];
  hours_range?: [string, string];
  dates?: string[];
  pincodes?: string[];
}

export interface ServicePricingRule {
  id: string;
  service_id: string | null;
  name: string;
  rule_type: 'surcharge' | 'discount';
  amount_type: 'fixed' | 'percentage';
  amount_value: number;
  conditions: ServicePricingRuleConditions | null;
  is_active: boolean;
  created_at: string;
}

export interface ServicePackage {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number;
  services: { service_id: string; variant_id?: string }[];
  is_active: boolean;
  created_at: string;
}

export interface BookingPricing {
  id: string;
  booking_id: string;
  base_price: number;
  hourly_price: number;
  area_price: number;
  quantity_price: number;
  distance_price: number;
  inspection_fee: number;
  travel_fee: number;
  surcharges: { name: string; amount: number }[];
  addons_total: number;
  addons_breakdown: { addon_id: string; title: string; price: number; quantity: number }[];
  gst_amount: number;
  discount_amount: number;
  coupon_discount: number;
  wallet_discount: number;
  total_price: number;
  created_at: string;
}

export interface BookingFormAnswer {
  id: string;
  booking_id: string;
  field_name: string;
  field_label: string;
  field_value: string | null;
  created_at: string;
}

export interface BookingQuote {
  id: string;
  booking_id: string;
  professional_id: string | null;
  customer_id: string;
  status: 'pending_customer_approval' | 'approved' | 'declined' | 'expired';
  tax_rate: number;
  discount: number;
  total_amount: number;
  expiry_time: string | null;
  notes: string | null;
  created_at: string;
  quote_items?: BookingQuoteItem[];
}

export interface BookingQuoteItem {
  id: string;
  quote_id: string;
  item_type: 'material' | 'labour';
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  status: string;
  changed_by: string | null;
  remarks: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_booking_amount: number;
  max_discount: number | null;
  limit_per_user: number;
  total_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  benefits: { discount_percent?: number; free_cancellation?: boolean; priority_booking?: boolean };
  created_at: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  plan_id: string;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}
