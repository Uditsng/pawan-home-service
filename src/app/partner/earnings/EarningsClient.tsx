"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { calculatePartnerEarningsBreakdown, formatPartnerShareBadge } from "@/lib/engines/commissionEngine";
import type { EnrichedBooking } from "./page";

type Period = "today" | "week" | "month" | "all";

interface Comparisons {
  todayVsYesterday: number | null;
  weekVsLastWeek: number | null;
  monthVsLastMonth: number | null;
}

interface Props {
  bookings: EnrichedBooking[];
  commissionPercent: number;
  streak: number;
  comparisons: Comparisons;
  dailyTarget: number;
}

const periods: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
];

function periodRange(period: Period) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (period === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return { start: s, end };
  }
  if (period === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - now.getDay());
    s.setHours(0, 0, 0, 0);
    return { start: s, end };
  }
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  }
  return { start: new Date(0), end };
}

function filterAndAggregate(bookings: EnrichedBooking[], period: Period, commPct: number) {
  const { start, end } = periodRange(period);
  const filtered = bookings.filter((b) => {
    const d = new Date(b.completed_at || b.created_at);
    return d >= start && d <= end;
  });
  let total = 0, gst = 0;
  for (const b of filtered) {
    total += Number(b.total_amount || 0);
    gst += Number(b.booking_pricing?.gst_amount || 0);
  }
  const breakdown = calculatePartnerEarningsBreakdown(total, gst, commPct);
  return { filtered, breakdown };
}

function buildChart(bookings: EnrichedBooking[], period: Period, commPct: number) {
  if (period === "today") return null;
  const { start, end } = periodRange(period);

  if (period === "week") {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const values = [0, 0, 0, 0, 0, 0, 0];
    for (const b of bookings) {
      const d = new Date(b.completed_at || b.created_at);
      if (d >= start && d <= end) {
        const e = calculatePartnerEarningsBreakdown(
          Number(b.total_amount || 0),
          Number(b.booking_pricing?.gst_amount || 0),
          commPct
        );
        values[d.getDay()] += e.partnerPayoutAmount;
      }
    }
    return { labels, values };
  }

  if (period === "month") {
    const labels: string[] = [];
    const values: number[] = [];
    const cursor = new Date(start);
    let wn = 1;
    while (cursor < end) {
      const wEnd = new Date(cursor);
      wEnd.setDate(wEnd.getDate() + 6);
      labels.push(`W${wn}`);
      let v = 0;
      for (const b of bookings) {
        const d = new Date(b.completed_at || b.created_at);
        if (d >= cursor && d <= wEnd && d >= start && d <= end) {
          const e = calculatePartnerEarningsBreakdown(
            Number(b.total_amount || 0),
            Number(b.booking_pricing?.gst_amount || 0),
            commPct
          );
          v += e.partnerPayoutAmount;
        }
      }
      values.push(v);
      cursor.setDate(cursor.getDate() + 7);
      wn++;
    }
    return { labels, values };
  }

  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const mEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0, 23, 59, 59, 999);
    if (mEnd < start) break;
    labels.push(mStart.toLocaleString("en-IN", { month: "short", year: "2-digit" }));
    let v = 0;
    for (const b of bookings) {
      const d = new Date(b.completed_at || b.created_at);
      if (d >= mStart && d <= mEnd) {
        const e = calculatePartnerEarningsBreakdown(
          Number(b.total_amount || 0),
          Number(b.booking_pricing?.gst_amount || 0),
          commPct
        );
        v += e.partnerPayoutAmount;
      }
    }
    values.push(v);
  }
  return { labels, values };
}

function monthlyTrends(bookings: EnrichedBooking[], commPct: number) {
  const groups = new Map<string, { rev: number; jobs: number; payout: number }>();
  for (const b of bookings) {
    const d = new Date(b.completed_at || b.created_at);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!groups.has(key)) groups.set(key, { rev: 0, jobs: 0, payout: 0 });
    const g = groups.get(key)!;
    g.rev += Number(b.total_amount || 0);
    g.jobs++;
    const e = calculatePartnerEarningsBreakdown(
      Number(b.total_amount || 0),
      Number(b.booking_pricing?.gst_amount || 0),
      commPct
    );
    g.payout += e.partnerPayoutAmount;
  }
  return Array.from(groups.entries()).reverse();
}

