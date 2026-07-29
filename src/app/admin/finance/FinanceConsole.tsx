"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { calculatePartnerEarningsBreakdown} from "@/lib/engines/commissionEngine";

export interface FinanceTransaction {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  services: { title: string } | null;
  customer: { full_name: string } | null;
  partner: { full_name: string } | null;
  booking_pricing: {
    base_price: number;
    addons_total: number;
    gst_amount: number;
    discount_amount: number;
    total_price: number;
  } | null;
}

type Period = "today" | "week" | "month" | "year" | "all";

interface Props {
  initialBookings: FinanceTransaction[];
  commissionPercent?: number;
}

const periodTabs: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
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
  if (period === "year") {
    return { start: new Date(now.getFullYear(), 0, 1), end };
  }
  return { start: new Date(0), end };
}

function filterPeriod(bookings: FinanceTransaction[], period: Period) {
  const { start, end } = periodRange(period);
  return bookings.filter((b) => {
    const d = new Date(b.created_at);
    return d >= start && d <= end;
  });
}

function computeMetrics(bookings: FinanceTransaction[], commPct: number) {
  let totalCollected = 0, totalGst = 0, totalServiceRev = 0;
  let totalComm = 0, totalPayout = 0, pendingPayout = 0;
  for (const b of bookings) {
    const amt = Number(b.total_amount || 0);
    const gst = Number(b.booking_pricing?.gst_amount || 0);
    const breakdown = calculatePartnerEarningsBreakdown(amt, gst, commPct);
    totalCollected += amt;
    totalGst += gst;
    totalServiceRev += breakdown.serviceRevenue;
    totalComm += breakdown.platformCommissionAmount;
    totalPayout += breakdown.partnerPayoutAmount;
    if (b.status !== "completed") {
      pendingPayout += breakdown.partnerPayoutAmount;
    }
  }
  return { totalCollected, totalGst, totalServiceRev, totalComm, totalPayout, pendingPayout };
}

function buildChartData(bookings: FinanceTransaction[], period: Period) {
  if (period === "today") return null;
  const { start, end } = periodRange(period);

  if (period === "week") {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const values = [0, 0, 0, 0, 0, 0, 0];
    for (const b of bookings) {
      const d = new Date(b.created_at);
      if (d >= start && d <= end) {
        values[d.getDay()] += Number(b.total_amount || 0);
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
        const d = new Date(b.created_at);
        if (d >= cursor && d <= wEnd && d >= start && d <= end) {
          v += Number(b.total_amount || 0);
        }
      }
      values.push(v);
      cursor.setDate(cursor.getDate() + 7);
      wn++;
    }
    return { labels, values };
  }

  if (period === "year") {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const b of bookings) {
      const d = new Date(b.created_at);
      if (d >= start && d <= end) {
        values[d.getMonth()] += Number(b.total_amount || 0);
      }
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
      const d = new Date(b.created_at);
      if (d >= mStart && d <= mEnd) {
        v += Number(b.total_amount || 0);
      }
    }
    values.push(v);
  }
  return { labels, values };
}

function buildTrends(bookings: FinanceTransaction[], commPct: number) {
  const groups = new Map<string, { jobs: number; collected: number; gst: number; comm: number; payout: number }>();
  for (const b of bookings) {
    const d = new Date(b.created_at);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!groups.has(key)) groups.set(key, { jobs: 0, collected: 0, gst: 0, comm: 0, payout: 0 });
    const g = groups.get(key)!;
    const amt = Number(b.total_amount || 0);
    const gst = Number(b.booking_pricing?.gst_amount || 0);
    const breakdown = calculatePartnerEarningsBreakdown(amt, gst, commPct);
    g.jobs++;
    g.collected += amt;
    g.gst += gst;
    g.comm += breakdown.platformCommissionAmount;
    g.payout += breakdown.partnerPayoutAmount;
  }
  return Array.from(groups.entries()).reverse();
}

