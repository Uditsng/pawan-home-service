"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { adminAdjustWalletAction } from "./actions";

export interface AdminWalletCustomer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedUserId) ?? null;

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const nameMatch = (c.full_name || "").toLowerCase().includes(q);
      const phoneMatch = (c.phone || "").toLowerCase().includes(q);
      const emailMatch = (c.email || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [customers, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

      <div className="relative" ref={dropdownRef}>
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 block mb-1.5">
          Customer
        </span>

        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full px-3 py-2 rounded-lg bg-surface text-left text-sm font-semibold border transition-all flex items-center justify-between gap-2 cursor-pointer ${
            isOpen
              ? "border-primary/40 ring-2 ring-primary/20"
              : "border-outline-variant/20 hover:border-outline-variant/40"
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="material-symbols-outlined text-base text-primary/70 shrink-0">
                person
              </span>
              <span className="text-primary truncate">
                {selectedCustomer.full_name || "Unknown"}
                {selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ""}
              </span>
              <span className="ml-auto text-xs font-bold text-primary shrink-0">
                ₹{selectedCustomer.wallet_total.toLocaleString("en-IN")}
              </span>
            </div>
          ) : (
            <span className="text-on-surface-variant/50 text-sm">
              — Choose a customer —
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {selectedCustomer && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserId("");
                  setSearchQuery("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    setSelectedUserId("");
                    setSearchQuery("");
                  }
                }}
                className="p-0.5 text-on-surface-variant/40 hover:text-red-500 rounded transition-colors cursor-pointer"
                title="Clear selection"
              >
                <span className="material-symbols-outlined text-[16px] block">close</span>
              </span>
            )}
            <span
              className={`material-symbols-outlined text-base text-on-surface-variant/60 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search Input Bar */}
            <div className="p-2.5 border-b border-outline-variant/10 bg-surface-container-lowest">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant/40 text-[18px]">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filteredCustomers.length > 0) {
                        setSelectedUserId(filteredCustomers[0].id);
                        setIsOpen(false);
                      }
                    }
                  }}
                  placeholder="Search by name, phone, or email..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-surface text-xs font-semibold text-primary border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1.5 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <span className="material-symbols-outlined text-[16px] block">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customers List / Empty State */}
            <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
              {filteredCustomers.length === 0 ? (
                <div className="py-6 px-4 text-center text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-3xl block mb-1 opacity-40">
                    person_search
                  </span>
                  <p className="text-xs font-semibold text-primary">No customers found</p>
                  <p className="text-[10px] mt-0.5 opacity-70">
                    No matching customer for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = c.id === selectedUserId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(c.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-surface-container transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected ? "bg-primary/5 font-bold" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-primary truncate">
                          {c.full_name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/60 truncate mt-0.5">
                          {c.phone ? <span>+91 {c.phone}</span> : <span>No phone</span>}
                          {c.email && (
                            <>
                              <span>·</span>
                              <span className="truncate">{c.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-primary">
                          ₹{c.wallet_total.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[9px] text-on-surface-variant/50">
                          Cash ₹{c.wallet_cash.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <p className="text-[10px] font-bold text-on-surface-variant bg-surface px-3 py-2 rounded-xl">
          Cash ₹{selectedCustomer.wallet_cash.toLocaleString("en-IN")} · Bonus ₹{selectedCustomer.wallet_bonus.toLocaleString("en-IN")} · Total ₹{selectedCustomer.wallet_total.toLocaleString("en-IN")}
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
        className="w-full py-2.5 bg-primary text-white rounded-lg text-xs font-extrabold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
      >
        {status === "loading" ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
