"use client";

import { useState } from "react";
import { adminAdjustWalletAction } from "./actions";

export interface AdminWalletCustomer {
  id: string;
  full_name: string | null;
  phone: string | null;
  wallet_cash: number;
  wallet_bonus: number;
  wallet_total: number;
}

interface WalletAdminClientProps {
  customers: AdminWalletCustomer[];
}

type AdjustStatus = "idle" | "loading" | "success" | "error";

export default function WalletAdminClient({ customers }: WalletAdminClientProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"cash" | "bonus">("cash");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<AdjustStatus>("idle");
  const [message, setMessage] = useState("");

  const selectedCustomer = customers.find((c) => c.id === selectedUserId) ?? null;

  const handleSubmit = async () => {
    if (!selectedUserId.trim()) {
      setStatus("error");
      setMessage("Choose a customer.");
      return;
    }
    if (amount.trim() === "") {
      setStatus("error");
      setMessage("Enter an amount.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const formData = new FormData();
    formData.set("user_id", selectedUserId);
    formData.set("amount", amount);
    formData.set("balance_type", balanceType);
    formData.set("reason", reason);

    const res = await adminAdjustWalletAction(formData);

    if (res.success) {
      setStatus("success");
      setMessage(`Done. New balance: ₹${Number(res.newBalance ?? 0).toLocaleString("en-IN")}`);
      setAmount("");
      setReason("");
    } else {
      setStatus("error");
      setMessage(res.error || "Adjustment failed.");
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Adjust Balance</h3>
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
          Add money to or take money from a customer&apos;s wallet
        </p>
      </div>

      <label className="block">
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Customer</span>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface text-sm font-semibold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— Choose a customer —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name || "Unknown"} {c.phone ? `(${c.phone})` : ""} — ₹{c.wallet_total}
            </option>
          ))}
        </select>
      </label>

      {selectedCustomer && (
        <p className="text-[10px] font-bold text-on-surface-variant bg-surface px-3 py-2 rounded-xl">
          Cash ₹{selectedCustomer.wallet_cash} · Bonus ₹{selectedCustomer.wallet_bonus} · Total ₹{selectedCustomer.wallet_total}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Amount (₹)</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500 or -100"
            className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface text-sm font-semibold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Type</span>
          <select
            value={balanceType}
            onChange={(e) => setBalanceType(e.target.value as "cash" | "bonus")}
            className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface text-sm font-semibold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="cash">Cash</option>
            <option value="bonus">Bonus</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Reason (optional)</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer compensation for delayed booking"
          className="mt-1.5 w-full px-3 py-2 rounded-lg bg-surface text-sm font-semibold border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <p className="text-[10px] text-on-surface-variant">
        Positive adds money, negative takes it back. Balances never go below ₹0. Every change is saved and audited.
      </p>

      {status === "success" && (
        <p className="px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/10 text-[#059669]">{message}</p>
      )}
      {status === "error" && (
        <p className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/5 text-red-600">{message}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="w-full py-2.5 bg-primary text-white rounded-lg text-xs font-extrabold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-colors"
      >
        {status === "loading" ? "Saving…" : "Save"}
      </button>
    </div>
  );
}