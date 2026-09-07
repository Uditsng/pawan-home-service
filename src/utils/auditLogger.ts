import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export interface AuditLogInput {
  action: "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";
  targetEntity: "auth" | "services" | "subcategories" | "categories" | "coupons" | "settings" | "partners" | "bookings" | string;
  recordId?: string | null;
  recordTitle?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
}

/**
 * Utility to log administrative actions and authentication events into admin_audit_logs table.
 */
export async function logAdminAuditAction(input: AuditLogInput): Promise<void> {
  try {
    let actorId = input.actorUserId || null;
    let actorEmail = input.actorEmail || null;
    let actorName = input.actorName || null;

    // Fetch current user and profile if not explicitly passed
    if (!actorId || !actorEmail) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        actorId = user.id;
        actorEmail = user.email || "admin@phs.com";

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        if (profile) {
          actorName = profile.full_name || actorEmail.split("@")[0];
          if (!actorEmail && profile.email) {
            actorEmail = profile.email;
          }
        }
      }
    }

    if (!actorEmail) {
      actorEmail = "system@phs.com";
    }

    // Use admin client to ensure logging succeeds even across auth contexts
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase.from("admin_audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_name: actorName || actorEmail.split("@")[0],
      action: input.action,
      target_entity: input.targetEntity,
      record_id: input.recordId ? String(input.recordId) : null,
      record_title: input.recordTitle || null,
      old_data: input.oldData || null,
      new_data: input.newData || null,
      ip_address: input.ipAddress || null,
    });

    if (error) {
      console.error("[AuditLogger] Failed to insert audit log:", error.message);
    }
  } catch (err) {
    console.error("[AuditLogger] Unexpected error logging audit action:", err);
  }
}
