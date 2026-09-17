/**
 * Notification Pipeline — Developer Diagnostics & E2E Simulation
 *
 * Server-side helpers backing /admin/notifications/test. Everything here is
 * admin-gated (the page and actions call requireAdmin first). Uses the
 * service-role client so RLS never hides ledger/token rows from the panel.
 *
 * The simulation intentionally drives the REAL pipeline (enqueue →
 * claim → dispatch) exactly like production — it is not a mock.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import { NOTIFICATION_CHANNELS } from "@/lib/notifications/types";
import type { NotificationType } from "@/lib/types";

export interface ColumnProbe {
  table: string;
  column: string;
  present: boolean;
}

export interface RpcProbe {
  name: string;
  present: boolean;
}

export interface TokenRegistry {
  total: number;
  active: number;
  inactive: number;
  platforms: Record<string, number>;
  recent: {
    id: string;
    platform: string | null;
    is_active: boolean;
    app_version: string | null;
    last_token_error_at: string | null;
    last_seen: string | null;
    masked_token: string | null;
  }[];
}

export interface LedgerOverview {
  counts: Record<string, number>;
  recent: {
    id: string;
    status: string;
    platform: string | null;
    retry_count: number;
    user_id: string;
    masked_token: string | null;
    updated_at: string | null;
  }[];
}

export interface PipelineDiagnostics {
  columns: ColumnProbe[];
  rpcs: RpcProbe[];
  advertised: { tables: string[]; channelMap: string[]; statuses: string[] };
  tokens: TokenRegistry | null;
  ledger: LedgerOverview | null;
  reclaimCount: number;
  fcmConfigured: boolean;
}

export interface SimulationRow {
  id: string;
  status: string;
  platform: string | null;
  retry_count: number;
  masked_token: string | null;
  updated_at: string | null;
}

export interface SimulationResult {
  ok: boolean;
  error?: string;
  notificationId?: string;
  notificationType?: NotificationType;
  deliveryStatus?: string;
  ledgerRows?: SimulationRow[];
  note?: string;
}

const LEDGER_STATUSES = [
  "queued",
  "in_flight",
  "firebase_accepted",
  "delivered",
  "opened",
  "read",
  "retryable",
  "failed_permanent",
  "failed_unregistered",
  "expired",
  "no_token",
  "degraded",
];

const COLUMN_PROBES: { table: string; column: string }[] = [
  { table: "notification_deliveries", column: "status" },
  { table: "notification_deliveries", column: "retry_count" },
  { table: "notification_deliveries", column: "next_retry_at" },
  { table: "notification_deliveries", column: "token_id" },
  { table: "notification_deliveries", column: "fcm_token" },
  { table: "notification_deliveries", column: "platform" },
  { table: "notification_deliveries", column: "claimed_at" },
  { table: "notification_tokens", column: "is_active" },
  { table: "notification_tokens", column: "app_version" },
  { table: "notification_tokens", column: "last_token_error_at" },
  { table: "notifications", column: "opened_at" },
  { table: "notifications", column: "read_at" },
  { table: "notifications", column: "pinned" },
  { table: "notifications", column: "delivery_status" },
  { table: "admin_notifications", column: "lease_expires_at" },
  { table: "admin_notifications", column: "delivered_count" },
  { table: "admin_notifications", column: "opened_count" },
  { table: "admin_notifications", column: "read_count" },
  { table: "admin_notifications", column: "no_token_count" },
];

function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return token.length > 15 ? `${token.slice(0, 5)}…${token.slice(-5)}` : token;
}

async function probeColumn(supabase: ReturnType<typeof createAdminClient>, table: string, column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

interface SafeCallResult {
  data?: unknown;
  count?: number | null;
  error?: { code?: string; message: string } | null;
}

async function safeCall(builder: unknown): Promise<SafeCallResult> {
  try {
    const result = await builder;
    return (result ?? {}) as SafeCallResult;
  } catch (err) {
    return {
      error: {
        code: "RUNTIME",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function existsOrCallable(result: SafeCallResult): boolean {
  if (!result.error) return true;
  const message = result.error.message || "";
  const code = result.error.code || "";
  // 42883 = undefined function; PostgREST also reports "Could not find the
  // function..." — treat both as "not present". Anything else is a real error.
  if (code === "42883") return false;
  if (message.includes("Could not find the function")) return false;
  return true;
}

async function probeRpc(supabase: ReturnType<typeof createAdminClient>, name: string): Promise<boolean> {
  switch (name) {
    case "claim_notification_deliveries":
      // p_batch_size <= 0 is a guarded no-op — safe to call for existence checks.
      return existsOrCallable(await safeCall(supabase.rpc(name, { p_batch_size: 0 })));
    case "claim_notification_deliveries_for":
      return existsOrCallable(await safeCall(supabase.rpc(name, { p_notification_ids: [], p_batch_size: 0 })));
    default:
      return existsOrCallable(await safeCall(supabase.rpc(name, { p_stale_after: "10 minutes" })));
  }
}

/**
 * Collect a full snapshot of pipeline health.
 * Safe to run concurrently; reclaims stale in_flight rows as a side effect
 * (that is desirable — it is what the drain worker does every pass).
 */
