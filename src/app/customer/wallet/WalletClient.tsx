"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useRefreshableData } from "@/lib/refresh/RefreshContext";
import { createClient } from "@/utils/supabase/client";
import { Capacitor } from "@capacitor/core";
import {
  createWalletRechargeAction,
  verifyWalletRechargeAction,
  markWalletRechargeStateAction,
} from "@/app/actions/walletRecharge";
import type { WalletRechargeRow, WalletTransaction } from "./page";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  error?: { code?: string; description?: string } | null;
}

interface CustomWindow {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
}

const sourceLabels: Record<string, string> = {
  referral_reward:   "Referral Reward",
  referral_bonus:    "Referral Bonus",
  partner_referral_reward: "Partner Referral Reward",
  partner_referral_bonus:  "Partner Referral Bonus",
  booking_discount:  "Booking Discount",
  admin_adjustment:  "Admin Adjustment",
  refund:            "Refund",
  recharge:          "Money Added",
  promo_credit:      "Promo Credit",
  reversal:          "Reversal",
};

type MessageState = { type: "success" | "error" | "info"; text: string } | null;

interface WalletClientProps {
  initialBalance: number;
  initialCash: number;
  initialBonus: number;
  initialTransactions: WalletTransaction[];
  initialRecharges: WalletRechargeRow[];
  referralReward: string;
  rechargeMin: number;
  rechargeMax: number;
  rechargePresets: number[];
  userId: string;
}

type ActivityItem =
  | { kind: "tx"; tx: WalletTransaction }
  | { kind: "recharge"; row: WalletRechargeRow };

