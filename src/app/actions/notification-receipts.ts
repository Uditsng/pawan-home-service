/**
 * Notification Delivery Receipts — Server Actions
 *
 * Client-observed confirmation that a notification reached its destination.
 * Receipts advance `notification_deliveries.status` along the monotonic
 * ladder (firebase_accepted → delivered → opened → read) and stamp the
 * matching in-app `notifications` row.
 *
 *   delivered  — FCM message received while the app is foregrounded
 *   opened     — user tapped the push/local notification
 *   read       — user read the row inside the bell dropdown
 *
 * Security: runs with the caller's own RLS (`createClient`), so it can only
 * ever touch rows where `user_id = auth.uid()`. Never use the admin client.
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import type { NotificationType } from "@/lib/types";

export type NotificationReceiptEvent = "delivered" | "opened" | "read";

export interface NotificationReceiptInput {
  /** Which client-observed stage the notification reached. */
  event: NotificationReceiptEvent;
  /**
   * Exact in-app notification row id (used by the bell "read" path).
   * When present the signature fields below are ignored.
   */
  notificationId?: string;
  /** FCM push path: resolve the latest matching row via signature. */
  type?: NotificationType;
  metadata?: Record<string, unknown> | null;
}

/** Monotonic advance ladder: which prior statuses may move to each receipt. */
const RECEIPT_ADVANCE_FROM: Record<NotificationReceiptEvent, string[]> = {
  delivered: ["firebase_accepted"],
  opened: ["firebase_accepted", "delivered"],
  read: ["firebase_accepted", "delivered", "opened"],
};

const VALID_EVENTS: NotificationReceiptEvent[] = ["delivered", "opened", "read"];

export async function reportNotificationReceipt(
  input: NotificationReceiptInput
): Promise<{ success: boolean; error?: string }> {
  if (!input || !input.event || !VALID_EVENTS.includes(input.event)) {
    return { success: false, error: "Invalid receipt event." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  try {
    // ── 1. Resolve the notification row id ─────────────────────
    let notificationId: string | null = input.notificationId || null;

    if (!notificationId) {
      if (!input.type) {
        return { success: false, error: "Missing notification id or type." };
      }

      const meta = input.metadata || {};
      const bookingId = meta.booking_id ? String(meta.booking_id) : null;
      const campaignId = meta.campaign_id ? String(meta.campaign_id) : null;

      // Signature match: the latest own row for (type, booking/campaign ref).
      let query = supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", input.type)
        .order("created_at", { ascending: false })
        .limit(1);

      query = bookingId ? query.eq("booking_id", bookingId) : query.is("booking_id", null);
      if (campaignId) query = query.eq("metadata->>campaign_id", campaignId);

      const { data: rows, error: fetchErr } = await query;
      if (fetchErr) {
        console.error("[Notification Receipts] Signature resolution failed:", fetchErr.message);
        return { success: false, error: "Failed to resolve notification." };
      }

      const row = rows && rows.length > 0 ? rows[0] : null;
      if (!row) {
        return { success: true }; // nothing to ack — drop silently
      }
      notificationId = row.id as string;
    }

    // ── 2. Advance the recipient's delivery ledger rows ─────────
    const now = new Date().toISOString();
    const target = input.event;

    const { error: updErr } = await supabase
      .from("notification_deliveries")
      .update({ status: target, updated_at: now })
      .eq("notification_id", notificationId)
      .eq("user_id", user.id)
      .in("status", RECEIPT_ADVANCE_FROM[target]);

    if (updErr) {
      // The ledger may not be migrated yet in some environments — never break
      // the notification UX because of a receipt callback.
      console.error("[Notification Receipts] Ledger update failed:", updErr.message);
    }

    // ── 3. Stamp the in-app row (open/read + delivery_status) ───
    const rowPatch: Record<string, unknown> = {
      delivery_status: target,
      updated_at: now,
    };
    if (target === "opened") {
      rowPatch.opened_at = now;
    }
    if (target === "read") {
      rowPatch.read_at = now;
      const { data: notifRow } = await supabase
        .from("notifications")
        .select("opened_at")
        .eq("id", notificationId)
        .single();
      // Reading implies the row was at least opened (don't regress a real tap).
      if (!(notifRow && (notifRow as { opened_at: string | null }).opened_at)) {
        rowPatch.opened_at = now;
      }
    }

    const { error: stampErr } = await supabase
      .from("notifications")
      .update(rowPatch)
      .eq("id", notificationId);
    if (stampErr) {
      console.error("[Notification Receipts] Row stamp failed:", stampErr.message);
    }

    return { success: true };
  } catch (err) {
    console.error("[Notification Receipts] Error:", (err as Error).message);
    return { success: false, error: "Failed to record receipt." };
  }
}