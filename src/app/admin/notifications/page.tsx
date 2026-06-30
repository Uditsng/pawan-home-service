import { createClient } from "@/utils/supabase/server";
import { getAdminNotifications } from "./actions";
import { NotificationsConsole } from "./NotificationsConsole";

export const dynamic = "force-dynamic";

interface AdminNotificationCampaign {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  category: string;
  priority: string;
  audience_type: string;
  audience_filters?: Record<string, unknown> | null;
  deep_link: string | null;
  status: string;
  scheduled_at: string | null;
  expires_at: string | null;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string | null;
  } | null;
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  
  let stats = {
    total: 0,
    draft: 0,
    scheduled: 0,
    completed: 0,
    failed: 0,
    archived: 0,
  };

  let initialData = {
    notifications: [] as AdminNotificationCampaign[],
    totalCount: 0,
  };

  let isSchemaError = false;

  try {
    // 1. Fetch statistics
    const fetchStat = async (status?: string) => {
      let query = supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("deleted_at", null);
      if (status) {
        query = query.eq("status", status);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    };

    const [total, draft, scheduled, completed, failed, archived] = await Promise.all([
      fetchStat(),
      fetchStat("draft"),
      fetchStat("scheduled"),
      fetchStat("completed"),
      fetchStat("failed"),
      fetchStat("archived"),
    ]);

    stats = { total, draft, scheduled, completed, failed, archived };

    // 2. Fetch initial data for dashboard table
    const result = await getAdminNotifications({ page: 1, pageSize: 10 });
    if (result.isSchemaError) {
      isSchemaError = true;
    } else {
      initialData = {
        notifications: result.notifications,
        totalCount: result.totalCount,
      };
    }
  } catch (err: any) {
    const errMsg = err.message || "";
    if (err.code === '42P01' || errMsg.includes('relation "admin_notifications" does not exist')) {
      isSchemaError = true;
    } else {
      console.error("[NotificationsPage] Error loading data:", err);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Notification Center</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Create, schedule, target, and monitor push alerts and customer/partner promotions.
          </p>
        </div>
      </div>

      {isSchemaError ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex flex-col items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-700">database_schema</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
              <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                The database tables for managing notification campaigns (<code className="bg-amber-500/15 px-1 py-0.5 rounded font-mono font-bold text-[11px]">admin_notifications</code>, <code className="bg-amber-500/15 px-1 py-0.5 rounded font-mono font-bold text-[11px]">notification_logs</code>, and <code className="bg-amber-500/15 px-1 py-0.5 rounded font-mono font-bold text-[11px]">notification_templates</code>) do not exist in the database.
              </p>
              <p className="text-xs text-amber-700 mt-2 font-bold">
                Please copy and run the SQL schema inside your Supabase Dashboard SQL Editor first. The SQL file is located in your project migrations folder:
              </p>
              <code className="block mt-2 bg-amber-900/10 p-3 rounded-lg border border-amber-500/20 text-[10px] text-amber-900 font-mono select-all">
                supabase/migrations/20260630010000_notification_management.sql
              </code>
            </div>
          </div>
        </div>
      ) : (
        <NotificationsConsole
          initialStats={stats}
          initialNotifications={initialData.notifications}
          initialTotalCount={initialData.totalCount}
        />
      )}
    </div>
  );
}
