"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";

export default function ScheduleClient({ service }: { service: { id: string; duration_minutes: number } }) {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedFullDate, setSelectedFullDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const monthShort = selectedFullDate.toLocaleString('default', { month: 'short' });
  const selectedDateNum = selectedFullDate.getDate();

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Pre-determined time slots
  const availableMorningSlots = ['9:00 AM', '10:00 AM', '11:00 AM'];
  const availableAfternoonSlots = ['1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'];

  const today = new Date();
  const isToday = selectedFullDate.getFullYear() === today.getFullYear() &&
    selectedFullDate.getMonth() === today.getMonth() &&
    selectedFullDate.getDate() === today.getDate();
  const currentHour = today.getHours();

  // Filter slots based on date and time
  const filteredMorningSlots = useMemo(() => {
    if (!isToday) return availableMorningSlots;
    return availableMorningSlots.filter(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return slotHour > currentHour + 1; // At least 1 hour notice
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, currentHour]);

  const filteredAfternoonSlots = useMemo(() => {
    if (!isToday) return availableAfternoonSlots;
    return availableAfternoonSlots.filter(slot => {
      let slotHour = parseInt(slot.split(':')[0]);
      if (slotHour !== 12) slotHour += 12; // converting PM to 24h
      return slotHour > currentHour + 1; // At least 1 hour notice
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, currentHour]);

  // Set default selected time if empty
  useEffect(() => {
    if (isCustomMode) return;
    const allAvailable = [...filteredMorningSlots, ...filteredAfternoonSlots];
    if (allAvailable.length > 0 && (!selectedTime || !allAvailable.includes(selectedTime))) {
      // setTimeout to avoid synchronous state update in effect
      setTimeout(() => setSelectedTime(allAvailable[0]), 0);
    } else if (allAvailable.length === 0 && selectedTime !== "") {
      setTimeout(() => setSelectedTime(""), 0);
    }
  }, [filteredMorningSlots, filteredAfternoonSlots, selectedTime, isCustomMode, selectedFullDate]);

  const handleContinue = () => {
    if (!selectedTime) return;

    const year = selectedFullDate.getFullYear();
    const formattedMonth = (selectedFullDate.getMonth() + 1).toString().padStart(2, '0');
    const formattedDate = selectedFullDate.getDate().toString().padStart(2, '0');

    const payload = new URLSearchParams({
      serviceId: service.id,
      date: `${year}-${formattedMonth}-${formattedDate}`,
      time: selectedTime,
    });
    router.push(`/checkout/payment?${payload.toString()}`);
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      <main className="max-w-2xl mx-auto px-4 md:px-6 pb-40">
        {/* Headline Section */}
        <section className="mt-6 md:mt-8 mb-6 md:mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface leading-tight mb-2">
            When should <br />we come?
          </h1>
        </section>

        {/* 7-Days & Custom Toggle Section */}
        {!isCustomMode ? (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg font-bold">Select Date</h2>
              <button
                onClick={() => setIsCustomMode(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors p-2 rounded-full  border border-primary"
              >
                Select
              </button>
            </div>

            <div className="flex overflow-x-auto gap-2 md:gap-3 pb-4 snap-x scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {next7Days.map((dateObj) => {
                const isSelected = selectedFullDate.toDateString() === dateObj.toDateString();
                const dayName = dateObj.toLocaleString('default', { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const isTodayItem = dateObj.toDateString() === today.toDateString();

                return (
                  <button
                    key={dateObj.toISOString()}
                    onClick={() => setSelectedFullDate(dateObj)}
                    className={`snap-center shrink-0 w-16 md:w-20 py-3 md:py-4 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 transition-all relative border-2 ${isSelected ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-surface-container-lowest border-transparent text-on-surface hover:bg-surface-container-low'}`}
                  >
                    <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {isTodayItem ? 'Today' : dayName}
                    </span>
                    <span className="text-xl md:text-2xl font-extrabold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bg-surface-container-lowest rounded-3xl p-6 mt-35 mb-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline text-lg font-bold">Custom Schedule</h2>
              <button
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedFullDate(today);
                  setSelectedTime("");
                }}
                className="text-sm font-bold p-2 rounded-full border border-primary text-primary hover:text-primary/80 transition-colors"
              >
                Use Quick Pick
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant mt-10 mb-2">Select Date</label>
              <input
                type="date"
                min={today.toISOString().split('T')[0]} // Prevents past dates
                value={
                  // Need to adjust for timezone offset to prevent date shifting in input
                  new Date(selectedFullDate.getTime() - (selectedFullDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                }
                onChange={(e) => {
                  if (e.target.value) {
                    // Append time to parse correctly in local time
                    const newD = new Date(e.target.value + 'T12:00:00');
                    if (!isNaN(newD.getTime())) setSelectedFullDate(newD);
                  }
                }}
                className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant/20 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Select Time</label>
              <input
                type="time"
                value={(() => {
                  if (!selectedTime) return "10:00";
                  if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
                    const [time, modifier] = selectedTime.split(' ');
                    const [h, minutes] = time.split(':');
                    let hours = h;
                    if (hours === '12') hours = '00';
                    if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
                    return `${hours.padStart(2, '0')}:${minutes}`;
                  }
                  return selectedTime;
                })()}
                onChange={(e) => {
                  const val = e.target.value; // e.g. "14:30"

                  // Convert native time to readable AM/PM
                  if (val) {
                    const [h, m] = val.split(':');
                    let numH = parseInt(h, 10);
                    const ampm = numH >= 12 ? 'PM' : 'AM';
                    numH = numH % 12 || 12; // Handle 0 and >12 cases

                    setSelectedTime(`${numH}:${m} ${ampm}`);
                  } else {
                    setSelectedTime("");
                  }
                }}
                className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant/20 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </section>
        )}

        {/* Standard Time Slots if NOT custom */}
        {!isCustomMode && (
          <section className="space-y-8">
            {filteredMorningSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-lg">wb_sunny</span>
                  <h3 className="font-headline font-bold text-sm tracking-wide uppercase opacity-70">Morning</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {filteredMorningSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border-2 flex items-center justify-center font-bold text-base md:text-lg active:scale-95 ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-lowest border-transparent text-on-surface shadow-sm hover:bg-surface-container-low'}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredAfternoonSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary text-lg">light_mode</span>
                  <h3 className="font-headline font-bold text-sm tracking-wide uppercase opacity-70">Afternoon</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredAfternoonSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-4 rounded-2xl transition-all border-2 flex items-center justify-center font-bold text-lg active:scale-95 ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-lowest border-transparent text-on-surface shadow-sm hover:bg-surface-container-low'}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredMorningSlots.length === 0 && filteredAfternoonSlots.length === 0 && (
              <div className="p-6 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/10 text-on-surface-variant">
                No available slots for this date. Please select another date.
              </div>
            )}
          </section>
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-none">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-safe flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between px-1 md:px-2">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estimated duration</p>
              <p className="font-bold text-on-surface text-sm md:text-base">{service?.duration_minutes || "60"} Minutes</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Selected Slot</p>
              <p className="font-bold text-primary text-sm md:text-base">
                {monthShort} {selectedDateNum}{selectedTime ? `, ${selectedTime}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleContinue}
            disabled={!selectedTime}
            className={`w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all
              ${!selectedTime ? 'bg-surface-container text-on-surface/30 cursor-not-allowed' : 'bg-secondary text-white shadow-[0_12px_32px_rgba(253,118,26,0.25)] hover:opacity-90 active:scale-[0.98]'}`}
          >
            Continue To Payment
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
