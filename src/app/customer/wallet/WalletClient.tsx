"use client";

import React, { useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useRefreshableData } from "@/lib/refresh/RefreshContext";
import { createClient } from "@/utils/supabase/client";

interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  source: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const sourceLabels: Record<string, string> = {
  referral_reward:   "Referral Reward",
  booking_discount:  "Booking Discount",
  admin_adjustment:  "Admin Adjustment",
  refund:            "Refund",
};

interface WalletClientProps {
  initialBalance: number;
  initialTransactions: WalletTransaction[];
  referralReward: string;
  userId: string;
}

export default function WalletClient({
  initialBalance,
  initialTransactions,
  referralReward,
  userId,
}: WalletClientProps) {
  
  const fetchWalletData = useCallback(async () => {
    const supabase = createClient();
    const [profileRes, txRes] = await Promise.all([
      supabase.from("profiles").select("wallet_balance").eq("id", userId).single(),
      supabase
        .from("wallet_transactions")
        .select("id, type, source, amount, balance_after, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    return {
      walletBalance: Number(profileRes.data?.wallet_balance ?? 0),
      transactions: (txRes.data ?? []) as WalletTransaction[]
    };
  }, [userId]);

  const { data: walletData } = useRefreshableData(
    "wallet",
    fetchWalletData,
    {
      initialData: { walletBalance: initialBalance, transactions: initialTransactions },
      cachePolicy: "medium",
      realtimeConfig: {
        table: "wallet_transactions",
        filter: `user_id=eq.${userId}`,
      }
    }
  );

  const walletBalance = walletData?.walletBalance ?? initialBalance;
  const transactions = walletData?.transactions ?? initialTransactions;

  const totalCredited = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="bg-[#f5f6f8] text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">
        {/* ── BALANCE HERO ──────────────────────────────────────── */}
        <div className="bg-primary rounded-[24px] p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Available Balance</p>
                <h1 className="text-4xl font-black text-white tracking-tighter">
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </h1>
              </div>
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Total Earned</p>
                <p className="text-base font-bold text-secondary mt-0.5">₹{totalCredited.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Transactions</p>
                <p className="text-base font-bold text-white/80 mt-0.5">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── HOW TO EARN MORE ─────────────────────────────────── */}
        <div className="bg-white rounded-[20px] shadow-sm p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10 mb-4">
            <span className="material-symbols-outlined text-primary text-[18px]">tips_and_updates</span>
            <h2 className="font-bold text-[14px] text-primary tracking-tight">Earn More Credits</h2>
          </div>
          <div className="flex items-center gap-4 p-4 bg-secondary/5 border border-secondary/15 rounded-xl">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-on-surface">Refer friends &amp; earn ₹{referralReward}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">For every friend who completes their first booking.</p>
            </div>
            <a href="/customer/profile/referral" className="px-3 py-1.5 bg-primary text-white text-[10px] font-extrabold uppercase tracking-widest rounded-lg shrink-0 hover:bg-primary/90 transition-colors">
              Refer
            </a>
          </div>
        </div>

        {/* ── TRANSACTION HISTORY ──────────────────────────────── */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
            <h2 className="font-bold text-[14px] text-primary tracking-tight">Transaction History</h2>
            {transactions.length > 0 && (
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                {transactions.length} records
              </span>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">No transactions yet</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Refer friends to earn your first wallet credit!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {transactions.map((tx) => {
                const isCredit = tx.type === "credit";
                const date = new Date(tx.created_at);
                const formattedDate = date.toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                });
                const formattedTime = date.toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit", hour12: true,
                });
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit ? "bg-green-500/10" : "bg-primary/5"
                    }`}>
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isCredit ? "text-[#059669]" : "text-primary"
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isCredit ? "add_circle" : "remove_circle"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-on-surface truncate">
                        {sourceLabels[tx.source] ?? tx.source}
                      </p>
                      {tx.description && (
                        <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{tx.description}</p>
                      )}
                      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wide mt-0.5">
                        {formattedDate} · {formattedTime}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[15px] font-black ${isCredit ? "text-[#059669]" : "text-on-surface"}`}>
                        {isCredit ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[9px] text-on-surface-variant/50 font-bold mt-0.5">
                        Bal: ₹{Number(tx.balance_after).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── NOTICE ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-[16px]">
          <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            Wallet credits are applied automatically at checkout as a discount. Credits cannot be transferred or encashed. PHS Cleaning Company reserves the right to modify wallet terms at any time.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