export async function collectDiagnostics(): Promise<PipelineDiagnostics> {
  const supabase = createAdminClient();

  // 1. Column probes (individual selects so a single 42703 identifies exactly
  //    which column is missing).
  const columns: ColumnProbe[] = [];
  for (const p of COLUMN_PROBES) {
    columns.push({
      table: p.table,
      column: p.column,
      present: await probeColumn(supabase, p.table, p.column),
    });
  }

  // 2. RPC probes (all call paths are guarded no-ops / safe to run).
  const rpcProbes: RpcProbe[] = [];
  for (const name of [
    "claim_notification_deliveries",
    "claim_notification_deliveries_for",
    "reclaim_stale_notification_deliveries",
  ]) {
    rpcProbes.push({ name, present: await probeRpc(supabase, name) });
  }

  // 3. Reclaim stale rows now (recover anything left in_flight by a crash).
  let reclaimCount = 0;
  const reclaim = await safeCall(supabase.rpc("reclaim_stale_notification_deliveries", { p_stale_after: "10 minutes" }));
  if (!reclaim.error) {
    reclaimCount = typeof reclaim.data === "number" ? reclaim.data : 0;
  }

  // 4. Token registry.
  let tokens: TokenRegistry | null = null;
  const totalTok = await safeCall(supabase.from("notification_tokens").select("id", { count: "exact", head: true }));
  const activeTok = await safeCall(supabase.from("notification_tokens").select("id", { count: "exact", head: true }).eq("is_active", true));
  if (!totalTok.error && !activeTok.error) {
    const total = totalTok.count ?? 0;
    const active = activeTok.count ?? 0;
    const { data: recent } = await supabase
      .from("notification_tokens")
      .select("id, platform, is_active, app_version, last_token_error_at, last_seen, fcm_token")
      .order("last_seen", { ascending: false })
      .limit(5);
    const recentRows = (recent || []) as {
      id: string; platform: string | null; is_active: boolean; app_version: string | null;
      last_token_error_at: string | null; last_seen: string | null; fcm_token: string | null;
    }[];
    const platformBuckets: Record<string, number> = {};
    recentRows.forEach((r) => {
      const k = r.platform || "unknown";
      platformBuckets[k] = (platformBuckets[k] || 0) + 1;
    });
    tokens = {
      total,
      active,
      inactive: total - active,
      platforms: platformBuckets,
      recent: recentRows.map((r) => ({
        id: r.id,
        platform: r.platform,
        is_active: r.is_active,
        app_version: r.app_version,
        last_token_error_at: r.last_token_error_at,
        last_seen: r.last_seen,
        masked_token: maskToken(r.fcm_token),
      })),
    };
  }

  // 5. Ledger overview.
  let ledger: LedgerOverview | null = null;
  const ledgerCounts = await safeCall(supabase.from("notification_deliveries").select("status"));
  if (!ledgerCounts.error) {
    const counts: Record<string, number> = {};
    LEDGER_STATUSES.forEach((s) => (counts[s] = 0));
    const statusRows = (ledgerCounts.data as { status: string }[] | null) ?? [];
    statusRows.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    const { data: recent } = await supabase
      .from("notification_deliveries")
      .select("id, status, platform, retry_count, user_id, fcm_token, updated_at")
      .order("created_at", { ascending: false })
      .limit(12);
    ledger = {
      counts,
      recent: ((recent || []) as {
        id: string; status: string; platform: string | null; retry_count: number;
        user_id: string; fcm_token: string | null; updated_at: string | null;
      }[]).map((r) => ({
        id: r.id,
        status: r.status,
        platform: r.platform,
        retry_count: r.retry_count,
        user_id: r.user_id,
        masked_token: maskToken(r.fcm_token),
        updated_at: r.updated_at,
      })),
    };
  }

  const fcmConfigured = !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY;

  return {
    columns,
    rpcs: rpcProbes,
    advertised: {
      tables: ["notifications", "booking_job_offers", "bookings", "profiles", "notification_deliveries"],
      channelMap: Object.keys(NOTIFICATION_CHANNELS),
      statuses: LEDGER_STATUSES,
    },
    tokens,
    ledger,
    reclaimCount,
    fcmConfigured,
  };
}

