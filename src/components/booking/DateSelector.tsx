import React, { useMemo } from "react";

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

export default function DateSelector({
  selectedDate,
  onChange,
}: DateSelectorProps) {
  const next4Days = useMemo(() => {
    const baseDate = new Date();
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
      {next4Days.map((d, idx) => {
        const isSelected =
          d.getDate() === selectedDate.getDate() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getFullYear() === selectedDate.getFullYear();

        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dateNum = d.getDate();
        const monthShort = d.toLocaleDateString("en-US", { month: "short" });

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(d)}
            className={`flex flex-col items-center justify-center min-w-[72px] h-[84px] rounded-2xl border transition-all duration-200 select-none cursor-pointer active:scale-95 ${
              isSelected
                ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]"
                : "bg-surface border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low hover:border-outline-variant"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 mb-0.5">{dayName}</span>
            <span className="text-xl font-headline font-black leading-none mb-1">{dateNum}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60 leading-none">{monthShort}</span>
          </button>
        );
      })}
    </div>
  );
}
