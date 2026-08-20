"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface ComingSoonScrollerProps {
  children: ReactNode;
  totalItems: number;
}

export function ComingSoonScroller({ children, totalItems }: ComingSoonScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [totalItems]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.8, 300);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Desktop Navigation Arrows - Positioned neatly at top right */}
      <div className="hidden sm:flex items-center gap-1.5 absolute -top-11 sm:-top-12 right-0 z-10">
        <button
          type="button"
          onClick={() => handleScroll("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className="w-7 h-7 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-primary flex items-center justify-center shadow-2xs hover:bg-surface-container hover:border-secondary/50 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">chevron_left</span>
        </button>
        <button
          type="button"
          onClick={() => handleScroll("right")}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className="w-7 h-7 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-primary flex items-center justify-center shadow-2xs hover:bg-surface-container hover:border-secondary/50 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>
      </div>

      {/* Horizontal Scroll Rail */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 -mx-0.5 px-0.5"
      >
        {children}
      </div>
    </div>
  );
}
