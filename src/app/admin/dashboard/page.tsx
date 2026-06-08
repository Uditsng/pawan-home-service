import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

// ─── Interfaces ──────────────────────────────────────────────

interface RecentBooking {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  city: string | null;
  services?: {
    title: string;
  } | null;
  customer?: {
    full_name: string;
  } | null;
}

interface AdminDashboardMetrics {
  monthly_gmv?: number | null;
  daily_gmv?: number | null;
  weekly_gmv?: number | null;
  mom_growth?: number | null;
  pending_count?: number | null;
  confirmed_count?: number | null;
  in_progress_count?: number | null;
  completed_count?: number | null;
  cancelled_count?: number | null;
  active_bookings?: number | null;
  success_rate?: number | null;
  total_partners?: number | null;
  active_partner_count?: number | null;
  offline_partner_count?: number | null;
  busy_partner_count?: number | null;
  suspended_partner_count?: number | null;
  fleet_utilization?: number | null;
  customer_count?: number | null;
  recent_bookings?: RecentBooking[] | null;
}

// ─── Server Component ────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: metricsRaw, error } = await supabase.rpc("get_admin_dashboard_metrics");

  if (error || !metricsRaw) {
    console.error("Failed to fetch dashboard metrics from database RPC:", error);
    throw new Error(error?.message || "Failed to load dashboard metrics.");
  }

  const metrics = metricsRaw as unknown as AdminDashboardMetrics;

  const monthlyGMV = Number(metrics.monthly_gmv || 0);
  const dailyGMV = Number(metrics.daily_gmv || 0);
  const weeklyGMV = Number(metrics.weekly_gmv || 0);
  const momGrowth = Number(metrics.mom_growth || 0);
  const momGrowthStr = momGrowth >= 0 ? `+${momGrowth.toFixed(1)}%` : `${momGrowth.toFixed(1)}%`;

  const pendingCount = Number(metrics.pending_count || 0);
  const confirmedCount = Number(metrics.confirmed_count || 0);
  const inProgressCount = Number(metrics.in_progress_count || 0);
  const completedCount = Number(metrics.completed_count || 0);
  const cancelledCount = Number(metrics.cancelled_count || 0);
  const activeBookings = Number(metrics.active_bookings || 0);
  const successRate = Number(metrics.success_rate || 100);

  const totalPartners = Number(metrics.total_partners || 0);
  const activePartnerCount = Number(metrics.active_partner_count || 0);
  const offlinePartnerCount = Number(metrics.offline_partner_count || 0);
  const busyPartnerCount = Number(metrics.busy_partner_count || 0);
  const suspendedPartnerCount = Number(metrics.suspended_partner_count || 0);
  const fleetUtilization = Number(metrics.fleet_utilization || 0);
  const customerCount = Number(metrics.customer_count || 0);

  // Recent bookings for Ops Ledger
  const recentBookings = (metrics.recent_bookings || []) as RecentBooking[];

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ─── SECTION 1: COMPACT METRIC MATRIX ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* KPI 1: Monthly GMV */}
        <Link href="/admin/finance" className="bg-primary p-5 rounded-2xl text-white shadow-ambient relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-secondary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2">This Month&apos;s Revenue</p>
          <h2 className="text-2xl font-bold font-headline tracking-tighter">₹{monthlyGMV.toLocaleString()}</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${
              momGrowth >= 0 ? "text-secondary bg-secondary/15" : "text-red-300 bg-red-500/15"
            }`}>
              {momGrowthStr}
            </span>
            <span className="text-[8px] text-white/35 font-bold uppercase tracking-widest">vs Last Month</span>
          </div>
          <div className="flex items-center gap-3 mt-2.5 text-[8px] font-bold text-white/40 uppercase tracking-wider">
            <span>Today: ₹{dailyGMV.toLocaleString()}</span>
            <span className="w-px h-3 bg-white/15"></span>
            <span>Week: ₹{weeklyGMV.toLocaleString()}</span>
          </div>
        </Link>

        {/* KPI 2: Pipeline Bookings */}
        <Link href="/admin/bookings" className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm hover:shadow-ambient transition-all group">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Active Bookings</p>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold font-headline tracking-tighter text-primary">{activeBookings}</h2>
            <span className="material-symbols-outlined text-secondary text-xl opacity-30 group-hover:opacity-100 transition-opacity">calendar_month</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {pendingCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/15">{pendingCount} Pending</span>
            )}
            {confirmedCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/15">{confirmedCount} Confirmed</span>
            )}
            {inProgressCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/15">{inProgressCount} Active</span>
            )}
            {activeBookings === 0 && pendingCount === 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant">No Active</span>
            )}
          </div>
        </Link>

        {/* KPI 3: Fleet Capacity */}
        <Link href="/admin/partners" className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm hover:shadow-ambient transition-all group">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Partner Team</p>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold font-headline tracking-tighter text-primary">
              {activePartnerCount}<span className="text-sm text-on-surface-variant/40 font-bold ml-1">/ {totalPartners}</span>
            </h2>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Active</span>
            </div>
          </div>
          {/* Capacity bar */}
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-2.5">
            <div className="bg-secondary h-full rounded-full transition-all duration-700" style={{ width: `${fleetUtilization}%` }}></div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {offlinePartnerCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant">{offlinePartnerCount} Offline</span>
            )}
            {busyPartnerCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700">{busyPartnerCount} Busy</span>
            )}
            {suspendedPartnerCount > 0 && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600">{suspendedPartnerCount} Suspended</span>
            )}
          </div>
        </Link>

        {/* KPI 4: Success Rate */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm hover:shadow-ambient transition-all group relative overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Success Rate</p>
          <div className="flex items-end justify-between">
            <h2 className={`text-2xl font-bold font-headline tracking-tighter ${
              successRate >= 90 ? "text-primary" : successRate >= 70 ? "text-amber-700" : "text-red-600"
            }`}>
              {successRate.toFixed(1)}%
            </h2>
            {/* CSS-only progress ring */}
            <div className="relative w-10 h-10 shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-surface-container"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${successRate}, 100`}
                  strokeLinecap="round"
                  className={successRate >= 90 ? "text-secondary" : successRate >= 70 ? "text-amber-500" : "text-red-500"}
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
            <span>{completedCount} Done</span>
            <span className="w-px h-3 bg-outline-variant/20"></span>
            <span>{cancelledCount} Cancelled</span>
            <span className="w-px h-3 bg-outline-variant/20"></span>
            <span>{customerCount || 0} Customers</span>
          </div>
        </div>
      </div>


      {/* ─── SECTION 4: LIVE OPS LEDGER ────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Recent Bookings</h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">Latest booking activity</p>
          </div>
          <Link href="/admin/bookings" className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/15 hover:bg-primary/90 transition-all">
            View All →
          </Link>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Booking ID</th>
                <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Service · City</th>
                <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Customer</th>
                <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Amount</th>
                <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Status</th>
                <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No booking transactions recorded this month.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => {
                  const statusVariant: Record<string, "warning" | "primary" | "success" | "danger" | "surface"> = {
                    pending: "warning",
                    confirmed: "primary",
                    accepted: "primary",
                    in_progress: "primary",
                    completed: "success",
                    cancelled: "danger",
                  };
                  return (
                    <tr key={booking.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <Link href="/admin/bookings" className="text-[10px] font-black text-primary font-mono tracking-tighter uppercase hover:text-secondary transition-colors">
                          BK-{booking.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[10px] font-bold text-primary tracking-tight truncate max-w-[160px]">{booking.services?.title || "Service"}</p>
                        <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px] text-secondary">location_on</span>
                          {booking.city || "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href="/admin/customers" className="text-[10px] font-bold text-primary hover:text-secondary transition-colors uppercase tracking-tight truncate block max-w-[120px]">
                          {booking.customer?.full_name || "Customer"}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-xs font-bold text-primary font-headline tracking-tighter">₹{Number(booking.total_amount).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant={statusVariant[booking.status] || "primary"}>
                          {booking.status === "in_progress" ? "Active" : booking.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                          {format(new Date(booking.created_at), "dd MMM · hh:mm a")}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-outline-variant/10">
          {recentBookings.length === 0 ? (
            <div className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
              No booking transactions recorded this month.
            </div>
          ) : (
            recentBookings.map((booking) => {
              const statusVariant: Record<string, "warning" | "primary" | "success" | "danger" | "surface"> = {
                pending: "warning",
                confirmed: "primary",
                accepted: "primary",
                in_progress: "primary",
                completed: "success",
                cancelled: "danger",
              };
              return (
                <Link key={booking.id} href="/admin/bookings" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low/30 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    booking.status === "completed" ? "bg-secondary/10 text-secondary" :
                    booking.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-primary/5 text-primary"
                  }`}>
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {booking.status === "completed" ? "verified" : booking.status === "cancelled" ? "error" : "schedule"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-primary truncate uppercase tracking-tighter">BK-{booking.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50 truncate">{booking.services?.title} · {booking.city}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs font-bold text-primary font-headline tracking-tighter">₹{Number(booking.total_amount).toLocaleString()}</p>
                    <Badge variant={statusVariant[booking.status] || "primary"}>
                      {booking.status === "in_progress" ? "Active" : booking.status}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
