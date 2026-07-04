import React from "react";

interface QuantitySelectorProps {
  quantity: number;
  minQty: number;
  maxQty: number;
  unitName: string;
  pricePerUnit: number;
  onChange: (qty: number) => void;
}

export default function QuantitySelector({
  quantity,
  minQty,
  maxQty,
  unitName,
  pricePerUnit,
  onChange,
}: QuantitySelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Quantity ({unitName})
          </label>
          <p className="text-[10px] text-on-surface-variant/60 font-medium mt-0.5">
            Price: ₹{pricePerUnit} per {unitName.toLowerCase().replace(/s$/, "")}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface p-1 rounded-xl border border-outline-variant/25 shadow-xs">
          <button
            type="button"
            onClick={() => onChange(Math.max(minQty, quantity - 1))}
            disabled={quantity <= minQty}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/10 text-on-surface hover:bg-surface-container disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-black">remove</span>
          </button>
          <span className="w-8 text-center text-sm font-headline font-black text-primary">{quantity}</span>
          <button
            type="button"
            onClick={() => onChange(Math.min(maxQty, quantity + 1))}
            disabled={quantity >= maxQty}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/10 text-on-surface hover:bg-surface-container disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-black">add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
