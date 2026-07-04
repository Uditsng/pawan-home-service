/**
 * Notification Service — Server-Side Only
 *
 * Centralised service to:
 *   1. Insert in-app notification records in the database (idempotent).
 *   2. Dispatch FCM push notifications with priority, TTL, collapse/group keys.
 *
 * Notifications are ASYNCHRONOUS — they never block the caller.
 * Failures are logged but never propagated to the booking flow.
 */

import "server-only";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getFirebaseMessaging } from "@/lib/firebase-admin";
import type { NotificationType } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────

interface SendNotificationParams {
  /** Single user ID or array of user IDs to notify */
  userIds: string | string[];
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  recipientRole?: 'customer' | 'partner' | 'admin';
}

// ─── Classification Helpers ─────────────────────────────────

function getNotificationPriority(type: NotificationType): "high" | "normal" {
  const highPriorityTypes: NotificationType[] = [
    "new_job_offer",
    "partner_assigned",
    "extension_requested",
  ];
  if (highPriorityTypes.includes(type)) return "high";
  return "normal";
}

function getNotificationTtl(type: NotificationType): number {
  // Returns TTL in seconds
  switch (type) {
    case "new_job_offer":
      return 10 * 60; // 10 minutes
    case "extension_requested":
      return 15 * 60; // 15 minutes
    case "booking_created":
    case "booking_confirmed":
    case "partner_assigned":
    case "partner_reassigned":
    case "service_started":
    case "service_completed":
    case "booking_cancelled":
      return 24 * 3600; // 24 hours
    default:
      return 48 * 3600; // 48 hours default (promotional / general)
  }
}

function getCollapseKey(type: NotificationType, bookingId: string | null): string | undefined {
  if (!bookingId) return undefined;
  switch (type) {
    case "new_job_offer":
      return `new_job_offer_${bookingId}`;
    case "extension_requested":
      return `extension_requested_${bookingId}`;
    default:
      return undefined;
  }
}

// ─── Core Send Function ─────────────────────────────────────

