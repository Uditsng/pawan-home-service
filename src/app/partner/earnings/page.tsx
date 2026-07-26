import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { BookingWithDetails, PartnerProfile } from "@/lib/types";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculateCommissionBreakdown, formatPartnerShareBadge } from "@/lib/engines/commissionEngine";

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch partner profile, completed jobs, and platform settings in parallel
  const [profileResult, completedResult, platformSettings] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select("*, services:service_id(title)")
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    fetchPlatformSettings(supabase),
  ]);

  const profile = profileResult.data as PartnerProfile | null;
  const payouts = (completedResult.data || []) as BookingWithDetails[];
  const commissionPercent = platformSettings.platformCommission;

  const totalRawRevenue = payouts.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  const totalEarnings = calculateCommissionBreakdown(totalRawRevenue, commissionPercent).partnerPayoutAmount;

  // ─── Calculate weekly chart data ───────────────────────────
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const dailyEarnings: number[] = [0, 0, 0, 0, 0, 0, 0];

  payouts.forEach((job) => {
    const completedDate = job.completed_at
      ? new Date(job.completed_at)
      : new Date(job.created_at);
    if (completedDate >= weekStart) {
      const dayIndex = completedDate.getDay();
      const jobPayout = calculateCommissionBreakdown(Number(job.total_amount || 0), commissionPercent).partnerPayoutAmount;
      dailyEarnings[dayIndex] += jobPayout;
    }
  });

  const maxDailyEarning = Math.max(...dailyEarnings, 1);

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col pb-20 lg:pb-10">
      <main className="grow max-w-6xl mx-auto w-full px-3.5 sm:px-6 space-y-5 mt-3 sm:mt-5">

        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-headline font-black tracking-tight text-on-surface">
              Earnings & Payouts
            </h1>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Track your weekly settled revenue and payout history
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20 text-xs font-bold font-label">
            <span className="material-symbols-outlined text-base">verified</span>
            <span>{formatPartnerShareBadge(commissionPercent)}</span>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left Column (Chart & Net Summary) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Net Earnings Summary Banner */}
            <div className="bg-primary rounded-2xl p-5 sm:p-6 text-on-primary shadow-xs overflow-hidden relative">
              <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="font-label text-[10px] sm:text-[11px] uppercase tracking-widest font-extrabold text-secondary">
                    Net Settled Earnings
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-headline font-black tracking-tight text-white mt-1">
                    ₹{totalEarnings.toFixed(2)}
                  </h2>
                </div>
                
                <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-white/20">
                  <span
                    className="material-symbols-outlined text-secondary text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    account_balance_wallet
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-wider font-extrabold text-white">
                    Live Payouts
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Chart Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/15">
              <div className="flex items-center justify-between mb-4">
                <span className="font-label text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  This Week&apos;s Revenue Breakdown
                </span>
                <span className="text-[11px] font-bold text-primary font-mono">
                  Peak: ₹{maxDailyEarning.toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between items-end h-28 sm:h-36 gap-1.5 sm:gap-2">
                {dayNames.map((day, idx) => {
                  const heightPercent =
                    maxDailyEarning > 0
                      ? (dailyEarnings[idx] / maxDailyEarning) * 100
                      : 0;
                  const isMax =
                    dailyEarnings[idx] === maxDailyEarning &&
                    dailyEarnings[idx] > 0;
                  const isToday = idx === now.getDay();

                  let colorClass = "bg-primary/20 group-hover:bg-primary/40";
                  let textClass = "text-on-surface-variant/70";
                  if (isMax && dailyEarnings[idx] > 0) {
                    colorClass = "bg-primary shadow-xs";
                    textClass = "text-primary font-black";
                  } else if (isToday) {
                    colorClass = "bg-secondary";
                    textClass = "text-primary font-black";
                  } else if (dailyEarnings[idx] === 0) {
                    colorClass = "bg-surface-container-high";
                  }

                  return (
                    <div
                      key={day}
                      className="flex-1 flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-full sm:w-9 bg-surface-container-low rounded-t-lg relative h-full flex items-end overflow-hidden border border-outline-variant/10">
                        <div
                          className={`w-full ${colorClass} transition-all duration-300`}
                          style={{
                            height: `${Math.max(heightPercent, 6)}%`,
                          }}
                        ></div>
                      </div>
                      <span
                        className={`font-label text-[10px] font-bold uppercase tracking-wider ${textClass}`}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Metric Cards (2 Columns) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    work_history
                  </span>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-headline font-black text-on-surface tracking-tight leading-none">
                    {payouts.length}
                  </p>
                  <p className="font-label text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mt-1">
                    Completed Jobs
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-primary shrink-0">
                  <span
                    className="material-symbols-outlined text-xl text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-headline font-black text-on-surface tracking-tight leading-none">
                    {profile?.rating_avg
                      ? profile.rating_avg.toFixed(1)
                      : "—"}
                  </p>
                  <p className="font-label text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mt-1">
                    Average Rating
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Recent Payout History) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-headline font-bold text-on-surface tracking-tight">
                Recent Payout History
              </h3>
              <span className="text-[11px] font-bold text-on-surface-variant">
                {payouts.length} Total
              </span>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 no-scrollbar">
              {payouts.map((job) => {
                const jobPayout = calculateCommissionBreakdown(Number(job.total_amount || 0), commissionPercent).partnerPayoutAmount;
                return (
                  <div
                    key={job.id}
                    className="flex items-center p-3 sm:p-3.5 bg-surface-container-lowest border border-outline-variant/15 shadow-xs rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-colors"
                  >
                    <div className="w-1 absolute left-0 top-0 bottom-0 bg-primary"></div>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                      <span
                        className="material-symbols-outlined text-primary text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        payments
                      </span>
                    </div>
                    <div className="grow min-w-0 pr-2">
                      <h4 className="text-xs sm:text-sm font-bold font-headline text-on-surface truncate">
                        {job.services?.title || "Service"}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 font-medium">
                        {new Date(
                          job.completed_at || job.created_at
                        ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-black font-headline text-primary tracking-tight">
                        ₹{jobPayout.toFixed(2)}
                      </p>
                      <span className="font-label text-[9px] font-extrabold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        Settled
                      </span>
                    </div>
                  </div>
                );
              })}

              {payouts.length === 0 && (
                <div className="p-6 text-center bg-surface-container-low border border-outline-variant/15 rounded-2xl">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">
                    money_off
                  </span>
                  <p className="font-bold text-on-surface text-xs sm:text-sm">No completed payouts yet</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Your settled earnings will appear here once jobs are completed.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
