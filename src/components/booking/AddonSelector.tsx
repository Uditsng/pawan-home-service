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
    <section className="bg-surface-container-low border border-green-300 rounded-2xl p-3 md:p-4 shadow-xs">
      <h3 className="text-center text-base font-bold text-primary font-headline mb-3 flex items-center justify-center gap-2">
       Frequently added together
      </h3>
      <div className="space-y-1">
        {addons.map((a) => {
          const currentQty = selectedAddonIds[a.id] || 0;
          const isSelected = currentQty > 0;
          return (
            <div
              key={a.id}
              className={`p-2 rounded-md border transition-all flex items-center justify-between gap-2 ${
                isSelected
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-outline-variant/10 hover:bg-surface-container-low"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs md:text-sm font-bold text-on-surface">{a.title}</span>
                  {a.is_required && (
                    <span className="text-red-600 font-bold text-[8px] px-1.5 py-0.5  tracking-widest uppercase">*Required</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">{a.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-primary font-headline">₹{a.price}</span>

                {/* Addon Selector Counter */}
                <div className="flex items-center gap-1 bg-gray-300 p-0.5 rounded-lg border border-outline-variant/15">
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
