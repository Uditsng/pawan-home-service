"use client";

import React, { useEffect, useState } from "react";

interface VersionCheckResponse {
  minimum_supported_version: string;
  latest_version: string;
  force_update: boolean;
}

const CLIENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

function parseVersion(v: string): number[] {
  return v.split(".").map((num) => parseInt(num, 10) || 0);
}

function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

export default function VersionAlert() {
  const [alertType, setAlertType] = useState<"none" | "force" | "recommend">("none");
  const [serverVersionInfo, setServerVersionInfo] = useState<VersionCheckResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;
        const data = (await res.json()) as VersionCheckResponse;
        setServerVersionInfo(data);

        // Compare versions
        const isBelowMin = compareVersions(CLIENT_VERSION, data.minimum_supported_version) < 0;
        const isBelowLatest = compareVersions(CLIENT_VERSION, data.latest_version) < 0;

        if (isBelowMin || (data.force_update && isBelowLatest)) {
          setAlertType("force");
        } else if (isBelowLatest) {
          setAlertType("recommend");
        }
      } catch (err) {
        console.error("[VersionCheck] Failed to verify application version:", err);
      }
    };

    void checkVersion();
  }, []);

  if (alertType === "none" || (alertType === "recommend" && dismissed)) return null;

  // 1. Force Update Block (Full-screen Overlay)
  if (alertType === "force") {
    return (
      <div className="fixed inset-0 bg-[#002261]/95 backdrop-blur-md z-9999 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-sm border border-outline-variant/15 shadow-2xl relative overflow-hidden flex flex-col items-center">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-error text-4xl animate-bounce">system_update_alt</span>
          </div>

          <h2 className="font-headline text-xl md:text-2xl font-black text-on-surface leading-tight mb-3">
            Critical Update Required
          </h2>
          
          <p className="text-on-surface-variant font-medium text-xs md:text-sm leading-relaxed mb-6">
            This version of the PHS application is no longer supported. Please install the latest update to continue booking and managing services safely.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => {
                // Redirect to Google Play Store / Apple App Store placeholder
                window.location.href = "https://play.google.com/store";
              }}
              className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white text-xs md:text-sm font-black uppercase tracking-widest rounded-xl transition-all active:scale-98 shadow-md"
            >
              Update Now
            </button>
            
            <p className="text-[10px] text-on-surface-variant/45 font-bold uppercase tracking-wider">
              Client version: {CLIENT_VERSION} · Required: {serverVersionInfo?.minimum_supported_version}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Recommend Update Alert (Top Banner Card)
  return (
    <div className="fixed top-4 left-4 right-4 z-9999 max-w-md mx-auto animate-in slide-in-from-top-6 duration-300 pointer-events-auto">
      <div className="glass-panel bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/15 p-4 rounded-2xl shadow-xl flex gap-3 items-start relative">
        <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            tips_and_updates
          </span>
        </div>

        <div className="flex-1 pr-6">
          <h4 className="font-headline text-sm font-black text-on-surface">Update Available ({serverVersionInfo?.latest_version})</h4>
          <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-relaxed">
            Get the latest features, bug fixes, and performance improvements.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => {
                window.location.href = "https://play.google.com/store";
              }}
              className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors"
            >
              Update
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-on-surface"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-on-surface-variant/50 hover:text-on-surface transition-colors"
          aria-label="Close alert"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