/**
 * Send an in-app notification (stored in DB) and optionally a
 * push notification via FCM.
 *
 * This function is fire-and-forget when called from booking flows.
 * Wrap in a void Promise to keep the caller non-blocking:
 *
 *   void sendNotification({ ... })
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { userIds, title, body, type, metadata = {}, recipientRole } = params;
  const targets = Array.isArray(userIds) ? userIds : [userIds];

  if (targets.length === 0) return;

  const bookingId = (metadata?.booking_id as string) || null;
  const role = (metadata?.role as string) || null;

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    console.log(`[Notification Pipeline] [1. TRIGGER] Event: ${type}, Booking: ${bookingId}, RecipientsCount: ${targets.length}`);
  }

  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const version = (metadata?.event_version as number) || 1;

    // Dedup key uses a 5-minute time bucket to allow legitimate re-sends
    // (e.g. partner rejection then reassignment of same booking) while still
    // preventing pure duplicates triggered by accidental double-calls.
    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-min window

    // 1. Batch insert in-app notification records (Idempotent using dedup_key)
    const notificationRows = targets.map((userId) => {
      const dedupKey = `${bookingId || "global"}:${userId}:${type}:${version}:${timeBucket}`;
      return {
        user_id: userId,
        title,
        body,
        message: body,
        type,
        metadata,
        booking_id: bookingId,
        role,
        is_read: false,
        dedup_key: dedupKey,
        delivery_status: "created",
      };
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("notifications")
      .upsert(notificationRows, { onConflict: "dedup_key", ignoreDuplicates: true })
      .select("id, user_id");

    if (insertError) {
      console.error(`[Notification Pipeline] [2. DB_INSERT] Failed: ${insertError.message}`);
      // Fallback: continue trying FCM anyway with all targets
    }

    const successfulUserIds = inserted ? inserted.map((row: { user_id: string }) => row.user_id) : targets;
    const notificationIds = inserted ? inserted.map((row: { id: string }) => row.id) : [];

    if (inserted && successfulUserIds.length === 0) {
      if (isDev) {
        console.log(`[Notification Pipeline] [2. DB_INSERT] [IDEMPOTENCY] Duplicate within 5-min window for booking ${bookingId} — FCM skipped.`);
      }
      return; // Skip duplicate FCM notifications within the same time window
    }

    if (isDev) {
      console.log(`[Notification Pipeline] [2. DB_INSERT] Saved: ${successfulUserIds.length} rows`);
    }

    // 1.5 Log notification delivery events to audit trail if booking_id exists
    if (bookingId) {
      await supabaseAdmin.from("booking_audit_trail").insert({
        booking_id: bookingId,
        action: "NOTIFICATION_SENT",
        actor: "SYSTEM",
        metadata: {
          title,
          type,
          role,
          message: body,
        },
      });
    }

    // 2. Attempt FCM push (non-critical) for successfully inserted rows
    await sendFcmPush(successfulUserIds, notificationIds, inserted, title, body, type, metadata, recipientRole);
  } catch (err) {
    console.error(`[Notification Pipeline] [ERROR] Unexpected error:`, (err as Error).message);
  }
}

// ─── FCM Push Helper ────────────────────────────────────────

async function sendFcmPush(
  userIds: string[],
  notificationIds: string[],
  insertedRows: { id: string; user_id: string }[] | null,
  title: string,
  body: string,
  type: NotificationType,
  metadata: Record<string, unknown>,
  recipientRole?: 'customer' | 'partner' | 'admin'
): Promise<void> {
  const messaging = getFirebaseMessaging();
  
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!messaging) {
    // FCM not configured
    if (notificationIds.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .update({ delivery_status: "delivery_failed" })
        .in("id", notificationIds);
    }
    return; 
  }

  try {
    // Fetch all FCM tokens and platform details for the target users
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from("notification_tokens")
      .select("fcm_token, user_id, platform")
      .in("user_id", userIds);

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      // No tokens registered — mark delivery status as failed
      if (notificationIds.length > 0) {
        await supabaseAdmin
          .from("notifications")
          .update({ delivery_status: "delivery_failed" })
          .in("id", notificationIds);
      }
      return;
    }

    const tokens = tokenRows.map((t: { fcm_token: string }) => t.fcm_token);

    const isPartnerJobAlert = recipientRole === 'partner' && (type === 'new_job_offer' || type === 'partner_assigned');
    const channelId = isPartnerJobAlert ? 'service_assignment' : 'phs_bookings';
    const iosSound = isPartnerJobAlert ? 'service_alert.wav' : 'default';

    const priority = getNotificationPriority(type);
    const ttlSeconds = getNotificationTtl(type);
    const bookingId = (metadata?.booking_id as string) || null;
    const collapseKey = getCollapseKey(type, bookingId);

    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      console.log(`[Notification Pipeline] [4. FCM_REQUEST] Tokens: ${tokens.length}, Channel: ${channelId}, Priority: ${priority}, TTL: ${ttlSeconds}s`);
    }

    // Set status to 'sent_to_firebase'
    if (notificationIds.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .update({ delivery_status: "sent_to_firebase" })
        .in("id", notificationIds);
    }

    // Send multicast message
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        type,
        metadata: JSON.stringify(metadata),
      },
      // Android-specific config
      android: {
        priority: priority,
        ttl: ttlSeconds * 1000, // FCM Node.js Admin SDK takes TTL in milliseconds
        collapseKey: collapseKey,
        notification: {
          channelId: channelId,
          icon: "ic_notification",
          color: "#002261",
          sound: isPartnerJobAlert ? "service_alert" : "default",
        },
      },
      // iOS-specific config
      apns: {
        headers: {
          "apns-priority": priority === "high" ? "10" : "5",
          "apns-expiration": String(Math.floor(Date.now() / 1000) + ttlSeconds),
          ...(collapseKey ? { "apns-collapse-id": collapseKey } : {}),
        },
        payload: {
          aps: {
            sound: iosSound,
          },
        },
      },
      // Web push config
      webpush: {
        headers: { 
          Urgency: priority === "high" ? "high" : "normal",
          TTL: String(ttlSeconds),
        },
        notification: {
          icon: "/PHS.png",
          badge: "/PHS.png",
        },
      },
    });

    let invalidTokens: string[] = [];
    const userStatusMap: Record<string, "firebase_accepted" | "delivery_failed"> = {};

    // Default all targets to failed
    userIds.forEach(uid => {
      userStatusMap[uid] = "delivery_failed";
    });

    response.responses.forEach((resp, idx) => {
      const token = tokens[idx];
      const row = tokenRows.find(r => r.fcm_token === token);
      const userId = row ? row.user_id : "unknown";
      const platform = row ? row.platform : "unknown";
      const maskedToken = token.length > 15 ? token.substring(0, 5) + "..." + token.substring(token.length - 5) : token;

      if (resp.success) {
        if (row) {
          userStatusMap[row.user_id] = "firebase_accepted";
        }
        if (isDev) {
          console.log(`[Notification Pipeline] [5. FCM_RESPONSE] [SUCCESS] User: ${userId}, Token: ${maskedToken}, Platform: ${platform}`);
        }
      } else if (resp.error) {
        let cleanupAction = "None";
        let retryDecision = "No Retry: Permanent Error";

        if (
          resp.error.code === "messaging/registration-token-not-registered" ||
          resp.error.code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(token);
          cleanupAction = "Deleted token from database";
        } else {
          retryDecision = "No Retry: Configuration / Protocol mismatch error";
        }

        console.error(`[Notification Pipeline] [5. FCM_RESPONSE] [FAILURE]
  User: ${userId}
  Token: ${maskedToken}
  Platform: ${platform}
  Error Code: ${resp.error.code}
  Error Message: ${resp.error.message}
  Cleanup Action: ${cleanupAction}
  Retry Decision: ${retryDecision}`);
      }
    });

    if (invalidTokens.length > 0) {
      await supabaseAdmin
        .from("notification_tokens")
        .delete()
        .in("fcm_token", invalidTokens);

      await supabaseAdmin
        .from("device_tokens")
        .delete()
        .in("device_token", invalidTokens);
    }

    // Update database status of each notification row matching the status of their FCM dispatch
    if (notificationIds.length > 0 && insertedRows && insertedRows.length > 0) {
      for (const row of insertedRows) {
        const status = userStatusMap[row.user_id] || "delivery_failed";
        await supabaseAdmin
          .from("notifications")
          .update({ delivery_status: status })
          .eq("id", row.id);
      }
    }

    if (isDev) {
      console.log(`[Notification Pipeline] [5. FCM_RESPONSE] Successes: ${response.successCount}, Failures: ${response.failureCount}, Cleaned: ${invalidTokens.length}`);
    }
  } catch (err) {
    console.error(`[Notification Pipeline] [ERROR] FCM push error:`, (err as Error).message);
    if (notificationIds.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .update({ delivery_status: "delivery_failed" })
        .in("id", notificationIds);
    }
  }
}

// ─── Convenience Helpers ────────────────────────────────────

/** Notify a customer about their booking */
export async function notifyCustomer(
  customerId: string,
  title: string,
  body: string,
  type: NotificationType,
  metadata?: Record<string, unknown>
): Promise<void> {
  return sendNotification({ userIds: customerId, title, body, type, metadata, recipientRole: 'customer' });
}

/** Notify a partner about a job */
export async function notifyPartner(
  partnerId: string,
  title: string,
  body: string,
  type: NotificationType,
  metadata?: Record<string, unknown>
): Promise<void> {
  return sendNotification({ userIds: partnerId, title, body, type, metadata, recipientRole: 'partner' });
}

/** Notify all admins */
export async function notifyAdmins(
  title: string,
  body: string,
  type: NotificationType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!admins || admins.length === 0) return;

    const adminIds = admins.map((a: { id: string }) => a.id);
    return sendNotification({ userIds: adminIds, title, body, type, metadata, recipientRole: 'admin' });
  } catch (err) {
    console.error("[notifications] notifyAdmins error:", (err as Error).message);
  }
}


