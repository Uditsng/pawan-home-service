"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  approvePayoutAction,
  rejectPayoutAction,
  processPayoutAction,
  markPaidAction,
  cancelPayoutAction,
  addPayoutAdjustmentAction,
  type PayoutAdminRow,
  type AdminPayoutStatus,
  type AdminPaymentMethod,
  type AdminPaymentDetail,
} from "./actions";

interface PayoutsConsoleProps {
  rows: PayoutAdminRow[];
  minPayout: number;
  payoutsEnabled: boolean;
}

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  return d.toLocaleDateString("en-IN", opts);
}

const STATUS_META: Record<AdminPayoutStatus, { label: string; variant: "surface" | "primary" | "outline" | "success" | "warning" | "danger" }> = {
  requested: { label: "Requested", variant: "warning" },
  approved: { label: "Approved", variant: "primary" },
  processing: { label: "Processing", variant: "outline" },
  paid: { label: "Paid", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "surface" },
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CASH: "Cash",
  OTHER: "Other",
};

const FILTERS: { key: AdminPayoutStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "processing", label: "Processing" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

function kycBankFields(kyc: unknown): { bank_name: string; account_no: string; ifsc: string } {
  const doc = (kyc ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    bank_name: str(doc.bank_name),
    account_no: str(doc.bank_account_no),
    ifsc: str(doc.bank_ifsc),
  };
}

export function PayoutsConsole({ rows, minPayout, payoutsEnabled }: PayoutsConsoleProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<AdminPayoutStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Drawer form state
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [formAction, setFormAction] = useState<"" | "reject" | "process" | "mark_paid" | "cancel" | "adjust">("");
  const [method, setMethod] = useState<AdminPaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [adjKind, setAdjKind] = useState<"clawback" | "restitution" | "admin">("clawback");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.payout.status === filter)),
    [rows, filter]
  );

  const metrics = useMemo(() => {
    const pending = rows.filter((r) => ["requested", "approved", "processing"].includes(r.payout.status));
    const totalPending = pending.reduce((s, r) => s + Number(r.payout.requested_amount || 0), 0);
    const paid = rows.filter((r) => r.payout.status === "paid").reduce((s, r) => s + Number(r.payout.requested_amount || 0), 0);
    const processing = pending.filter((r) => r.payout.status === "processing").reduce((s, r) => s + Number(r.payout.requested_amount || 0), 0);
    return { pendingCount: pending.length, totalPending, paid, processing };
  }, [rows]);

  const selected = rows.find((r) => r.payout.id === selectedId) || null;

  const showNotice = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const refresh = (res: { success: boolean; error?: string | null }) => {
    setFormAction("");
    setRejectReason("");
    setCancelReason("");
    setReference("");
    setAdjReason("");
    setAdjAmount("");
    if (res.success) {
      showNotice("success", "Payout updated.");
      router.refresh();
    } else {
      showNotice("error", res.error ?? "Operation failed.");
    }
  };

  const run = (fn: () => Promise<{ success: boolean; error?: string | null }>) => {
    startTransition(async () => refresh(await fn()));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary font-headline">Payouts</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Review professional withdrawal requests, verify receiving details, and release payments.
          </p>
        </div>
        <Badge variant={payoutsEnabled ? "success" : "warning"}>
          {payoutsEnabled ? "Payouts enabled" : "Payouts paused"}
        </Badge>
        <Badge variant="outline">Min payout {inr(minPayout)}</Badge>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl border flex items-center gap-2.5 text-sm font-bold ${
            notice.kind === "success" ? "bg-secondary/10 border-secondary/25 text-primary" : "bg-error/10 border-error/25 text-error"
          }`}
        >
          <span className="material-symbols-outlined text-base">{notice.kind === "success" ? "check_circle" : "error"}</span>
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="hover:opacity-70">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: "Pending Requests", value: metrics.pendingCount, icon: "hourglass_empty", accent: true },
          { label: "Amount Pending", value: inr(metrics.totalPending), icon: "account_balance_wallet", accent: false },
          { label: "In Processing", value: inr(metrics.processing), icon: "sync", accent: false },
          { label: "Paid (Lifetime)", value: inr(metrics.paid), icon: "task_alt", accent: false },
        ].map((m) => (
          <div
            key={m.label}
            className={`p-5 rounded-4xl border transition-all ${
              m.accent
                ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
                : "bg-surface-container-lowest border-outline-variant/15 shadow-xs"
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${m.accent ? "text-secondary" : "text-secondary"}`}>{m.icon}</span>
            <p className={`text-2xl font-black mt-2 tracking-tight ${m.accent ? "text-white" : "text-primary"}`}>{m.value}</p>
            <p className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${m.accent ? "text-white/70" : "text-on-surface-variant/70"}`}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-primary text-white border-primary"
                : "bg-surface-container-lowest border-outline-variant/15 text-on-surface-variant hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-secondary/15 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#059669] text-3xl drop-shadow-sm">payments</span>
          </div>
          <p className="font-bold text-on-surface-variant">No payouts here yet</p>
          <p className="text-sm text-on-surface-variant/70 max-w-sm">
            {filter === "all"
              ? "When professionals request a withdrawal, it will appear in this list for review and disbursal."
              : `There are no ${filter} payouts right now.`}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_0.9fr_1fr_0.7fr_0.7fr] gap-3 px-5 py-3 border-b border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            <span>Partner</span>
            <span>Payout</span>
            <span>Amount</span>
            <span>Requested</span>
            <span>Method</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {filtered.map((r) => (
              <button
                key={r.payout.id}
                onClick={() => setSelectedId(r.payout.id)}
                className="w-full grid grid-cols-2 md:grid-cols-[1.4fr_1fr_0.9fr_1fr_0.7fr_0.7fr] gap-3 px-5 py-4 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="col-span-2 md:col-span-1">
                  <p className="font-bold text-on-surface text-sm truncate">{r.partner.full_name || "Unnamed partner"}</p>
                  <p className="text-[11px] text-on-surface-variant/70 truncate">{r.partner.phone || r.partner.email || "—"}</p>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">{r.payout.payout_number}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{r.payout.status === "requested" ? "Awaiting review" : r.payout.status.charAt(0).toUpperCase() + r.payout.status.slice(1)}</p>
                </div>
                <div>
                  <p className="font-black text-primary text-sm">{inr(Number(r.payout.requested_amount))}</p>
                  <p className="text-[11px] text-on-surface-variant/70 md:hidden">{r.allocations_count} earnings · {r.event_count} events</p>
                </div>
                <div className="hidden md:block">
                  <p className="font-bold text-on-surface text-sm">{formatDate(r.payout.requested_at)}</p>
                  <p className="text-[11px] text-on-surface-variant/70">{r.allocations_count} earnings · {r.event_count} events</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-on-surface-variant">{r.payout.payment_method ? METHOD_LABEL[r.payout.payment_method] ?? r.payout.payment_method : "—"}</p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Badge variant={STATUS_META[r.payout.status]?.variant ?? "surface"}>{STATUS_META[r.payout.status]?.label ?? r.payout.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-surface-container-lowest shadow-2xl overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-primary text-white px-6 py-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary/90">{selected.payout.payout_number}</p>
                <h2 className="text-xl font-black font-headline mt-1">{selected.partner.full_name || "Partner"}</h2>
                <p className="text-xs text-white/70 mt-0.5">Requested {inr(Number(selected.payout.requested_amount))} · {formatDate(selected.payout.requested_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="scale-90">
                  <Badge variant={STATUS_META[selected.payout.status]?.variant ?? "surface"}>{STATUS_META[selected.payout.status]?.label ?? selected.payout.status}</Badge>
                </div>
                <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Partner card */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Professional</h3>
                <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{selected.partner.full_name || "Unnamed partner"}</p>
                      <p className="text-xs text-on-surface-variant/70 truncate">{selected.partner.email || "—"}</p>
                    </div>
                    <Badge variant={selected.partner.kyc_status === "approved" ? "success" : selected.partner.kyc_status ? "warning" : "outline"}>
                      KYC {selected.partner.kyc_status || "pending"}
                    </Badge>
                  </div>
                  {selected.partner.phone && (
                    <p className="mt-2 text-xs font-bold text-on-surface-variant">📱 {selected.partner.phone}</p>
                  )}
                </div>
              </section>

              {/* KYC bank details */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bank details (onboarding KYC)</h3>
                <BankDetailsDisplay kyc={selected.partner.kyc_documents} />
              </section>

              {/* Payment receiving methods */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Receiving methods</h3>
                {selected.payment_details.length === 0 ? (
                  <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 text-sm text-on-surface-variant">
                    No receiving methods added by the professional.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.payment_details.map((d) => (
                      <PaymentDetailRow key={d.id} detail={d} />
                    ))}
                  </div>
                )}
              </section>

              {/* Payout detail */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Payout detail</h3>
                <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 divide-y divide-outline-variant/10 text-sm">
                  {[
                    ["Requested", formatDate(selected.payout.requested_at)],
                    ["Approved", formatDate(selected.payout.approved_at)],
                    ["Processing", formatDate(selected.payout.processed_at)],
                    ["Paid", formatDate(selected.payout.paid_at)],
                    ["Method", selected.payout.payment_method ? METHOD_LABEL[selected.payout.payment_method] ?? selected.payout.payment_method : "—"],
                    ["Reference", selected.payout.payment_reference || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 gap-3">
                      <span className="text-on-surface-variant font-bold">{k}</span>
                      <span className="font-bold text-on-surface text-right">{v}</span>
                    </div>
                  ))}
                  {(selected.payout.rejection_reason || selected.payout.cancellation_reason) && (
                    <div className="py-2">
                      <span className="text-error font-bold">{selected.payout.rejection_reason ? "Rejection reason" : "Cancellation reason"}:</span>
                      <p className="text-on-surface-variant text-xs mt-1">{selected.payout.rejection_reason || selected.payout.cancellation_reason}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Charge summary */}
              <section className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Charge</h3>
                <div className="bg-primary rounded-2xl p-4 text-white flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary/90">Charge to payout</p>
                    <p className="text-2xl font-black mt-1">{inr(Number(selected.payout.requested_amount))}</p>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-secondary">currency_rupee</span>
                </div>
              </section>

              {/* Actions */}
              {(["requested", "approved", "processing"].includes(selected.payout.status) || formAction) && (
                <section className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Actions</h3>

                  {formAction === "" && (
                    <div className="flex flex-wrap gap-2">
                      {selected.payout.status === "requested" && (
                        <Button variant="secondary" size="sm" disabled={isPending} onClick={() => run(() => approvePayoutAction(selected.payout.id, selected.payout.payout_number, selected.partner.id, selected.partner.full_name))}>
                          <span className="material-symbols-outlined text-sm mr-1">approval</span>Approve
                        </Button>
                      )}
                      {selected.payout.status === "requested" && (
                        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setFormAction("reject")}>
                          <span className="material-symbols-outlined text-sm mr-1">block</span>Reject
                        </Button>
                      )}
                      {selected.payout.status === "approved" && (
                        <Button variant="outline" size="sm" disabled={isPending} onClick={() => setFormAction("process")}>
                          <span className="material-symbols-outlined text-sm mr-1">play_arrow</span>Mark processing
                        </Button>
                      )}
                      {["approved", "processing"].includes(selected.payout.status) && (
                        <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setFormAction("mark_paid")}>
                          <span className="material-symbols-outlined text-sm mr-1">task_alt</span>Mark paid
                        </Button>
                      )}
                      {["requested", "approved"].includes(selected.payout.status) && (
                        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setFormAction("cancel")}>
                          <span className="material-symbols-outlined text-sm mr-1">close</span>Cancel
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setFormAction("adjust")}>
                        <span className="material-symbols-outlined text-sm mr-1">tune</span>Adjust ledger
                      </Button>
                    </div>
                  )}

                  {formAction === "reject" && (
                    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant">Why are you rejecting this payout? The reason is shared with the professional.</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="e.g. KYC verification pending"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => rejectPayoutAction(selected.payout.id, selected.payout.payout_number, selected.partner.id, selected.partner.full_name, rejectReason))}>
                          Reject payout
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFormAction("")}>Close</Button>
                      </div>
                    </div>
                  )}

                  {formAction === "cancel" && (
                    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant">Cancelling releases this amount back to the professional&apos;s available balance.</p>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="Reason for cancelling"
                      />
                      <div className="flex gap-2">
                        <Button variant="slate" size="sm" disabled={isPending} onClick={() => run(() => cancelPayoutAction(selected.payout.id, selected.payout.payout_number, selected.partner.id, selected.partner.full_name, cancelReason))}>
                          Cancel payout
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFormAction("")}>Close</Button>
                      </div>
                    </div>
                  )}

                  {(formAction === "process" || formAction === "mark_paid") && (
                    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant">
                        {formAction === "mark_paid" ? "Confirm the payout reached the professional." : "Mark this payout as being transferred."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["BANK_TRANSFER", "UPI", "CASH", "OTHER"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                              method === m ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/40"
                            }`}
                          >
                            {METHOD_LABEL[m]}
                          </button>
                        ))}
                      </div>
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                        placeholder="Payment reference / note (optional)"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant={formAction === "mark_paid" ? "secondary" : "outline"}
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(
                              formAction === "mark_paid"
                                ? () => markPaidAction(selected.payout.id, selected.payout.payout_number, selected.partner.id, selected.partner.full_name, method, reference)
                                : () => processPayoutAction(selected.payout.id, selected.payout.payout_number, selected.partner.id, selected.partner.full_name, method, reference)
                            )
                          }
                        >
                          {formAction === "mark_paid" ? "Confirm paid" : "Start processing"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFormAction("")}>Close</Button>
                      </div>
                    </div>
                  )}

                  {formAction === "adjust" && (
                    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant">
                        Adjusting the professional&apos;s ledger. Withholding (clawback) reduces their available balance.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["clawback", "restitution", "admin"] as const).map((k) => (
                          <button
                            key={k}
                            onClick={() => setAdjKind(k)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                              adjKind === k ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/40"
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(e.target.value)}
                          type="number"
                          min="1"
                          className="px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                          placeholder="Amount (₹)"
                        />
                        <input
                          value={adjReason}
                          onChange={(e) => setAdjReason(e.target.value)}
                          className="col-span-2 px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                          placeholder="Reason (required)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="slate"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(() =>
                              addPayoutAdjustmentAction({
                                partnerId: selected.partner.id,
                                partnerName: selected.partner.full_name,
                                payoutId: selected.payout.id,
                                kind: adjKind,
                                amount: adjAmount,
                                reason: adjReason,
                              })
                            )
                          }
                        >
                          Save adjustment
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFormAction("")}>Close</Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankDetailsDisplay({ kyc }: { kyc: unknown }) {
  const bank = kycBankFields(kyc);
  const hasAny = bank.bank_name || bank.account_no || bank.ifsc;
  if (!hasAny) {
    return (
      <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 text-sm text-on-surface-variant">
        No bank details found in onboarding KYC.
      </div>
    );
  }
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-1.5 text-sm">
      {bank.bank_name && (
        <p className="flex justify-between gap-3">
          <span className="text-on-surface-variant font-bold">Bank</span>
          <span className="font-bold text-on-surface text-right">{bank.bank_name}</span>
        </p>
      )}
      {bank.account_no && (
        <p className="flex justify-between gap-3">
          <span className="text-on-surface-variant font-bold">Account no.</span>
          <span className="font-bold text-on-surface text-right">•••• {bank.account_no.slice(-4)}</span>
        </p>
      )}
      {bank.ifsc && (
        <p className="flex justify-between gap-3">
          <span className="text-on-surface-variant font-bold">IFSC</span>
          <span className="font-bold text-on-surface text-right">{bank.ifsc}</span>
        </p>
      )}
    </div>
  );
}

function PaymentDetailRow({ detail }: { detail: AdminPaymentDetail }) {
  const icon = detail.method === "BANK" ? "account_balance" : detail.method === "UPI" ? "qr_code_2" : detail.method === "QR" ? "qr_code" : "payments";
  const label = detail.method === "BANK" ? "Bank" : detail.method === "UPI" ? "UPI ID" : detail.method === "QR" ? "QR code" : "Other";
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/10 p-3 flex items-center gap-3">
      <div className="w-9 h-9 bg-secondary/15 rounded-xl flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-secondary text-lg drop-shadow-sm">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-sm truncate">{detail.label || label}</p>
        <p className="text-xs text-on-surface-variant/70 truncate">{detail.value}</p>
      </div>
      {detail.is_primary && <Badge variant="success">Primary</Badge>}
    </div>
  );
}