// ─── E2E Simulation ──────────────────────────────────────────

/**
 * E2E simulation: enqueue a real test notification for the calling admin
 * through the production funnel (sendNotification → ledger → inline drain),
 * then read back the per-device delivery journey.
 */
export async function simulatePipelineCycle(adminUserId: string): Promise<SimulationResult> {
  const supabase = createAdminClient();

  // Unique event_version defeats the 5-minute dedup window so repeated runs
  // always enqueue a fresh row without touching any real booking/campaign.
  const eventVersion = Date.now();
  const simulatedAt = new Date().toISOString();

  await sendNotification({
    userIds: adminUserId,
    title: "PHS Diagnostics — Pipeline E2E",
    body: `Simulating enqueue → claim → dispatch at ${simulatedAt}.`,
    type: "general",
    metadata: {
      is_test: true,
      event_version: eventVersion,
      simulated_at: simulatedAt,
    },
  });

  const { data: latest } = await supabase
    .from("notifications")
    .select("id, type, delivery_status, metadata")
    .eq("user_id", adminUserId)
    .eq("type", "general")
    .order("created_at", { ascending: false })
    .limit(5);

  const row = ((latest || []) as {
    id: string; type: string; delivery_status: string; metadata: Record<string, unknown> | null;
  }[]).find((n) => n.metadata && (n.metadata as Record<string, unknown>).is_test === true &&
    (n.metadata as Record<string, unknown>).event_version === eventVersion);

  if (!row) {
    return {
      ok: false,
      error: "No notification row was created for the simulation (check enqueue path).",
    };
  }

  const { data: ledger } = await supabase
    .from("notification_deliveries")
    .select("id, status, platform, retry_count, fcm_token, updated_at")
    .eq("notification_id", row.id)
    .order("created_at", { ascending: true });

  const ledgerRows = ((ledger || []) as {
    id: string; status: string; platform: string | null; retry_count: number;
    fcm_token: string | null; updated_at: string | null;
  }[]).map((r) => ({
    id: r.id,
    status: r.status,
    platform: r.platform,
    retry_count: r.retry_count,
    masked_token: maskToken(r.fcm_token),
    updated_at: r.updated_at,
  }));

  return {
    ok: true,
    notificationId: row.id,
    notificationType: row.type as NotificationType,
    deliveryStatus: row.delivery_status,
    ledgerRows,
    note: ledgerRows.length === 0
      ? "This run produced a test notification for the current admin. Simulate again to re-run after the notification row resolves; delivery depends on that user having an active device token."
      : "Rows describe the delivery journey (one per device token, or a no_token/degraded row).",
  };
}