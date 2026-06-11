"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toggleOnlineStatus } from "@/app/partner/actions";

interface PartnerHeaderProps {
  /** Initial status fetched server-side from profiles.status */
  initialStatus?: string;
}

export default function PartnerHeader({ initialStatus = "offline" }: PartnerHeaderProps) {
  // Derive isOnline from the real DB status
  const [status, setStatus]         = useState<string>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const isOnline = status === "active";
  const isBusy   = ["professional_en_route", "professional_arrived", "otp_pending", "in_progress", "confirmed", "accepted"].includes(status);

  const handleToggle = () => {
    if (isBusy) return; // Cannot change while on a job
    setErrorMsg(null);

    const goOnline = !isOnline;

    // Optimistic update
    setStatus(goOnline ? "active" : "offline");

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

  // Badge config
  let dotColor    = "bg-outline-variant";
  let labelText   = "OFFLINE";
  let labelColor  = "text-on-surface-variant";
  let borderColor = "border-outline-variant/10";
  let title       = "Go Online";

  if (isBusy) {
    dotColor    = "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]";
    labelText   = "ON JOB";
    labelColor  = "text-warning";
    borderColor = "border-warning/20";
    title       = "You are currently on a job";
  } else if (isOnline) {
    dotColor    = "bg-secondary shadow-[0_0_8px_rgba(166,206,55,0.5)]";
    labelText   = "ONLINE";
    labelColor  = "text-secondary";
    borderColor = "border-secondary/20";
    title       = "Go Offline";
  }

  return (
    <header className="bg-surface-dim sticky top-0 z-50 transition-colors border-b border-surface-variant/20 pt-safe">
      <div className="flex flex-col w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Platform Logo */}
          <Link href="/partner/dashboard" className="flex items-center gap-2">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              className="h-12 md:h-14 w-auto rounded-lg shadow-sm"
              width={40}
              height={40}
            />
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Status Toggle */}
            <button
              onClick={handleToggle}
              disabled={isPending || isBusy}
              title={title}
              aria-label={title}
              className={`flex items-center bg-surface-container-lowest border shadow-sm px-3 py-1.5 rounded-full gap-2 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${borderColor}`}
            >
              {isPending ? (
                <div className="w-2.5 h-2.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <div className={`w-2.5 h-2.5 rounded-full transition-colors ${dotColor}`} />
              )}
              <span className={`font-label text-[11px] font-bold tracking-widest uppercase ${labelColor}`}>
                {isPending ? "..." : labelText}
              </span>
            </button>
          </div>
        </div>

        {/* Inline error toast (non-intrusive, below header) */}
        {errorMsg && (
          <div className="mx-6 mb-3 px-4 py-2.5 bg-error/10 border border-error/20 rounded-xl text-xs font-bold text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMsg}
          </div>
        )}
      </div>
    </header>
  );
}
