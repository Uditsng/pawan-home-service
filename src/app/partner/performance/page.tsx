import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { PartnerProfile, ReviewWithCustomer } from "@/lib/types";

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── Fetch partner profile with metrics ────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as PartnerProfile | null;


  // ─── Fetch total completed jobs count ──────────────────────
  const { count: totalCompleted } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", user.id)
    .eq("status", "completed");

  // ─── Fetch total cancelled by partner ──────────────────────
  // const { count: totalCancelled } = await supabase
  //   .from("bookings")
  //   .select("id", { count: "exact", head: true })
  //   .eq("partner_id", user.id)
  //   .eq("status", "cancelled")
  //   .eq("cancelled_by", "PARTNER");

  // ─── Calculate on-time rate from bookings ──────────────────
  // On-time = started_at is before or within 15 min of scheduled_date
  const { data: completedJobs } = await supabase
    .from("bookings")
    .select("scheduled_date, started_at")
    .eq("partner_id", user.id)
    .eq("status", "completed")
    .not("started_at", "is", null);

  let onTimeCount = 0;
  const totalWithStartTime = completedJobs?.length || 0;
  completedJobs?.forEach((job) => {
    if (job.scheduled_date && job.started_at) {
      const scheduled = new Date(job.scheduled_date).getTime();
      const started = new Date(job.started_at).getTime();
      const fifteenMin = 15 * 60 * 1000;
      if (started <= scheduled + fifteenMin) {
        onTimeCount++;
      }
    }
  });
  const onTimeRate =
    totalWithStartTime > 0
      ? Math.round((onTimeCount / totalWithStartTime) * 100)
      : 0;

  // ─── Fetch recent reviews ─────────────────────────────────
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      "*, customer:customer_id(full_name, avatar_url), booking:booking_id(services:service_id(title))"
    )
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const reviews = (reviewsData || []) as unknown as ReviewWithCustomer[];

  // ─── Fetch rating distribution ────────────────────────────
  const { data: distributionData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("partner_id", user.id);

  const distribution = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 star counts
  distributionData?.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[5 - r.rating]++;
    }
  });
  const totalReviews = distributionData?.length || 0;

  // ─── Calculate badge eligibility ──────────────────────────
  const ratingAvg = profile?.rating_avg || 0;
  const completionRate =
    (totalCompleted || 0) > 0
      ? Math.round(
        ((totalCompleted || 0) /
          Math.max((profile?.jobs_accepted_count || 0), 1)) *
        100
      )
      : 0;
  const cancellationRate = profile?.cancellation_rate
    ? Math.round(profile.cancellation_rate * 100)
    : 0;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32">
      <main className="max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-8">
        {/* Insight Banner */}
        <section>
          <div className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary to-primary-container p-8 text-on-primary shadow-[0_12px_32px_rgba(0,104,95,0.2)]">
            <div className="relative z-10 flex flex-col md:flex-row gap-6">
              <div className="w-14 h-14 bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-[32px] text-primary-fixed"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  workspace_premium
                </span>
              </div>
              <div className="max-w-md">
                <span className="font-label text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2 block text-primary-fixed">
                  Performance Summary
                </span>
                <h2 className="font-headline font-black text-[22px] leading-snug tracking-tight">
                  {ratingAvg >= 4.5
                    ? `Outstanding! Your ${ratingAvg.toFixed(1)}★ rating puts you in the top tier!`
                    : ratingAvg > 0
                      ? `Keep improving! Your current rating is ${ratingAvg.toFixed(1)}★.`
                      : `Welcome! Complete jobs and earn your first reviews.`}
                </h2>
                <p className="text-[13px] mt-2 opacity-90 font-medium leading-relaxed">
                  {(totalCompleted || 0) > 0
                    ? `You've completed ${totalCompleted} jobs with a ${completionRate}% completion rate.`
                    : `Start accepting jobs to build your performance metrics.`}
                </p>
              </div>
            </div>
            {/* Abstract visual element */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </section>

        {/* Metrics Grid (Asymmetric Bento) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Rating Card */}
          <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 relative overflow-hidden group shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4 pl-1">
              Overall Rating & Breakdown
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start pl-1">
              {/* Overall Score */}
              <div className="sm:w-1/3 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline font-black text-[56px] leading-none tracking-tighter text-on-surface">
                    {ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}
                  </h3>
                  <div className="flex items-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-base ${
                          star <= Math.round(ratingAvg)
                            ? "text-secondary font-fill"
                            : "text-on-surface-variant/20"
                        }`}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-on-surface-variant text-[11px] font-bold bg-surface-container-high/50 px-2.5 py-1 rounded-md">
                    {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Distribution Bars */}
              <div className="flex-1 w-full space-y-2">
                {distribution.map((count, index) => {
                  const stars = 5 - index;
                  const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-6 font-semibold text-on-surface-variant text-right">
                        {stars}★
                      </span>
                      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-on-surface-variant/70 text-right font-medium">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Job Completion */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 relative overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container"></div>
            <div className="pl-1">
              <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                Completion
              </p>
              <h3 className="font-headline font-black text-3xl text-on-surface tracking-tighter mb-8">
                {completionRate > 0 ? `${completionRate}%` : "—"}
              </h3>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary-container rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* On-time Arrival */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 relative overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-tertiary"></div>
            <div className="pl-1 h-full flex flex-col justify-between">
              <div>
                <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                  On-time
                </p>
                <h3 className="font-headline font-black text-3xl text-on-surface tracking-tighter">
                  {totalWithStartTime > 0 ? `${onTimeRate}%` : "—"}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-tertiary font-bold bg-tertiary/10 px-3 py-1.5 rounded-lg w-fit mt-6">
                <span className="material-symbols-outlined text-sm">
                  schedule
                </span>
                <span>
                  {onTimeRate >= 90
                    ? "High Punctuality"
                    : onTimeRate > 0
                      ? "Keep Improving"
                      : "No Data Yet"}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Rate (Warning State) */}
          <div className="md:col-span-4 lg:col-span-1 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 relative overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
            <div className="pl-1 flex flex-row items-center justify-between lg:flex-col md:items-start">
              <div>
                <p className="font-label text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                  Cancellations
                </p>
                <h3 className="font-headline font-black text-3xl text-on-surface tracking-tighter">
                  {cancellationRate > 0 ? `${cancellationRate}%` : "0%"}
                </h3>
              </div>
              <p className="text-[10px] bg-error/10 text-error px-2.5 py-1 rounded-md font-bold uppercase tracking-widest mt-0 lg:mt-4">
                Threshold:{" "}
                <span className="text-on-surface">5%</span>
              </p>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section>
          <div className="flex items-center justify-between mb-5 px-1 relative">
            <h2 className="font-headline font-black text-[22px] tracking-tight text-on-surface">
              Active Badges
            </h2>
            <div className="absolute top-1/2 right-16 left-32 h-px bg-linear-to-r from-outline-variant/20 to-transparent -translate-y-1/2 z-[-1]"></div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar mask-linear -mx-2 px-2">
            {/* Top Rated Badge */}
            <div
              className={`min-w-[130px] shrink-0 border shadow-[0_2px_8px_rgba(15,23,42,0.02)] rounded-3xl p-5 flex flex-col items-center text-center transition-transform hover:scale-105 cursor-pointer ${ratingAvg >= 4.5
                ? "bg-surface-container-lowest border-outline-variant/10 hover:border-primary/30"
                : "bg-surface-container-high/30 border-outline-variant/5 grayscale opacity-50 cursor-not-allowed"
                }`}
            >
              <div
                className={`w-14 h-14 rounded-full border flex items-center justify-center mb-4 ${ratingAvg >= 4.5
                  ? "bg-primary/10 border-primary/20"
                  : "bg-surface-dim/50 border-surface-variant"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[28px] ${ratingAvg >= 4.5 ? "text-primary" : "text-on-surface-variant"}`}
                  style={{
                    fontVariationSettings: `'FILL' ${ratingAvg >= 4.5 ? 1 : 0}`,
                  }}
                >
                  {ratingAvg >= 4.5 ? "verified" : "lock"}
                </span>
              </div>
              <span className="font-headline font-black text-[13px] text-on-surface tracking-tight">
                Top Rated
              </span>
              <span className="text-[10px] font-medium text-on-surface-variant mt-1">
                Consistent 4.5+
              </span>
            </div>

            {/* Punctual Pro Badge */}
            <div
              className={`min-w-[130px] shrink-0 border shadow-[0_2px_8px_rgba(15,23,42,0.02)] rounded-3xl p-5 flex flex-col items-center text-center transition-transform hover:scale-105 cursor-pointer ${onTimeRate >= 95
                ? "bg-surface-container-lowest border-outline-variant/10 hover:border-secondary-container/30"
                : "bg-surface-container-high/30 border-outline-variant/5 grayscale opacity-50 cursor-not-allowed"
                }`}
            >
              <div
                className={`w-14 h-14 rounded-full border flex items-center justify-center mb-4 ${onTimeRate >= 95
                  ? "bg-secondary-container/10 border-secondary-container/20"
                  : "bg-surface-dim/50 border-surface-variant"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[28px] ${onTimeRate >= 95 ? "text-secondary-container" : "text-on-surface-variant"}`}
                  style={{
                    fontVariationSettings: `'FILL' ${onTimeRate >= 95 ? 1 : 0}`,
                  }}
                >
                  {onTimeRate >= 95 ? "bolt" : "lock"}
                </span>
              </div>
              <span className="font-headline font-black text-[13px] text-on-surface tracking-tight">
                Punctual Pro
              </span>
              <span className="text-[10px] font-medium text-on-surface-variant mt-1">
                {onTimeRate >= 95 ? "No late arrivals" : `${onTimeRate}% on-time`}
              </span>
            </div>

            {/* 100+ Jobs Badge */}
            <div
              className={`min-w-[130px] shrink-0 border shadow-[0_2px_8px_rgba(15,23,42,0.02)] rounded-3xl p-5 flex flex-col items-center text-center transition-transform hover:scale-105 cursor-pointer ${(totalCompleted || 0) >= 100
                ? "bg-surface-container-lowest border-outline-variant/10 hover:border-tertiary-container/30"
                : "bg-surface-container-high/30 border-outline-variant/5 grayscale opacity-50 cursor-not-allowed"
                }`}
            >
              <div
                className={`w-14 h-14 rounded-full border flex items-center justify-center mb-4 ${(totalCompleted || 0) >= 100
                  ? "bg-tertiary-container/10 border-tertiary-container/20"
                  : "bg-surface-dim/50 border-surface-variant"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[28px] ${(totalCompleted || 0) >= 100 ? "text-tertiary-container" : "text-on-surface-variant"}`}
                  style={{
                    fontVariationSettings: `'FILL' ${(totalCompleted || 0) >= 100 ? 1 : 0}`,
                  }}
                >
                  {(totalCompleted || 0) >= 100 ? "military_tech" : "lock"}
                </span>
              </div>
              <span className="font-headline font-black text-[13px] text-on-surface tracking-tight">
                100+ Jobs
              </span>
              <span className="text-[10px] font-medium text-on-surface-variant mt-1">
                {(totalCompleted || 0) >= 100
                  ? "Veteran Partner"
                  : `${totalCompleted || 0}/100 jobs`}
              </span>
            </div>

            {/* Locked Badge — Elite 500 */}
            <div className="min-w-[130px] shrink-0 bg-surface-container-high/30 border border-outline-variant/5 rounded-3xl p-5 flex flex-col items-center text-center grayscale opacity-50 cursor-not-allowed">
              <div className="w-14 h-14 rounded-full bg-surface-dim/50 border border-surface-variant flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
                  lock
                </span>
              </div>
              <span className="font-headline font-black text-[13px] text-on-surface tracking-tight">
                Elite 500
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant mt-1">
                {totalCompleted || 0}
                <span className="opacity-60">/500 jobs</span>
              </span>
            </div>
          </div>
        </section>

        {/* Recent Feedback Section */}
        <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-4xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.02)]">
          <div className="px-6 py-5 border-b border-surface-variant/30 flex justify-between items-center bg-surface-container-lowest group relative overflow-hidden">
            <h2 className="font-headline font-black text-[17px] text-on-surface tracking-tight relative z-10">
              Recent Feedback
            </h2>
            <div className="relative z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors cursor-pointer text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">
                tune
              </span>
            </div>
          </div>

          <div className="divide-y divide-surface-variant/20">
            {reviews.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-40">
                  rate_review
                </span>
                <p className="font-bold">No reviews yet</p>
                <p className="text-xs mt-1 text-outline-variant">
                  Customer feedback will appear here after completing jobs.
                </p>
              </div>
            )}

            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex gap-4 p-6 hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-container-high shrink-0 overflow-hidden border border-outline-variant/10 shadow-sm">
                  {review.customer?.avatar_url ? (
                    <Image
                      width={48}
                      height={48}
                      alt="User"
                      className="w-full h-full object-cover"
                      src={review.customer.avatar_url}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-fixed/20 text-primary-fixed-variant flex items-center justify-center font-bold">
                      {review.customer?.full_name
                        ? review.customer.full_name.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-headline font-black text-[15px] text-on-surface tracking-tight">
                      {review.customer?.full_name || "Anonymous"}
                    </span>
                    <div className="flex gap-[2px]">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined text-[15px] ${i <= review.rating ? "text-primary" : "text-surface-dim"}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed">
                      &quot;{review.comment}&quot;
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    {review.booking?.services?.title && (
                      <span className="text-[9px] font-label font-black uppercase tracking-widest bg-surface-container-high text-on-surface px-2.5 py-1 rounded-md">
                        {review.booking.services.title}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-outline-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">
                        schedule
                      </span>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
