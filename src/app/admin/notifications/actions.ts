"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/notifications";

// Helper to check for missing database tables
function handleDbError(error: any) {
  if (!error) return;
  const errMsg = error.message || "";
  const isMissing = error.code === '42P01' || errMsg.includes('relation "admin_notifications" does not exist') || errMsg.includes('relation "notification_logs" does not exist') || errMsg.includes('relation "notification_templates" does not exist') || errMsg.includes('Could not find the table') || errMsg.includes('schema cache');
  
  if (isMissing) {
    throw new Error(
      "DATABASE_SCHEMA_ERROR: The notification module database tables do not exist. " +
      "Please execute the DDL queries in the migration file supabase/migrations/20260630010000_notification_management.sql inside your Supabase Dashboard SQL Editor."
    );
  }
  throw new Error(error.message);
}

/**
 * Fetch all customers, partners, and admins for targeting
 */
export async function getTargetAudienceUsers() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch categorized list of services for targeting (future-ready)
 */
export async function getActiveServicesCatalog() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, title, category")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get notification campaigns list (paginated, sorted, filtered)
 */
export async function getAdminNotifications(params: {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  audience?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const {
    search = "",
    category = "",
    priority = "",
    status = "",
    audience = "",
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    pageSize = 15,
  } = params;

  try {
    let query = supabase
      .from("admin_notifications")
      .select(`
        *,
        creator:profiles!admin_notifications_created_by_fkey(full_name)
      `, { count: "exact" });

    // Exclude hard-deleted items
    query = query.is("deleted_at", null);

    // Apply filters
    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (status) query = query.eq("status", status);
    if (audience) query = query.eq("audience_type", audience);

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) handleDbError(error);

    return {
      notifications: data || [],
      totalCount: count || 0,
      isSchemaError: false,
    };
  } catch (err) {
    if ((err as Error).message.includes("DATABASE_SCHEMA_ERROR")) {
      return {
        notifications: [],
        totalCount: 0,
        isSchemaError: true,
      };
    }
    throw err;
  }
}

/**
 * Get detailed stats and logs for a specific campaign
 */
export async function getAdminNotificationDetails(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: campaign, error: cError } = await supabase
    .from("admin_notifications")
    .select(`
      *,
      creator:profiles!admin_notifications_created_by_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (cError) handleDbError(cError);

  const { data: logs, error: lError } = await supabase
    .from("notification_logs")
    .select(`
      *,
      user:profiles!notification_logs_user_id_fkey(full_name, email)
    `)
    .eq("notification_id", id)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (lError) handleDbError(lError);

  return {
    campaign,
    logs: logs || [],
  };
}

/**
 * Create a new notification campaign
 */
export async function createAdminNotification(data: {
  title: string;
  message: string;
  image_url?: string;
  category: string;
  priority: string;
  audience_type: string;
  audience_filters?: Record<string, unknown>;
  deep_link?: string;
  status: 'draft' | 'scheduled';
  scheduled_at?: string | null;
  expires_at?: string | null;
}) {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("admin_notifications")
    .insert({
      ...data,
      created_by: adminUser.id,
      recipient_count: 0,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
  return inserted;
}

/**
 * Update an existing notification campaign (draft or scheduled only)
 */
export async function updateAdminNotification(
  id: string,
  data: {
    title: string;
    message: string;
    image_url?: string;
    category: string;
    priority: string;
    audience_type: string;
    audience_filters?: Record<string, unknown>;
    deep_link?: string;
    status: 'draft' | 'scheduled';
    scheduled_at?: string | null;
    expires_at?: string | null;
  }
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("admin_notifications")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${id}`);
  return updated;
}

/**
 * Duplicate a notification campaign (1-click clone)
 */
export async function duplicateAdminNotification(id: string) {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const { data: source, error: fetchErr } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) handleDbError(fetchErr);

  const { data: cloned, error: insertErr } = await supabase
    .from("admin_notifications")
    .insert({
      title: `${source.title} (Copy)`,
      message: source.message,
      image_url: source.image_url,
      category: source.category,
      priority: source.priority,
      audience_type: source.audience_type,
      audience_filters: source.audience_filters,
      deep_link: source.deep_link,
      status: "draft",
      created_by: adminUser.id,
      recipient_count: 0,
      success_count: 0,
      failure_count: 0,
    })
    .select()
    .single();

  if (insertErr) handleDbError(insertErr);

  revalidatePath("/admin/notifications");
  return cloned;
}

/**
 * Archive campaign
 */
export async function archiveAdminNotification(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${id}`);
}

/**
 * Restore archived campaign to draft
 */
export async function restoreAdminNotification(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${id}`);
}

/**
 * Soft delete campaign
 */
export async function softDeleteAdminNotification(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
}

/**
 * Cancel scheduled campaign
 */
