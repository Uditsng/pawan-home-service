import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { redirect } from "next/navigation";
import AuditLogsView, { AuditLogRow } from "./AuditLogsView";

export default async function AdminAuditLogsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: rawLogs, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error fetching admin audit logs:", error.message);
  }

  const logs: AuditLogRow[] = (rawLogs || []).map((row) => ({
    id: String(row.id),
    actor_id: row.actor_id ? String(row.actor_id) : null,
    actor_email: String(row.actor_email || "system@phs.com"),
    actor_name: row.actor_name ? String(row.actor_name) : null,
    action: String(row.action || "UNKNOWN"),
    target_entity: String(row.target_entity || "system"),
    record_id: row.record_id ? String(row.record_id) : null,
    record_title: row.record_title ? String(row.record_title) : null,
    old_data: (row.old_data as Record<string, unknown>) || null,
    new_data: (row.new_data as Record<string, unknown>) || null,
    ip_address: row.ip_address ? String(row.ip_address) : null,
    created_at: String(row.created_at || new Date().toISOString()),
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">manage_search</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Admin Audit Logs</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Complete history of admin logins and database modifications across all administrators
            </p>
          </div>
        </div>
      </div>

      {/* Main View */}
      <AuditLogsView logs={logs} />
    </div>
  );
}
