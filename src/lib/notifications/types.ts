/**
 * Notification System Shared Types & Canonical Configuration
 *
 * This module is the SINGLE source of truth for:
 *   - delivery status lifecycle (notification_deliveries.status)
 *   - FCM error classification + retry backoff
 *   - Android notification channel map + type→channel routing
 *   - portal-specific audible in-app alert sets
 *
 * It is pure data/types — safe to import from BOTH server code
 * (src/lib/notifications.ts) and client code (MobileSetup.tsx,
 * NotificationBell.tsx) without risking "server-only" leakage.
 *
 * IMPORTANT (Android): channels are locked by the OS after first
 * creation. Changing the channel map here only affects FRESH installs
 * or NEW channel IDs. See Milestone 4 notes.
 */

import type { NotificationType } from "@/lib/types";

// ─── Delivery Status Lifecycle ────────────────────────────────
// Mirrors the CHECK constraint in notification_deliveries.status.

export type DeliveryStatus =
  | "queued" //                  created, waiting for a worker to drain
  | "in_flight" //               claimed by a worker, dispatch in progress
  | "firebase_accepted" //       FCM accepted into its queue (NOT delivered/heard)
  | "delivered" //               client-confirmed soft receipt (foreground/resume)
  | "opened" //                  user tapped the notification
  | "read" //                    user read the in-app row
  | "retryable" //               transient FCM failure, backoff scheduled
  | "failed_permanent" //        FCM rejected, no retry possible
  | "failed_unregistered" //     token invalid/unregistered — deleted
  | "expired" //                 device offline past FCM TTL
  | "no_token" //                recipient had no registered device at send time
  | "degraded"; //               delivered in-app only (FCM unconfigured/skipped)

/** Statuses the drain worker should pick up in claim_notification_deliveries. */
export const DRAINABLE_STATUSES: DeliveryStatus[] = ["queued", "retryable"];

/** Statuses requiring no further action. */
export const TERMINAL_STATUSES: DeliveryStatus[] = [
  "delivered",
  "opened",
  "read",
  "failed_permanent",
  "failed_unregistered",
  "expired",
  "no_token",
  "degraded",
];

// ─── FCM Error Classification & Backoff ───────────────────────

export type FcmErrorClass = "retryable" | "unregistered" | "permanent" | "unknown";

const UNREGISTERED_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const RETRYABLE_ERRORS = new Set([
  "messaging/server-unavailable",
  "messaging/internal-error",
  "messaging/quota-exceeded",
  "messaging/resource-exhausted",
  "functions/messaging/server-unavailable", // old SDK alias
]);

export function classifyFcmError(code: string | null | undefined): FcmErrorClass {
  if (!code) return "unknown";
  if (UNREGISTERED_ERRORS.has(code)) return "unregistered";
  if (RETRYABLE_ERRORS.has(code)) return "retryable";
  return "permanent";
}

export const RETRY_MAX_ATTEMPTS = 5;
export const RETRY_BASE_DELAY_MS = 60_000; // 1 minute base

/** Exponential backoff delay given the number of retries already used. */
export function retryDelayMs(retryCount: number): number {
  const exp = Math.min(retryCount, 6); // cap exponent: 1,2,4,8,16,32,64 min
  return RETRY_BASE_DELAY_MS * 2 ** exp;
}

// ─── Android Notification Channels (canonical) ────────────────
// Importance values follow NotificationManager:
//   5 = IMPORTANCE_MAX, 4 = HIGH, 3 = DEFAULT, 2 = LOW, 1 = MIN.

export interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  importance: number;
  visibility: number; // 1 = PUBLIC, 0 = PRIVATE
  sound: "default" | "service_alert" | null;
  vibration: boolean;
}

export const NOTIFICATION_CHANNELS: Record<string, NotificationChannelConfig> = {
  service_assignment: {
    id: "service_assignment",
    name: "New Service Requests",
    description: "High-importance alerts for new jobs assigned to partners",
    importance: 5,
    visibility: 1,
    sound: "service_alert",
    vibration: true,
  },
  phs_bookings: {
    id: "phs_bookings",
    name: "Bookings & Service Updates",
    description: "Booking confirmations, reschedules, and service status updates",
    importance: 4,
    visibility: 1,
    sound: "default",
    vibration: true,
  },
  phs_critical: {
    id: "phs_critical",
    name: "Critical Alerts",
    description: "Urgent alerts: cancellations, payment failures, SOS",
    importance: 5,
    visibility: 1,
    sound: "service_alert",
    vibration: true,
  },
  phs_general: {
    id: "phs_general",
    name: "General Notifications",
    description: "Offers, wallet updates, and account messages",
    importance: 3,
    visibility: 1,
    sound: "default",
    vibration: false,
  },
};

