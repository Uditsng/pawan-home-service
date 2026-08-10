"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/refresh/RefreshContext";
import { cancelBookingAction } from "@/app/actions/bookings";
import { isWithinFreeWindow, formatFreeWindowLabel } from "@/utils/bookingPolicy";

const REASON_OPTIONS = [
  "Changed my mind",
  "Booking a different time",
  "Booked by mistake",
  "Found a cheaper alternative",
  "Other",
];

interface CancelBookingDialogProps {
  bookingId: string;
  createdAt: string;
  cancellationWindowMinutes: number;
  onClose: () => void;
  onSuccess: (info?: { releasedPartnerId?: string | null }) => void;
}

export default function CancelBookingDialog({
  bookingId,
  createdAt,
  cancellationWindowMinutes,
  onClose,
  onSuccess,
}: CancelBookingDialogProps) {
  const { invalidate } = useRefresh();
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refundEligible = isWithinFreeWindow(createdAt, cancellationWindowMinutes);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setErrorMessage("");
    setIsSubmitting(true);

    const reason =
      selectedReason === "Other" ? customReason.trim() : `${selectedReason}${customReason.trim() ? ` — ${customReason.trim()}` : ""}`;

    try {
      const result = await cancelBookingAction(bookingId, reason);
      if (!result.success) {
        setErrorMessage(result.error || "Could not cancel the booking.");
        return;
      }

      await invalidate("bookings");
      await invalidate(`booking_detail_${bookingId}`);
      if (result.releasedPartnerId) {
        await invalidate(`partner_jobs_${result.releasedPartnerId}`);
      }

      onSuccess({ releasedPartnerId: result.releasedPartnerId });
    } catch (err) {
      setErrorMessage((err as Error).message || "Could not cancel the booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-2xl p-5 pb-8 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-lg font-bold text-on-surface">Cancel Booking</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Refund banner */}
        <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl border mb-5 ${refundEligible ? "bg-success/10 border-success/25" : "bg-warning/10 border-warning/25"}`}>
          <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${refundEligible ? "text-success" : "text-warning"}`}>
            {refundEligible ? "account_balance_wallet" : "info"}
          </span>
          <p className="text-[11px] font-semibold leading-relaxed text-on-surface-variant">
            {refundEligible ? (
              <>
                You are within the {formatFreeWindowLabel(cancellationWindowMinutes)} free-cancellation window.
                Your full payment will be <span className="text-success font-black">automatically refunded</span> to your wallet.
              </>
            ) : (
              <>
                The {formatFreeWindowLabel(cancellationWindowMinutes)} free-cancellation window has passed.
                <span className="text-warning font-black"> No refund</span> will be issued for this cancellation.
              </>
            )}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Reason for cancellation</label>
          <div className="grid grid-cols-1 gap-1.5">
            {REASON_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedReason(opt)}
                className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedReason === opt
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-surface border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {selectedReason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us why you are cancelling (optional)"
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-outline-variant/25 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-primary/5 focus:border-primary text-on-surface font-semibold placeholder:text-on-surface-variant/50 resize-none"
            />
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 bg-error/10 border border-error/30 rounded-2xl p-4 flex items-start gap-3 text-error animate-in fade-in">
            <span className="material-symbols-outlined shrink-0">error</span>
            <p className="text-xs font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface font-bold font-headline text-sm transition-all hover:bg-surface-container-high active:scale-95 cursor-pointer"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex-[1.4] py-3 rounded-xl bg-error text-white font-bold font-headline text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">hourglass_top</span>
                Cancelling...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">cancel</span>
                Cancel Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}