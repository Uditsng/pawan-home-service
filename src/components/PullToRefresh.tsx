"use client";

import React, { useState, useEffect, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<"idle" | "pulling" | "refreshing" | "completed">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 70; // px threshold to trigger refresh
  const MAX_PULL = 110;  // max px to pull down

  const handleTouchStart = (e: TouchEvent) => {
    // Only pull if container is at the top of scroll
    const scrollEl = document.documentElement || document.body;
    if (scrollEl.scrollTop > 0) return;

    startY.current = e.touches[0].pageY;
    currentY.current = e.touches[0].pageY;
    isPulling.current = true;
    setStatus("idle");
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current) return;

    currentY.current = e.touches[0].pageY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Apply resistance
      const resistanceDiff = Math.min(MAX_PULL, Math.pow(diff, 0.82));
      setPullDistance(resistanceDiff);
      setStatus(resistanceDiff >= THRESHOLD ? "pulling" : "idle");

      // Prevent body scroll to stop native overscroll effects
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setStatus("refreshing");
      setPullDistance(THRESHOLD); // Rest at threshold position
      try {
        await onRefresh();
        setStatus("completed");
      } catch (err) {
        console.error("[PullToRefresh] Refresh failed:", err);
        setStatus("idle");
      } finally {
        // Animate return to top
        setTimeout(() => {
          setPullDistance(0);
          setStatus("idle");
        }, 300);
      }
    } else {
      setPullDistance(0);
      setStatus("idle");
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Attach listeners with { passive: false } to allow e.preventDefault()
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance]);

  return (
    <div ref={containerRef} className="relative w-full min-h-screen select-none touch-pan-y">
      {/* PTR Loading/Progress indicator panel */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-all duration-150 z-50 pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          top: `-${pullDistance}px`,
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 bg-surface-container-highest/98 border border-outline-variant/15 px-4 py-2 rounded-full shadow-md animate-in fade-in zoom-in duration-300">
          {status === "refreshing" ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4.5 w-4.5 text-secondary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-[11px] font-black text-primary font-headline uppercase tracking-widest">Synchronizing...</span>
            </div>
          ) : status === "completed" ? (
            <div className="flex items-center gap-1.5 text-green-600">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="text-[11px] font-black font-headline uppercase tracking-widest">Updated</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span
                className="material-symbols-outlined text-[18px] transition-transform duration-200"
                style={{
                  transform: `rotate(${Math.min(180, (pullDistance / THRESHOLD) * 180)}deg)`,
                }}
              >
                arrow_downward
              </span>
              <span className="text-[11px] font-black font-headline uppercase tracking-widest">
                {pullDistance >= THRESHOLD ? "Release to sync" : "Pull to sync"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="transition-transform duration-150"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
