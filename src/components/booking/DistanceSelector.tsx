import React from "react";

interface DistanceSelectorProps {
  distanceKm: number;
  minKm?: number;
  maxKm?: number;
  baseDistanceFee: number;
  freeKm: number;
  pricePerKm: number;
  onChange: (km: number) => void;
}

export default function DistanceSelector({
  distanceKm,
  minKm = 1,
  maxKm = 150,
  baseDistanceFee,
  freeKm,
  pricePerKm,
  onChange,
}: DistanceSelectorProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10) || minKm);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-baseline">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Estimated Travel Distance (KM)
        </label>
        <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-black text-xs">
          {distanceKm} KM
        </div>
      </div>
      <input
        type="range"
        min={minKm}
        max={maxKm}
        value={distanceKm}
        onChange={handleSliderChange}
        className="w-full accent-primary h-2 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold uppercase">
        <span>{minKm} KM</span>
        <span>{maxKm} KM</span>
      </div>
      <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/10 text-xs text-on-surface-variant font-medium leading-relaxed">
        Base Fee: <strong>₹{baseDistanceFee}</strong> (includes first {freeKm} KM).
        <br />
        Additional distance is billed at <strong>₹{pricePerKm}/KM</strong>.
      </div>
    </div>
  );
}
