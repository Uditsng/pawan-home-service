"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  requestPayoutAction,
  cancelPayoutRequestAction,
  savePaymentDetailAction,
  setPrimaryPaymentDetailAction,
  removePaymentDetailAction,
  type PayoutSummary,
  type PartnerPaymentDetail,
  type KycBankInfo,
  type PayoutStatus,
  type PayoutPaymentMethod,
} from "./actions";

interface PayoutsClientProps {
  summary: PayoutSummary | null;
  paymentDetails: PartnerPaymentDetail[];
  kycStatus: string | null;
  kycBank: KycBankInfo;
  fallbackMin: number;
}

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return d.toLocaleDateString("en-IN", opts);
}

const STATUS_META: Record<PayoutStatus, { label: string; variant: "surface" | "primary" | "outline" | "success" | "warning" | "danger" }> = {
  requested: { label: "Requested", variant: "warning" },
  approved: { label: "Approved", variant: "primary" },
  processing: { label: "Processing", variant: "outline" },
  paid: { label: "Paid", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "surface" },
};

const METHOD_LABEL: Record<PayoutPaymentMethod, string> = {
  BANK: "Bank Account",
  UPI: "UPI ID",
  QR: "QR Code",
  OTHER: "Other",
};

const METHOD_ICON: Record<PayoutPaymentMethod, string> = {
  BANK: "account_balance",
  UPI: "qr_code_2",
  QR: "qr_code",
  OTHER: "payments",
};

