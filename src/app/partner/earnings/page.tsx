import PartnerBottomNav from "@/components/PartnerBottomNav";
import PartnerHeader from "@/components/PartnerHeader";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { BookingWithDetails, PartnerProfile } from "@/lib/types";

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── Fetch partner profile ─────────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as PartnerProfile | null;


  // ─── Fetch completed jobs for this partner ─────────────────
  const { data: completedData } = await supabase
    .from("bookings")
    .select("*, services:service_id(title)")
    .eq("partner_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const payouts = (completedData || []) as BookingWithDetails[];
  const totalEarnings =
    payouts.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0) *
    0.8;

  // ─── Calculate weekly chart data ───────────────────────────
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Initialize daily earnings for the week
  const dailyEarnings: number[] = [0, 0, 0, 0, 0, 0, 0];

  payouts.forEach((job) => {
    const completedDate = job.completed_at
      ? new Date(job.completed_at)
      : new Date(job.created_at);
    if (completedDate >= weekStart) {
      const dayIndex = completedDate.getDay();
      dailyEarnings[dayIndex] += Number(job.total_amount || 0) * 0.8;
    }
  });

  const maxDailyEarning = Math.max(...dailyEarnings, 1); // Avoid division by zero

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col pb-40">
      <PartnerHeader />

      <main className="grow max-w-7xl mx-auto w-full px-4 md:px-6 space-y-12 mt-6">

        {/* Summary Dashboard (The Overlap Pattern) */}
        <section className="relative">
          <div className="bg-linear-to-br from-primary to-primary-container rounded-4xl p-8 pb-20 text-on-primary-container shadow-[0_20px_40px_rgba(0,104,95,0.15)] overflow-hidden relative">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl opacity-60"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <p className="font-label text-[10px] uppercase tracking-[0.2em] font-black opacity-80 text-primary-fixed">
                  Net Earnings
                </p>
                <h2 className="text-5xl font-black font-headline tracking-tighter text-white mt-1">
                  ₹{totalEarnings.toFixed(2)}
                </h2>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-1.5 border border-white/20 shadow-sm">
                <span
                  className="material-symbols-outlined text-white text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_balance_wallet
                </span>
                <span className="font-label text-[11px] uppercase tracking-wider font-bold text-white">
                  Live <span className="opacity-70">Payout</span>
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Chart Card (Asymmetric Overlap) */}
          <div className="mx-4 -mt-18 bg-surface-container-lowest rounded-3xl p-6 shadow-xl shadow-black/4 border border-outline-variant/10 relative z-20">
            <div className="flex justify-between items-end h-36 gap-2 sm:gap-4">
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
                let textClass = "text-outline";
                if (isMax && dailyEarnings[idx] > 0) {
                  colorClass =
                    "bg-primary shadow-[0_0_16px_rgba(0,104,95,0.4)]";
                  textClass = "text-primary font-black";
                } else if (isToday) {
                  colorClass = "bg-secondary-container";
                  textClass = "text-secondary font-black";
                } else if (dailyEarnings[idx] === 0) {
                  colorClass = "bg-surface-dim";
                }

                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-3 group"
                  >
                    <div className="w-full sm:w-10 bg-surface-container-low rounded-t-xl relative h-full flex items-end overflow-hidden border border-outline-variant/5">
                      <div
                        className={`w-full ${colorClass} transition-all duration-300`}
                        style={{
                          height: `${Math.max(heightPercent, 5)}%`,
                        }}
                      ></div>
                    </div>
                    <span
                      className={`font-label text-[10px] font-bold uppercase tracking-widest ${textClass}`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Recent Payouts Section */}
        <section className="space-y-5">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[1.35rem] font-black font-headline text-on-surface tracking-tight">
              Recent Payouts
            </h3>
          </div>

          <div className="space-y-3">
            {payouts.map((job) => (
              <div
                key={job.id}
                className="flex items-center p-4 sm:p-5 bg-surface-container-lowest border border-outline-variant/10 shadow-[0_2px_8px_rgba(15,23,42,0.02)] rounded-[1.25rem] relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-[1.25rem]"></div>
                <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center mr-4 border border-outline-variant/10 shadow-sm">
                  <span
                    className="material-symbols-outlined text-primary text-[28px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    payments
                  </span>
                </div>
                <div className="grow">
                  <h4 className="text-[17px] font-bold font-headline text-on-surface tracking-tight">
                    {job.services?.title || "Service"}
                  </h4>
                  <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                    Completed{" "}
                    {new Date(
                      job.completed_at || job.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black font-headline text-primary tracking-tighter">
                    ₹{(Number(job.total_amount) * 0.8).toFixed(2)}
                  </p>
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mt-1">
                    Settled
                  </p>
                </div>
              </div>
            ))}

            {payouts.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
                  money_off
                </span>
                <p className="font-bold">No completed jobs yet.</p>
                <p className="text-xs mt-1 text-slate-400">
                  Earnings will appear here once you complete jobs.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Bento Grid (Secondary Data) */}
        <section className="grid grid-cols-2 gap-4 pb-8">
          <div className="bg-surface-container-lowest border border-outline-variant/10 p-6 rounded-4xl flex flex-col justify-between aspect-square shadow-[0_2px_12px_rgba(15,23,42,0.02)] relative overflow-hidden">
            <span
              className="material-symbols-outlined text-primary bg-primary/5 border border-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-[28px] relative z-10"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              work_history
            </span>
            <div className="relative z-10 mt-6">
              <p className="text-[40px] font-black font-headline text-on-surface tracking-tighter leading-none">
                {payouts.length}
              </p>
              <p className="font-label text-[10px] uppercase font-black text-on-surface-variant tracking-widest mt-2">
                Jobs Completed
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-[20px]"></div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/10 p-6 rounded-4xl flex flex-col justify-between aspect-square shadow-[0_2px_12px_rgba(15,23,42,0.02)] relative overflow-hidden">
            <span
              className="material-symbols-outlined text-secondary bg-secondary/5 border border-secondary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-[28px] relative z-10"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <div className="relative z-10 mt-6">
              <p className="text-[40px] font-black font-headline text-on-surface tracking-tighter leading-none">
                {profile?.rating_avg
                  ? profile.rating_avg.toFixed(1)
                  : "—"}
              </p>
              <p className="font-label text-[10px] uppercase font-black text-on-surface-variant tracking-widest mt-2">
                Avg Rating
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-secondary/5 rounded-full blur-[20px]"></div>
          </div>
        </section>
      </main>

      <PartnerBottomNav />
    </div>
  );
}
