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

  // ─── Fetch all performance data in parallel to resolve the waterfall ────────
  const [
    profileRes,
    totalCompletedRes,
    completedJobsRes,
    reviewsRes,
    distributionRes
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("bookings")
      .select("scheduled_date, started_at")
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .not("started_at", "is", null),
    supabase
      .from("reviews")
      .select(
        "*, customer:customer_id(full_name, avatar_url), booking:booking_id(services:service_id(title))"
      )
      .eq("partner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reviews")
      .select("rating")
      .eq("partner_id", user.id)
  ]);

  const profile = profileRes.data as PartnerProfile | null;
  const totalCompleted = totalCompletedRes.count;
  const completedJobs = completedJobsRes.data;
  const reviews = (reviewsRes.data || []) as unknown as ReviewWithCustomer[];
  const distributionData = distributionRes.data;

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
    <div className="bg-surface font-body text-on-surface min-h-screen pb-20 lg:pb-10">
      <main className="grow max-w-6xl mx-auto w-full px-3.5 sm:px-6 space-y-5 mt-3 sm:mt-5">
        
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-headline font-black tracking-tight text-on-surface">
              Performance & Quality
            </h1>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Monitor your customer ratings, punctuality, and quality badges
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-secondary/15 text-primary px-3 py-1.5 rounded-xl border border-secondary/30 text-xs font-bold font-label">
            <span className="material-symbols-outlined text-base">workspace_premium</span>
            <span>Quality Scorecard</span>
          </div>
        </div>

        {/* Insight Banner */}
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-primary p-4 sm:p-5 text-on-primary shadow-xs">
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/15 border border-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-xl sm:text-2xl text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspace_premium
                  </span>
                </div>
                <div>
                  <span className="font-label text-[10px] font-extrabold uppercase tracking-widest text-secondary block">
                    Partner Metric Overview
                  </span>
                  <h2 className="font-headline font-extrabold text-sm sm:text-base leading-snug text-white">
                    {ratingAvg >= 4.5
                      ? `Outstanding! Your ${ratingAvg.toFixed(1)}★ rating puts you in the top tier!`
                      : ratingAvg > 0
                        ? `Keep improving! Your current rating is ${ratingAvg.toFixed(1)}★.`
                        : `Welcome! Complete jobs to earn your first rating.`}
                  </h2>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[11px] font-bold text-white/90 bg-white/15 px-3 py-1 rounded-full border border-white/20 inline-block">
                  {(totalCompleted || 0) > 0
                    ? `${totalCompleted} Jobs · ${completionRate}% Completion`
                    : `No jobs completed yet`}
                </span>
              </div>
            </div>
            {/* Ambient visual element */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Rating Card */}
          <div className="sm:col-span-2 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="flex items-center justify-between mb-3 pl-1">
              <span className="font-label text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Rating Breakdown
              </span>
              <span className="text-[11px] font-extrabold text-on-surface-variant bg-surface-container-low px-2.5 py-0.5 rounded-full border border-outline-variant/15">
                {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pl-1">
              {/* Overall Score */}
              <div className="sm:w-1/3 flex flex-col justify-between text-center sm:text-left">
                <div>
                  <h3 className="font-headline font-black text-3xl sm:text-4xl leading-none tracking-tight text-primary">
                    {ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-0.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-sm ${
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
              </div>

              {/* Distribution Bars */}
              <div className="flex-1 w-full space-y-1.5">
                {distribution.map((count, index) => {
                  const stars = 5 - index;
                  const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2.5 text-xs">
                      <span className="w-5 font-semibold text-on-surface-variant text-right text-[11px]">
                        {stars}★
                      </span>
                      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-6 text-on-surface-variant/70 text-right font-medium text-[11px]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Job Completion */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            <div className="pl-1">
              <span className="font-label text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                Completion Rate
              </span>
              <h3 className="font-headline font-black text-2xl sm:text-3xl text-on-surface tracking-tight mb-4">
                {completionRate > 0 ? `${completionRate}%` : "—"}
              </h3>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* On-time Arrival */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="pl-1">
              <span className="font-label text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">
                On-Time Rate
              </span>
              <h3 className="font-headline font-black text-2xl sm:text-3xl text-on-surface tracking-tight">
                {totalWithStartTime > 0 ? `${onTimeRate}%` : "—"}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg w-fit mt-3">
              <span className="material-symbols-outlined text-xs">
                schedule
              </span>
              <span>
                {onTimeRate >= 90
                  ? "High Punctuality"
                  : onTimeRate > 0
                    ? "Keep Improving"
                    : "No Data"}
              </span>
            </div>
          </div>

          {/* Cancellation Rate */}
          <div className="sm:col-span-2 lg:col-span-4 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-xs flex items-center justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
            <div className="pl-2">
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Job Cancellation Rate
              </span>
              <p className="font-headline font-black text-lg sm:text-xl text-on-surface tracking-tight mt-0.5">
                {cancellationRate > 0 ? `${cancellationRate}%` : "0%"}
              </p>
            </div>
            <span className="text-[10px] bg-error/10 text-error px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
              Safety Threshold: 5%
            </span>
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-base sm:text-lg tracking-tight text-on-surface pl-1">
            Performance Badges
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Top Rated Badge */}
            <div
              className={`border rounded-2xl p-3.5 flex flex-col items-center text-center transition-all ${ratingAvg >= 4.5
                ? "bg-surface-container-lowest border-outline-variant/15 shadow-xs"
                : "bg-surface-container-low border-outline-variant/10 opacity-60"
                }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${ratingAvg >= 4.5
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-container-high text-on-surface-variant"
                  }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {ratingAvg >= 4.5 ? "verified" : "lock"}
                </span>
              </div>
              <span className="font-headline font-bold text-xs text-on-surface">
                Top Rated
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">
                4.5+ Avg Rating
              </span>
            </div>

            {/* Punctual Pro Badge */}
            <div
              className={`border rounded-2xl p-3.5 flex flex-col items-center text-center transition-all ${onTimeRate >= 95
                ? "bg-surface-container-lowest border-outline-variant/15 shadow-xs"
                : "bg-surface-container-low border-outline-variant/10 opacity-60"
                }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${onTimeRate >= 95
                  ? "bg-secondary/20 text-primary"
                  : "bg-surface-container-high text-on-surface-variant"
                  }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {onTimeRate >= 95 ? "bolt" : "lock"}
                </span>
              </div>
              <span className="font-headline font-bold text-xs text-on-surface">
                Punctual Pro
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">
                95%+ On-Time
              </span>
            </div>

            {/* 100+ Jobs Badge */}
            <div
              className={`border rounded-2xl p-3.5 flex flex-col items-center text-center transition-all ${(totalCompleted || 0) >= 100
                ? "bg-surface-container-lowest border-outline-variant/15 shadow-xs"
                : "bg-surface-container-low border-outline-variant/10 opacity-60"
                }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${(totalCompleted || 0) >= 100
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-container-high text-on-surface-variant"
                  }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {(totalCompleted || 0) >= 100 ? "military_tech" : "lock"}
                </span>
              </div>
              <span className="font-headline font-bold text-xs text-on-surface">
                100+ Jobs
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">
                {(totalCompleted || 0) >= 100 ? "Veteran Partner" : `${totalCompleted || 0}/100 Jobs`}
              </span>
            </div>

            {/* Locked Badge */}
            <div className="border bg-surface-container-low border-outline-variant/10 opacity-60 rounded-2xl p-3.5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-xl">
                  lock
                </span>
              </div>
              <span className="font-headline font-bold text-xs text-on-surface">
                Elite 500
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">
                {totalCompleted || 0}/500 Jobs
              </span>
            </div>
          </div>
        </section>

        {/* Recent Feedback Section */}
        <section className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container-low/40">
            <h2 className="font-headline font-bold text-xs sm:text-sm text-on-surface uppercase tracking-wider">
              Recent Customer Reviews
            </h2>
            <span className="text-[11px] font-bold text-on-surface-variant">
              Top 5 Reviews
            </span>
          </div>

          <div className="divide-y divide-outline-variant/15">
            {reviews.length === 0 && (
              <div className="p-6 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-1 opacity-40">
                  rate_review
                </span>
                <p className="font-bold text-xs sm:text-sm text-on-surface">No reviews yet</p>
                <p className="text-[11px] mt-0.5">
                  Customer feedback will appear here after completing jobs.
                </p>
              </div>
            )}

            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex gap-3.5 p-4 hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm">
                  {review.customer?.avatar_url ? (
                    <Image
                      width={36}
                      height={36}
                      alt="User"
                      className="w-full h-full object-cover"
                      src={review.customer.avatar_url}
                    />
                  ) : (
                    review.customer?.full_name
                      ? review.customer.full_name.charAt(0).toUpperCase()
                      : "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-headline font-bold text-xs sm:text-sm text-on-surface truncate">
                      {review.customer?.full_name || "Customer"}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined text-xs ${i <= review.rating ? "text-secondary font-fill" : "text-outline-variant/30"}`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                      &quot;{review.comment}&quot;
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {review.booking?.services?.title && (
                      <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {review.booking.services.title}
                      </span>
                    )}
                    <span className="text-[11px] text-on-surface-variant/70">
                      {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
