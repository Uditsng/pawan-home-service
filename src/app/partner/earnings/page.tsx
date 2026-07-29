import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculatePartnerEarningsBreakdown } from "@/lib/engines/commissionEngine";
import { EarningsClient } from "./EarningsClient";

interface RawBooking {
  id: string;
  total_amount: number;
  completed_at: string | null;
  created_at: string;
  services: { title: string } | null;
  customer: { full_name: string } | null;
}

interface RawPricing {
  booking_id: string;
  base_price: number;
  addons_total: number;
  gst_amount: number;
  total_price: number;
}

function calculateStreak(bookings: { completed_at: string | null; created_at: string }[]): number {
  const daySet = new Set<number>();
  for (const b of bookings) {
    const d = new Date(b.completed_at || b.created_at);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const startTs = daySet.has(todayTs) ? todayTs : todayTs - 86400000;
  if (!daySet.has(startTs)) return 0;
  let streak = 0;
  for (let i = 0; ; i++) {
    if (daySet.has(startTs - i * 86400000)) streak++;
    else break;
  }
  return streak;
}

function computePeriodPayout(
  bookings: RawBooking[],
  pricingMap: Map<string, RawPricing>,
  start: Date,
  end: Date,
  commPct: number
): number {
  let total = 0, gst = 0;
  for (const b of bookings) {
    const d = new Date(b.completed_at || b.created_at);
    if (d >= start && d <= end) {
      total += Number(b.total_amount || 0);
      gst += Number(pricingMap.get(b.id)?.gst_amount || 0);
    }
  }
  return calculatePartnerEarningsBreakdown(total, gst, commPct).partnerPayoutAmount;
}

function computeComparisons(bookings: RawBooking[], pricingMap: Map<string, RawPricing>, commPct: number) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const todayP = computePeriodPayout(bookings, pricingMap, todayStart, todayEnd, commPct);
  const yesterdayP = computePeriodPayout(bookings, pricingMap, yesterdayStart, todayStart, commPct);
  const weekP = computePeriodPayout(bookings, pricingMap, weekStart, todayEnd, commPct);
  const lastWeekP = computePeriodPayout(bookings, pricingMap, lastWeekStart, weekStart, commPct);
  const monthP = computePeriodPayout(bookings, pricingMap, monthStart, todayEnd, commPct);
  const lastMonthP = computePeriodPayout(bookings, pricingMap, lastMonthStart, lastMonthEnd, commPct);

  const calc = (cur: number, prev: number): number | null => {
    if (cur === 0 && prev === 0) return null;
    if (prev === 0) return 100;
    return Math.round(((cur - prev) / prev) * 100);
  };

  return {
    todayVsYesterday: calc(todayP, yesterdayP),
    weekVsLastWeek: calc(weekP, lastWeekP),
    monthVsLastMonth: calc(monthP, lastMonthP),
  };
}

function computeDailyTarget(bookings: RawBooking[], pricingMap: Map<string, RawPricing>, commPct: number): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const dailyTotals: Record<string, number> = {};
  const dailyGst: Record<string, number> = {};
  for (const b of bookings) {
    const d = new Date(b.completed_at || b.created_at);
    if (d >= thirtyDaysAgo && d <= now) {
      const key = d.toISOString().slice(0, 10);
      dailyTotals[key] = (dailyTotals[key] || 0) + Number(b.total_amount || 0);
      dailyGst[key] = (dailyGst[key] || 0) + Number(pricingMap.get(b.id)?.gst_amount || 0);
    }
  }
  const days = Object.keys(dailyTotals);
  if (days.length === 0) return 500;
  const avgTotal = Math.round(Object.values(dailyTotals).reduce((a, b) => a + b, 0) / days.length);
  const avgGst = Math.round(Object.values(dailyGst).reduce((a, b) => a + b, 0) / days.length);
  return calculatePartnerEarningsBreakdown(avgTotal, avgGst, commPct).partnerPayoutAmount;
}

export interface EnrichedBooking extends RawBooking {
  booking_pricing: RawPricing | null;
}

export default async function EarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [bookingsResult, pricingResult, platformSettings] = await Promise.all([
    supabase
      .from("bookings")
      .select(`*,
        services:service_id(title),
        customer:customer_id(full_name)
      `)
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    supabase
      .from("booking_pricing")
      .select("booking_id, base_price, addons_total, gst_amount, total_price"),
    fetchPlatformSettings(supabase),
  ]);

  const bookings = (bookingsResult.data || []) as RawBooking[];
  const pricingData = (pricingResult.data || []) as RawPricing[];
  const pricingMap = new Map(pricingData.map((p) => [p.booking_id, p]));
  const commissionPercent = platformSettings.platformCommission;

  const enrichedBookings: EnrichedBooking[] = bookings.map((b) => ({
    ...b,
    booking_pricing: pricingMap.get(b.id) || null,
  }));

  const streak = calculateStreak(bookings);
  const comparisons = computeComparisons(bookings, pricingMap, commissionPercent);
  const dailyTarget = computeDailyTarget(bookings, pricingMap, commissionPercent);

  return (
    <EarningsClient
      bookings={enrichedBookings}
      commissionPercent={commissionPercent}
      streak={streak}
      comparisons={comparisons}
      dailyTarget={dailyTarget}
    />
  );
}
