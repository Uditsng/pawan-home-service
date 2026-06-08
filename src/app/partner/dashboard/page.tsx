import Link from "next/link";
import PartnerBottomNav from "@/components/PartnerBottomNav";
import PartnerHeader from "@/components/PartnerHeader";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { BookingWithDetails, PartnerProfile } from "@/lib/types";

export default async function PartnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── Compute date boundaries first ─────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // ─── Parallelize ALL queries (~1.5s savings) ───────────────
  const [
    profileResult,
    activeJobResult,
    todayCompletedResult,
    nextAssignedResult,
    upcomingResult,
    weeklyResult,
  ] = await Promise.all([
    // Partner profile (select only used columns)
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, rating_avg, acceptance_rate, jobs_cancelled_count")
      .eq("id", user.id)
      .single(),
    // Current active job (in_progress)
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle(),
    // Today's completed bookings (for earnings)
    supabase
      .from("bookings")
      .select("total_amount")
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", todayStart.toISOString()),
    // Next auto-assigned job (confirmed)
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .eq("status", "confirmed")
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Upcoming scheduled jobs
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category)")
      .eq("partner_id", user.id)
      .in("status", ["confirmed", "accepted", "in_progress"])
      .order("scheduled_date", { ascending: true })
      .limit(4),
    // Weekly completed count
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", weekStart.toISOString()),
  ]);

  const profile = profileResult.data as PartnerProfile | null;
  const activeJob = activeJobResult.data as BookingWithDetails | null;
  const todayCompleted = todayCompletedResult.data;
  const nextAssignedJob = nextAssignedResult.data as BookingWithDetails | null;
  const upcomingJobs = (upcomingResult.data || []) as BookingWithDetails[];
  const weeklyJobsCount = weeklyResult.count;


  // ─── Derived metrics ───────────────────────────────────────
  const dailyEarnings =
    (todayCompleted || []).reduce(
      (acc, b) => acc + Number(b.total_amount || 0),
      0
    ) * 0.8;
  const todayJobsCompleted = todayCompleted?.length || 0;
  const activeHours = todayJobsCompleted * 1.5 + (activeJob ? 0.5 : 0);

  // ─── Service icon mapping ──────────────────────────────────
  function getServiceIcon(category?: string) {
    switch (category?.toLowerCase()) {
      case "cleaning":
        return "cleaning_services";
      case "pest control":
        return "pest_control";
      case "electrical":
        return "bolt";
      case "plumbing":
        return "plumbing";
      case "painting":
        return "format_paint";
      case "ac service":
        return "ac_unit";
      default:
        return "home_repair_service";
    }
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32">
      <PartnerHeader />

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-8 relative">
        {/* Active Job Banner */}
        {activeJob ? (
          <div className="bg-linear-to-r from-primary to-primary-container text-on-primary p-5 rounded-2xl flex items-center justify-between shadow-[0_12px_32px_rgba(0,104,95,0.15)] relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                near_me
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold opacity-80 font-label">
                  Current Mission
                </p>
                <p className="font-semibold text-[15px] mt-0.5">
                  {activeJob.services?.title} —{" "}
                  {activeJob.city || "Location TBD"}
                </p>
              </div>
            </div>
            <button className="bg-white/10 backdrop-blur-md hover:bg-white/20 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border border-white/10 relative z-10">
              View Details
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">
              event_available
            </span>
            <div>
              <p className="font-semibold text-[15px] text-on-surface">
                No active mission
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Check the{" "}
                <Link
                  href="/partner/jobs"
                  className="text-primary font-bold hover:underline"
                >
                  Job Center
                </Link>{" "}
                for your assigned jobs.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Earnings Card (Asymmetric Bento Style) */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant/10 shadow-sm rounded-2xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                Daily Earnings
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="text-4xl font-black font-headline tracking-tight">
                  ₹{dailyEarnings.toFixed(0)}
                </h2>
                {todayJobsCompleted > 0 && (
                  <div className="flex items-center text-tertiary-container gap-1 text-sm font-bold bg-tertiary-container/10 px-2 py-0.5 rounded-md">
                    <span className="material-symbols-outlined text-base">
                      trending_up
                    </span>
                    <span>Active</span>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center text-sm border-l-4 border-primary pl-3">
                  <span className="text-on-surface-variant font-medium">
                    Jobs Completed
                  </span>
                  <span className="font-bold">
                    {String(todayJobsCompleted).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-l-4 border-secondary-container pl-3">
                  <span className="text-on-surface-variant font-medium">
                    Active Hours
                  </span>
                  <span className="font-bold">
                    {Math.floor(activeHours)}h{" "}
                    {Math.round((activeHours % 1) * 60)}m
                  </span>
                </div>
              </div>
            </div>
            {/* Abstract visual element */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
          </div>

          {/* New Job Request (High Priority Card) */}
          {nextAssignedJob ? (
            <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary-container"></div>
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-secondary-container text-on-secondary-container font-label text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-[0_4px_12px_rgba(253,118,26,0.15)]">
                      New Assignment
                    </span>
                    <h3 className="text-2xl font-black font-headline mt-3 text-on-surface tracking-tight">
                      {nextAssignedJob.services?.title || "Service Request"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[28px] font-black font-headline tracking-tighter text-primary">
                      ₹{(Number(nextAssignedJob.total_amount) * 0.8).toFixed(0)}
                    </p>
                    <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                      Potential Payout
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4 mb-2">
                  <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Assigned to You
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4 mt-4 bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container text-2xl">
                      schedule
                    </span>
                    <div className="text-sm">
                      <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                        Time Slot
                      </p>
                      <p className="font-semibold text-on-surface mt-0.5">
                        {nextAssignedJob.scheduled_date
                          ? new Date(
                            nextAssignedJob.scheduled_date
                          ).toLocaleString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-10 bg-outline-variant/20"></div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container text-2xl">
                      location_on
                    </span>
                    <div className="text-sm">
                      <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                        Location
                      </p>
                      <p className="font-semibold text-on-surface mt-0.5">
                        {nextAssignedJob.city || "TBD"}
                      </p>
                    </div>
                  </div>
                  {nextAssignedJob.customer?.full_name && (
                    <>
                      <div className="hidden sm:block w-px h-10 bg-outline-variant/20"></div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary-container text-2xl">
                          person
                        </span>
                        <div className="text-sm">
                          <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                            Customer
                          </p>
                          <p className="font-semibold text-on-surface mt-0.5">
                            {nextAssignedJob.customer.full_name}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4 mt-8">
                  <Link
                    href="/partner/jobs"
                    className="flex-1 bg-linear-to-br from-[#00685f] to-[#008378] text-white py-4 rounded-xl font-bold font-headline tracking-wide text-[15px] shadow-lg active:scale-[0.98] transition-transform text-center"
                  >
                    Start This Job
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">
                inbox
              </span>
              <p className="font-bold text-on-surface text-lg">
                No new assignments
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                New jobs will be manually assigned to you by the administration team based on your skills and service areas.
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Jobs Section */}
        <section className="space-y-5">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-bold font-headline pl-3 border-l-4 border-primary tracking-tight text-on-surface">
              Upcoming Jobs
            </h3>
            <Link
              href="/partner/jobs"
              className="text-primary font-bold text-sm tracking-wide hover:underline"
            >
              View Schedule
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-on-surface-variant font-medium">
                No upcoming jobs scheduled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingJobs.map((job, idx) => (
                <div
                  key={job.id}
                  className={`bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 flex items-center justify-between group hover:bg-white hover:border-primary-fixed hover:shadow-sm transition-all cursor-pointer ${idx > 1 ? "opacity-70 hover:opacity-100" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {getServiceIcon(job.services?.category)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[17px] font-headline text-on-surface">
                        {job.services?.title || "Service"}
                      </p>
                      <p className="text-xs font-medium text-on-surface-variant flex items-center mt-0.5 gap-1">
                        {job.city || "Location TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="font-bold font-headline text-[15px] text-primary bg-primary/5 px-3 py-1 rounded-lg">
                      {job.scheduled_date
                        ? new Date(job.scheduled_date).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit" }
                        )
                        : "TBD"}
                    </p>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                      chevron_right
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance Quick-View */}
        <div className="bg-surface-container-low border border-surface-container-highest rounded-4xl p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center md:border-r border-outline-variant/20 px-2 group">
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter group-hover:text-primary transition-colors">
              {profile?.rating_avg
                ? profile.rating_avg.toFixed(1)
                : "—"}
            </p>
            <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-2">
              Rating
            </p>
          </div>
          <div className="text-center md:border-r border-outline-variant/20 px-2 group">
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter group-hover:text-primary transition-colors">
              {profile?.acceptance_rate
                ? `${(profile.acceptance_rate * 100).toFixed(0)}%`
                : "—"}
            </p>
            <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-2">
              Acceptance
            </p>
          </div>
          <div className="text-center md:border-r border-outline-variant/20 px-2 group">
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter group-hover:scale-105 transition-transform">
              {profile?.jobs_cancelled_count ?? 0}
            </p>
            <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-2">
              Cancellations
            </p>
          </div>
          <div className="text-center px-2 group">
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter group-hover:text-primary transition-colors">
              {weeklyJobsCount ?? 0}
            </p>
            <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-2">
              Weekly Jobs
            </p>
          </div>
        </div>
      </main>

      <PartnerBottomNav />
    </div>
  );
}
