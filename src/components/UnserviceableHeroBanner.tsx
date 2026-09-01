"use client";

import { useState } from "react";
import { logServiceInterestAction } from "@/app/admin/settings/actions";

interface UnserviceableHeroBannerProps {
  currentPincode?: string;
  currentCity?: string;
  onChangeLocationClick?: () => void;
}

export default function UnserviceableHeroBanner({
  currentPincode = "",
  currentCity = "",
  onChangeLocationClick,
}: UnserviceableHeroBannerProps) {
  const [isNotifying, setIsNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const handleNotifyMe = async () => {
    if (isNotifying || notified) return;
    setIsNotifying(true);

    try {
      if (currentPincode || currentCity) {
        await logServiceInterestAction({
          pincode: currentPincode || "unknown",
          city: currentCity || undefined,
        });
      }

      setNotified(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest rounded-2xl p-2 sm:p-4 text-center relative overflow-hidden my-2">
      {/* Soft Background Accent Dots */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#a6ce37_1px,transparent_1px)] [bg-size:16px_16px]" />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Main Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-primary uppercase font-headline">
          WE ARE <br className="sm:hidden" />
          <span className="text-secondary">COMING SOON</span>
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-on-surface-variant font-medium mt-4 leading-relaxed max-w-md">
          We&apos;re currently live in select areas and expanding quickly. Get notified when we are near you!
        </p>

        {/* Notify Me Button */}
        <button
          type="button"
          onClick={handleNotifyMe}
          disabled={isNotifying || notified}
          className={`mt-6 px-8 py-3.5 rounded-full text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
            notified
              ? "bg-emerald-100 text-emerald-800 cursor-default shadow-none"
              : "bg-[#059669] hover:bg-[#047857] text-white active:scale-95 hover:shadow-lg"
          }`}
        >
          {notified ? (
            <>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              You&apos;ll be notified!
            </>
          ) : isNotifying ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Logging interest...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">chat</span>
              Notify me!
            </>
          )}
        </button>

        {/* Change Location Option */}
        {onChangeLocationClick && (
          <button
            type="button"
            onClick={onChangeLocationClick}
            className="mt-4 text-xs font-bold text-secondary hover:underline cursor-pointer transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            Change location
          </button>
        )}
      </div>
    </div>
  );
}
