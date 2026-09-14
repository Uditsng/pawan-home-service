import type { Offer } from "@/lib/types";
import { formatOfferBenefit } from "@/lib/offers/format";

interface OfferCardProps {
  offer: Offer;
  size?: "sm" | "md" | "lg";
  className?: string;
  footer?: React.ReactNode;
}

function getOfferValue(offer: Offer): string {
  return formatOfferBenefit(offer);
}

export function OfferCard({ offer, size = "md", className = "", footer }: OfferCardProps) {
  const compact = size === "sm";
  const large = size === "lg";
  const price = offer.purchase_price > 0 ? `₹${offer.purchase_price}` : "Free";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-[#062a6b] to-[#0b3d91] text-white shadow-[0_16px_40px_-12px_rgba(0,34,97,0.45)] ring-1 ring-white/10 ${className}`}
    >
      {/* Ambient decor */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-secondary/25 blur-2xl" aria-hidden />
      <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-white/5 blur-3xl" aria-hidden />

      <div className={`relative flex flex-col ${compact ? "p-4 gap-1.5" : large ? "p-6 gap-2.5" : "p-5 gap-2"}`}>
        {/* Code */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/90">
            <span className="material-symbols-outlined text-[11px]">local_activity</span>
            {offer.code}
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary text-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
            {formatOfferBenefit(offer)}
          </span>
        </div>

        {/* Title */}
        <h3 className={`font-headline font-bold text-white ${compact ? "text-base" : large ? "text-2xl" : "text-xl"}`}>
          {offer.title}
        </h3>

        {offer.display_text ? (
          <p className={`text-white/75 font-medium ${compact ? "text-[11px]" : "text-xs"}`}>{offer.display_text}</p>
        ) : offer.description ? (
          <p className={`text-white/75 font-medium ${compact ? "text-[11px]" : "text-xs"}`}>{offer.description}</p>
        ) : null}

        {/* Pay box */}
        <div className="mt-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Pay</p>
            <p className={`font-headline font-black text-secondary leading-none mt-0.5 ${compact ? "text-xl" : large ? "text-4xl" : "text-3xl"}`}>
              {price}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">You get</p>
            <p className={`font-headline font-black text-white leading-none mt-0.5 ${compact ? "text-base" : large ? "text-2xl" : "text-xl"}`}>
              {getOfferValue(offer)}
            </p>
          </div>
        </div>

        {footer ? (
          <div className="mt-1">{footer}</div>
        ) : (
          <div className="mt-auto pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
              {offer.purchase_price > 0 ? `Get for ₹${offer.purchase_price}` : "Claim free"}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}