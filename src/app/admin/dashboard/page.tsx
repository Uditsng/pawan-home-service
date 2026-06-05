import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ExportButton } from "./ExportButton";

// ─── Helpers ─────────────────────────────────────────────────

function demandSignal(bookings: number, partners: number): { label: string; color: string; icon: string } {
  if (partners === 0 && bookings > 0)
    return { label: "No Coverage", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: "error" };
  if (partners === 0 && bookings === 0)
    return { label: "Inactive", color: "bg-surface-container text-on-surface-variant border-outline-variant/20", icon: "radio_button_unchecked" };
  const ratio = bookings / partners;
  if (ratio > 5)
    return { label: "Critical", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: "warning" };
  if (ratio > 2)
    return { label: "High", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: "trending_up" };
  return { label: "Balanced", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: "check_circle" };
}

// ─── Types ───────────────────────────────────────────────────

interface AdminBooking {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  city: string;
  service_id: string;
  customer_id: string;
  partner_id: string | null;
  services: { title: string; category: string } | null;
  customer: { full_name: string } | null;
  partner: { full_name: string } | null;
}

// ─── Server Component ────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: metricsRaw, error } = await supabase.rpc("get_admin_dashboard_metrics");

  if (error || !metricsRaw) {
    console.error("Failed to fetch dashboard metrics from database RPC:", error);
    throw new Error(error?.message || "Failed to load dashboard metrics.");
  }

  const metrics = metricsRaw as any;
  const now = new Date();

  const monthlyGMV = Number(metrics.monthly_gmv || 0);
  const dailyGMV = Number(metrics.daily_gmv || 0);
  const weeklyGMV = Number(metrics.weekly_gmv || 0);
  const prevMonthGMV = Number(metrics.prev_month_gmv || 0);
  const momGrowth = Number(metrics.mom_growth || 0);
  const momGrowthStr = momGrowth >= 0 ? `+${momGrowth.toFixed(1)}%` : `${momGrowth.toFixed(1)}%`;

  const pendingCount = Number(metrics.pending_count || 0);
  const confirmedCount = Number(metrics.confirmed_count || 0);
  const inProgressCount = Number(metrics.in_progress_count || 0);
  const acceptedCount = Number(metrics.accepted_count || 0);
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

  const topServices = (metrics.top_services || []).map((s: any) => [
    s.title,
    { count: s.count, revenue: Number(s.revenue), category: s.category }
  ]) as [string, { count: number; revenue: number; category: string }][];
  
  const maxServiceCount = topServices.length > 0 ? topServices[0][1].count : 1;

  const zoneData = (metrics.zone_data || []).map((z: any) => ({
    city: z.city,
    bookings: z.bookings,
    partners: z.partners,
    aov: z.aov,
    signal: demandSignal(z.bookings, z.partners)
  }));

  // ─── 9. Ops Strategy alerts ────────────────────────────────

  interface OpsAlert {
    severity: "critical" | "warning" | "info";
    message: string;
    icon: string;
    color: string;
  }
  const opsAlerts: OpsAlert[] = [];

  zoneData.forEach((z: any) => {
    if (z.bookings > 0 && z.partners === 0) {
      opsAlerts.push({
        severity: "critical",
        message: `${z.city} has ${z.bookings} booking${z.bookings > 1 ? "s" : ""} but 0 active partners online`,
        icon: "error",
        color: "bg-red-500/10 border-red-500/20 text-red-700",
      });
    } else if (z.partners > 0 && z.bookings / z.partners > 5) {
      opsAlerts.push({
        severity: "warning",
        message: `${z.city} has ${z.bookings}:${z.partners} booking-to-partner ratio — consider recruitment`,
        icon: "warning",
        color: "bg-amber-500/10 border-amber-500/20 text-amber-700",
      });
    } else if (z.partners > 0 && z.bookings / z.partners <= 2) {
      opsAlerts.push({
        severity: "info",
        message: `${z.city} fleet is balanced at ${z.bookings}:${z.partners} ratio`,
        icon: "check_circle",
        color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
      });
    }
  });

  const monthlyBookingsCount = pendingCount + activeBookings + completedCount + cancelledCount;

  if (cancelledCount > 0 && monthlyBookingsCount > 0 && cancelledCount / monthlyBookingsCount > 0.15) {
    opsAlerts.push({
      severity: "critical",
      message: `High cancellation rate: ${((cancelledCount / monthlyBookingsCount) * 100).toFixed(1)}% this month`,
      icon: "cancel",
      color: "bg-red-500/10 border-red-500/20 text-red-700",
    });
  }

  if (pendingCount > 3) {
    opsAlerts.push({
      severity: "warning",
      message: `${pendingCount} bookings pending partner assignment — manual override may be needed`,
      icon: "pending_actions",
      color: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    });
  }

  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  opsAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const displayAlerts = opsAlerts.slice(0, 4);

  // Recent completed payouts
  const recentPayouts = (metrics.recent_payouts || []) as any[];

  // Recent bookings for Ops Ledger
  const recentBookings = (metrics.recent_bookings || []) as any[];

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ─── SECTION 1: COMPACT METRIC MATRIX ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* KPI 1: Monthly GMV */}
        <Link href="/admin/finance" className="bg-primary p-5 rounded-2xl text-white shadow-ambient relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-secondary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2">This Month's Revenue</p>
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

      {/* ─── SECTION 2 + 3: INTELLIGENCE PANELS ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* ─── LEFT: Revenue Intelligence Engine (2/3) ──────── */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold tracking-tight text-primary font-headline">Revenue Overview</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 mt-0.5">This month's summary · {format(now, "MMM yyyy")}</p>
            </div>
            <ExportButton />
          </div>

          {/* Row A: Platform Split Ledger */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/50">Our Earnings (20%)</p>
              <p className="text-xl font-bold text-primary font-headline mt-1.5 tracking-tighter">₹{(monthlyGMV * 0.2).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-secondary/70">Partner Payments (80%)</p>
              <p className="text-xl font-bold text-primary font-headline mt-1.5 tracking-tighter">₹{(monthlyGMV * 0.8).toLocaleString()}</p>
            </div>
          </div>

          {/* Row A.5: Recent Payout Log */}
          {recentPayouts.length > 0 && (
            <div className="border border-outline-variant/10 rounded-xl overflow-hidden">
              <div className="bg-surface-dim/30 px-4 py-2 flex items-center justify-between">
                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">Recent Payouts</p>
                <Link href="/admin/finance" className="text-[8px] font-black uppercase tracking-widest text-secondary hover:underline">View All →</Link>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {recentPayouts.map((p: any) => (
                  <Link key={p.id} href="/admin/finance" className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[9px] font-black text-on-surface-variant/40 font-mono tracking-tighter shrink-0">TX-{p.id.slice(0, 6).toUpperCase()}</span>
                      <span className="text-[10px] font-bold text-primary truncate">{(p.partner as Record<string, unknown>)?.full_name as string || "Partner"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-secondary tracking-tighter">₹{(Number(p.total_amount) * 0.8).toLocaleString()}</span>
                      <span className="text-[8px] text-on-surface-variant/40 font-bold">{format(new Date(p.created_at), "dd MMM")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Row B: Dominant Services Bar Chart */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">Top Services</p>
            {topServices.length === 0 ? (
              <div className="text-center py-6 text-on-surface-variant/40">
                <span className="material-symbols-outlined text-2xl mb-1 block opacity-40">analytics</span>
                <p className="text-xs font-semibold">No service data available yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topServices.map(([title, data]) => {
                  const barWidth = Math.max(8, Math.round((data.count / maxServiceCount) * 100));
                  return (
                    <Link key={title} href="/admin/bookings" className="flex items-center gap-3 group hover:bg-surface-container-low/30 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                      <span className="text-[10px] font-bold text-primary w-[120px] truncate shrink-0 tracking-tight group-hover:text-secondary transition-colors">{title}</span>
                      <div className="flex-1 h-4 bg-surface-container rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-700 group-hover:bg-secondary"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] font-black text-on-surface-variant/60 w-12 text-right shrink-0">{data.count} bookings</span>
                      <span className="text-[9px] font-bold text-primary w-16 text-right shrink-0 tracking-tighter">₹{data.revenue.toLocaleString()}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Geographic & Service Density (1/3) ───── */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4 flex flex-col">
          <div>
            <h3 className="text-base font-bold tracking-tight text-primary font-headline">City Performance</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 mt-0.5">Bookings & partners by city</p>
          </div>

          {/* Zone Data Table */}
          {zoneData.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant/40 flex-1 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-2xl mb-1 opacity-40">location_off</span>
              <p className="text-xs font-semibold">No geographic data available.</p>
              <p className="text-[10px] text-on-surface-variant/30 mt-1">Zone data populates as bookings come in.</p>
            </div>
          ) : (
            <div className="border border-outline-variant/10 rounded-xl overflow-hidden flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-dim/40 border-b border-outline-variant/15">
                    <th className="px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">City</th>
                    <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 text-center">Orders</th>
                    <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 text-center">Pros</th>
                    <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right">Avg.</th>
                    <th className="px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {zoneData.map((z: any) => (
                    <tr key={z.city} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <Link href="/admin/partners" className="text-[10px] font-bold text-primary hover:text-secondary transition-colors uppercase tracking-tight">{z.city}</Link>
                      </td>
                      <td className="px-2 py-2.5 text-center text-[10px] font-black text-primary">{z.bookings}</td>
                      <td className="px-2 py-2.5 text-center text-[10px] font-black text-primary">{z.partners}</td>
                      <td className="px-2 py-2.5 text-right text-[10px] font-bold text-on-surface-variant">₹{z.aov.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${z.signal.color}`}>
                          <span className="material-symbols-outlined text-[10px]">{z.signal.icon}</span>
                          {z.signal.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ops Strategy Alert Queue */}
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-secondary">insights</span>
              Alerts & Actions
            </p>
            {displayAlerts.length === 0 ? (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-emerald-700">Everything looks good. No alerts right now.</p>
              </div>
            ) : (
              displayAlerts.map((alert, idx) => (
                <Link key={idx} href="/admin/partners" className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors hover:brightness-95 ${alert.color}`}>
                  <span className="material-symbols-outlined text-sm mt-px shrink-0">{alert.icon}</span>
                  <p className="text-[10px] font-bold leading-snug">{alert.message}</p>
                </Link>
              ))
            )}
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
                recentBookings.map((booking: any) => {
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
                          {(booking.customer as Record<string, unknown>)?.full_name as string || "Customer"}
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
            recentBookings.map((booking: any) => {
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
