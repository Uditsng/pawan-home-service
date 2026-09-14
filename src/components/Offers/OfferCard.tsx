import Image from "next/image";
import type { Offer } from "@/lib/types";
import { formatOfferBenefit } from "@/lib/offers/format";

interface OfferCardProps {
  offer: Offer;
  size?: "sm" | "md" | "lg";
  className?: string;
  footer?: React.ReactNode;
}

export function OfferCard({ offer, size = "md", className = "", footer }: OfferCardProps) {
  const compact = size === "sm";
  const large = size === "lg";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-[#062a6b] to-[#0b3d91] text-white shadow-[0_16px_40px_-12px_rgba(0,34,97,0.45)] ring-1 ring-white/10 ${className}`}
    >
      {/* Ambient decor */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-secondary/20 blur-2xl" aria-hidden />
      <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />

      {offer.artwork_url ? (
        <Image
          src={offer.artwork_url}
          alt={offer.title}
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover opacity-25"
        />
      ) : null}

      <div className={`relative flex flex-col ${compact ? "p-4 gap-1.5" : "p-6 gap-2"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/90">
            <span className="material-symbols-outlined text-[11px]">local_activity</span>
            {offer.code}
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary text-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
            {formatOfferBenefit(offer)}
          </span>
        </div>

        <h3 className={`font-headline font-bold text-white ${compact ? "text-base" : large ? "text-2xl" : "text-xl"}`}>
          {offer.title}
        </h3>

        {offer.display_text ? (
          <p className={`text-white/80 font-medium ${compact ? "text-[11px]" : "text-xs"}`}>{offer.display_text}</p>
        ) : offer.description ? (
          <p className={`text-white/80 font-medium ${compact ? "text-[11px]" : "text-xs"}`}>{offer.description}</p>
        ) : null}

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