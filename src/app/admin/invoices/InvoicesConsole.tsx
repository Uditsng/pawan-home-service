"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { regenerateInvoiceAction } from "./actions";
import type { AdminInvoice } from "./page";

interface CompletedWithoutInvoice {
  id: string;
  total_amount: number;
  scheduled_date: string | null;
  service_title: string;
  customer_name: string;
  customer_phone: string;
}

interface InvoicesConsoleProps {
  initialInvoices: AdminInvoice[];
  completedWithoutInvoice: CompletedWithoutInvoice[];
  fetchError?: string | null;
}

type TimePeriod = "all" | "today" | "week" | "month" | "year";

const PERIOD_CHIPS: { key: TimePeriod; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

function periodRange(period: TimePeriod) {
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

export default function InvoicesConsole({
  initialInvoices,
  completedWithoutInvoice: initialCompletedWithoutInvoice,
  fetchError,
}: InvoicesConsoleProps) {
  const invoices = initialInvoices;
  const pendingBookings = initialCompletedWithoutInvoice;

  // Time period filter
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  // Regeneration
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filter invoices based on search inputs + time period
  const filteredInvoices = useMemo(() => {
    const { start, end } = periodRange(timePeriod);

    return invoices.filter((inv) => {
      const invDate = new Date(inv.created_at);
      if (invDate < start || invDate > end) return false;

      const text = searchTerm.toLowerCase().trim();
      const matchesText =
        !text ||
        inv.invoice_number.toLowerCase().includes(text) ||
        (inv.booking?.id || "").toLowerCase().includes(text) ||
        (inv.customer?.full_name || "").toLowerCase().includes(text) ||
        (inv.customer?.phone || "").includes(text);

      let matchesDate = true;
      if (startDate || endDate) {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (invDate < s) matchesDate = false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (invDate > e) matchesDate = false;
        }
      }

      const matchesPayment =
        !paymentFilter ||
        inv.payment_method.toLowerCase() === paymentFilter.toLowerCase();

      let matchesTotal = true;
      if (minTotal && inv.grand_total < Number(minTotal)) matchesTotal = false;
      if (maxTotal && inv.grand_total > Number(maxTotal)) matchesTotal = false;

      return matchesText && matchesDate && matchesPayment && matchesTotal;
    });
  }, [invoices, timePeriod, searchTerm, startDate, endDate, paymentFilter, minTotal, maxTotal]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Reset page on filter change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Compute metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.grand_total, 0);
  const totalGst = invoices.reduce((sum, i) => sum + i.tax_amount, 0);
  const invoiceCount = invoices.length;

  // CSV Export
  const handleExportCSV = () => {
    const toExport = filteredInvoices;
    if (toExport.length === 0) {
      setExportError("No invoices available to export.");
      return;
    }
    setExportError(null);

    const headers = [
      "Invoice Number", "Invoice Date", "Booking ID", "Service Name",
      "Customer Name", "Customer Phone", "Customer Email", "Professional Name",
      "Subtotal (INR)", "Discount Applied (INR)", "GST Amount (INR)",
      "Grand Total (INR)", "Payment Mode", "Transaction ID"
    ];

    const rows = toExport.map((inv) => [
      inv.invoice_number,
      format(new Date(inv.created_at), "yyyy-MM-dd HH:mm"),
      inv.booking ? `BK-${inv.booking.id.substring(0, 6).toUpperCase()}` : "—",
      inv.booking?.services?.title || "—",
      inv.customer?.full_name || "—",
      inv.customer?.phone || "—",
      inv.customer?.email || "—",
      inv.partner?.full_name || "Unassigned",
      inv.subtotal.toFixed(2),
      inv.discount_amount.toFixed(2),
      inv.tax_amount.toFixed(2),
      inv.grand_total.toFixed(2),
      inv.payment_method.toUpperCase(),
      inv.transaction_id || "—"
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phs_invoices_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Regenerate invoice
  const handleRegenerate = async (bookingId: string) => {
    setIsProcessingId(bookingId);
    setMessage(null);
    try {
      const res = await regenerateInvoiceAction(bookingId);
      if (res.success) {
        setMessage({ text: "Invoice generated successfully!", type: "success" });
        window.location.reload();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ text: errMsg || "Failed to generate invoice.", type: "error" });
    } finally {
      setIsProcessingId(null);
    }
  };

  // Render stars (for visual use)
  const hasActiveFilters = searchTerm || startDate || endDate || paymentFilter || minTotal || maxTotal || timePeriod !== "all";

  return (
    <div className="space-y-4">
      {/* Database Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-xl border border-error/30 bg-error/5 flex items-start gap-3">
          <span className="material-symbols-outlined text-error shrink-0 text-xl">error</span>
          <div className="text-sm font-semibold text-error leading-relaxed flex-1">{fetchError}</div>
          <button onClick={() => window.location.reload()} className="shrink-0 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Success/Error Banner */}
      {message && (
        <div className={`p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
          message.type === "success"
            ? "bg-success/10 text-success border-success/20"
            : "bg-error/10 text-error border-error/20"
        }`}>
          <span className="material-symbols-outlined text-base">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          {message.text}
        </div>
      )}

      {/* ─── 4 METRIC CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Total Invoiced</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">₹{totalInvoiced.toLocaleString()}</p>
          <p className="text-[10px] text-on-surface-variant/40 font-bold mt-1">{invoiceCount} invoices</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">GST Collected</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">₹{totalGst.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Tax Ledger</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Invoice Count</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{invoiceCount}</p>
          <p className="text-[10px] text-on-surface-variant/40 font-bold mt-1">Total generated</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Pending (Unbilled)</p>
          <p className="text-2xl font-bold text-amber-600 font-headline mt-1">{pendingBookings.length}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${pendingBookings.length > 0 ? "bg-amber-500 animate-pulse" : "bg-secondary"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pendingBookings.length > 0 ? "text-amber-600" : "text-on-surface-variant/40"}`}>
              {pendingBookings.length > 0 ? "Manual generation available" : "All complete"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TIME-PERIOD FILTER CHIPS ──────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PERIOD_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => { setTimePeriod(chip.key); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              timePeriod === chip.key
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ─── MAIN GRID: Table + Sidebar ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Main Invoices Section */}
        <div className="lg:col-span-3 space-y-4">

          {/* Controls / Filter Section */}
          <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search by invoice #, booking ID, customer..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <select
                  value={paymentFilter}
                  onChange={(e) => handleFilterChange(setPaymentFilter, e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  <option value="">All Payments</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
                <button onClick={handleExportCSV} className="px-3 py-2 bg-surface border border-outline-variant/20 hover:bg-surface-container rounded-xl flex items-center gap-1.5 transition-colors">
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">cloud_download</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">CSV</span>
                </button>
              </div>
            </div>

            {exportError && (
              <div className="p-3 rounded-xl text-xs font-semibold flex items-start gap-2 bg-error/10 text-error border border-error/20">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{exportError}</span>
              </div>
            )}

            {/* Advanced Filters */}
            <div className="flex flex-wrap gap-2 items-center border-t border-outline-variant/10 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60">From:</span>
                <input type="date" value={startDate} onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-[11px] text-primary outline-none focus:ring-1 focus:ring-secondary/30" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60">To:</span>
                <input type="date" value={endDate} onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-[11px] text-primary outline-none focus:ring-1 focus:ring-secondary/30" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60">Min:</span>
                <input type="number" placeholder="₹0" value={minTotal} onChange={(e) => handleFilterChange(setMinTotal, e.target.value)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-[11px] text-primary outline-none focus:ring-1 focus:ring-secondary/30" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60">Max:</span>
                <input type="number" placeholder="₹∞" value={maxTotal} onChange={(e) => handleFilterChange(setMaxTotal, e.target.value)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-[11px] text-primary outline-none focus:ring-1 focus:ring-secondary/30" />
              </div>
              {hasActiveFilters && (
                <button onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); setPaymentFilter(""); setMinTotal(""); setMaxTotal(""); setTimePeriod("all"); setCurrentPage(1); }}
                  className="text-secondary text-[10px] font-black uppercase tracking-widest hover:underline ml-auto">
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 text-left border-collapse">
                <thead>
                  <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Invoice Detail</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Booking</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Customer &amp; Pro</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Amount</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {paginatedInvoices.map((inv) => {
                    const bkRef = inv.booking ? `BK-${inv.booking.id.substring(0, 6).toUpperCase()}` : "—";
                    return (
                      <tr key={inv.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-black text-primary uppercase font-mono tracking-tighter">{inv.invoice_number}</p>
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-0.5">
                            {format(new Date(inv.created_at), "MMM dd, yyyy")}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {inv.booking ? (
                            <>
                              <p className="text-xs font-bold text-on-surface font-mono">#{bkRef}</p>
                              <p className="text-[10px] text-on-surface-variant/60 font-medium mt-0.5">
                                {inv.booking.services?.title || "Home Service"}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant/40 italic">No booking ref</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-bold text-primary uppercase tracking-tight">{inv.customer?.full_name || "Unknown"}</p>
                          {inv.customer?.phone && (
                            <p className="text-[10px] text-on-surface-variant/50 font-bold mt-0.5">+91 {inv.customer.phone}</p>
                          )}
                          <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">engineering</span>
                            {inv.partner?.full_name || "Unassigned"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="text-sm font-black text-primary tracking-tighter">₹{inv.grand_total.toFixed(2)}</p>
                          {inv.discount_amount > 0 && (
                            <p className="text-[9px] text-error font-bold">-₹{inv.discount_amount.toFixed(0)} discount</p>
                          )}
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[8px] font-black uppercase tracking-wider">
                            {inv.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {inv.booking?.id ? (
                              <>
                                <Link href={`/customer/bookings/${inv.booking.id}/invoice`} target="_blank"
                                  className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant/15 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                  View
                                </Link>
                                <Link href={`/api/invoice/${inv.booking.id}/pdf?download=1`} target="_blank"
                                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                  PDF
                                </Link>
                                <button
                                  onClick={() => handleRegenerate(inv.booking!.id)}
                                  disabled={isProcessingId === inv.booking.id}
                                  className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border border-outline-variant/15 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all disabled:opacity-50">
                                  {isProcessingId === inv.booking.id ? (
                                    <span className="w-3 h-3 rounded-full border border-outline-variant border-t-primary animate-spin inline-block" />
                                  ) : "Regen"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant/40 text-xs font-semibold">
                        No matching invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/10">
                <p className="text-[10px] font-bold text-on-surface-variant/50">
                  Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-all">
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                          currentPage === pageNum
                            ? "bg-primary text-white"
                            : "text-on-surface-variant hover:bg-surface-container-high"
                        }`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-all">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {paginatedInvoices.map((inv) => {
              return (
                <div key={inv.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-sm p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-primary uppercase font-mono tracking-tighter">{inv.invoice_number}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 mt-0.5">
                        {format(new Date(inv.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary tracking-tighter">₹{inv.grand_total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-on-surface-variant/60">{inv.customer?.full_name || "Unknown"}</span>
                    <span className="text-secondary">{inv.partner?.full_name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-outline-variant/10">
                    {inv.booking?.id ? (
                      <>
                        <Link href={`/customer/bookings/${inv.booking.id}/invoice`} target="_blank"
                          className="flex-1 text-center px-2.5 py-1.5 bg-surface-container text-primary border border-outline-variant/15 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">
                          View
                        </Link>
                        <Link href={`/api/invoice/${inv.booking.id}/pdf?download=1`} target="_blank"
                          className="flex-1 text-center px-2.5 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm">
                          PDF
                        </Link>
                        <button onClick={() => handleRegenerate(inv.booking!.id)} disabled={isProcessingId === inv.booking.id}
                          className="flex-1 text-center px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border border-outline-variant/15 rounded-lg text-on-surface-variant disabled:opacity-50">
                          {isProcessingId === inv.booking.id ? "..." : "Regen"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {paginatedInvoices.length === 0 && (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-8 text-center">
                <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl">receipt_long</span>
                </div>
                <p className="text-xs font-bold text-on-surface-variant/60">No invoices found</p>
              </div>
            )}
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1 py-2">
                <p className="text-[10px] font-bold text-on-surface-variant/50">
                  {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant disabled:opacity-30">
                    Prev
                  </button>
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant disabled:opacity-30">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Completed bookings lacking invoices */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-[#059669]">pending_actions</span>
              Completion Backlog
            </h3>
            <p className="text-[10px] text-on-surface-variant/60 mt-1 font-medium leading-relaxed">
              Completed bookings without invoices. Generate manually.
            </p>

            <div className="mt-3 space-y-2.5 max-h-90 overflow-y-auto no-scrollbar pr-1">
              {pendingBookings.map((b) => (
                <div key={b.id} className="p-2.5 bg-surface rounded-xl border border-outline-variant/15 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-bold text-on-surface leading-tight flex-1">{b.service_title}</p>
                    <span className="text-[9px] font-black text-on-surface-variant/40 uppercase font-mono shrink-0">
                      BK-{b.id.substring(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[9px] text-on-surface-variant/60 font-medium">
                    <p>{b.customer_name} · ₹{b.total_amount.toLocaleString()}</p>
                    {b.scheduled_date && <p>{format(new Date(b.scheduled_date), "MMM dd, yyyy")}</p>}
                  </div>
                  <button
                    onClick={() => handleRegenerate(b.id)}
                    disabled={isProcessingId === b.id}
                    className="w-full py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isProcessingId === b.id ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      "Generate Invoice"
                    )}
                  </button>
                </div>
              ))}
              {pendingBookings.length === 0 && (
                <div className="text-center py-6 text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">
                  All invoices generated
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