function motivationalMessage(payout: number, period: Period): string {
  if (period !== "today") return "";
  if (payout === 0) return "No earnings yet today.";
  if (payout < 500) return "Good start! Keep it going.";
  if (payout < 1000) return "Solid earnings today!";
  if (payout < 2000) return "Great day! You're on a roll!";
  return "Outstanding! Maxing out today!";
}

export function EarningsClient({ bookings, commissionPercent, streak, comparisons, dailyTarget }: Props) {
  const [period, setPeriod] = useState<Period>("today");

  const { filtered, breakdown } = useMemo(
    () => filterAndAggregate(bookings, period, commissionPercent),
    [bookings, period, commissionPercent]
  );

  const chart = useMemo(() => buildChart(bookings, period, commissionPercent), [bookings, period, commissionPercent]);

  const trends = useMemo(
    () => (period === "month" || period === "all" ? monthlyTrends(bookings, commissionPercent) : []),
    [bookings, period, commissionPercent]
  );

  const comparisonValue = useMemo(() => {
    if (period === "today") return comparisons.todayVsYesterday;
    if (period === "week") return comparisons.weekVsLastWeek;
    if (period === "month") return comparisons.monthVsLastMonth;
    return null;
  }, [period, comparisons]);

  const comparisonLabel = period === "today" ? "yesterday" : period === "week" ? "last week" : "last month";

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const avgPerJob = filtered.length > 0 ? Math.round(breakdown.partnerPayoutAmount / filtered.length) : 0;

  const topService = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of filtered) {
      const name = b.services?.title || "Service";
      const e = calculatePartnerEarningsBreakdown(
        Number(b.total_amount || 0),
        Number(b.booking_pricing?.gst_amount || 0),
        commissionPercent
      );
      map.set(name, (map.get(name) || 0) + e.partnerPayoutAmount);
    }
    let best = "";
    let bestVal = 0;
    for (const [k, v] of map) {
      if (v > bestVal) {
        bestVal = v;
        best = k;
      }
    }
    return best;
  }, [filtered, commissionPercent]);

  const bestDay = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    for (const b of filtered) {
      const d = new Date(b.completed_at || b.created_at);
      const e = calculatePartnerEarningsBreakdown(
        Number(b.total_amount || 0),
        Number(b.booking_pricing?.gst_amount || 0),
        commissionPercent
      );
      dayTotals[d.getDay()] += e.partnerPayoutAmount;
    }
    const max = Math.max(...dayTotals);
    if (max === 0) return "";
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names[dayTotals.indexOf(max)];
  }, [filtered, commissionPercent]);

  const chartMax = chart ? Math.max(...chart.values, 1) : 0;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-10 font-body">
      <main className="max-w-lg mx-auto px-2.5 py-2 space-y-2">
        {/* Period Selector + Hero */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-0.5">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  period === p.key
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-on-surface leading-tight">
              ₹{breakdown.partnerPayoutAmount.toFixed(0)}
            </p>
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight mt-0.5">
              {formatPartnerShareBadge(commissionPercent)}
            </p>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-on-surface-variant">Total Job Value</p>
            <p className="text-sm font-black text-on-surface tracking-tight">₹{breakdown.serviceRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-on-surface-variant">Platform Fee</p>
            <p className="text-sm font-black text-error tracking-tight">-₹{breakdown.platformCommissionAmount.toFixed(0)}</p>
          </div>
          <div className="bg-primary rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-secondary/90">Your Earnings</p>
            <p className="text-sm font-black text-on-primary tracking-tight">₹{breakdown.partnerPayoutAmount.toFixed(0)}</p>
          </div>
        </div>

        {/* Motivation Strip */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            {streak > 1 && (
              <span className="flex items-center gap-1 font-bold text-on-surface-variant">
                <span className="text-sm">🔥</span>
                {streak}-day streak
              </span>
            )}
            {streak === 1 && (
              <span className="flex items-center gap-1 font-bold text-on-surface-variant">
                <span className="text-sm">⭐</span>
                First day!
              </span>
            )}
            {period === "today" && breakdown.partnerPayoutAmount > 0 && (
              <span className="text-success font-bold text-[10px]">
                {motivationalMessage(breakdown.partnerPayoutAmount, period)}
              </span>
            )}
            {period === "today" && breakdown.partnerPayoutAmount === 0 && (
              <Link href="/partner/jobs" className="text-primary font-bold text-[10px] underline">
                Check available jobs
              </Link>
            )}
          </div>
          {comparisonValue !== null && (
            <span
              className={`font-bold text-[10px] ${
                comparisonValue >= 0 ? "text-success" : "text-error"
              }`}
            >
              {comparisonValue >= 0 ? "↑" : "↓"} {Math.abs(comparisonValue)}% vs {comparisonLabel}
            </span>
          )}
        </div>

        {/* Daily Goal Bar (Today only) */}
        {period === "today" && dailyTarget > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant mb-1">
              <span>Daily Goal</span>
              <span>
                ₹{Math.min(breakdown.partnerPayoutAmount, dailyTarget).toFixed(0)} / ₹{dailyTarget.toFixed(0)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((breakdown.partnerPayoutAmount / dailyTarget) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Compact Chart (Week / Month / All) */}
        {chart && chartMax > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2">
            <div className="flex items-end h-16 sm:h-20 gap-px">
              {chart.values.map((val, i) => {
                const pct = chartMax > 0 ? (val / chartMax) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                    <div className="w-full bg-surface-container-low rounded-t relative h-full flex items-end overflow-hidden">
                      <div
                        className="w-full bg-primary/70 rounded-t transition-all duration-300 min-h-0.5"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-bold text-on-surface-variant/60 leading-none">
                      {chart.labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 px-0.5">
            Completed Jobs ({filtered.length})
          </p>
          <div className="space-y-0.5">
            {filtered.map((b) => {
              const e = calculatePartnerEarningsBreakdown(
                Number(b.total_amount || 0),
                Number(b.booking_pricing?.gst_amount || 0),
                commissionPercent
              );
              const isExpanded = expandedId === b.id;
              return (
                <div key={b.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2 text-left hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/40 shrink-0">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                      <span className="text-xs font-bold text-on-surface truncate">{b.services?.title || "Service"}</span>
                      {b.customer?.full_name && (
                        <span className="text-[10px] text-on-surface-variant truncate hidden sm:inline">
                          · {b.customer.full_name}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-black text-primary">₹{e.partnerPayoutAmount.toFixed(0)}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="bg-surface-container-low border border-outline-variant/15 rounded-lg p-2 mx-1 mb-0.5 text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Total Job Value</span>
                        <span className="font-semibold">₹{e.serviceRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Platform Fee ({e.commissionPercent}%)</span>
                        <span className="font-semibold text-error">-₹{e.platformCommissionAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-outline-variant/10 pt-0.5 flex justify-between font-bold">
                        <span className="text-on-surface-variant">Your Payout</span>
                        <span className="text-primary">₹{e.partnerPayoutAmount.toFixed(2)}</span>
                      </div>
                      {b.booking_pricing?.gst_amount ? (
                        <div className="flex justify-between text-[10px] text-on-surface-variant/60">
                          <span>GST included in total</span>
                          <span>₹{Number(b.booking_pricing.gst_amount).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {b.customer?.full_name && (
                        <div className="flex justify-between text-[10px] text-on-surface-variant/60">
                          <span>Customer</span>
                          <span>{b.customer.full_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] text-on-surface-variant/60">
                        <span>Completed</span>
                        <span>
                          {new Date(b.completed_at || b.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-4 text-center">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant/30">receipt_long</span>
                <p className="text-xs font-bold text-on-surface mt-1">No completed jobs</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {period === "today"
                    ? "Complete jobs to start earning."
                    : "No earnings in this period."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trends (Month / All) */}
        {trends.length > 1 && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Monthly Trends
            </p>
            <div className="space-y-0.5">
              {trends.map(([month, data]) => (
                <div
                  key={month}
                  className="flex items-center justify-between text-[11px] py-0.5 border-b border-outline-variant/5 last:border-0"
                >
                  <span className="font-bold text-on-surface w-14 shrink-0">{month}</span>
                  <span className="text-on-surface-variant w-8 text-right">{data.jobs} jobs</span>
                  <span className="text-on-surface-variant w-16 text-right">₹{data.rev.toFixed(0)}</span>
                  <span className="font-bold text-primary w-14 text-right">₹{data.payout.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Stats */}
        <div className="flex items-center justify-between text-[10px] text-on-surface-variant bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2 gap-1">
          {avgPerJob > 0 && (
            <span className="font-bold text-on-surface">
              Avg ₹{avgPerJob}/job
            </span>
          )}
          {bestDay && (
            <span>Best: {bestDay}</span>
          )}
          {topService && (
            <span className="truncate">Top: {topService}</span>
          )}
          <span className="shrink-0">{filtered.length} jobs</span>
        </div>
      </main>
    </div>
  );
}