export function FinanceConsole({ initialBookings, commissionPercent = 20 }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [statusFilter, setStatusFilter] = useState<"all" | "settled" | "pending">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const periodBookings = useMemo(() => filterPeriod(initialBookings, period), [initialBookings, period]);

  const metrics = useMemo(() => computeMetrics(periodBookings, commissionPercent), [periodBookings, commissionPercent]);

  const chart = useMemo(() => buildChartData(periodBookings, period), [periodBookings, period]);

  const trends = useMemo(() => buildTrends(initialBookings, commissionPercent), [initialBookings, commissionPercent]);

  const filtered = useMemo(() => {
    return periodBookings.filter((tx) => {
      const text = searchTerm.toLowerCase();
      const matchSearch =
        tx.id.toLowerCase().includes(text) ||
        (tx.services?.title || "").toLowerCase().includes(text) ||
        (tx.customer?.full_name || "").toLowerCase().includes(text) ||
        (tx.partner?.full_name || "").toLowerCase().includes(text);
      if (!matchSearch) return false;
      if (statusFilter === "settled") return tx.status === "completed";
      if (statusFilter === "pending") return tx.status !== "completed";
      return true;
    });
  }, [periodBookings, searchTerm, statusFilter]);

  const chartMax = chart ? Math.max(...chart.values, 1) : 0;

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      setExportError("No transaction records to export.");
      return;
    }
    setExportError(null);
    const headers = [
      "Date", "Transaction ID", "Service", "Customer", "Professional",
      "Base Price", "Add-ons", "GST", "Discount", "Total Paid",
      `Commission (${commissionPercent}%)`, "Partner Payout", "Status",
    ];
    const rows = filtered.map((tx) => {
      const amt = Number(tx.total_amount || 0);
      const gst = Number(tx.booking_pricing?.gst_amount || 0);
      const breakdown = calculatePartnerEarningsBreakdown(amt, gst, commissionPercent);
      return [
        new Date(tx.created_at).toISOString().slice(0, 10),
        `TX-${tx.id.slice(0, 8).toUpperCase()}`,
        tx.services?.title || "—",
        tx.customer?.full_name || "—",
        tx.partner?.full_name || "—",
        (tx.booking_pricing?.base_price ?? 0).toFixed(2),
        (tx.booking_pricing?.addons_total ?? 0).toFixed(2),
        gst.toFixed(2),
        (tx.booking_pricing?.discount_amount ?? 0).toFixed(2),
        amt.toFixed(2),
        breakdown.platformCommissionAmount.toFixed(2),
        breakdown.partnerPayoutAmount.toFixed(2),
        tx.status,
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `finance_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessPayout = () => {
    setIsProcessingPayout(true);
    setPayoutSuccess(false);
    setTimeout(() => {
      setIsProcessingPayout(false);
      setPayoutSuccess(true);
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess(false);
      }, 1500);
    }, 1500);
  };

  const totalBookings = periodBookings.length;
  const avgPerJob = totalBookings > 0 ? Math.round(metrics.totalCollected / totalBookings) : 0;

  const topService = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of periodBookings) {
      const name = b.services?.title || "Unknown";
      map.set(name, (map.get(name) || 0) + Number(b.total_amount || 0));
    }
    let best = "", bestVal = 0;
    for (const [k, v] of map) {
      if (v > bestVal) { bestVal = v; best = k; }
    }
    return best;
  }, [periodBookings]);

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {periodTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              period === t.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 6 Metric Cards (2×3) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-primary rounded-2xl p-4 text-on-primary">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Collected</p>
          <p className="text-xl sm:text-2xl font-black font-headline tracking-tight text-secondary mt-1">
            ₹{metrics.totalCollected.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Service Revenue</p>
          <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-on-surface mt-1">
            ₹{metrics.totalServiceRev.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">GST Collected</p>
          <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-on-surface mt-1">
            ₹{metrics.totalGst.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">
            Platform Commission ({commissionPercent}%)
          </p>
          <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-secondary mt-1">
            ₹{metrics.totalComm.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Partner Payouts</p>
          <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-primary mt-1">
            ₹{metrics.totalPayout.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Pending Settlements</p>
          <p className="text-lg sm:text-xl font-black font-headline tracking-tight text-amber-600 mt-1">
            ₹{metrics.pendingPayout.toLocaleString()}
          </p>
          {metrics.pendingPayout > 0 && (
            <button
              onClick={() => setShowPayoutModal(true)}
              className="text-[9px] font-black text-secondary hover:underline uppercase tracking-widest mt-2 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              Settle Now
            </button>
          )}
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {chart && chartMax > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">
            Revenue Trend
          </p>
          <div className="flex items-end h-20 sm:h-24 gap-px">
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
                  <span className="text-[7px] font-bold text-on-surface-variant/60 leading-none">{chart.labels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10">
        <div className="flex items-center gap-1 bg-surface p-0.5 rounded-xl border border-outline-variant/15">
          {(["all", "settled", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                statusFilter === f
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search by ID, service, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
            />
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-sm text-on-surface-variant/40">search</span>
          </div>
          <Button variant="ghost" onClick={handleExportCSV} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest gap-1 border border-outline-variant/20 rounded-xl shrink-0">
            <span className="material-symbols-outlined text-sm">cloud_download</span>
            CSV
          </Button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-error/10 text-error border border-error/20">
          <span className="material-symbols-outlined text-sm">error</span>
          {exportError}
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-x-auto">
        <table className="w-full min-w-200 text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
              {["Date / ID", "Service · Customer · Pro", "Base + Addons", "GST", "Discount", "Total", "Commission", "Payout", "Status"].map((h) => (
                <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filtered.map((tx) => {
              const amt = Number(tx.total_amount || 0);
              const gst = Number(tx.booking_pricing?.gst_amount || 0);
              const breakdown = calculatePartnerEarningsBreakdown(amt, gst, commissionPercent);
              const isExpanded = expandedId === tx.id;
              const isSettled = tx.status === "completed";
              return (
                <tr key={tx.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      className="flex items-center gap-1 text-left"
                    >
                      <span className="material-symbols-outlined text-[11px] text-on-surface-variant/30 shrink-0">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-on-surface leading-tight">
                          {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[9px] font-mono font-bold text-on-surface-variant/40 leading-tight mt-0.5">
                          TX-{tx.id.slice(0, 6).toUpperCase()}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-bold text-on-surface leading-tight">{tx.services?.title || "—"}</p>
                    <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">{tx.customer?.full_name || "—"}</p>
                    {tx.partner?.full_name && (
                      <p className="text-[9px] text-secondary font-bold leading-tight mt-0.5">{tx.partner.full_name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-on-surface align-top">
                    <span className="text-on-surface-variant">₹</span>
                    {(tx.booking_pricing?.base_price ?? 0).toLocaleString()}
                    {(tx.booking_pricing?.addons_total ?? 0) > 0 && (
                      <span className="text-secondary text-[10px] ml-1">
                        +{tx.booking_pricing!.addons_total.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-on-surface align-top">
                    ₹{gst.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold align-top">
                    {(tx.booking_pricing?.discount_amount ?? 0) > 0 ? (
                      <span className="text-error">-₹{tx.booking_pricing!.discount_amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-on-surface-variant/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm font-black text-on-surface align-top tracking-tight">
                    ₹{amt.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold align-top">
                    <span className="text-error/80">-₹{breakdown.platformCommissionAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-3 text-sm font-black text-secondary align-top tracking-tight">
                    ₹{breakdown.partnerPayoutAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        isSettled
                          ? "bg-secondary/10 text-secondary border-secondary/20"
                          : tx.status === "cancelled" || tx.status === "refunded"
                          ? "bg-error/10 text-error border-error/20"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isSettled
                            ? "bg-secondary"
                            : tx.status === "cancelled" || tx.status === "refunded"
                            ? "bg-error"
                            : "bg-amber-400"
                        }`}
                      />
                      {isSettled ? "Settled" : tx.status === "cancelled" ? "Cancelled" : tx.status === "refunded" ? "Refunded" : "Pending"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant/40 text-xs font-semibold">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expandable detail rows */}
      {filtered
        .filter((tx) => expandedId === tx.id)
        .map((tx) => {
          const amt = Number(tx.total_amount || 0);
          const gst = Number(tx.booking_pricing?.gst_amount || 0);
          const breakdown = calculatePartnerEarningsBreakdown(amt, gst, commissionPercent);
          return (
            <div key={`detail-${tx.id}`} className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 -mt-4 mb-2 text-xs space-y-1.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Base Price</p>
                  <p className="font-bold">₹{(tx.booking_pricing?.base_price ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Add-ons</p>
                  <p className="font-bold">₹{(tx.booking_pricing?.addons_total ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">GST ({tx.booking_pricing?.gst_amount ? "18%" : "0%"})</p>
                  <p className="font-bold">₹{gst.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Discount</p>
                  <p className="font-bold">-₹{(tx.booking_pricing?.discount_amount ?? 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="border-t border-outline-variant/10 pt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Total Paid</p>
                  <p className="font-black text-on-surface">₹{amt.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Service Revenue (ex-GST)</p>
                  <p className="font-bold text-on-surface">₹{breakdown.serviceRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Commission ({commissionPercent}%)</p>
                  <p className="font-bold text-error">-₹{breakdown.platformCommissionAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Partner Payout</p>
                  <p className="font-black text-secondary">₹{breakdown.partnerPayoutAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="border-t border-outline-variant/10 pt-1.5 flex flex-wrap gap-x-4 text-[10px] text-on-surface-variant/60">
                <span>Customer: {tx.customer?.full_name || "—"}</span>
                <span>Professional: {tx.partner?.full_name || "—"}</span>
                <span>Service: {tx.services?.title || "—"}</span>
                <span>Status: {tx.status}</span>
              </div>
            </div>
          );
        })}

      {/* Monthly Trends */}
      {trends.length > 1 && (
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Monthly Trends</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  {["Month", "Jobs", "Collected", "GST", "Commission", "Payouts"].map((h) => (
                    <th key={h} className="py-1.5 pr-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 12).map(([month, data]) => (
                  <tr key={month} className="border-b border-outline-variant/5">
                    <td className="py-1.5 pr-3 font-bold text-on-surface">{month}</td>
                    <td className="py-1.5 pr-3 text-on-surface-variant">{data.jobs}</td>
                    <td className="py-1.5 pr-3 font-bold text-on-surface">₹{data.collected.toLocaleString()}</td>
                    <td className="py-1.5 pr-3 text-on-surface-variant">₹{data.gst.toLocaleString()}</td>
                    <td className="py-1.5 pr-3 font-bold text-secondary">₹{data.comm.toLocaleString()}</td>
                    <td className="py-1.5 pr-3 font-bold text-primary">₹{data.payout.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-on-surface-variant bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-3">
        {totalBookings > 0 && (
          <span className="font-bold text-on-surface">{totalBookings} transactions</span>
        )}
        {avgPerJob > 0 && <span>Avg ₹{avgPerJob.toLocaleString()}/job</span>}
        {topService && <span>Top: {topService}</span>}
        <span>Period: <span className="font-bold text-on-surface">₹{metrics.totalCollected.toLocaleString()}</span></span>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowPayoutModal(false)} />
          <div className="bg-surface relative w-full max-w-sm rounded-[28px] border border-outline-variant/20 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-primary font-headline">Disburse Payouts</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">
                  Settle all outstanding professional payments for the current period.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                  <span>Pending Settlements</span>
                  <span className="text-primary">
                    {periodBookings.filter((b) => b.status !== "completed").length} Transactions
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-primary border-t border-outline-variant/10 pt-2">
                  <span>Total Payout Amount</span>
                  <span className="text-secondary text-lg">₹{metrics.pendingPayout.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowPayoutModal(false)} className="flex-1 py-3 text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessPayout}
                disabled={isProcessingPayout || payoutSuccess}
                className="flex-1 py-3 text-xs"
              >
                {isProcessingPayout ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Wiring...
                  </span>
                ) : payoutSuccess ? (
                  "Settled!"
                ) : (
                  "Disburse Funds"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
