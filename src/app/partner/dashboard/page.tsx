import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { BookingWithDetails, PartnerProfile } from "@/lib/types";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculateCommissionBreakdown } from "@/lib/engines/commissionEngine";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";

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
    platformSettings,
  ] = await Promise.all([
    // Partner profile (select only used columns)
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, rating_avg, acceptance_rate, jobs_cancelled_count, status")
      .eq("id", user.id)
      .single(),
    // Current active job (in_progress)
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category, image_url, subcategories(icon_name)), customer:customer_id(full_name)")
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
      .select("*, services:service_id(title, category, image_url, subcategories(icon_name)), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .eq("status", "confirmed")
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Upcoming scheduled jobs
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category, image_url, subcategories(icon_name))")
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
    fetchPlatformSettings(supabase),
  ]);

  const profile = profileResult.data as PartnerProfile | null;
  const activeJob = activeJobResult.data as BookingWithDetails | null;
  const todayCompleted = todayCompletedResult.data;
  const nextAssignedJob = nextAssignedResult.data as BookingWithDetails | null;
  const upcomingJobs = (upcomingResult.data || []) as BookingWithDetails[];
  const weeklyJobsCount = weeklyResult.count;

  const commissionPercent = platformSettings.platformCommission;

  // ─── Derived metrics ───────────────────────────────────────
  const todayRawTotal = (todayCompleted || []).reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const dailyEarnings = calculateCommissionBreakdown(todayRawTotal, commissionPercent).partnerPayoutAmount;
  const todayJobsCompleted = todayCompleted?.length || 0;
  const activeHours = todayJobsCompleted * 1.5 + (activeJob ? 0.5 : 0);

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 lg:pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 space-y-6 sm:space-y-8 relative">
        {/* Active Job Banner */}
        {activeJob ? (
          <div className="bg-primary text-on-primary p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-2xl sm:text-3xl text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  near_me
                </span>
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-extrabold opacity-80 font-label">
                  Current Active Job
                </p>
                <p className="font-bold text-base sm:text-lg mt-0.5 leading-snug">
                  {activeJob.services?.title} —{" "}
                  <span className="font-normal opacity-90">{activeJob.address || activeJob.city || "Location TBD"}</span>
                </p>
              </div>
            </div>
            <Link
              href="/partner/jobs"
              className="bg-secondary text-primary hover:bg-secondary/90 whitespace-nowrap px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-sm relative z-10 self-end sm:self-center"
            >
              View Active Job
            </Link>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant/15 p-4 sm:p-5 rounded-3xl flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center shrink-0 text-on-surface-variant">
              <span className="material-symbols-outlined text-2xl sm:text-3xl">
                event_available
              </span>
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-on-surface">
                No active job right now
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Check{" "}
                <Link
                  href="/partner/jobs"
                  className="text-primary font-bold hover:underline"
                >
                  My Jobs
                </Link>{" "}
                to view upcoming and assigned jobs.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Earnings Card (Asymmetric Bento Style) */}
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/15 shadow-xs rounded-3xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                Today&apos;s Earnings
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tight text-primary">
                  ₹{dailyEarnings.toFixed(0)}
                </h2>
                {todayJobsCompleted > 0 && (
                  <div className="flex items-center text-success gap-1 text-xs font-bold bg-success/10 px-2 py-0.5 rounded-md">
                    <span className="material-symbols-outlined text-sm">
                      trending_up
                    </span>
                    <span>Active</span>
                  </div>
                )}
              </div>

              <div className="mt-6 sm:mt-8 space-y-4">
                <div className="flex justify-between items-center text-xs sm:text-sm border-l-4 border-primary pl-3">
                  <span className="text-on-surface-variant font-medium">
                    Jobs Completed Today
                  </span>
                  <span className="font-extrabold text-on-surface">
                    {String(todayJobsCompleted).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm border-l-4 border-secondary pl-3">
                  <span className="text-on-surface-variant font-medium">
                    Active Service Hours
                  </span>
                  <span className="font-extrabold text-on-surface">
                    {Math.floor(activeHours)}h{" "}
                    {Math.round((activeHours % 1) * 60)}m
                  </span>
                </div>
              </div>
            </div>
            {/* Ambient detail glow */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none"></div>
          </div>

          {/* New Job Request (High Priority Card) */}
          {nextAssignedJob ? (
            <div className="lg:col-span-8 bg-surface-container-lowest border border-black/10 rounded-3xl overflow-hidden shadow-xs relative group hover:shadow-md transition-shadow">
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="bg-secondary/15 text-primary font-label text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-secondary/30">
                      New Job Assigned
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black font-headline mt-3 text-on-surface tracking-tight">
                      {nextAssignedJob.services?.title || "Service Request"}
                    </h3>
                  </div>
                  <div className="sm:text-right bg-surface-container-low sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <p className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-primary">
                      ₹{calculateCommissionBreakdown(Number(nextAssignedJob.total_amount || 0), commissionPercent).partnerPayoutAmount.toFixed(0)}
                    </p>
                    <p className="font-label text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                      Your Payout
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4 mb-2">
                  <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Assigned to You
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 bg-surface-container-low/60 p-4 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl shrink-0">
                      schedule
                    </span>
                    <div className="text-xs sm:text-sm">
                      <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                        Time Slot
                      </p>
                      <p className="font-semibold text-on-surface mt-0.5">
                        {nextAssignedJob.scheduled_date
                          ? new Date(
                            nextAssignedJob.scheduled_date
                          ).toLocaleString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Kolkata",
                          })
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary text-2xl shrink-0 mt-0.5">
                      location_on
                    </span>
                    <div className="text-xs sm:text-sm min-w-0">
                      <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                        Location
                      </p>
                      <p className="font-semibold text-on-surface mt-0.5 leading-tight truncate">
                        {nextAssignedJob.address || nextAssignedJob.city || "TBD"}
                      </p>
                    </div>
                  </div>
                  {nextAssignedJob.customer?.full_name && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl shrink-0">
                        person
                      </span>
                      <div className="text-xs sm:text-sm">
                        <p className="text-on-surface-variant font-label text-[10px] uppercase font-bold tracking-widest">
                          Customer
                        </p>
                        <p className="font-semibold text-on-surface mt-0.5">
                          {nextAssignedJob.customer.full_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  <Link
                    href="/partner/jobs"
                    className="flex-1 bg-primary hover:bg-primary/95 text-on-primary py-3.5 px-6 rounded-2xl font-extrabold font-headline tracking-wide text-sm sm:text-base shadow-sm active:scale-[0.98] transition-all text-center"
                  >
                    View Job Details
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 mb-3">
                <span className="material-symbols-outlined text-3xl">
                  inbox
                </span>
              </div>
              <p className="font-bold text-on-surface text-base sm:text-lg">
                No new jobs assigned
              </p>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mt-1">
                New jobs will be auto-assigned to you based on your active status, services, and pincodes.
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Jobs Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-lg sm:text-xl font-bold font-headline pl-3 border-l-4 border-primary tracking-tight text-on-surface">
              Upcoming Scheduled Jobs
            </h3>
            <Link
              href="/partner/jobs"
              className="text-primary font-bold text-xs sm:text-sm tracking-wide hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-6 text-center">
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
                No upcoming jobs scheduled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingJobs.map((job, idx) => (
                <div
                  key={job.id}
                  className={`bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-4 sm:p-5 flex items-center justify-between group hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer ${idx > 1 ? "opacity-80 hover:opacity-100" : ""}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <ServiceCardThumbnail
                      imageUrl={job.services?.image_url}
                      iconName={job.services?.subcategories?.icon_name || "home_repair_service"}
                      containerClassName="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl"
                      iconClassName="w-6 h-6 text-[#059669] drop-shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm sm:text-base font-headline text-on-surface truncate">
                        {job.services?.title || "Service"}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                        {job.address || job.city || "Location TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-bold font-headline text-xs sm:text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                      {job.scheduled_date
                        ? new Date(job.scheduled_date).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }
                        )
                        : "TBD"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance Quick-View */}
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-5 sm:p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 shadow-xs">
          <div className="text-center md:border-r border-outline-variant/15 p-2 group">
            <p className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight group-hover:scale-105 transition-transform">
              {profile?.rating_avg
                ? profile.rating_avg.toFixed(1)
                : "—"}
            </p>
            <p className="font-label text-[10px] sm:text-xs uppercase font-bold tracking-widest text-on-surface-variant mt-1.5">
              Average Rating
            </p>
          </div>
          <div className="text-center md:border-r border-outline-variant/15 p-2 group">
            <p className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight group-hover:scale-105 transition-transform">
              {profile?.acceptance_rate
                ? `${(profile.acceptance_rate * 100).toFixed(0)}%`
                : "—"}
            </p>
            <p className="font-label text-[10px] sm:text-xs uppercase font-bold tracking-widest text-on-surface-variant mt-1.5">
              Acceptance Rate
            </p>
          </div>
          <div className="text-center md:border-r border-outline-variant/15 p-2 group">
            <p className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight group-hover:scale-105 transition-transform">
              {profile?.jobs_cancelled_count ?? 0}
            </p>
            <p className="font-label text-[10px] sm:text-xs uppercase font-bold tracking-widest text-on-surface-variant mt-1.5">
              Cancellations
            </p>
          </div>
          <div className="text-center p-2 group">
            <p className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight group-hover:scale-105 transition-transform">
              {weeklyJobsCount ?? 0}
            </p>
            <p className="font-label text-[10px] sm:text-xs uppercase font-bold tracking-widest text-on-surface-variant mt-1.5">
              Weekly Jobs
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
