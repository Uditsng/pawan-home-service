import React from "react";
import { BookingPricing } from "@/lib/types";

interface PriceSummaryProps {
  breakdown: Omit<BookingPricing, "id" | "booking_id" | "created_at">;
  pricingModel?: string;
  variant?: "sticky" | "detailed";
  bookButton?: React.ReactNode;
  cartButton?: React.ReactNode;
  useWallet?: boolean;
  walletBalance?: number;
  onToggleWallet?: () => void;
}

export default function PriceSummary({
  breakdown,
  pricingModel,
  variant = "sticky",
  bookButton,
  cartButton,
  useWallet = false,
  walletBalance = 0,
  onToggleWallet,
}: PriceSummaryProps) {
  const priceWithoutGst = breakdown.total_price - breakdown.gst_amount;

  if (variant === "sticky") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/15 py-4 px-4 md:px-6 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] animate-fade-in">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Estimated Total</span>
            <span className="text-xl md:text-2xl font-black text-primary font-headline tracking-tighter">
              ₹{priceWithoutGst}
              {pricingModel === "hourly" && <span className="text-xs font-semibold text-on-surface-variant">/hr</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {cartButton}
            {bookButton}
          </div>
        </div>
      </div>
    );
  }

  // Detailed breakdown table (used in Payment Page)
  const walletApplied = useWallet ? Math.min(walletBalance, breakdown.total_price) : 0;
  const payableAmount = Math.max(0, breakdown.total_price - walletApplied);

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
      <h3 className="text-base font-bold text-primary font-headline border-b border-outline-variant/10 pb-2">
        Payment Summary
      </h3>
      <div className="space-y-2.5 text-xs font-medium text-on-surface-variant">
        <div className="flex justify-between">
          <span>Base Price</span>
          <span className="font-bold text-primary">₹{breakdown.base_price}</span>
        </div>

        {breakdown.addons_total > 0 && (
          <div className="flex justify-between">
            <span>Add-ons Total</span>
            <span className="font-bold text-primary">+₹{breakdown.addons_total}</span>
          </div>
        )}

        {breakdown.travel_fee > 0 && (
          <div className="flex justify-between">
            <span>Travel / Convenience Fee</span>
            <span className="font-bold text-primary">+₹{breakdown.travel_fee}</span>
          </div>
        )}

        {breakdown.surcharges && breakdown.surcharges.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-outline-variant/10">
            {breakdown.surcharges.map((s, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span>{s.name}</span>
                <span className={`font-bold ${s.amount < 0 ? "text-success" : "text-primary"}`}>
                  {s.amount < 0 ? "-₹" : "+₹"}{Math.abs(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {breakdown.discount_amount > 0 && (
          <div className="flex justify-between text-success">
            <span>Membership Discount</span>
            <span className="font-black">-₹{breakdown.discount_amount}</span>
          </div>
        )}

        {breakdown.coupon_discount > 0 && (
          <div className="flex justify-between text-success">
            <span>Coupon Discount</span>
            <span className="font-black">-₹{breakdown.coupon_discount}</span>
          </div>
        )}

        {breakdown.gst_amount > 0 && (
          <div className="flex justify-between">
            <span>GST (18%)</span>
            <span className="font-bold text-primary">+₹{breakdown.gst_amount}</span>
          </div>
        )}

        {/* Wallet check */}
        {walletBalance > 0 && onToggleWallet && (
          <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-wallet-check"
                checked={useWallet}
                onChange={onToggleWallet}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <label htmlFor="use-wallet-check" className="cursor-pointer select-none">
                Use Wallet Balance (Available: ₹{walletBalance})
              </label>
            </div>
            {useWallet && (
              <span className="font-black text-success">-₹{walletApplied}</span>
            )}
          </div>
        )}

        <div className="flex justify-between text-sm font-black text-primary border-t border-outline-variant/20 pt-3 mt-2">
          <span>Amount Payable</span>
          <span className="text-base">₹{payableAmount}</span>
        </div>
      </div>
    </div>
  );
}
