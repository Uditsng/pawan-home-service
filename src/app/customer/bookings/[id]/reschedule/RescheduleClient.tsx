"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DateSelector from "@/components/booking/DateSelector";
import TimeSelector from "@/components/booking/TimeSelector";
import { useRefresh } from "@/lib/refresh/RefreshContext";
import { rescheduleBookingAction } from "@/app/actions/bookings";
import { ALL_AVAILABLE_SLOTS, AVAILABLE_MORNING_SLOTS, AVAILABLE_AFTERNOON_SLOTS, filterTimeSlots } from "@/utils/schedule";
import { formatFreeWindowLabel } from "@/utils/bookingPolicy";
import type { RescheduleBookingInfo } from "./page";

export default function RescheduleClient({
  initialBooking,
  cancellationWindowMinutes,
}: {
  initialBooking: RescheduleBookingInfo;
  cancellationWindowMinutes: number;
}) {
  const router = useRouter();
  const { invalidate } = useRefresh();

  const [selectedFullDate, setSelectedFullDate] = useState<Date>(() => {
    const scheduled = new Date(initialBooking.scheduled_date);
    const today = new Date();
    const sameOrFuture = scheduled.getTime() >= today.getTime();
    return sameOrFuture ? scheduled : new Date();
  });
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const oldDateObj = new Date(initialBooking.scheduled_date);
  const oldDateStr = oldDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" });
  const oldTimeStr = oldDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const filteredMorningSlots = useMemo(
    () => filterTimeSlots(AVAILABLE_MORNING_SLOTS, selectedFullDate),
    [selectedFullDate]
  );
  const filteredAfternoonSlots = useMemo(
    () => filterTimeSlots(AVAILABLE_AFTERNOON_SLOTS, selectedFullDate),
    [selectedFullDate]
  );

  const allSlots = useMemo(
    () => [...filteredMorningSlots, ...filteredAfternoonSlots],
    [filteredMorningSlots, filteredAfternoonSlots]
  );

  const effectiveSelectedTime = useMemo(() => {
    if (selectedTime && allSlots.includes(selectedTime)) return selectedTime;
    return allSlots[0] || "";
  }, [selectedTime, allSlots]);

  const handleConfirm = async () => {
    if (!effectiveSelectedTime || isSubmitting) return;
    setErrorMessage("");
    setIsSubmitting(true);

    const year = selectedFullDate.getFullYear();
    const month = (selectedFullDate.getMonth() + 1).toString().padStart(2, "0");
    const day = selectedFullDate.getDate().toString().padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    try {
      const result = await rescheduleBookingAction(initialBooking.id, dateStr, effectiveSelectedTime);
      if (!result.success) {
        setErrorMessage(result.error || "Could not reschedule the booking.");
        return;
      }

      await invalidate("bookings");
      await invalidate(`booking_detail_${initialBooking.id}`);
      if (result.releasedPartnerId) {
        await invalidate(`partner_jobs_${result.releasedPartnerId}`);
      }

      router.push(`/customer/bookings/${initialBooking.id}/tracking`);
    } catch (err) {
      setErrorMessage((err as Error).message || "Could not reschedule the booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      <main className="max-w-2xl mx-auto px-4 md:px-6 pb-28">
        <section className="mt-4 mb-3">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-tight mb-1">
            Reschedule Booking
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">
            Move {initialBooking.services?.title ?? "your booking"} to a new slot.
          </p>
        </section>

        {/* Current vs New */}
        <section className="mb-4 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">Current Slot</span>
            <span className="text-xs font-bold text-on-surface-variant">{oldDateStr} · {oldTimeStr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">New Slot</span>
            <span className="text-xs font-bold text-primary">
              {effectiveSelectedTime
                ? `${selectedFullDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" })} · ${effectiveSelectedTime}`
                : "Select a slot"}
            </span>
          </div>
        </section>

        {/* Date Selection */}
        <section className="mb-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-primary text-lg font-bold">calendar_today</span>
            <h2 className="font-headline text-sm font-bold">Choose New Date</h2>
          </div>
          <DateSelector selectedDate={selectedFullDate} onChange={setSelectedFullDate} />
        </section>

        {/* Time Slot Selection */}
        <section className="mb-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-primary text-lg font-bold">schedule</span>
            <h2 className="font-headline text-sm font-bold">Choose New Time Slot</h2>
          </div>
          <TimeSelector
            selectedTime={effectiveSelectedTime}
            morningSlots={filteredMorningSlots}
            afternoonSlots={filteredAfternoonSlots}
            onChange={setSelectedTime}
          />
        </section>

        {/* Policy Note */}
        <section className="mb-4 flex items-start gap-2 p-3.5 rounded-2xl bg-secondary/5 border border-secondary/20">
          <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">info</span>
          <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
            Your price stays unchanged. The current professional is released and a new Professional
            will be assigned to the new slot. Cancellations within {formatFreeWindowLabel(cancellationWindowMinutes)}{" "}
            of booking are fully refunded to your wallet.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-4 bg-error/10 border border-error/30 rounded-2xl p-4 flex items-start gap-3 text-error animate-in fade-in">
            <span className="material-symbols-outlined shrink-0">error</span>
            <p className="text-xs font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!effectiveSelectedTime || isSubmitting || ALL_AVAILABLE_SLOTS.length === 0}
          className={`w-full py-3.5 rounded-xl font-headline font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all mb-2
            ${!effectiveSelectedTime || isSubmitting
              ? "bg-surface-container text-on-surface/30 cursor-not-allowed"
              : "bg-secondary text-white shadow-[0_10px_24px_rgba(253,118,26,0.2)] hover:opacity-90 active:scale-[0.98]"}`}
        >
          {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
          <span className="material-symbols-outlined text-lg">{isSubmitting ? "hourglass_top" : "arrow_forward"}</span>
        </button>
        <button
          onClick={() => router.push(`/customer/bookings/${initialBooking.id}/tracking`)}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Back to Booking
        </button>
      </main>
    </div>
  );
}