export function PayoutsClient({ summary, paymentDetails, kycStatus, kycBank, fallbackMin }: PayoutsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Add-payment form state
  const [formOpen, setFormOpen] = useState(false);
  const [method, setMethod] = useState<PayoutPaymentMethod>("UPI");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [makePrimary, setMakePrimary] = useState(true);

  const balances = summary
    ? [
        { label: "Available to Withdraw", value: summary.available, icon: "account_balance_wallet", accent: true },
        { label: "Processing", value: summary.processing, icon: "sync", accent: false },
        { label: "Paid (Lifetime)", value: summary.paid, icon: "task_alt", accent: false },
        { label: "Total Earned", value: summary.total_earned, icon: "trending_up", accent: false },
      ]
    : [];

  const showNotice = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleRequestPayout = () => {
    startTransition(async () => {
      const res = await requestPayoutAction();
      if (res.success) {
        showNotice("success", `Payout of ${inr(res.amount ?? 0)} requested. Your bank details will be confirmed by our team.`);
        router.refresh();
      } else {
        showNotice("error", res.error ?? "Unable to request a payout.");
      }
    });
  };

  const handleCancelPayout = (payoutId: string) => {
    startTransition(async () => {
      const res = await cancelPayoutRequestAction(payoutId);
      if (res.success) {
        showNotice("success", "Payout request cancelled. Your earnings are back in your available balance.");
        router.refresh();
      } else {
        showNotice("error", res.error ?? "Unable to cancel the payout.");
      }
    });
  };

  const handleSavePayment = () => {
    startTransition(async () => {
      const res = await savePaymentDetailAction({ method, label, value, is_primary: makePrimary });
      if (res.success) {
        showNotice("success", "Payment details saved.");
        setFormOpen(false);
        setLabel("");
        setValue("");
        router.refresh();
      } else {
        showNotice("error", res.error ?? "Unable to save payment details.");
      }
    });
  };

  const handleSetPrimary = (id: string) => {
    startTransition(async () => {
      const res = await setPrimaryPaymentDetailAction(id);
      if (!res.success) showNotice("error", res.error ?? "Unable to update primary method.");
      router.refresh();
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const res = await removePaymentDetailAction(id);
      if (!res.success) showNotice("error", res.error ?? "Unable to remove payment details.");
      else showNotice("success", "Payment details removed.");
      router.refresh();
    });
  };

  const minPayout = summary?.min_payout ?? fallbackMin;
  const payoutEnabled = summary?.payouts_enabled ?? true;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary font-headline">Payouts</h1>
          <p className="text-on-surface-variant font-medium mt-0.5 opacity-80 text-sm">
            Withdraw your earnings whenever your available balance is above the minimum.
          </p>
        </div>
        <Badge variant="surface" className="shrink-0">
          <span className="material-symbols-outlined mr-1 text-sm">savings</span>
          Min payout {inr(minPayout)}
        </Badge>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl border flex items-center gap-2.5 text-sm font-bold animate-in fade-in ${
            notice.kind === "success"
              ? "bg-secondary/10 border-secondary/25 text-primary"
              : "bg-error/10 border-error/25 text-error"
          }`}
        >
          <span className="material-symbols-outlined text-base">{notice.kind === "success" ? "check_circle" : "error"}</span>
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="hover:opacity-70">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {!summary ? (
        <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-secondary/15 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#059669] text-3xl drop-shadow-sm">account_balance_wallet</span>
          </div>
          <p className="font-bold text-on-surface-variant">Payouts are not ready yet</p>
          <p className="text-sm text-on-surface-variant/70 max-w-sm">
            Your earnings ledger is being set up. Complete a booking and your earnings will appear here.
          </p>
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : !payoutEnabled ? (
        <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-warning/15 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#D97706] text-3xl drop-shadow-sm">lock_clock</span>
          </div>
          <p className="font-bold text-on-surface-variant">Payouts are temporarily paused</p>
          <p className="text-sm text-on-surface-variant/70 max-w-sm">
            The platform is not processing withdrawals right now. Your earnings are safe — you can withdraw once payouts reopen.
          </p>
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {balances.map((b) => (
              <div
                key={b.label}
                className={`p-5 rounded-4xl border transition-all ${
                  b.accent
                    ? "bg-primary text-white border-primary shadow-xl shadow-primary/20"
                    : "bg-surface-container-lowest border-outline-variant/15 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`material-symbols-outlined text-xl ${b.accent ? "text-secondary" : "text-secondary"}`}>{b.icon}</span>
                </div>
                <p className={`text-2xl font-black mt-2 tracking-tight ${b.accent ? "text-white" : "text-primary"}`}>{inr(b.value)}</p>
                <p className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${b.accent ? "text-white/70" : "text-on-surface-variant/70"}`}>
                  {b.label}
                </p>
              </div>
            ))}
          </div>

          {/* Current payout / CTA */}
          {summary.current_payout ? (
            <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-6 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-warning/15 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#D97706] text-2xl drop-shadow-sm">hourglass_top</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-primary">Payout {summary.current_payout.payout_number}</p>
                    <StatusChip status={summary.current_payout.status} />
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {inr(summary.current_payout.requested_amount)} requested on {formatDate(summary.current_payout.requested_at)}. We will verify
                    your bank/giving details and release the payment shortly.
                  </p>
                  {summary.current_payout.rejection_reason && (
                    <p className="text-xs font-bold text-error mt-2">
                      {summary.current_payout.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
              {["requested", "approved"].includes(summary.current_payout.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleCancelPayout(summary.current_payout!.id)}
                  className="shrink-0"
                >
                  <span className="material-symbols-outlined text-sm mr-1">undo</span>
                  Cancel request
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-6 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/15 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">request_quote</span>
                </div>
                <div>
                  <p className="font-black text-primary">Ready to withdraw?</p>
                  <p className="text-sm text-on-surface-variant mt-1">
                    You can withdraw up to {inr(summary.available)} in one request. Minimum payout is {inr(minPayout)}.
                    We pay out within a few working days via your saved details.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={isPending || summary.available < minPayout || summary.clawback_due > 0}
                onClick={handleRequestPayout}
                className="shrink-0"
              >
                {isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-on-secondary border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base mr-1">download</span>
                    Withdraw {inr(summary.available)}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Payment details */}
          <section className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-primary font-headline">How you get paid</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Add a UPI ID, QR code, or other details. Our team uses your primary method alongside the bank details below.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFormOpen((v) => !v)}>
                <span className="material-symbols-outlined text-sm mr-1">{formOpen ? "close" : "add"}</span>
                {formOpen ? "Cancel" : "Add details"}
              </Button>
            </div>

            {/* KYC bank card (read-only from onboarding) */}
            {(kycBank.bank_name || kycBank.bank_account_no || kycBank.bank_ifsc) && (
              <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant/70">
                    Bank details from onboarding {kycStatus ? `· ${kycStatus.toUpperCase()}` : ""}
                  </p>
                  <div className="text-sm font-bold text-on-surface mt-1 leading-relaxed">
                    {kycBank.bank_name && <span>{kycBank.bank_name}</span>}
                    {kycBank.bank_account_no && (
                      <span className="text-on-surface-variant font-semibold"> · A/C ••••{kycBank.bank_account_no.slice(-4)}</span>
                    )}
                    {kycBank.bank_ifsc && <span className="text-on-surface-variant font-semibold"> · IFSC {kycBank.bank_ifsc}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Add form */}
            {formOpen && (
              <div className="bg-surface rounded-2xl border border-outline-variant/10 p-4 space-y-3 animate-in fade-in">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(METHOD_LABEL) as PayoutPaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        method === m
                          ? "bg-primary text-white border-primary"
                          : "border-outline-variant text-on-surface-variant hover:border-primary/40"
                      }`}
                    >
                      {METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Label</span>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder={method === "UPI" ? "e.g. GPay" : method === "BANK" ? "e.g. HDFC Account" : "e.g. PhonePe QR"}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Details</span>
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={method === "UPI" ? "yourname@upi" : method === "BANK" ? "Account no & IFSC" : "QR image link or code"}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makePrimary}
                    onChange={(e) => setMakePrimary(e.target.checked)}
                    className="w-4 h-4 accent-[#a6ce37]"
                  />
                  <span className="text-xs font-bold text-on-surface-variant">Set as primary method</span>
                </label>
                <Button variant="primary" size="sm" disabled={isPending} onClick={handleSavePayment}>
                  {isPending ? "Saving..." : "Save payment details"}
                </Button>
              </div>
            )}

            {/* Saved methods */}
            {paymentDetails.length === 0 && !formOpen ? (
              <div className="flex flex-col items-center text-center gap-2 py-4">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">qr_code_2</span>
                <p className="text-sm font-bold text-on-surface-variant">No receiving methods added yet.</p>
                <p className="text-xs text-on-surface-variant/60">Add a UPI ID or your QR so we can pay you smoothly.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paymentDetails.map((d) => (
                  <div key={d.id} className="bg-surface rounded-2xl border border-outline-variant/10 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/15 rounded-xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">{METHOD_ICON[d.method]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{d.label || METHOD_LABEL[d.method]}</p>
                      <p className="text-xs text-on-surface-variant/70 truncate">{d.value}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.is_primary ? (
                        <Badge variant="success" className="mr-1">
                          Primary
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => handleSetPrimary(d.id)}>
                          Make primary
                        </Button>
                      )}
                      <button
                        onClick={() => handleRemove(d.id)}
                        disabled={isPending}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="Remove"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Withdrawal history */}
          <section className="bg-surface-container-lowest rounded-4xl border border-outline-variant/15 p-6 space-y-3">
            <div>
              <h2 className="font-black text-primary font-headline">Withdrawal history</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Track the status of every payout request.</p>
            </div>
            {summary.payouts.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-6">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">receipt_long</span>
                <p className="text-sm font-bold text-on-surface-variant">No withdrawals yet.</p>
                <p className="text-xs text-on-surface-variant/60">Your first payout request will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.payouts.map((p) => (
                  <div key={p.id} className="bg-surface rounded-2xl border border-outline-variant/10 p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm">{p.payout_number}</p>
                      <p className="text-xs text-on-surface-variant/70">
                        Requested {formatDate(p.requested_at)}
                        {p.paid_at ? ` · Paid ${formatDate(p.paid_at)}` : p.rejected_at ? ` · Rejected ${formatDate(p.rejected_at)}` : ""}
                      </p>
                      {(p.rejection_reason || p.cancellation_reason) && (
                        <p className="text-[11px] text-on-surface-variant/70 mt-0.5 truncate">
                          {p.rejection_reason || p.cancellation_reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-primary">{inr(p.requested_amount)}</p>
                    </div>
                    <div className="shrink-0">
                      <StatusChip status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: PayoutStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.cancelled;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}