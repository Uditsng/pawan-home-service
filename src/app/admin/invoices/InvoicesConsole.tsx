"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
}

export default function InvoicesConsole({
  initialInvoices,
  completedWithoutInvoice: initialCompletedWithoutInvoice,
}: InvoicesConsoleProps) {
  const invoices = initialInvoices;
  const pendingBookings = initialCompletedWithoutInvoice;

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filter invoices based on search inputs
  const filteredInvoices = invoices.filter((inv) => {
    const text = searchTerm.toLowerCase().trim();
    
    // Text search matching Invoice Number, Booking ID, Customer Name, Customer Phone
    const matchesText = 
      !text ||
      inv.invoice_number.toLowerCase().includes(text) ||
      (inv.booking?.id || "").toLowerCase().includes(text) ||
      inv.customer?.full_name.toLowerCase().includes(text) ||
      (inv.customer?.phone || "").includes(text);

    // Date Range Matching
    let matchesDate = true;
    if (startDate || endDate) {
      const invDate = new Date(inv.created_at);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (invDate < start) matchesDate = false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (invDate > end) matchesDate = false;
      }
    }

    // Payment method filter
    const matchesPayment = 
      !paymentFilter || 
      inv.payment_method.toLowerCase() === paymentFilter.toLowerCase();

    // Grand total range filter
    let matchesTotal = true;
    if (minTotal && inv.grand_total < Number(minTotal)) matchesTotal = false;
    if (maxTotal && inv.grand_total > Number(maxTotal)) matchesTotal = false;

    return matchesText && matchesDate && matchesPayment && matchesTotal;
  });

  // Export CSV Utility
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      setExportError("No invoices available to export.");
      return;
    }
    setExportError(null);

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Booking ID",
      "Service Name",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Professional Name",
      "Subtotal (INR)",
      "Discount Applied (INR)",
      "GST Amount (INR)",
      "Grand Total (INR)",
      "Payment Mode",
      "Transaction ID"
    ];

    const rows = filteredInvoices.map((inv) => [
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

  // Trigger regeneration of invoice
  const handleRegenerate = async (bookingId: string) => {
    setIsProcessingId(bookingId);
    setMessage(null);

    try {
      const res = await regenerateInvoiceAction(bookingId);
      if (res.success) {
        setMessage({ text: "Invoice generated successfully!", type: "success" });
        
        // Reload invoices and clear from pending bookings
        window.location.reload();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ text: errMsg || "Failed to generate invoice.", type: "error" });
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            message.type === "success"
              ? "bg-success/10 text-success border-success/20"
              : "bg-error/10 text-error border-error/20"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          {message.text}
        </div>
      )}

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="solid" className="p-6 bg-primary text-white shadow-md relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/15 rounded-bl-[80px] blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Invoiced Amount</p>
          <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-secondary">
            ₹{invoices.reduce((sum, i) => sum + i.grand_total, 0).toLocaleString()}
          </h2>
          <p className="text-[9px] font-bold text-white/30 mt-2 uppercase tracking-widest">
            From {invoices.length} invoices generated
          </p>
        </Card>

        <Card variant="solid" className="p-6 bg-surface-container-lowest border border-outline-variant/15 shadow-sm relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Total Collected GST (18%)</p>
          <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-primary">
            ₹{invoices.reduce((sum, i) => sum + i.tax_amount, 0).toLocaleString()}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Tax Ledger</span>
          </div>
        </Card>

        <Card variant="solid" className="p-6 bg-surface-container-lowest border border-outline-variant/15 shadow-sm relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Pending Invoices (Completed Jobs)</p>
          <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-primary">
            {pendingBookings.length}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${pendingBookings.length > 0 ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}></span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${pendingBookings.length > 0 ? "text-amber-600 font-bold" : "text-on-surface-variant/40"}`}>
              {pendingBookings.length > 0 ? "Manual Generation Available" : "All complete"}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Invoices Section */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls / Filter Section */}
          <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by Invoice #, Booking ID, Customer Name, or Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-on-surface-variant/40">search</span>
              </div>

              <div className="flex gap-2 shrink-0">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  <option value="">All Payment Modes</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>

                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="px-4 py-2 border border-outline-variant/20 hover:bg-surface-container rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-lg">cloud_download</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Export CSV</span>
                </Button>
              </div>
            </div>

            {exportError && (
              <div className="w-full p-3 mb-4 rounded-xl text-[13px] font-semibold flex items-start gap-2 bg-error/10 text-error border border-error/20">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{exportError}</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center border-t border-outline-variant/10 pt-4 text-xs font-bold text-on-surface-variant/60">
              <div className="flex items-center gap-2">
                <span>Start Date:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>End Date:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                />
              </div>
              <div className="flex items-center gap-2 border-l border-outline-variant/20 pl-4">
                <span>Min Amount:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Max Amount:</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-secondary/30"
                />
              </div>
              {(startDate || endDate || searchTerm || paymentFilter || minTotal || maxTotal) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStartDate("");
                    setEndDate("");
                    setPaymentFilter("");
                    setMinTotal("");
                    setMaxTotal("");
                  }}
                  className="text-secondary text-[10px] font-black uppercase tracking-widest hover:underline ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table list */}
          <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/15 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Invoice Detail</th>
                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Booking Info</th>
                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Customer & Pro</th>
                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Pricing Breakdown</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredInvoices.map((inv) => {
                    const bkRef = inv.booking ? `BK-${inv.booking.id.substring(0, 6).toUpperCase()}` : "—";
                    return (
                      <tr key={inv.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-primary uppercase font-mono tracking-tighter">{inv.invoice_number}</p>
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">
                            {format(new Date(inv.created_at), "MMM dd, yyyy")}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-primary">
                          <p className="font-mono text-slate-800">#{bkRef}</p>
                          <p className="text-[10px] text-on-surface-variant/60 mt-1 font-medium">
                            {inv.booking?.services?.title || "Home Service"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs font-black text-primary uppercase tracking-tight">
                            {inv.customer?.full_name || "Unknown Customer"}
                          </p>
                          {inv.customer?.phone && (
                            <p className="text-[10px] text-on-surface-variant/50 font-bold mt-0.5">
                              +91 {inv.customer.phone}
                            </p>
                          )}
                          <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">engineering</span>
                            {inv.partner?.full_name || "Unassigned"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right font-sans">
                          <p className="text-sm font-black text-primary tracking-tighter">₹{inv.grand_total.toFixed(2)}</p>
                          <p className="text-[9px] text-on-surface-variant/40 mt-1 font-medium">
                            Subtotal: ₹{inv.subtotal.toFixed(0)} &middot; GST: ₹{inv.tax_amount.toFixed(0)}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/50 text-[8px] font-black uppercase text-slate-500 tracking-wider">
                            {inv.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/customer/bookings/${inv.booking?.id}/invoice`}
                              target="_blank"
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant/15 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              View
                            </Link>

                            <Link
                              href={`/customer/bookings/${inv.booking?.id}/invoice?download=true`}
                              target="_blank"
                              className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1 shadow-sm border-none cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                              PDF
                            </Link>

                            <Button
                              variant="ghost"
                              onClick={() => inv.booking && handleRegenerate(inv.booking.id)}
                              disabled={isProcessingId === inv.booking?.id}
                              className="px-3 py-1.5 text-[10px] border border-outline-variant/15 rounded-xl text-slate-500 hover:text-primary transition-colors hover:bg-slate-50"
                            >
                              {isProcessingId === inv.booking?.id ? (
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-300 border-t-slate-600 animate-spin inline-block"></span>
                              ) : (
                                "Regen"
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant/40 text-xs font-semibold">
                        No matching invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Panel: Completed bookings lacking invoices */}
        <div className="lg:col-span-1 space-y-4">
          <Card variant="outline" className="p-5 border border-outline-variant/20 rounded-[24px] bg-surface-container-low/30">
            <h3 className="font-headline text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[#059669]">pending_actions</span>
              Completion Backlog
            </h3>
            <p className="text-[11px] text-on-surface-variant/70 mt-1 leading-relaxed">
              These bookings are marked Completed but do not have an invoice generated. You can trigger generation manually.
            </p>

            <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
              {pendingBookings.map((b) => (
                <div key={b.id} className="p-3 bg-surface rounded-xl border border-outline-variant/15 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-800 tracking-tight leading-tight">{b.service_title}</p>
                    <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
                      BK-{b.id.substring(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-on-surface-variant/60 font-medium">
                    <p>Client: {b.customer_name}</p>
                    <p>Amount: ₹{b.total_amount}</p>
                    {b.scheduled_date && (
                      <p>Date: {format(new Date(b.scheduled_date), "MMM dd, yyyy")}</p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleRegenerate(b.id)}
                    disabled={isProcessingId === b.id}
                    className="w-full py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 shadow-sm mt-1"
                  >
                    {isProcessingId === b.id ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    ) : (
                      "Generate Invoice"
                    )}
                  </Button>
                </div>
              ))}

              {pendingBookings.length === 0 && (
                <div className="text-center py-6 text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wider">
                  No completed jobs pending invoice
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
