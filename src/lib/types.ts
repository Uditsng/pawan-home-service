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

export interface Service {
  id: string;
  category: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  is_active: boolean;
  created_at: string;
  page_content: string | null;
  pricing_model?: 'fixed' | 'hourly';
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
  pricing_model?: 'fixed' | 'hourly';
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
  pricingModel?: 'fixed' | 'hourly';
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
  services: { title: string; category?: string; pricing_model?: 'fixed' | 'hourly' } | null;
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
  created_at: string;
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
