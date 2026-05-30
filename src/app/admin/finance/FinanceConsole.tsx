"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

export interface FinanceTransaction {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  customer: {
    full_name: string | null;
  } | null;
  partner: {
    full_name: string | null;
  } | null;
}

interface FinanceConsoleProps {
  initialBookings: FinanceTransaction[];
}

export function FinanceConsole({ initialBookings }: FinanceConsoleProps) {
  const [txList, setTxList] = useState<FinanceTransaction[]>(initialBookings);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "settled" | "pending">("all");
  
  // Payout Drawer/Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Group transactions by status (Completed booking = settled payout, others = pending payout)
  const processedTransactions = txList.map(tx => {
    const isSettled = tx.status === "completed";
    return {
      ...tx,
      payoutStatus: isSettled ? ("settled" as const) : ("pending" as const)
    };
  });

  // Dynamic Metrics
  const totalRevenue = txList.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
  const platformShare = totalRevenue * 0.2;
  const partnerPayouts = totalRevenue * 0.8;
  
  const pendingPayouts = processedTransactions
    .filter(t => t.payoutStatus === "pending")
    .reduce((acc, t) => acc + Number(t.total_amount || 0) * 0.8, 0);

  const settledPayouts = processedTransactions
    .filter(t => t.payoutStatus === "settled")
    .reduce((acc, t) => acc + Number(t.total_amount || 0) * 0.8, 0);

  // Filtered transactions
  const filteredTx = processedTransactions.filter(tx => {
    const text = searchTerm.toLowerCase();
    const searchMatch = 
      tx.id.toLowerCase().includes(text) ||
      (tx.customer?.full_name || "").toLowerCase().includes(text) ||
      (tx.partner?.full_name || "").toLowerCase().includes(text);

    const statusMatch = 
      statusFilter === "all" ||
      tx.payoutStatus === statusFilter;

    return searchMatch && statusMatch;
  });

  // Client-side CSV Export Utility
  const handleExportCSV = () => {
    if (filteredTx.length === 0) {
      alert("No transaction records to export.");
      return;
    }

    const headers = ["Transaction ID", "Date", "Customer", "Professional Assigned", "Total Amount", "Platform Share (20%)", "Partner Share (80%)", "Payout Status"];
    const rows = filteredTx.map(tx => [
      `TX-${tx.id.slice(0, 8).toUpperCase()}`,
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
      tx.customer?.full_name || "Unknown Customer",
      tx.partner?.full_name || "Unassigned",
      `INR ${tx.total_amount}`,
      `INR ${Number(tx.total_amount) * 0.2}`,
      `INR ${Number(tx.total_amount) * 0.8}`,
      tx.payoutStatus.toUpperCase()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payout Execution
  const handleProcessPayout = () => {
    setIsProcessingPayout(true);
    setPayoutSuccess(false);
    
    setTimeout(() => {
      setIsProcessingPayout(false);
      setPayoutSuccess(true);
      
      // Update all local pending payouts to completed/settled for demonstration
      setTxList(prev => prev.map(t => ({
        ...t,
        status: "completed" // Set completed so they register as settled
      })));

      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess(false);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-primary p-6 rounded-2xl text-white shadow-md relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/15 rounded-bl-[80px] blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Revenue</p>
          <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-secondary">₹{totalRevenue.toLocaleString()}</h2>
          <p className="text-[9px] font-bold text-white/30 mt-2 uppercase tracking-widest">All active & completed bookings</p>
        </div>
        
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-sm relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform Revenue (20%)</p>
          <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-primary">₹{platformShare.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Commission Earnings</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-sm relative group overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Partner Payouts (80%)</p>
            <h2 className="text-2xl font-bold mt-2 font-headline tracking-tighter text-primary">₹{partnerPayouts.toLocaleString()}</h2>
          </div>
          {pendingPayouts > 0 ? (
            <button
              onClick={() => setShowPayoutModal(true)}
              className="text-[9px] font-black text-secondary hover:text-secondary/80 hover:underline uppercase tracking-widest mt-2 flex items-center gap-1.5 text-left"
            >
              <span className="material-symbols-outlined text-[14px] animate-bounce">account_balance_wallet</span> 
              Settle ₹{pendingPayouts.toLocaleString()} Pending Payouts
            </button>
          ) : (
            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              All payouts settled
            </span>
          )}
        </div>
      </div>

      {/* Filtering Ledger Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10">
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-outline-variant/15">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            All Ledger
          </button>
          <button
            onClick={() => setStatusFilter("settled")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              statusFilter === "settled"
                ? "bg-primary text-white shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Settled (₹{settledPayouts.toLocaleString()})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              statusFilter === "pending"
                ? "bg-primary text-white shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Pending (₹{pendingPayouts.toLocaleString()})
          </button>
        </div>

        <div className="flex flex-1 w-full md:w-auto items-center gap-3 justify-end">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search ledger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-on-surface-variant/40">search</span>
          </div>

          <Button
            variant="ghost"
            onClick={handleExportCSV}
            className="px-4 py-2 hover:bg-surface-container flex items-center gap-2 border border-outline-variant/20 rounded-xl"
          >
            <span className="material-symbols-outlined text-lg">cloud_download</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Transaction ID</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Customer & Professional</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Total Invoice</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Platform (20%)</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Partner Share (80%)</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredTx.map(tx => (
                <tr key={tx.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-primary uppercase font-mono tracking-tighter">TX-{tx.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">
                      {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{tx.customer?.full_name || "Unknown Customer"}</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">engineering</span> {tx.partner?.full_name || "Unassigned Partner"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-primary text-base tracking-tighter">
                    ₹{Number(tx.total_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-xs font-bold text-on-surface-variant/50">
                    ₹{(Number(tx.total_amount) * 0.2).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-base font-bold text-secondary tracking-tighter">
                    ₹{(Number(tx.total_amount) * 0.8).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      tx.payoutStatus === 'settled'
                        ? 'bg-secondary/10 text-secondary border-secondary/20'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tx.payoutStatus === 'settled' ? 'bg-secondary' : 'bg-amber-400'}`}></span>
                      {tx.payoutStatus}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No matching financial transactions found in ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Resolution Confirmation Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowPayoutModal(false)}
          ></div>

          {/* Modal Content */}
          <div className="bg-surface relative w-full max-w-sm rounded-[28px] border border-outline-variant/20 p-6 sm:p-8 shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-primary font-headline">Disburse Payouts</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">
                  You are settling all outstanding professional payments. These disbursements will be routed via standard bank wires.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                  <span>Pending Settlements</span>
                  <span className="text-primary">
                    {processedTransactions.filter(t => t.payoutStatus === "pending").length} Transactions
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-primary border-t border-outline-variant/10 pt-2">
                  <span>Total Payout Amount</span>
                  <span className="text-secondary text-lg">₹{pendingPayouts.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 py-3 text-xs"
              >
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
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
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
