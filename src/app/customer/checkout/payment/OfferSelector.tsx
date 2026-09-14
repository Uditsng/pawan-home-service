"use client";

import { useEffect } from "react";
import { formatOfferBenefit, formatEntitlementValue } from "@/lib/offers/format";
import { calculateOfferDiscount } from "@/lib/pricing/offerEngine";
import type { OfferBenefit } from "@/lib/pricing/types";
import type { CheckoutOfferEntitlement } from "./page";

function buildBenefit(e: CheckoutOfferEntitlement): OfferBenefit | null {
  if (!e.offers) return null;
  return {
    offerType: e.offer_type,
    benefitValue: Number(e.offers.benefit_value) || 0,
    maxDiscount: e.offers.max_discount != null ? Number(e.offers.max_discount) : undefined,
    minBookingAmount: Number(e.offers.min_booking_amount) || 0,
    remainingValue: e.offer_type === "SERVICE_CREDIT" ? Number(e.remaining_value) : undefined,
    remainingUses: e.offer_type !== "SERVICE_CREDIT" ? Number(e.remaining_uses) : undefined,
  };
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "No expiry";
  return `Valid till ${new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

interface OfferSelectorProps {
  entitlements: CheckoutOfferEntitlement[];
  preOfferOrderTotal: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function OfferSelector({
  entitlements,
  preOfferOrderTotal,
  selectedId,
  onSelect,
  onClose,
}: OfferSelectorProps) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">local_activity</span>
            <h3 className="text-base font-extrabold text-on-surface">Use an Offer</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-1 pb-6 space-y-3">
          {entitlements.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">local_activity</span>
              <p className="text-xs font-semibold text-on-surface-variant">
                No available offers for the selected service(s).
              </p>
              <p className="text-[10px] text-on-surface-variant/70">
                Browse offers from your PHS Dashboard and come back to apply them.
              </p>
            </div>
          ) : (
            entitlements.map((e) => {
              const benefit = buildBenefit(e);
              const applied = calculateOfferDiscount(preOfferOrderTotal, benefit);
              const min = Number(e.offers?.min_booking_amount || 0);
              const disabled = applied <= 0 || preOfferOrderTotal < min;
              const isSelected = selectedId === e.id;
              return (
                <div
                  key={e.id}
                  className={`p-4 bg-surface border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? "border-secondary ring-2 ring-secondary/30"
                      : disabled
                        ? "border-outline-variant/10 opacity-60"
                        : "border-outline-variant/20 hover:border-secondary/40 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/5 text-primary border border-primary/20 rounded-lg text-[10px] font-black tracking-wider uppercase font-mono">
                        {e.offers?.code}
                      </span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {e.offers ? formatOfferBenefit(e.offers) : ""}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-on-surface truncate leading-tight pt-0.5">
                      {e.offers?.title}
                    </p>

                    <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{formatEntitlementValue(e)}</span>
                      <span>•</span>
                      <span>{formatExpiry(e.expires_at)}</span>
                    </div>

                    {disabled && preOfferOrderTotal < min && (
                      <p className="text-[10px] font-semibold text-warning">
                        Needs a minimum order value of ₹{min}
                      </p>
                    )}
                    {disabled && applied <= 0 && preOfferOrderTotal >= min && (
                      <p className="text-[10px] font-semibold text-warning">
                        This offer provides no benefit for your order value.
                      </p>
                    )}
                    {!disabled && (
                      <p className="text-[10px] font-semibold text-emerald-600">
                        You’ll save ₹{applied} on this booking
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onSelect(e.id);
                      onClose();
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-surface-container text-on-surface-variant border border-outline-variant/20"
                        : "bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
                    }`}
                  >
                    {isSelected ? "Selected" : "Apply"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}