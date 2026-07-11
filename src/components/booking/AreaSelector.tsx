import React from "react";

interface AreaSlab {
  min: number;
  max?: number;
  rate: number;
}

interface AreaSelectorProps {
  areaSqft: number;
  minArea: number;
  maxArea: number;
  step?: number;
  areaSlabs?: AreaSlab[];
  onChange: (area: number) => void;
}

export default function AreaSelector({
  areaSqft,
  minArea,
  maxArea,
  step = 1,
  areaSlabs = [],
  onChange,
}: AreaSelectorProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10) || minArea);
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Math.max(0, parseInt(e.target.value, 10) || 0));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-baseline">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Service Area Size (Sqft)
        </label>
        <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-black text-xs">
          {areaSqft} Sqft
        </div>
      </div>
      <input
        type="range"
        min={minArea}
        max={maxArea}
        step={step}
        value={areaSqft}
        onChange={handleSliderChange}
        className="w-full accent-primary h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold uppercase">
        <span>Min: {minArea} Sqft</span>
        <span>Max: {maxArea} Sqft</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Manual Input</span>
          <input
            type="number"
            value={areaSqft}
            onChange={handleManualChange}
            className="w-full border border-outline-variant/20 rounded-lg p-2.5 bg-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs font-bold"
          />
        </div>
        {areaSlabs && areaSlabs.length > 0 && (
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Slab Rates</span>
            <div className="bg-surface p-2 rounded-lg border border-outline-variant/15 text-[10px] text-on-surface-variant/80 font-medium space-y-0.5 max-h-[80px] overflow-y-auto">
              {areaSlabs.map((s, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{s.min}{s.max ? `-${s.max}` : "+"} sqft</span>
                  <span className="font-black text-primary">₹{s.rate}/sqft</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
