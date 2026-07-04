import React from "react";
import { ServiceAddon } from "@/lib/types";

interface AddonSelectorProps {
  addons: ServiceAddon[];
  selectedAddonIds: Record<string, number>;
  onChange: (addonId: string, qty: number, maxQty: number) => void;
}

export default function AddonSelector({
  addons,
  selectedAddonIds,
  onChange,
}: AddonSelectorProps) {
  if (addons.length === 0) return null;

  return (
    <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
      <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">library_add</span> Available Add-ons
      </h3>
      <div className="space-y-3">
        {addons.map((a) => {
          const currentQty = selectedAddonIds[a.id] || 0;
          const isSelected = currentQty > 0;
          return (
            <div
              key={a.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isSelected
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-outline-variant/10 hover:bg-surface-container-low"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs md:text-sm font-bold text-on-surface truncate">{a.title}</span>
                  {a.is_required && (
                    <span className="bg-red-500/10 text-red-600 font-bold text-[8px] px-1.5 py-0.5 rounded-full border border-red-500/25 tracking-widest uppercase">Required</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed line-clamp-1">{a.description}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs font-black text-primary font-headline">₹{a.price}</span>

                {/* Addon Selector Counter */}
                <div className="flex items-center gap-2.5 bg-surface-container p-0.5 rounded-lg border border-outline-variant/15">
                  <button
                    type="button"
                    onClick={() => onChange(a.id, currentQty - 1, a.max_quantity)}
                    className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 cursor-pointer text-xs"
                    disabled={currentQty === 0}
                  >
                    <span className="material-symbols-outlined text-xs font-black">remove</span>
                  </button>
                  <span className="w-5 text-center text-xs font-headline font-black text-primary">{currentQty}</span>
                  <button
                    type="button"
                    onClick={() => onChange(a.id, currentQty + 1, a.max_quantity)}
                    className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 cursor-pointer text-xs"
                    disabled={currentQty >= a.max_quantity}
                  >
                    <span className="material-symbols-outlined text-xs font-black">add</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
