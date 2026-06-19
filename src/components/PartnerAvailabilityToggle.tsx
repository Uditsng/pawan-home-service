"use client";

import { useState, useTransition } from "react";
import { toggleOnlineStatus } from "@/app/partner/actions";

interface PartnerAvailabilityToggleProps {
  initialStatus: string;
}

export default function PartnerAvailabilityToggle({
  initialStatus,
}: PartnerAvailabilityToggleProps) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOnline = status === "active";
  const isBusy = [
    "busy",
    "professional_en_route",
    "professional_arrived",
    "otp_pending",
    "in_progress",
    "confirmed",
    "accepted",
  ].includes(status);

  const handleToggle = () => {
    if (isBusy || isPending) return;
    setErrorMsg(null);

    const goOnline = !isOnline;
    setStatus(goOnline ? "active" : "offline"); // optimistic

    startTransition(async () => {
      const result = await toggleOnlineStatus(goOnline);
      if (!result.success) {
        // Revert optimistic update
        setStatus(isOnline ? "active" : "offline");
        setErrorMsg(result.error ?? "Failed to update status.");
      } else if (result.status) {
        setStatus(result.status);
      }
    });
  };

  // Determine label & toggle appearance based on status
  let label = "Offline";
  let labelClass = "text-on-surface-variant";
  let trackClass = "bg-outline-variant/40";
  let thumbClass = "left-1";

  if (isBusy) {
    label = "On Job";
    labelClass = "text-warning";
    trackClass = "bg-warning/30";
    thumbClass = "left-5";
  } else if (isOnline) {
    label = "Online";
    labelClass = "text-success";
    trackClass = "bg-success";
    thumbClass = "left-5";
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center justify-between p-4 md:p-5 border-b border-slate-100 transition-colors group ${isBusy ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"}`}
        onClick={handleToggle}
        role="button"
        aria-disabled={isBusy || isPending}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleToggle();
        }}
        title={
          isBusy
            ? "Cannot change availability while on a job"
            : isOnline
              ? "Go Offline"
              : "Go Online"
        }
      >
        <div className="flex items-center gap-3 md:gap-4">
          <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">
            toggle_on
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">
              Accepting New Jobs
            </span>
            <span className={`text-[11px] font-semibold ${labelClass}`}>
              {isPending ? "Updating..." : label}
            </span>
          </div>
        </div>

        {/* Toggle switch */}
        <div
          className={`relative inline-block w-10 h-6 rounded-full transition-colors duration-200 ${trackClass}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${thumbClass}`}
          />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Inline error message */}
      {errorMsg && (
        <div className="mx-4 mb-1 px-3 py-2 bg-error/10 border border-error/20 rounded-xl text-xs font-bold text-error flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
