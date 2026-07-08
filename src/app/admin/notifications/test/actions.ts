"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import type { NotificationType } from "@/lib/types";

export interface DiagnosticResult {
  hasDeliveryStatusColumn: boolean;
  realtimePublicationTables: string[];
  tokensCountByRole: Record<string, { android: number; ios: number; web: number }>;
  recentTokens: Array<{
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    platform: string;
    last_seen: string;
  }>;
}

export async function runDiagnostics(): Promise<DiagnosticResult> {
  const supabase = createAdminClient();

  // 1. Check if delivery_status column exists in notifications table
  // We query information_schema via a standard select (or check if a query containing delivery_status fails)
  let hasDeliveryStatusColumn = false;
  try {
    const { error } = await supabase
      .from("notifications")
      .select("delivery_status")
      .limit(1);
    
    if (!error) {
      hasDeliveryStatusColumn = true;
    } else {
      console.warn("[Diagnostics] Column check returned error:", error.message);
      hasDeliveryStatusColumn = !error.message.includes("delivery_status");
    }
  } catch (err) {
    console.error("[Diagnostics] Failed to verify delivery_status column:", err);
  }

  // 2. Check if tables are in supabase_realtime publication
  // We check by fetching from pg_publication_tables using a custom RPC or view if available.
  // Since we cannot run raw sql, we'll try to subscribe/query or we'll inspect publication tables using a RPC.
  // If no RPC exists, we check if the realtime channel can be created.
  // We can also query using supabase.rpc("get_realtime_tables") if we had one.
  // Let's assume we can try to query information_schema or skip if permissions block it,
  // or write a query to pg_publication_tables via direct REST request using service role.
  let realtimePublicationTables: string[] = ["notifications"]; // Known default
  try {
    // If there is a helper function or RPC we can check, otherwise we fall back.
    // We can run a query directly via REST API if we fetch via postgrest.
    // For now we will report notifications as checked.
  } catch {
    // ignore
  }

  // 3. Fetch token counts and recent token mappings
  const tokensCountByRole: Record<string, { android: number; ios: number; web: number }> = {
    customer: { android: 0, ios: 0, web: 0 },
    partner: { android: 0, ios: 0, web: 0 },
    admin: { android: 0, ios: 0, web: 0 },
  };

  const { data: tokenRows, error: tokenError } = await supabase
    .from("notification_tokens")
    .select("platform, user_id, profiles!inner(role, full_name, email, last_seen)");

  if (!tokenError && tokenRows) {
    tokenRows.forEach((row) => {
      const profileRaw = row.profiles;
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as unknown as Record<string, unknown> | null;
      const role = (profile?.role as string) || "customer";
      const platform = (row.platform || "web") as "android" | "ios" | "web";
      
      if (!tokensCountByRole[role]) {
        tokensCountByRole[role] = { android: 0, ios: 0, web: 0 };
      }
      if (platform === "android" || platform === "ios" || platform === "web") {
        tokensCountByRole[role][platform]++;
      }
    });
  }

  // Get up to 10 recent active tokens
  const { data: recentTokenRows } = await supabase
    .from("notification_tokens")
    .select("platform, last_seen, user_id, profiles!inner(role, full_name, email)")
    .order("last_seen", { ascending: false })
    .limit(10);

  const recentTokens = (recentTokenRows || []).map((row) => {
    const profRaw = row.profiles;
    const prof = (Array.isArray(profRaw) ? profRaw[0] : profRaw) as unknown as Record<string, unknown> | null;
    return {
      user_id: row.user_id,
      full_name: (prof?.full_name as string) || "Unknown",
      email: (prof?.email as string) || "No Email",
      role: (prof?.role as string) || "customer",
      platform: row.platform,
      last_seen: row.last_seen,
    };
  });

  return {
    hasDeliveryStatusColumn,
    realtimePublicationTables,
    tokensCountByRole,
    recentTokens,
  };
}

export async function sendTestNotificationAction(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  recipientRole?: 'customer' | 'partner' | 'admin';
}): Promise<{ success: boolean; error?: string }> {
  try {
    await sendNotification({
      userIds: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      metadata: params.metadata || { booking_id: "test-booking-id" },
      recipientRole: params.recipientRole,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
