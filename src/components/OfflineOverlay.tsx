"use client";

import { useEffect, useState, useCallback } from "react";
import type { PluginListenerHandle } from "@capacitor/core";

export default function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        return status.connected;
      }
    } catch {
      // Fall through to browser check
    }
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }, []);

  const handleManualRetry = async () => {
    setIsChecking(true);
    try {
      const online = await checkConnection();
      if (online) {
        setIsOffline(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1000);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let networkListener: PluginListenerHandle | null = null;

    const setupListeners = async () => {
      // 1. Initial check
      const online = await checkConnection();
      setIsOffline(!online);

      // 2. Capacitor Network listener for native mobile
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { Network } = await import("@capacitor/network");
          networkListener = await Network.addListener("networkStatusChange", (status) => {
            if (status.connected) {
              setIsOffline(false);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            } else {
              setIsOffline(true);
            }
          });
        }
      } catch (err) {
        console.error("Failed to attach Capacitor network listener:", err);
      }

      // 3. Browser fallbacks for PWA / Web views
      const handleOnline = () => {
        setIsOffline(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      };

      const handleOffline = () => {
        setIsOffline(true);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    };

    const cleanupPromise = setupListeners();

    return () => {
      networkListener?.remove();
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [checkConnection]);

  return (
    <>
      {/* Back Online Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10000 px-5 py-3 rounded-full bg-surface-container-lowest text-primary shadow-xl border border-secondary/30 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" /> */}
          <span className="text-xs font-semibold tracking-wide">Back Online</span>
        </div>
      )}

      {/* Full-Screen Offline Modal / Screen */}
      {isOffline && (
        <div
          id="phs-offline-screen"
          className="fixed inset-0 z-9999 bg-surface/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 select-none"
        >
          {/* Ambient decorative glowing backdrop */}
          {/* <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none" /> */}

          {/* Card Container */}
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl p-8 shadow-2xl border border-outline-variant/60 flex flex-col items-center">
            {/* Styled Icon */}
            <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 ring-8 ring-green-500/5">
              <span className="material-symbols-outlined text-[#059669] text-4xl drop-shadow-sm">
                wifi_off
              </span>
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-primary mb-2 tracking-tight">
              You are Offline
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-8 max-w-65">
              Please check your internet connection or Wi-Fi settings and try again.
            </p>

            {/* Retry Button */}
            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isChecking}
              className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-surface font-semibold text-sm tracking-wide shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-75 cursor-pointer"
            >
              {isChecking ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  <span>Checking Connection...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    refresh
                  </span>
                  <span>Retry Connection</span>
                </>
              )}
            </button>

            {/* Subtle help caption */}
            <div className="mt-6 flex items-center gap-2 text-xs text-on-surface-variant/80">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
              <span>Waiting for network reconnect...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
