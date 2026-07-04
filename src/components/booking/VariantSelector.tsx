import React from "react";
import { ServiceVariant } from "@/lib/types";

interface VariantSelectorProps {
  variants: ServiceVariant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
}: VariantSelectorProps) {
  if (variants.length === 0) return null;

  return (
    <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
      <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">category</span> Select Option / Variant
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variants.map((v) => {
          const isSelected = selectedVariantId === v.id;
          return (
            <div
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none active:scale-[0.99] duration-200 ${
                isSelected
                  ? "bg-primary/5 border-primary text-primary shadow-xs"
                  : "bg-surface border-outline-variant/15 text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <div>
                <h4 className="text-sm font-bold tracking-tight mb-1">{v.title}</h4>
                <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                  {v.description || "Tailored option specifically for you."}
                </p>
              </div>
              <div className="flex justify-between items-baseline mt-4 border-t border-outline-variant/10 pt-2">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Starting from</span>
                <span className="text-sm font-black">₹{v.price}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
