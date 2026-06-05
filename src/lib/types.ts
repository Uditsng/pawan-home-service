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
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'reassigned'
  | 'expired';

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
  is_active: boolean;
  created_at: string;
  page_content: string | null;
}

export interface Booking {
  id: string;
  service_id: string;
  customer_id: string;
  partner_id: string | null;
  status: BookingStatus;
  total_amount: number;
  city: string | null;
  pincode: string | null;
  scheduled_date: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  cancellation_reason: string | null;
}

// ─── Joined / Enriched Models ────────────────────────────────

export interface BookingWithDetails extends Booking {
  services: { title: string; category?: string } | null;
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

// ─── Notification Types ─────────────────────────────────────

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'partner_assigned'
  | 'partner_reassigned'
  | 'service_started'
  | 'service_completed'
  | 'booking_cancelled'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata: Record<string, unknown>;
  is_read: boolean;
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