function formatINR(amount: number): string {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function WalletClient({
  initialBalance,
  initialCash,
  initialBonus,
  initialTransactions,
  initialRecharges,
  referralReward,
  rechargeMin,
  rechargeMax,
  rechargePresets,
  userId,
}: WalletClientProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(() =>
    rechargePresets.length > 0 ? rechargePresets[0] : null
  );
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const fetchWalletData = useCallback(async () => {
    const supabase = createClient();
    const [profileRes, txRes, rechargeRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("wallet_balance, wallet_cash_balance, wallet_bonus_balance")
        .eq("id", userId)
        .single(),
      supabase
        .from("wallet_transactions")
        .select("id, type, source, amount, balance_after, description, balance_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("wallet_recharges")
        .select("id, amount, status, razorpay_payment_id, payment_method, failure_reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      walletBalance: Number(profileRes.data?.wallet_balance ?? 0),
      walletCash: Number(profileRes.data?.wallet_cash_balance ?? 0),
      walletBonus: Number(profileRes.data?.wallet_bonus_balance ?? 0),
      transactions: (txRes.data ?? []) as WalletTransaction[],
      recharges: (rechargeRes.data ?? []) as WalletRechargeRow[],
    };
  }, [userId]);

  const { data: walletData, refresh } = useRefreshableData(
    "wallet",
    fetchWalletData,
    {
      initialData: {
        walletBalance: initialBalance,
        walletCash: initialCash,
        walletBonus: initialBonus,
        transactions: initialTransactions,
        recharges: initialRecharges,
      },
      cachePolicy: "medium",
      realtimeConfig: {
        table: "wallet_transactions",
        filter: `user_id=eq.${userId}`,
      },
    }
  );

  const walletBalance = walletData?.walletBalance ?? initialBalance;
  const walletCash = walletData?.walletCash ?? initialCash;
  const walletBonus = walletData?.walletBonus ?? initialBonus;
  const transactions = walletData?.transactions ?? initialTransactions;
  const recharges = walletData?.recharges ?? initialRecharges;

  const totalCredited = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const validPresets = useMemo(() => {
    return (rechargePresets || [])
      .filter((p) => p >= rechargeMin && p <= rechargeMax)
      .sort((a, b) => a - b);
  }, [rechargePresets, rechargeMin, rechargeMax]);

  // Merge unsettled recharges (pending / failed / cancelled) with the settled
  // ledger. Successful recharges already appear as credit/recharge rows.
  const activity: ActivityItem[] = useMemo(() => {
    const unsettled = (recharges || [])
      .filter((r) => r.status !== "success")
      .map<ActivityItem>((row) => ({ kind: "recharge", row }));
    const txItems = (transactions || []).map<ActivityItem>((tx) => ({ kind: "tx", tx }));
    return [...unsettled, ...txItems].sort(
      (a, b) => Date.parse(b.kind === "recharge" ? b.row.created_at : b.tx.created_at) -
                Date.parse(a.kind === "recharge" ? a.row.created_at : a.tx.created_at)
    );
  }, [recharges, transactions]);

  // Razorpay checkout script.
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const effectiveAmount = useMemo(() => {
    if (customAmount.trim() !== "") {
      const parsed = Number(customAmount.replace(/,/g, ""));
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return selectedAmount ?? NaN;
  }, [customAmount, selectedAmount]);

  const handleRecharge = async () => {
    if (isProcessing) return;
    setMessage(null);

    if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }
    if (effectiveAmount < rechargeMin) {
      setMessage({ type: "error", text: `Minimum amount is ${formatINR(rechargeMin)}.` });
      return;
    }
    if (effectiveAmount > rechargeMax) {
      setMessage({ type: "error", text: `Maximum amount is ${formatINR(rechargeMax)}.` });
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createWalletRechargeAction(effectiveAmount);
      if (!order.success || !order.orderId) {
        setMessage({ type: "error", text: order.error || "Could not start the payment." });
        return;
      }

      const customWindow = window as unknown as CustomWindow;
      if (!customWindow.Razorpay) {
        setMessage({ type: "error", text: "Payment window could not open. Please try again." });
        return;
      }

      const isNativeApp = Capacitor.isNativePlatform();
      const rechargeId = order.rechargeId;
      const orderAmount = order.amount ?? effectiveAmount;

      const options = {
        key: order.keyId,
        ...(isNativeApp ? { webview_intent: true } : {}),
        amount: orderAmount,
        currency: order.currency ?? "INR",
        name: "PHS Cleaning Company",
        description: `Add Money — ${formatINR(orderAmount)}`,
        order_id: order.orderId,
        theme: { color: "#002261" },
        method: { card: true, upi: true, netbanking: true, wallet: false, emi: false, paylater: false },
        ...(isNativeApp
          ? {}
          : {
              config: {
                display: {
                  blocks: {
                    preferred: { name: "Payment Options", instruments: [{ method: "card" }, { method: "upi" }, { method: "netbanking" }] },
                  },
                  sequence: ["block.preferred"],
                  preferences: { show_default_blocks: false },
                },
              },
            }),
        handler: async function (response: RazorpaySuccessResponse) {
          if (!response.razorpay_payment_id) {
            setMessage({ type: "error", text: "Payment not completed. No amount was charged." });
            void refresh();
            return;
          }
          try {
            const verifyRes = await verifyWalletRechargeAction({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.success) {
              setMessage({
                type: "success",
                text: verifyRes.alreadyCredited
                  ? "This amount is already in your wallet."
                  : `Money added! ${formatINR(orderAmount)} is now in your wallet.`,
              });
            } else {
              setMessage({ type: "error", text: verifyRes.error || "Payment verification failed." });
            }
          } catch (err) {
            console.error("Recharge verification error:", err);
            setMessage({ type: "error", text: "We got your payment and are still confirming it. Check back soon — you won't be charged twice." });
          } finally {
            void refresh();
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            // Fire-and-forget: tidy the in-flight recharge row as cancelled.
            if (rechargeId) {
              void markWalletRechargeStateAction(rechargeId, "cancelled");
            }
            setMessage({ type: "info", text: "Payment cancelled. No amount was charged." });
            setIsProcessing(false);
            void refresh();
          },
        },
      };

      const rzp = new customWindow.Razorpay(options as unknown as Record<string, unknown>);
      rzp.open();
    } catch (err) {
      console.error("Recharge init error:", err);
      setMessage({ type: "error", text: (err as Error).message || "Failed to start the payment. Please try again." });
      setIsProcessing(false);
    }
  };

  const renderAmountText = (item: { kind: "tx"; tx: WalletTransaction } | { kind: "recharge"; row: WalletRechargeRow }) => {
    if (item.kind === "tx") {
      const isCredit = item.tx.type === "credit";
      return (
        <div className="text-right shrink-0">
          <p className={`text-sm font-black ${isCredit ? "text-secondary" : "text-on-surface"}`}>
            {isCredit ? "+" : "-"}{formatINR(Number(item.tx.amount))}
          </p>
          <p className="text-[9px] text-on-surface-variant/50 font-bold mt-0.5">
            Bal: {formatINR(Number(item.tx.balance_after))}
          </p>
        </div>
      );
    }

    const status = item.row.status;
    const statusMeta =
      status === "pending" || status === "created"
        ? { chip: "bg-amber-500/10 text-amber-600", label: "Pending" }
        : status === "failed"
        ? { chip: "bg-red-500/10 text-red-500", label: "Failed" }
        : status === "cancelled"
        ? { chip: "bg-outline-variant/30 text-on-surface-variant", label: "Cancelled" }
        : { chip: "bg-surface-container-high text-on-surface-variant", label: status };

    return (
      <div className="text-right shrink-0 space-y-1">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${statusMeta.chip}`}>
          {statusMeta.label}
        </span>
        <p className="text-sm font-black text-on-surface-variant">{formatINR(Number(item.row.amount))}</p>
      </div>
    );
  };

  const renderActivityRow = (item: ActivityItem) => {
    if (item.kind === "tx") {
      const isCredit = item.tx.type === "credit";
      const date = new Date(item.tx.created_at);
      const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const balanceType = item.tx.balance_type ?? "cash";

      return (
        <div key={`tx-${item.tx.id}`} className="flex items-center gap-4 px-5 py-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? "bg-secondary/10" : "bg-primary/5"}`}>
            <span className={`material-symbols-outlined text-xl ${isCredit ? "text-secondary" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {isCredit ? "add_circle" : "remove_circle"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-on-surface truncate">
              {sourceLabels[item.tx.source] ?? item.tx.source}
            </p>
            {item.tx.description && (
              <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{item.tx.description}</p>
            )}
            <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wide mt-0.5">
              {formattedDate} · {formattedTime}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded ${balanceType === "bonus" ? "bg-secondary/10 text-secondary" : "bg-primary/5 text-primary"}`}>
                {balanceType === "bonus" ? "Bonus" : "Cash"}
              </span>
            </p>
          </div>
          {renderAmountText(item)}
        </div>
      );
    }

    const date = new Date(item.row.created_at);
    const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const formattedTime = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const status = item.row.status;
    const desc =
      status === "failed"
        ? item.row.failure_reason || "Payment failed — no amount was charged."
        : status === "cancelled"
        ? "Payment cancelled — no amount was charged."
        : "Payment pending. We're confirming your money.";

    return (
      <div key={`rc-${item.row.id}`} className="flex items-center gap-4 px-5 py-3.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10">
          <span className="material-symbols-outlined text-xl text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            {status === "failed" || status === "cancelled" ? "error" : "hourglass_top"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-on-surface truncate">Wallet Recharge</p>
          <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{desc}</p>
          <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wide mt-0.5">
            {formattedDate} · {formattedTime}
          </p>
        </div>
        {renderAmountText(item)}
      </div>
    );
  };

  return (
    <div className="bg-surface-dim text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">
        {/* ── BALANCE HERO ──────────────────────────────────────── */}
        <div className="bg-primary rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Balance</p>
                <h1 className="text-4xl font-black text-white tracking-tighter">
                  {formatINR(walletBalance)}
                </h1>
                <p className="text-[11px] text-white/70 font-semibold mt-1">
                  Cash {formatINR(walletCash)} · Bonus {formatINR(walletBonus)}
                </p>
              </div>
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Earned</p>
                <p className="text-base font-bold text-secondary mt-0.5">{formatINR(totalCredited)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Transactions</p>
                <p className="text-base font-bold text-white/80 mt-0.5">{activity.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ADD MONEY ────────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10 mb-4">
            <span className="material-symbols-outlined text-primary text-lg">add_card</span>
            <h2 className="font-bold text-sm text-primary tracking-tight">Add Money</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {validPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setSelectedAmount(preset); setCustomAmount(""); setMessage(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  selectedAmount === preset && customAmount.trim() === ""
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-primary/10"
                }`}
              >
                {formatINR(preset)}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setMessage(null); }}
              onFocus={() => setSelectedAmount(null)}
              className="flex-1 min-w-33 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
            />
          </div>

          <p className="text-[10px] text-on-surface-variant mt-2">
            You can add between {formatINR(rechargeMin)} and {formatINR(rechargeMax)}. Money is added to your Cash balance and can only be used for bookings.
          </p>

          {message && (
            <p
              className={`mt-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                message.type === "success"
                  ? "bg-secondary/10 text-emerald-700"
                  : message.type === "error"
                  ? "bg-red-500/5 text-red-600"
                  : "bg-amber-500/10 text-amber-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="button"
            disabled={isProcessing || !Number.isFinite(effectiveAmount) || effectiveAmount <= 0}
            onClick={handleRecharge}
            className="mt-4 w-full py-3 bg-primary text-white rounded-lg text-sm font-extrabold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Adding…" : "Add money"}
          </button>
        </div>

        {/* ── HOW TO EARN MORE ─────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10 mb-4">
            <span className="material-symbols-outlined text-primary text-lg">tips_and_updates</span>
            <h2 className="font-bold text-sm text-primary tracking-tight">Earn Bonus</h2>
          </div>
          <div className="flex items-center gap-4 p-4 bg-secondary/5 border border-secondary/15 rounded-xl">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-on-surface">Refer friends, earn ₹{referralReward}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">When a friend joins with your code, you both get bonus money.</p>
            </div>
            <a href="/customer/profile/referral" className="px-3 py-1.5 bg-primary text-on-primary text-[10px] font-extrabold uppercase tracking-widest rounded-lg shrink-0 hover:bg-primary/90 transition-colors">
              Refer
            </a>
          </div>
        </div>

        {/* ── TRANSACTION HISTORY ──────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
            <h2 className="font-bold text-sm text-primary tracking-tight">Activity</h2>
            {activity.length > 0 && (
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                {activity.length} records
              </span>
            )}
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-secondary drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">No activity yet</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Add money or refer a friend to get started.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {activity.map(renderActivityRow)}
            </div>
          )}
        </div>

        {/* ── NOTICE ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            You can use this money to pay for bookings. Cash and bonus money can&apos;t be withdrawn or transferred.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}