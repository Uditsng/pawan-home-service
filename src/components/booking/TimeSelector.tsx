import React from "react";

interface TimeSelectorProps {
  selectedTime: string;
  morningSlots: string[];
  afternoonSlots: string[];
  onChange: (time: string) => void;
}

export default function TimeSelector({
  selectedTime,
  morningSlots,
  afternoonSlots,
  onChange,
}: TimeSelectorProps) {
  const renderSlotsGroup = (slots: string[], title: string, icon: string) => {
    if (slots.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 opacity-80">
          <span className="material-symbols-outlined text-base leading-none">{icon}</span>
          {title}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onChange(slot)}
                className={`py-3.5 px-2 rounded-xl border text-center font-bold text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]"
                    : "bg-surface border-outline-variant/15 text-on-surface-variant hover:bg-surface-container hover:border-outline-variant"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (morningSlots.length === 0 && afternoonSlots.length === 0) {
    return (
      <div className="text-center p-6 bg-surface rounded-2xl border border-outline-variant/15">
        <span className="material-symbols-outlined text-on-surface-variant/40 text-3xl mb-2">schedule</span>
        <p className="text-xs text-on-surface-variant font-medium">No slots available for the selected date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderSlotsGroup(morningSlots, "Morning Slots", "wb_sunny")}
      {renderSlotsGroup(afternoonSlots, "Afternoon Slots", "wb_twilight")}
    </div>
  );
}
