/**
 * Notification Service — Server-Side Only
 *
 * Centralised service to:
 *   1. Insert in-app notification records in the database.
 *   2. Dispatch FCM push notifications (if configured).
 *
 * Notifications are ASYNCHRONOUS — they never block the caller.
 * Failures are logged but never propagated to the booking flow.
 */

"use server";

import { createClient } from "@/utils/supabase/server";
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
  const { userIds, title, body, type, metadata = {} } = params;
  const targets = Array.isArray(userIds) ? userIds : [userIds];

  if (targets.length === 0) return;

  try {
    const supabase = await createClient();

    // 1. Batch insert in-app notification records
    const notificationRows = targets.map((userId) => ({
      user_id: userId,
      title,
      body,
      type,
      metadata,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (insertError) {
      console.error("[notifications] DB insert failed:", insertError.message);
      // Continue — try FCM anyway
    }

    // 2. Attempt FCM push (non-critical)
    await sendFcmPush(targets, title, body, type, metadata);
  } catch (err) {
    // Never throw — notifications must not break the caller
    console.error("[notifications] Unexpected error:", (err as Error).message);
  }
}

// ─── FCM Push Helper ────────────────────────────────────────

async function sendFcmPush(
  userIds: string[],
  title: string,
  body: string,
  type: NotificationType,
  metadata: Record<string, unknown>
): Promise<void> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return; // FCM not configured

  try {
    const supabase = await createClient();

    // Fetch all FCM tokens for the target users
    const { data: tokenRows, error: tokenError } = await supabase
      .from("notification_tokens")
      .select("fcm_token, user_id")
      .in("user_id", userIds);

    if (tokenError || !tokenRows || tokenRows.length === 0) {
      // No tokens registered — skip silently
      return;
    }

    const tokens = tokenRows.map((t: { fcm_token: string }) => t.fcm_token);

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
        priority: "high",
        notification: {
          channelId: "phs_bookings",
          icon: "ic_notification",
          color: "#002261",
        },
      },
      // Web push config
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          icon: "/PHS.png",
          badge: "/PHS.png",
        },
      },
    });

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          resp.error &&
          (resp.error.code === "messaging/registration-token-not-registered" ||
            resp.error.code === "messaging/invalid-registration-token")
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await supabase
          .from("notification_tokens")
          .delete()
          .in("fcm_token", invalidTokens);

        console.warn(
          `[notifications] Cleaned ${invalidTokens.length} stale FCM token(s).`
        );
      }
    }
  } catch (err) {
    console.error("[notifications] FCM push error:", (err as Error).message);
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
  return sendNotification({ userIds: customerId, title, body, type, metadata });
}

/** Notify a partner about a job */
export async function notifyPartner(
  partnerId: string,
  title: string,
  body: string,
  type: NotificationType,
  metadata?: Record<string, unknown>
): Promise<void> {
  return sendNotification({ userIds: partnerId, title, body, type, metadata });
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
    return sendNotification({ userIds: adminIds, title, body, type, metadata });
  } catch (err) {
    console.error("[notifications] notifyAdmins error:", (err as Error).message);
  }
}
