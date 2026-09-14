"use client";

import { useState } from "react";
import Link from "next/link";
import { OfferCard } from "@/components/Offers/OfferCard";
import type { Offer } from "@/lib/types";

interface OfferPromoSheetProps {
  offer: Offer;
}

export function OfferPromoSheet({ offer }: OfferPromoSheetProps) {
  // Show only once per travel to the dashboard (/customer/dashboard).
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`phs_offer_promo_${offer.id}`) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const close = () => {
    try {
      sessionStorage.setItem(`phs_offer_promo_${offer.id}`, "1");
    } catch {
      // Storage may be unavailable in some webviews — non-fatal.
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close offer promotion"
        onClick={close}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm cursor-pointer"
      />
      <div className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-4 pb-6 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-500 sm:slide-in-from-bottom-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-secondary">
            <span className="material-symbols-outlined text-sm">local_activity</span>
            Limited time offer
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <OfferCard offer={offer} size="lg" />

        <div className="mt-4 space-y-2.5">
          <Link
            href={`/customer/offers/${offer.id}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {offer.purchase_price > 0 ? `PAY ₹${offer.purchase_price}` : "GET OFFER"}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
          <Link
            href="/customer/offers"
            className="flex items-center justify-center w-full py-2.5 rounded-2xl text-on-surface-variant hover:text-primary text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            View all offers
          </Link>
        </div>
      </div>
    </div>
  );
}