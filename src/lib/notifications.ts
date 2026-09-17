/**
 * Notification Service — Server-Side Only
 *
 * Centralised service to:
 *   1. Insert in-app notification records in the database (idempotent).
 *   2. Enqueue per-recipient-per-device delivery ledger rows
 *      (public.notification_deliveries) for the drain worker to dispatch.
 *   3. Drain the ledger: claim → FCM multicast (≤450 tokens/call) → retry →
 *      update ledger/notification status + campaign stats.
 *
 * Design (Milestones 1–3):
 *   - Notifications are ASYNCHRONOUS — they never block the caller.
 *   - Small fan-outs (≤450 tokens) are dispatched INLINE via a scoped claim
 *     so booking flows get instant, atomic delivery.
 *   - Large fan-outs stay `queued` and are drained by the scheduled worker
 *     (#/api/notifications/deliver) or the admin campaign loop.
 *   - Concurrency is safe: only claim_* RPCs (FOR UPDATE SKIP LOCKED) may
 *     move rows into `in_flight`, so no row is ever sent twice.
 *   - Failures are logged but never propagated to the booking flow.
 */

import "server-only";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getFirebaseMessaging } from "@/lib/firebase-admin";
import {
  classifyFcmError,
  channelForType,
  DRAINABLE_STATUSES,
  RETRY_MAX_ATTEMPTS,
  retryDelayMs,
  TERMINAL_STATUSES,
} from "@/lib/notifications/types";
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

/** A claimed (in_flight) ledger row returned by a claim RPC. */
interface LedgerRow {
  id: string;
  notification_id: string | null;
  campaign_id: string | null;
  user_id: string;
  token_id: string | null;
  fcm_token: string | null;
  platform: string | null;
  status: string;
  retry_count: number;
}

interface DispatchSummary {
  claimed: number;
  firebaseAccepted: number;
  retryable: number;
  failed: number;
  degraded: number;
}

// ─── Prefs & Helpers ────────────────────────────────────────

const FCM_MULTICAST_LIMIT = 450; // FCM hard limit is 500; we stay safe.
const INLINE_DRAIN_LIMIT = 450;

/** Ledger statuses that still need worker attention (queued/retryable + claimed). */
const PENDING_STATUSES: string[] = [...DRAINABLE_STATUSES, "in_flight"];

function supabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
 * Create an in-app notification (stored in DB) and enqueue its delivery
 * ledger rows. Small event fan-outs are dispatched inline; large broadcast
 * fan-outs are left for the drain worker.
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
  const role = recipientRole || (metadata?.role as string) || null;
  const campaignId = (metadata?.campaign_id as string) || null;

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    console.log(`[Notification Pipeline] [1. TRIGGER] Event: ${type}, Booking: ${bookingId}, Campaign: ${campaignId}, RecipientsCount: ${targets.length}`);
  }

  try {
    const supabase = supabaseAdmin();

    const version = (metadata?.event_version as number) || 1;

    // Dedup key uses a 5-minute time bucket to allow legitimate re-sends
    // (e.g. partner rejection then reassignment of same booking) while still
    // preventing pure duplicates triggered by accidental double-calls.
    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-min window

    // 1. Batch insert in-app notification records (Idempotent using dedup_key)
    const notificationRows = targets.map((userId) => {
      const dedupKey = `${campaignId || bookingId || "global"}:${userId}:${type}:${version}:${timeBucket}`;
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

    const { data: inserted, error: insertError } = await supabase
      .from("notifications")
      .upsert(notificationRows, { onConflict: "dedup_key", ignoreDuplicates: true })
      .select("id, user_id");

    if (insertError) {
      console.error(`[Notification Pipeline] [2. DB_INSERT] Failed: ${insertError.message}`);
      return; // Cannot enqueue without valid notification IDs.
    }

    const insertedRows = inserted || [];
    const successfulUserIds = insertedRows.map((row) => row.user_id);

    if (inserted && successfulUserIds.length === 0) {
      if (isDev) {
        console.log(`[Notification Pipeline] [2. DB_INSERT] [IDEMPOTENCY] Duplicate within 5-min window for booking ${bookingId} — send skipped.`);
      }
      return; // Skip duplicate sends within the same time window
    }

    if (isDev) {
      console.log(`[Notification Pipeline] [2. DB_INSERT] Saved: ${successfulUserIds.length} rows`);
    }

    // 1.5 Log notification delivery events to audit trail if booking_id exists
    if (bookingId) {
      await supabase.from("booking_audit_trail").insert({
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

    // 2. Enqueue delivery ledger rows (queued per device token, degraded if no FCM)
    const enqueued = await enqueueDeliveryLedger(
      supabase,
      insertedRows,
      campaignId
    );

    // 3. Fast-path: dispatch small fan-outs inline so job alerts are instant.
    if (enqueued.tokenRows > 0 && enqueued.tokenRows <= INLINE_DRAIN_LIMIT) {
      await drainNotificationDeliveries({
        batchSize: INLINE_DRAIN_LIMIT,
        scopedNotificationIds: enqueued.notificationIds,
      });
    }
  } catch (err) {
    console.error(`[Notification Pipeline] [ERROR] Unexpected error:`, (err as Error).message);
  }
}

// ─── Enqueue Section ────────────────────────────────────────

interface EnqueueResult {
  notificationIds: string[];
  tokenRows: number;
}

/**
 * Insert ledger rows for freshly-created notification rows:
 *   - one row per active device token  (status 'queued')
 *   - one 'no_token' row per recipient with no registered device
 * When FCM is unconfigured, rows are recorded as 'degraded' (in-app only).
 * Returns the notification ids + count of token-bearing rows.
 */
async function enqueueDeliveryLedger(
  supabase: ReturnType<typeof supabaseAdmin>,
  insertedRows: { id: string; user_id: string }[],
  campaignId: string | null
): Promise<EnqueueResult> {
  const notificationIds = insertedRows.map((r) => r.id);
  if (notificationIds.length === 0) return { notificationIds, tokenRows: 0 };

  const userIds = [...new Set(insertedRows.map((r) => r.user_id))];

  // Resolve ONLY active tokens (M2: unregistered tokens are deactivated, not deleted).
  const { data: tokenRows, error: tokenError } = await supabase
    .from("notification_tokens")
    .select("id, fcm_token, user_id, platform")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (tokenError) {
    console.error("[Notification Pipeline] [ENQUEUE] Failed to resolve tokens:", tokenError.message);
  }

  const tokensByUser = new Map<string, { id: string; fcm_token: string; user_id: string; platform: string }[]>();
  (tokenRows || []).forEach((t) => {
    const list = tokensByUser.get(t.user_id) || [];
    list.push(t);
    tokensByUser.set(t.user_id, list);
  });

  const fcmConfigured = getFirebaseMessaging() !== null;

  const ledgerRows: Record<string, unknown>[] = [];
  let tokenRowCount = 0;

  for (const row of insertedRows) {
    const userTokens = tokensByUser.get(row.user_id) || [];

    if (userTokens.length === 0) {
      ledgerRows.push({
        notification_id: row.id,
        campaign_id: campaignId,
        user_id: row.user_id,
        token_id: null,
        fcm_token: null,
        platform: null,
        status: fcmConfigured ? "no_token" : "degraded",
      });
      continue;
    }

    for (const t of userTokens) {
      ledgerRows.push({
        notification_id: row.id,
        campaign_id: campaignId,
        user_id: row.user_id,
        token_id: t.id,
        fcm_token: t.fcm_token,
        platform: t.platform,
        status: fcmConfigured ? "queued" : "degraded",
      });
      tokenRowCount++;
    }
  }

  if (ledgerRows.length > 0) {
    const { error: ledgerError } = await supabase.from("notification_deliveries").insert(ledgerRows);
    if (ledgerError) {
      console.error("[Notification Pipeline] [ENQUEUE] Ledger insert failed:", ledgerError.message);
    }
  }

  return { notificationIds, tokenRows: tokenRowCount };
}

// ─── Drain Worker Section ───────────────────────────────────

export interface DrainOptions {
  batchSize?: number;
  scopedNotificationIds?: string[];
}

export interface DrainResult {
  claimed: number;
  dispatched: number;
  firebaseAccepted: number;
  retryable: number;
  failed: number;
  degraded: number;
  reclaimed: number;
}

/**
 * Drain queued/retryable ledger rows and dispatch them via FCM.
 *
 * Used by:
 *   - the scheduled worker  → /api/notifications/deliver
 *   - the admin "send now" campaign loop
 *   - the inline fast-path (scoped to freshly-created notification ids)
 *
 * Unless scoped, rows are claimed FIFO (oldest first) with FOR UPDATE
 * SKIP LOCKED so concurrent workers never double-deliver.
 */
export async function drainNotificationDeliveries(options: DrainOptions = {}): Promise<DrainResult> {
  const { batchSize = 200, scopedNotificationIds } = options;
  const supabase = supabaseAdmin();
  const messaging = getFirebaseMessaging();

  let reclaimed = 0;
  try {
    const { data: reclaimedData } = await supabase.rpc("reclaim_stale_notification_deliveries", {
      p_stale_after: "10 minutes",
    });
    reclaimed = reclaimedData ?? 0;
  } catch {
    // reclaim is best-effort — a missing RPC must not stop the drain
  }

  // No FCM configured: nothing can be dispatched. Flip every queued/retryable
  // row to 'degraded' so the queue never grows invisibly (guard-free: without
  // a messaging instance these rows can never deliver regardless of history).
  if (!messaging) {
    const { data: flipped } = await supabase
      .from("notification_deliveries")
      .update({ status: "degraded", updated_at: new Date().toISOString() })
      .in("status", [...DRAINABLE_STATUSES])
      .select("id");
    return { claimed: 0, dispatched: 0, firebaseAccepted: 0, retryable: 0, failed: 0, degraded: flipped?.length ?? 0, reclaimed };
  }

  // 1. Claim rows atomically (only the claim RPCs may move rows to in_flight).
  let rows: LedgerRow[] = [];
  try {
    if (scopedNotificationIds && scopedNotificationIds.length > 0) {
      const { data, error } = await supabase.rpc("claim_notification_deliveries_for", {
        p_notification_ids: scopedNotificationIds,
        p_batch_size: batchSize,
      });
      if (error) throw error;
      rows = (data || []) as LedgerRow[];
    } else {
      const { data, error } = await supabase.rpc("claim_notification_deliveries", {
        p_batch_size: batchSize,
      });
      if (error) throw error;
      rows = (data || []) as LedgerRow[];
    }
  } catch (err) {
    console.error("[Notification Pipeline] [DRAIN] Claim failed:", (err as Error).message);
    return { claimed: 0, dispatched: 0, firebaseAccepted: 0, retryable: 0, failed: 0, degraded: 0, reclaimed };
  }

  if (rows.length === 0) {
    return { claimed: 0, dispatched: 0, firebaseAccepted: 0, retryable: 0, failed: 0, degraded: 0, reclaimed };
  }

  const summary = await dispatchLedgerRows(supabase, rows, messaging);

  return {
    dispatched: summary.firebaseAccepted + summary.retryable,
    ...summary,
    reclaimed,
  };
}

// ─── Dispatch Section ───────────────────────────────────────

interface DispatchGroup extends LedgerRow {
  notification_title: string;
  notification_body: string;
  notification_type: NotificationType;
  notification_metadata: Record<string, unknown>;
}

/**
 * Dispatch a batch of claimed (in_flight) ledger rows:
 *   - group rows by identical message content (title/body/type/metadata)
 *   - multicast each group in ≤450-token chunks
 *   - classify every response and persist truthful ledger status + retries
 *   - update legacy notifications.delivery_status in bulk
 *   - refresh campaign stats (honest counters) for affected campaigns
 */
async function dispatchLedgerRows(
  supabase: ReturnType<typeof supabaseAdmin>,
  rows: LedgerRow[],
  messaging: NonNullable<ReturnType<typeof getFirebaseMessaging>>
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: rows.length, firebaseAccepted: 0, retryable: 0, failed: 0, degraded: 0 };

  // Load the notification content for every claimed row.
  const notificationIds = [...new Set(rows.map((r) => r.notification_id).filter((id): id is string => !!id))];
  let notificationMap = new Map<string, { title: string; body: string; type: NotificationType; metadata: Record<string, unknown> }>();

  if (notificationIds.length > 0) {
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, title, body, type, metadata")
      .in("id", notificationIds);
    notificationMap = new Map((notifs || []).map((n) => [
      n.id,
      { title: n.title, body: n.body, type: n.type as NotificationType, metadata: (n.metadata || {}) as Record<string, unknown> },
    ]));
  }

  // Group by identical message content so one multicast can serve many users.
  const groups = new Map<string, DispatchGroup[]>();
  for (const row of rows) {
    const n = row.notification_id ? notificationMap.get(row.notification_id) : null;
    const title = n?.title || "";
    const body = n?.body || "";
    const type = (n?.type || (row.notification_id ? "general" : "general")) as NotificationType;
    const metadata = n?.metadata || {};
    const bookingId = (metadata?.booking_id as string) || null;
    const channel = channelForType(type).id;
    const key = JSON.stringify({ title, body, type, metadata, channel, priority: getNotificationPriority(type), ttl: getNotificationTtl(type), collapse: getCollapseKey(type, bookingId) });

    const group = groups.get(key) || [];
    group.push({ ...row, notification_title: title, notification_body: body, notification_type: type, notification_metadata: metadata });
    groups.set(key, group);
  }

  const now = new Date().toISOString();
  const resultRows: { id: string; status: string; next_retry_at?: string; retry_count?: number; fcm_error_code?: string | null; fcm_error_msg?: string | null; updated_at: string }[] = [];

  for (const group of groups.values()) {
    const row = group[0];
    const bookingId = (row.notification_metadata?.booking_id as string) || null;
    const priority = getNotificationPriority(row.notification_type);
    const ttlSeconds = getNotificationTtl(row.notification_type);
    const collapseKey = getCollapseKey(row.notification_type, bookingId);
    const channel = channelForType(row.notification_type);
    const iosSound = channel.sound === "service_alert" ? "service_alert.wav" : "default";

    // Token-bearing rows only (no_token/degraded rows have no device to send to).
    const rowsWithTokens = group.filter((g) => g.fcm_token);

    if (rowsWithTokens.length === 0) {
      group.forEach((g) => resultRows.push({ id: g.id, status: g.fcm_token ? "failed_permanent" : "no_token", updated_at: now }));
      continue;
    }

    // Chunk into ≤450-token multicast calls.
    for (let start = 0; start < rowsWithTokens.length; start += FCM_MULTICAST_LIMIT) {
      const chunk = rowsWithTokens.slice(start, start + FCM_MULTICAST_LIMIT);
      const tokens = chunk.map((c) => c.fcm_token!).filter((t): t is string => !!t);

      let responses: { success: boolean; error?: { code?: string; message?: string } }[] = [];
      try {
        const st = await messaging.sendEachForMulticast({
          tokens,
          notification: { title: row.notification_title, body: row.notification_body },
          data: {
            type: row.notification_type,
            metadata: JSON.stringify(row.notification_metadata),
          },
          android: {
            priority,
            ttl: ttlSeconds * 1000,
            collapseKey,
            notification: {
              channelId: channel.id,
              icon: "ic_notification",
              color: "#002261",
              sound: channel.sound === "service_alert" ? "service_alert" : "default",
            },
          },
          apns: {
            headers: {
              "apns-priority": priority === "high" ? "10" : "5",
              "apns-expiration": String(Math.floor(Date.now() / 1000) + ttlSeconds),
              ...(collapseKey ? { "apns-collapse-id": collapseKey } : {}),
            },
            payload: { aps: { sound: iosSound } },
          },
          webpush: {
            headers: { Urgency: priority === "high" ? "high" : "normal", TTL: String(ttlSeconds) },
            notification: { icon: "/PHS.png", badge: "/PHS.png" },
          },
        });
        responses = st.responses;
      } catch (err) {
        console.error("[Notification Pipeline] [5. FCM_REQUEST] Multicast error:", (err as Error).message);
        // Whole chunk failed at transport level — classify as retryable.
        responses = tokens.map(() => ({ success: false, error: { code: "", message: (err as Error).message } }));
      }

      chunk.forEach((c, idx: number) => {
        const resp = responses[idx];
        const masked = c.fcm_token && c.fcm_token.length > 15 ? c.fcm_token.substring(0, 5) + "..." + c.fcm_token.substring(c.fcm_token.length - 5) : c.fcm_token;

        if (resp?.success) {
          summary.firebaseAccepted++;
          resultRows.push({ id: c.id, status: "firebase_accepted", updated_at: now });
          if (isDevLog()) console.log(`[Notification Pipeline] [5. FCM_RESPONSE] [SUCCESS] User: ${c.user_id}, Token: ${masked}, Platform: ${c.platform}`);
          return;
        }

        const code = resp?.error?.code || null;
        const cls = classifyFcmError(code);

        if (cls === "unregistered") {
          summary.failed++;
          resultRows.push({
            id: c.id,
            status: "failed_unregistered",
            fcm_error_code: code,
            fcm_error_msg: resp?.error?.message || null,
            updated_at: now,
          });
          console.error(`[Notification Pipeline] [5. FCM_RESPONSE] [UNREGISTERED] User: ${c.user_id}, Token: ${masked} — deactivating token.`);
          return;
        }

        if (cls === "retryable" && c.retry_count < RETRY_MAX_ATTEMPTS) {
          summary.retryable++;
          resultRows.push({
            id: c.id,
            status: "retryable",
            retry_count: c.retry_count + 1,
            next_retry_at: new Date(Date.now() + retryDelayMs(c.retry_count)).toISOString(),
            fcm_error_code: code,
            fcm_error_msg: resp?.error?.message || null,
            updated_at: now,
          });
          console.error(`[Notification Pipeline] [5. FCM_RESPONSE] [RETRYABLE] User: ${c.user_id}, Token: ${masked}, Retry#${c.retry_count + 1}`);
          return;
        }

        summary.failed++;
        resultRows.push({
          id: c.id,
          status: "failed_permanent",
          fcm_error_code: code,
          fcm_error_msg: resp?.error?.message || null,
          updated_at: now,
        });
        console.error(`[Notification Pipeline] [5. FCM_RESPONSE] [FAILURE] User: ${c.user_id}, Token: ${masked}, Code: ${code}, Msg: ${resp?.error?.message}`);
      });
    }
  }

  await persistLedgerResults(supabase, resultRows);
  await deactivateUnregisteredTokens(supabase, rows);
  await syncNotificationStatuses(supabase, rows);
  await refreshAffectedCampaigns(supabase, rows);

  return summary;
}

function isDevLog(): boolean {
  return process.env.NODE_ENV === "development";
}

// ─── Persist & Sync Section ─────────────────────────────────

/**
 * Persist ledger results efficiently:
 *   - batch UPDATE by common status (firebase_accepted / failed_*)
 *   - per-row UPDATE for retryable rows (distinct next_retry_at/retry_count)
 *   - deactivate tokens reported as unregistered
 */
async function persistLedgerResults(
  supabase: ReturnType<typeof supabaseAdmin>,
  resultRows: { id: string; status: string; next_retry_at?: string; retry_count?: number; fcm_error_code?: string | null; fcm_error_msg?: string | null; updated_at: string }[]
): Promise<void> {
  const now = new Date().toISOString();

  // Batch by every column that can vary within a status group. Failures carry
  // distinct FCM error codes/messages, so they must NOT be collapsed into one
  // null-code patch (that would discard the diagnostic detail).
  const byKey = new Map<
    string,
    { status: string; code: string | null; msg: string | null; ids: string[] }
  >();
  resultRows.forEach((r) => {
    if (r.status === "retryable") return; // handled per-row below
    const code = r.fcm_error_code ?? null;
    const msg = r.fcm_error_msg ?? null;
    const key = `${r.status}\u0000${code ?? ""}\u0000${msg ?? ""}`;
    const entry = byKey.get(key) ?? { status: r.status, code, msg, ids: [] };
    entry.ids.push(r.id);
    byKey.set(key, entry);
  });

  for (const { status, code, msg, ids } of byKey.values()) {
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "failed_permanent" || status === "failed_unregistered") {
      patch.fcm_error_code = code;
      patch.fcm_error_msg = msg;
    }
    const { error } = await supabase
      .from("notification_deliveries")
      .update(patch)
      .in("id", ids);
    if (error) console.error(`[Notification Pipeline] [UPDATE] Status ${status} failed for ${ids.length} rows:`, error.message);
  }

  // Retryable rows carry per-row retry_count + next_retry_at.
  for (const r of resultRows.filter((x) => x.status === "retryable")) {
    const { error } = await supabase
      .from("notification_deliveries")
      .update({
        status: "retryable",
        retry_count: r.retry_count,
        next_retry_at: r.next_retry_at,
        fcm_error_code: r.fcm_error_code ?? null,
        fcm_error_msg: r.fcm_error_msg ?? null,
        updated_at: now,
      })
      .eq("id", r.id);
    if (error) console.error("[Notification Pipeline] [UPDATE] Retryable row failed:", error.message);
  }
}

/**
 * Deactivate FCM tokens reported as unregistered (M2 multi-device rule):
 * they are deactivated, never deleted — a relogin re-activates them via
 * registerTokenAction. Also purges any legacy device_tokens rows.
 */
async function deactivateUnregisteredTokens(
  supabase: ReturnType<typeof supabaseAdmin>,
  rows: LedgerRow[]
): Promise<void> {
  const claimedIds = rows.map((r) => r.id);
  if (claimedIds.length === 0) return;

  const { data: unregistered, error } = await supabase
    .from("notification_deliveries")
    .select("token_id, fcm_token")
    .in("id", claimedIds)
    .eq("status", "failed_unregistered");

  if (error) {
    console.error("[Notification Pipeline] [DEACTIVATE] Could not read unregistered rows:", error.message);
    return;
  }

  const tokenIds = (unregistered || [])
    .map((r) => (r.token_id ? (r.token_id as string) : null))
    .filter((id): id is string => !!id);

  if (tokenIds.length > 0) {
    const now = new Date().toISOString();
    const { error: tokErr } = await supabase
      .from("notification_tokens")
      .update({ is_active: false, last_token_error_at: now })
      .in("id", tokenIds);
    if (tokErr) console.error("[Notification Pipeline] [DEACTIVATE] notification_tokens update failed:", tokErr.message);
  }

  // Legacy table cleanup is best-effort; it may not exist in every environment.
  const fcmTokens = (unregistered || [])
    .map((r) => (r.fcm_token ? (r.fcm_token as string) : null))
    .filter((t): t is string => !!t);
  if (fcmTokens.length > 0) {
    const { error: devErr } = await supabase.from("device_tokens").delete().in("device_token", fcmTokens);
    if (devErr) {
      console.error("[Notification Pipeline] [DEACTIVATE] device_tokens cleanup skipped:", devErr.message);
    }
  }
}

// ─── Notification Status Sync & Campaign Stats ──────────────

/**
 * Keep the legacy notifications.delivery_status meaningful in bulk:
 *   firebase_accepted  if any ledger row was accepted by FCM
 *   delivery_failed    if all rows failed terminally
 *   created            rows still queued/retryable (or no device at enqueue)
 */
async function syncNotificationStatuses(
  supabase: ReturnType<typeof supabaseAdmin>,
  rows: LedgerRow[]
): Promise<void> {
  const notificationIds = [...new Set(rows.map((r) => r.notification_id).filter((id): id is string => !!id))];
  if (notificationIds.length === 0) return;

  const { data: ledger } = await supabase
    .from("notification_deliveries")
    .select("notification_id, status")
    .in("notification_id", notificationIds);

  // Monotonic: read > opened > delivered > firebase_accepted. A later drain
  // pass must never downgrade a client receipt to firebase_accepted.
  const STAGE_RANK: Record<string, number> = {
    firebase_accepted: 1,
    delivered: 2,
    opened: 3,
    read: 4,
  };

  const aggregate = new Map<string, string>();
  for (const l of ledger || []) {
    if (!l.notification_id) continue;
    const current = aggregate.get(l.notification_id) || "created";
    const currentRank = STAGE_RANK[current] || 0;
    const ledgerRank = STAGE_RANK[l.status] || 0;
    if (ledgerRank > currentRank) {
      aggregate.set(l.notification_id, l.status);
    } else if (
      currentRank === 0 &&
      (l.status === "failed_permanent" || l.status === "failed_unregistered" || l.status === "expired")
    ) {
      aggregate.set(l.notification_id, "delivery_failed");
    }
  }

  const byStatus = new Map<string, string[]>();
  aggregate.forEach((status, notifId) => {
    const ids = byStatus.get(status) || [];
    ids.push(notifId);
    byStatus.set(status, ids);
  });

  for (const [status, ids] of byStatus.entries()) {
    const { error } = await supabase
      .from("notifications")
      .update({ delivery_status: status })
      .in("id", ids);
    if (error) console.error("[Notification Pipeline] [SYNC] Notification status update failed:", error.message);
  }
}

/**
 * Refresh admin_notifications counters from the ledger for every campaign
 * touched by this drain pass, and mark a campaign completed once all of its
 * delivery rows are terminal (none queued/in_flight/retryable).
 */
async function refreshAffectedCampaigns(
  supabase: ReturnType<typeof supabaseAdmin>,
  rows: LedgerRow[]
): Promise<void> {
  const campaignIds = [...new Set(rows.map((r) => r.campaign_id).filter((id): id is string => !!id))];
  for (const campaignId of campaignIds) {
    await refreshCampaignStats(supabase, campaignId);
  }
}

export async function refreshCampaignStats(
  supabase: ReturnType<typeof supabaseAdmin>,
  campaignId: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("notification_deliveries")
    .select("status, user_id")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("[Notification Pipeline] [CAMPAIGN] Stat fetch failed:", error.message);
    return;
  }

  const total = rows?.length || 0;
  const deliveredRows = (rows || []).filter((r) =>
    ["delivered", "opened", "read"].includes(r.status)
  ).length;
  const acceptedRows = (rows || []).filter((r) =>
    ["firebase_accepted", "delivered", "opened", "read"].includes(r.status)
  ).length;
  const failedRows = (rows || []).filter((r) =>
    ["failed_permanent", "failed_unregistered", "expired"].includes(r.status)
  ).length;
  const noTokenRows = (rows || []).filter((r) => r.status === "no_token").length;
  const openedRows = (rows || []).filter((r) => ["opened", "read"].includes(r.status)).length;
  const readRows = (rows || []).filter((r) => r.status === "read").length;

  const recipientCount = new Set((rows || []).map((r) => r.user_id)).size;

  const patch: Record<string, unknown> = {
    recipient_count: recipientCount || 1,
    success_count: acceptedRows,
    failure_count: failedRows,
    delivered_count: deliveredRows,
    opened_count: openedRows,
    read_count: readRows,
    no_token_count: noTokenRows,
  };

  // Mark completed only when every delivery row is terminal
  // (delivered/opened/read/failed_*/expired/no_token/degraded).
  const allTerminal = total > 0 && (rows || []).every((r) => TERMINAL_STATUSES.includes(r.status));
  const { data: campaign } = await supabase
    .from("admin_notifications")
    .select("status")
    .eq("id", campaignId)
    .single();

  if (allTerminal && campaign?.status === "sending") {
    patch.status = "completed";
  }

  const { error: updErr } = await supabase
    .from("admin_notifications")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (updErr) {
    console.error("[Notification Pipeline] [CAMPAIGN] Stat update failed:", updErr.message);
  }
}

/**
 * Count ledger rows for a campaign that still need work (queued/in_flight/retryable).
 * Returns a huge number on DB errors so caller drain-loops never spin forever.
 */
export async function countPendingDeliveries(
  supabase: ReturnType<typeof supabaseAdmin>,
  campaignId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", PENDING_STATUSES);

  if (error) {
    console.error("[Notification Pipeline] [CAMPAIGN] Pending count failed:", error.message);
    return Number.MAX_SAFE_INTEGER;
  }
  return count ?? 0;
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