export async function cancelScheduledNotification(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) handleDbError(error);

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${id}`);
}

/**
 * Send test notification to target device
 */
export async function sendTestNotificationAction(params: {
  title: string;
  message: string;
  image_url?: string;
  deep_link?: string;
  targetUserId: string;
}) {
  await requireAdmin();
  
  // Call standard notification pipeline
  await sendNotification({
    userIds: params.targetUserId,
    title: `[TEST] ${params.title}`,
    body: params.message,
    type: "general",
    metadata: {
      is_test: true,
      image_url: params.image_url || null,
      deep_link: params.deep_link || null,
    },
  });

  return { success: true };
}

/**
 * Send an entire broadcast campaign to targeted users immediately (foreground execution)
 */
export async function sendNotificationCampaignAction(campaignId: string) {
  await requireAdmin();
  const supabaseAdmin = createAdminClient();

  // 1. Fetch campaign
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from("admin_notifications")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (fetchError) handleDbError(fetchError);

  if (campaign.status === "completed" || campaign.status === "sending") {
    throw new Error("This campaign has already been sent or is currently sending.");
  }

  // 2. Mark sending
  await supabaseAdmin
    .from("admin_notifications")
    .update({ status: "sending" })
    .eq("id", campaignId);

  try {
    // 3. Resolve targeted audience
    let targetUserIds: string[] = [];
    const audienceType = campaign.audience_type;

    if (audienceType === "all") {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("status", "active");
      targetUserIds = users?.map(u => u.id) || [];
    } else if (audienceType === "customers") {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "customer")
        .eq("status", "active");
      targetUserIds = users?.map(u => u.id) || [];
    } else if (audienceType === "partners") {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "partner")
        .eq("status", "active");
      targetUserIds = users?.map(u => u.id) || [];
    } else if (audienceType === "admins") {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("status", "active");
      targetUserIds = users?.map(u => u.id) || [];
    } else if (audienceType === "selected") {
      targetUserIds = campaign.audience_filters?.userIds || [];
    }

    if (targetUserIds.length === 0) {
      await supabaseAdmin
        .from("admin_notifications")
        .update({
          status: "failed",
          recipient_count: 0,
          success_count: 0,
          failure_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      throw new Error("Recipient list is empty. Verify your target filters.");
    }

    // 4. Check for spam: warn if another campaign of same type was sent in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSent } = await supabaseAdmin
      .from("admin_notifications")
      .select("id")
      .eq("status", "completed")
      .eq("category", campaign.category)
      .gt("created_at", oneHourAgo)
      .limit(1);

    const hasSpamWarning = recentSent && recentSent.length > 0;

    // 5. Fetch tokens for recipient logs mapping
    const { data: tokenRows } = await supabaseAdmin
      .from("notification_tokens")
      .select("user_id, fcm_token, platform")
      .in("user_id", targetUserIds);

    // 6. Invoke pipeline in chunks of 500 (FCM limit for multicast)
    const chunkSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const logRows: Record<string, unknown>[] = [];

    for (let i = 0; i < targetUserIds.length; i += chunkSize) {
      const chunk = targetUserIds.slice(i, i + chunkSize);
      
      // Dispatch via FCM + User Inbox Database (idempotency built-in)
      await sendNotification({
        userIds: chunk,
        title: campaign.title,
        body: campaign.message,
        type: "general",
        metadata: {
          campaign_id: campaign.id,
          image_url: campaign.image_url || null,
          deep_link: campaign.deep_link || null,
        },
      });

      // Construct Logs
      chunk.forEach(uid => {
        const userTokens = tokenRows?.filter(t => t.user_id === uid) || [];
        if (userTokens.length === 0) {
          logRows.push({
            notification_id: campaignId,
            user_id: uid,
            device_token: null,
            platform: null,
            status: "failed",
            failure_reason: "No registered device token found.",
          });
          totalFailure++;
        } else {
          userTokens.forEach(tok => {
            logRows.push({
              notification_id: campaignId,
              user_id: uid,
              device_token: tok.fcm_token,
              platform: tok.platform,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
            totalSuccess++;
          });
        }
      });
    }

    // 7. Write Logs to Audit Table
    if (logRows.length > 0) {
      await supabaseAdmin.from("notification_logs").insert(logRows);
    }

    // 8. Update campaign completion stats
    await supabaseAdmin
      .from("admin_notifications")
      .update({
        status: "completed",
        recipient_count: targetUserIds.length,
        success_count: totalSuccess,
        failure_count: totalFailure,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    revalidatePath("/admin/notifications");
    revalidatePath(`/admin/notifications/${campaignId}`);

    return {
      success: true,
      recipients: targetUserIds.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
      spamWarning: hasSpamWarning,
    };
  } catch (err) {
    console.error("[sendCampaign] Error:", err);
    await supabaseAdmin
      .from("admin_notifications")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    revalidatePath("/admin/notifications");
    revalidatePath(`/admin/notifications/${campaignId}`);
    throw err;
  }
}

/**
 * ─── TEMPLATES CRUD OPERATIONS ──────────────────────────────
 */

export async function getNotificationTemplates() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) handleDbError(error);
  return data || [];
}

export async function saveNotificationTemplate(data: {
  id?: string;
  name: string;
  title: string;
  message: string;
  image_url?: string;
  category: string;
  priority: string;
  deep_link?: string;
}) {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  if (data.id) {
    const { data: updated, error } = await supabase
      .from("notification_templates")
      .update({
        name: data.name,
        title: data.title,
        message: data.message,
        image_url: data.image_url || null,
        category: data.category,
        priority: data.priority,
        deep_link: data.deep_link || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) handleDbError(error);
    return updated;
  } else {
    const { data: inserted, error } = await supabase
      .from("notification_templates")
      .insert({
        name: data.name,
        title: data.title,
        message: data.message,
        image_url: data.image_url || null,
        category: data.category,
        priority: data.priority,
        deep_link: data.deep_link || null,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (error) handleDbError(error);
    return inserted;
  }
}

export async function deleteNotificationTemplate(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_templates")
    .delete()
    .eq("id", id);

  if (error) handleDbError(error);
}

/**
 * Bulk Action Handlers
 */
export async function bulkArchiveNotifications(ids: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) handleDbError(error);
  revalidatePath("/admin/notifications");
}

export async function bulkDeleteNotifications(ids: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (error) handleDbError(error);
  revalidatePath("/admin/notifications");
}

export async function bulkRestoreNotifications(ids: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) handleDbError(error);
  revalidatePath("/admin/notifications");
}