/**
 * Notification type → channel id.
 * Server (FCM android.channelId) and client (LocalNotifications
 * channelId + createChannel) MUST use this same mapping so the sound
 * behaviour is consistent across all app states.
 */
export const NOTIFICATION_TYPE_CHANNEL: Record<NotificationType, string> = {
  // Partner job alerts — loud, persistent ringer
  new_job_offer: "service_assignment",
  partner_assigned: "service_assignment",

  // Booking lifecycle
  booking_created: "phs_bookings",
  booking_confirmed: "phs_bookings",
  booking_rescheduled: "phs_bookings",
  service_started: "phs_bookings",
  service_completed: "phs_bookings",
  review_received: "phs_bookings",
  extension_approved: "phs_bookings",
  extension_payment_pending: "phs_bookings",
  extension_paid: "phs_bookings",
  extension_activated: "phs_bookings",
  time_remaining_30m: "phs_bookings",
  time_completed: "phs_bookings",

  // Critical — needs attention immediately
  booking_cancelled: "phs_critical",
  partner_reassigned: "phs_critical",
  partner_rejected: "phs_critical",
  dispatch_exhausted: "phs_critical",
  booking_payment_failed: "phs_critical",
  extension_requested: "phs_critical",
  extension_rejected: "phs_critical",
  sos_alert: "phs_critical",

  // General — informational
  general: "phs_general",
  referral_reward: "phs_general",
  referral_bonus: "phs_general",
  partner_referral_reward: "phs_general",
  partner_referral_bonus: "phs_general",
  wallet_recharge: "phs_general",
  offer_purchase: "phs_general",
  payout_requested: "phs_general",
  payout_approved: "phs_general",
  payout_rejected: "phs_general",
  payout_processing: "phs_general",
  payout_paid: "phs_general",
  payout_cancelled: "phs_general",
  kyc_action_required: "phs_general",
  kyc_police_overdue: "phs_general",
};

/** Helper to resolve the channel config for a notification type. */
export function channelForType(type: NotificationType): NotificationChannelConfig {
  const channelId = NOTIFICATION_TYPE_CHANNEL[type] ?? "phs_general";
  return NOTIFICATION_CHANNELS[channelId] ?? NOTIFICATION_CHANNELS.phs_general;
}

/** Types that carry a booking reference and should deep-link to it. */
export const BOOKING_LINKED_TYPES = new Set<NotificationType>([
  "booking_created",
  "booking_confirmed",
  "booking_rescheduled",
  "booking_cancelled",
  "partner_assigned",
  "partner_reassigned",
  "partner_rejected",
  "service_started",
  "service_completed",
  "new_job_offer",
  "extension_requested",
  "extension_approved",
  "extension_rejected",
  "extension_payment_pending",
  "extension_paid",
  "extension_activated",
  "time_remaining_30m",
  "time_completed",
  "dispatch_exhausted",
  "booking_payment_failed",
  "sos_alert",
]);

// ─── In-App Audible Alert Routing ─────────────────────────────
// The web + foreground in-app "chime" must mirror OS loud-channel
// behaviour: ring whenever the type routes to a channel with
// sound "service_alert". Partner job alerts (service_assignment)
// ring only inside the partner portal; critical alerts
// (phs_critical) ring regardless of portal.

/** Types whose canonical channel plays a custom alert sound. */
export const IN_APP_AUDIBLE_TYPES: Set<NotificationType> = new Set(
  (Object.entries(NOTIFICATION_TYPE_CHANNEL) as [NotificationType, string][])
    .filter(([, channelId]) => NOTIFICATION_CHANNELS[channelId]?.sound === "service_alert")
    .map(([type]) => type)
);

/** Job-offer/assignment types: the chime is partner-portal-only. */
export const PARTNER_JOB_AUDIBLE_TYPES: Set<NotificationType> = new Set([
  "new_job_offer",
  "partner_assigned",
]);

export type Portal = "customer" | "partner" | "admin" | "other";

/**
 * Whether the in-app alert tone + bell flash should fire for this type.
 * Partner job alerts chime only inside the partner portal; critical alerts
 * (phs_critical channel) chime regardless of portal.
 */
export function shouldChimeInApp(type: NotificationType, portal: Portal): boolean {
  if (!IN_APP_AUDIBLE_TYPES.has(type)) return false;
  if (PARTNER_JOB_AUDIBLE_TYPES.has(type)) return portal === "partner";
  return true;
}