"use client";

import { useEffect } from "react";
import type { AvailableCoupon } from "@/app/actions/coupon.actions";

interface CouponSelectorProps {
  coupons: AvailableCoupon[];
  loading: boolean;
  onSelect: (coupon: AvailableCoupon) => void;
  onClose: () => void;
}

function discountLabel(c: AvailableCoupon): string {
  return c.discount_type === "percentage"
    ? `${c.discount_value}% OFF${c.max_discount ? ` (Max ₹${c.max_discount})` : ""}`
    : `₹${c.discount_value} OFF`;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "No expiry";
  return `Expires ${new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function CouponSelector({
  coupons,
  loading,
  onSelect,
  onClose,
}: CouponSelectorProps) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">local_offer</span>
            <h3 className="text-base font-extrabold text-on-surface">Available Coupons</h3>
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

        {/* Content Area - Scrollable */}
        <div className="overflow-y-auto overscroll-contain flex-1 pr-1 pb-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-on-surface-variant font-medium">Fetching best offers...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">confirmation_number</span>
              <p className="text-xs font-semibold text-on-surface-variant">
                No active coupons available for the selected service(s).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-surface border border-outline-variant/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-secondary/40 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-primary/5 text-primary border border-primary/20 rounded-lg text-xs font-black tracking-wider uppercase font-mono">
                        {c.code}
                      </span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {discountLabel(c)}
                      </span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <span className="font-medium">
                        {c.applicableServiceTitle
                          ? `For ${c.applicableServiceTitle}`
                          : "All services"}
                      </span>
                      <span>•</span>
                      <span>{formatExpiry(c.expires_at)}</span>
                    </div>

                    {c.min_booking_amount > 0 && (
                      <p className="text-[10px] text-on-surface-variant/80 font-medium">
                        Min order ₹{c.min_booking_amount}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
