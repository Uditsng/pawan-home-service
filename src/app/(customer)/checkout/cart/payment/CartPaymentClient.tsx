"use client";

import { useState, useTransition, useEffect } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { useRouter } from "next/navigation";
interface Address {
  formatted_address: string;
  city: string;
  pincode: string;
  label: string;
}

interface CartPaymentClientProps {
  addressObj: Address;
  date: string;
  time: string;
  taxRatePercent: number;
  referralDiscount: number;
  confirmOrderAction: (serviceIds: string[]) => Promise<{ success: boolean; error?: string } | void>;
}

export default function CartPaymentClient({
  addressObj,
  date,
  time,
  taxRatePercent,
  referralDiscount,
  confirmOrderAction,
}: CartPaymentClientProps) {
  const router = useRouter();
  const { items, itemCount, subtotal } = useCart();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !isPending) {
      router.push("/dashboard");
    }
  }, [items, router, isPending]);

  // Calculations
  const gstTax = Math.round(subtotal * (taxRatePercent / 100));
  const totalPrice = Math.max(0, subtotal + gstTax - referralDiscount);

  // Format Display Date
  const dateObj = new Date(`${date}T12:00:00`);
  const formattedDisplayDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed || isPending || items.length === 0) return;

    startTransition(async () => {
      const serviceIds = items.map(i => i.serviceId);
      await confirmOrderAction(serviceIds);
    });
  };

  if (items.length === 0 && !isPending) {
    return null;
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      {/* Top Header Bar */}
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-outline-variant/10 py-4 px-4 md:px-6">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.back()}
            className="text-on-surface hover:opacity-80 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-primary font-black text-lg font-headline tracking-tight">Checkout Payment</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl font-bold">shield</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-background">Secure Checkout</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. BOOKING & ADDRESS SUMMARY CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">receipt_long</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Order Summary</h3>
            </div>

            <div className="space-y-4">
              {/* Selected Services list */}
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Services Selected</p>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={item.serviceId} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#059669] text-xl">
                            {item.iconName}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate leading-tight">{item.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.subcategoryName}</p>
                        </div>
                      </div>
                      <span className="font-black text-sm text-primary shrink-0 ml-2">₹{item.basePrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date & Slot */}
              <div className="flex items-start gap-3 pt-2">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Schedule</p>
                  <p className="font-bold text-sm text-on-surface leading-tight mt-0.5">
                    {formattedDisplayDate} · <span className="text-primary">{time}</span>
                  </p>
                </div>
              </div>

              {/* Dynamic Service Address */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Service Location</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-extrabold text-on-surface bg-surface-container px-2 py-0.5 rounded-full uppercase tracking-wider scale-90 shrink-0">
                      {addressObj.label || "Home"}
                    </span>
                    <p className="font-bold text-sm text-on-surface truncate leading-tight">
                      {addressObj.formatted_address}
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-variant opacity-80 mt-0.5 leading-relaxed">
                    {addressObj.city} · {addressObj.pincode}
                  </p>
                </div>
              </div>

              {/* Cancellation Policy summary info */}
              <div className="flex items-start gap-3 p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                <span className="material-symbols-outlined text-warning text-[20px] shrink-0 mt-0.5">info</span>
                <div>
                  <p className="text-xs font-bold text-on-surface">Cancellation & Refund Policy</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                    Free cancellation is allowed within <span className="font-bold text-on-surface">15 minutes</span> of booking. Cancellations made after this 15-minute window may incur a platform convenience fee.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PAYMENT METHOD CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">payments</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Payment Method</h3>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-start gap-3.5">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">handshake</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm text-primary">Pay After Service (COD)</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  PHS guarantees absolute quality. Pay conveniently via UPI, Cash, or Cards only after your service is fully completed by our professional.
                </p>
              </div>
            </div>
          </div>

          {/* 3. BILLING DETAILS CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">receipt</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Billing Details</h3>
            </div>

            <div className="space-y-3 font-medium text-sm">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'service' : 'services'})</span>
                <span className="font-bold text-on-surface">₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>GST &amp; Taxes ({taxRatePercent}%)</span>
                <span className="font-bold text-on-surface">₹{gstTax}</span>
              </div>
              {referralDiscount > 0 && (
                <div className="flex justify-between items-center text-secondary-container bg-emerald-500/10 px-3 py-2 rounded-xl border border-secondary/20">
                  <span className="flex items-center gap-1 font-bold text-emerald-700 text-xs uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">redeem</span> Referral Reward
                  </span>
                  <span className="font-black text-emerald-700">-₹{referralDiscount}</span>
                </div>
              )}
              <div className="border-t border-outline-variant/30 pt-3 flex justify-between items-center text-base md:text-lg">
                <span className="font-headline font-extrabold text-on-surface">Total Amount</span>
                <span className="font-headline font-black text-primary text-xl md:text-2xl">₹{totalPrice}</span>
              </div>
            </div>
          </div>

          {/* 4. TERMS & CONFIRMATION CHECKBOX */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 select-none cursor-pointer">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-5 h-5 rounded-md border border-outline-variant text-primary focus:ring-primary focus:ring-offset-2 shrink-0 mt-0.5 accent-primary cursor-pointer"
              />
              <span className="text-xs text-on-surface-variant font-medium leading-normal">
                I agree to the PHS Cleaning Company <a href="/terms" target="_blank" className="text-primary font-bold hover:underline">Terms &amp; Conditions</a> and understand that I will pay <span className="font-bold text-on-surface">₹{totalPrice}</span> to the professional upon completion.
              </span>
            </label>

            {/* Confirm CTA Button */}
            <button
              id="confirm-booking-btn"
              type="submit"
              disabled={!isAgreed || isPending || items.length === 0}
              className={`w-full py-4 rounded-2xl font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-2 transition-all duration-300
                ${(!isAgreed || isPending || items.length === 0)
                  ? 'bg-surface-container text-on-surface/30 cursor-not-allowed border-none'
                  : 'bg-primary text-white shadow-lg shadow-primary/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] border-none'
                }`}
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Placing Order...
                </>
              ) : (
                <>
                  Confirm Booking (Pay COD)
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">verified_user</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
