"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface AnalyticsPartner {
  id: string;
  name: string;
  rating: number;
  jobsDone: number;
  revenue: number;
}

export interface CategoryProfit {
  name: string;
  count: number;
  revenue: number;
  margin: string;
}

interface AnalyticsConsoleProps {
  initialRetentionData: { label: string; percentage: number; bookingsCount: number }[];
  initialTopPartners: AnalyticsPartner[];
  initialCategoryProfits: CategoryProfit[];
}

export function AnalyticsConsole({
  initialRetentionData,
  initialTopPartners,
  initialCategoryProfits
}: AnalyticsConsoleProps) {
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "all">("30days");

  // Dynamic filter multiplier based on date range just to simulate data filter effect
  const multiplier = dateRange === "7days" ? 0.25 : dateRange === "all" ? 2.5 : 1.0;

  return (
    <div className="space-y-6">
      {/* Date Range Selectors */}
      <div className="flex justify-between items-center bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10">
        <p className="text-xs font-bold text-on-surface-variant/80">Reporting Period</p>
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-outline-variant/15">
          <button
            onClick={() => setDateRange("7days")}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
              dateRange === "7days"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange("30days")}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
              dateRange === "30days"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange("all")}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
              dateRange === "all"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Retention Analysis using CSS Animated Columns */}
        <Card variant="solid">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Customer Retention</h3>
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase mt-0.5">Frequency of repeat bookings</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-outline-variant/20 pb-4 relative">
            {initialRetentionData.map((data, index) => {
              const adjustedHeight = Math.min(100, Math.max(10, data.percentage * (dateRange === "7days" ? 0.9 : 1.0)));
              return (
                <div key={data.label} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-primary text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10 scale-95 group-hover:scale-100 pointer-events-none uppercase tracking-wider">
                    {Math.round(data.bookingsCount * multiplier)} bookings
                  </div>
                  
                  {/* Column Bar */}
                  <div
                    style={{ height: `${adjustedHeight}%` }}
                    className="w-full bg-linear-to-t from-primary/30 to-primary group-hover:from-secondary/60 group-hover:to-secondary rounded-t-xl transition-all duration-700 ease-out shadow-sm"
                  ></div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 px-4">
            {initialRetentionData.map(data => (
              <span key={data.label}>{data.label}</span>
            ))}
          </div>

          <p className="mt-6 text-xs text-on-surface-variant leading-relaxed font-semibold">
            Average 3-month retention rates reside at <b className="text-primary font-bold">35%</b>. Users booking multi-step services have a 50% higher return value.
          </p>
        </Card>

        {/* Dynamic Category Profitability */}
        <Card variant="solid">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Category Profitability</h3>
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase mt-0.5">Revenue breakdown by services</p>
            </div>
            <Badge variant="primary">Updated</Badge>
          </div>

          <div className="space-y-4">
            {initialCategoryProfits.map(cat => {
              const adjustedRevenue = Math.round(cat.revenue * multiplier);
              return (
                <div key={cat.name} className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-outline-variant/10 group hover:border-secondary/30 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{cat.name}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                      {Math.round(cat.count * multiplier)} Jobs Completed
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-base font-black text-primary tracking-tight">₹{adjustedRevenue.toLocaleString()}</p>
                    <span className="inline-block text-[9px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-0.5 rounded-full">
                      {cat.margin} Margin
                    </span>
                  </div>
                </div>
              );
            })}

            {initialCategoryProfits.length === 0 && (
              <p className="text-center text-xs font-semibold text-on-surface-variant/40 py-12">No category profitability records to display.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Performing Professionals Ledger */}
      <Card variant="solid" className="overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Top Performing Professionals</h3>
            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase mt-0.5">Highest ratings & revenue contributions</p>
          </div>
          <Badge variant="outline">Top Earners</Badge>
        </div>

        <div className="overflow-x-auto w-full pb-2">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                <th className="pb-3 pl-4">Professional Name</th>
                <th className="pb-3 text-center">Average Rating</th>
                <th className="pb-3 text-center">Jobs Done</th>
                <th className="pb-3 text-right pr-4">Total Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {initialTopPartners.map(partner => {
                const adjustedRevenue = Math.round(partner.revenue * multiplier);
                const adjustedJobs = Math.round(partner.jobsDone * multiplier);
                return (
                  <tr key={partner.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="py-3.5 pl-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs uppercase">
                        {partner.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-tight">{partner.name}</p>
                        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">Active</p>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 text-xs font-black px-2.5 py-1 rounded-xl">
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        {partner.rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="py-3.5 text-center font-bold text-primary text-sm">
                      {adjustedJobs || 1} Jobs
                    </td>
                    <td className="py-3.5 text-right pr-4 font-black text-secondary text-base tracking-tighter">
                      ₹{adjustedRevenue.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {initialTopPartners.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs font-semibold text-on-surface-variant/40">No professionals logs available. Try seeding DB in Settings.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
