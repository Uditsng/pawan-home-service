"use client";

import { useState, useTransition } from "react";

interface Service {
  id: string;
  title: string;
  base_price: number;
  category: string;
}

interface Address {
  formatted_address: string;
  city: string;
  pincode: string;
  label: string;
}

interface PaymentFormClientProps {
  service: Service;
  addressObj: Address;
  date: string;
  time: string;
  taxRatePercent: number;
  confirmBookingAction: () => Promise<void>;
}

export default function PaymentFormClient({
  service,
  addressObj,
  date,
  time,
  taxRatePercent,
  confirmBookingAction,
}: PaymentFormClientProps) {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Price Breakdown Calculation: Additive GST
  const subtotal = service.base_price;
  const gstTax = Math.round(subtotal * (taxRatePercent / 100));
  const totalPrice = subtotal + gstTax;

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
    if (!isAgreed || isPending) return;

    startTransition(async () => {
      await confirmBookingAction();
    });
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
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
              <h3 className="font-headline text-base font-bold text-on-surface">Booking Summary</h3>
            </div>

            <div className="space-y-4">
              {/* Service details */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-xl">
                    {service.category === "cleaning" ? "home_work" : "bug_report"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Service</p>
                  <p className="font-bold text-sm text-on-surface leading-tight mt-0.5">{service.title}</p>
                </div>
              </div>

              {/* Date & Slot */}
              <div className="flex items-start gap-3">
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

              {/* Duration */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estimated Duration</p>
                  <p className="font-bold text-sm text-on-surface leading-tight mt-0.5">60 Minutes</p>
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
                    Free cancellations allowed up to <span className="font-bold text-on-surface">24 hours before</span> service start time. Cancellations inside 24 hours may incur a platform convenience fee.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. PRICE BREAKDOWN CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">payments</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Price Breakdown</h3>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm text-on-surface-variant font-medium">
                <span>Service Charge</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-on-surface-variant font-medium">
                <span>GST ({taxRatePercent}%)</span>
                <span>₹{gstTax}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-on-surface-variant font-medium">
                <span>Convenience & Platform Fee</span>
                <span className="text-secondary font-bold">FREE</span>
              </div>

              <hr className="border-t border-dashed border-outline-variant/30 my-3" />

              <div className="flex justify-between items-center">
                <p className="font-extrabold text-base text-on-surface">Total Payable (All taxes included)</p>
                <p className="text-2xl font-black text-on-surface tracking-tight">₹{totalPrice}</p>
              </div>
            </div>
          </div>

          {/* 4. SECURE PAYMENT & TRUST ELEMENTS */}
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-5 md:p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-xl">lock</span>
              </div>
              <div>
                <p className="text-xs font-extrabold text-primary uppercase tracking-widest">SSL Encrypted Checkout</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-normal">
                  Your payments are processed securely via industry-standard 256-bit encryption protocols.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-primary/10 pt-4">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-[#059669]">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <p className="text-xs font-extrabold text-on-surface uppercase tracking-wider">100% Satisfaction Guarantee</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-normal">
                  Refund is guaranteed if you cancel in compliance with the cancellation policy or if a professional fails to arrive.
                </p>
              </div>
            </div>
          </div>

          {/* 5. TERMS CONFIRMATION CHECKBOX */}
          <div className="px-2 py-1">
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div className="relative shrink-0 mt-0.5">
                <input
                  id="terms-confirm"
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  disabled={isPending}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-outline-variant group-hover:border-primary peer-checked:border-secondary peer-checked:bg-secondary flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-white text-sm font-bold scale-0 peer-checked:scale-100 transition-transform">
                    check
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed">
                By proceeding, you agree to our <span className="text-primary font-bold underline">cancellation, refund, and service terms</span>.
              </span>
            </label>
          </div>

          {/* STICKY BOTTOM NAVIGATION BAR */}
          <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#f7f9fb]/90 backdrop-blur-2xl border-t border-outline-variant/10 p-3 md:p-4 pb-safe flex items-center">
            <div className="max-w-xl mx-auto flex gap-3 md:gap-4 items-center w-full">
              <div className="flex-1">
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Payable</p>
                <p className="text-xl md:text-2xl font-black text-on-background">₹{totalPrice}</p>
              </div>
              <button
                type="submit"
                disabled={!isAgreed || isPending}
                className={`flex-1 py-3.5 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl font-headline font-extrabold tracking-tight text-base md:text-lg text-center flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                  ${
                    !isAgreed || isPending
                      ? "bg-surface-container text-on-surface/30 cursor-not-allowed border border-outline-variant/10"
                      : "bg-secondary text-white shadow-[0_12px_32px_rgba(253,118,26,0.25)] hover:opacity-95"
                  }`}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Securing Booking...
                  </>
                ) : (
                  <>
                    Pay & Book
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">lock</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
}
