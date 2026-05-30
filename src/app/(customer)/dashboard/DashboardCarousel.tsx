"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface BannerItem {
  src: string;
  title: string;
  link: string;
}

const originalBanners: BannerItem[] = [
  {
    src: "/assets/PHS Banner 1.jpeg",
    title: "Pawan Pest Home Services - Premium Home Services",
    link: "/services"
  },
  {
    src: "/assets/PHS Banner 2.jpeg",
    title: "Pawan Pest Home Services - Safe & Effective Pest Control",
    link: "/services"
  },
  {
    src: "/assets/PHS Banner 3.jpeg",
    title: "Pawan Pest Home Services - Premium Housekeeping & Cleaning",
    link: "/services"
  },
  {
    src: "/assets/PHS Banner 4.jpeg",
    title: "Pawan Pest Home Services - Expert Maintenance & Repair",
    link: "/services"
  },
  {
    src: "/assets/PHS Banner 5.jpeg",
    title: "Pawan Pest Home Services - Comprehensive Home Solutions",
    link: "/services"
  }
];

export default function DashboardCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIndex, setCenterIndex] = useState(originalBanners.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const banners = [...originalBanners, ...originalBanners, ...originalBanners];

  // Initialize carousel to start centered in the duplicated array for infinite swiping
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const childWidth = el.firstElementChild?.clientWidth || 0;
    const gap = 16;
    const scrollStep = childWidth + gap;

    el.scrollTo({ left: scrollStep * originalBanners.length, behavior: "instant" as ScrollBehavior });
    setCenterIndex(originalBanners.length);
    setActiveIndex(0);
  }, []);

  // Tracking center card and active index during scroll events
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const childWidth = el.firstElementChild?.clientWidth || 0;
    const gap = 16;
    const scrollStep = childWidth + gap;

    if (scrollStep > 0) {
      const currentScrolledIndex = Math.round(el.scrollLeft / scrollStep);
      setCenterIndex(currentScrolledIndex);
      setActiveIndex(currentScrolledIndex % originalBanners.length);
    }
  };

  // Modern auto-play with interaction resetting
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      const childWidth = el.firstElementChild?.clientWidth || 0;
      const gap = 16;
      const scrollStep = childWidth + gap;
      let nextScroll = el.scrollLeft + scrollStep;

      const maxScroll = scrollStep * originalBanners.length * 2;
      const minScroll = scrollStep * originalBanners.length;

      // Infinite scroll wrap reset
      if (el.scrollLeft >= maxScroll) {
        el.scrollTo({ left: el.scrollLeft - minScroll, behavior: "instant" as ScrollBehavior });
        nextScroll = (el.scrollLeft - minScroll) + scrollStep;
      }

      el.scrollTo({ left: nextScroll, behavior: "smooth" });
    }, 5000);

    return () => clearInterval(interval);
  }, [centerIndex]);

  // Click handler for pagination progress indicators
  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;

    const childWidth = el.firstElementChild?.clientWidth || 0;
    const gap = 16;
    const scrollStep = childWidth + gap;

    const currentScrolledIndex = Math.round(el.scrollLeft / scrollStep);
    const currentBase = Math.floor(currentScrolledIndex / originalBanners.length) * originalBanners.length;
    const targetScrollIndex = currentBase + index;

    el.scrollTo({ left: targetScrollIndex * scrollStep, behavior: "smooth" });
  };

  return (
    <section className="mb-6 md:mb-10 relative overflow-hidden">
      {/* Inline styles for progress bar filling animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 5000ms linear forwards;
        }
      ` }} />

      {/* Slide Carousel Row */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 md:gap-4 pb-4 -mx-4 px-4 md:-mx-6 md:px-6 scroll-smooth"
      >
        {banners.map((banner, idx) => {
          const isCenter = idx === centerIndex;
          return (
            <Link
              key={idx}
              href={banner.link}
              className={`shrink-0 snap-center w-[88%] md:w-[75%] lg:w-[60%] max-w-[768px] aspect-video rounded-2xl overflow-hidden relative border transition-all duration-700 ease-out block group cursor-pointer ${
                isCenter
                  ? "scale-100 opacity-100 z-10 shadow-[0_16px_36px_rgba(0,34,97,0.12)] border-outline-variant/30"
                  : "scale-[0.93] sm:scale-[0.91] opacity-45 blur-[0.4px] z-0 border-transparent"
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={banner.src}
                  alt={banner.title}
                  fill
                  priority={idx === originalBanners.length}
                  className="object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  sizes="(max-w-768px) 88vw, (max-w-1024px) 75vw, 60vw"
                />
                
                {/* Subtle glassmorphic visual highlight on hover */}
                <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modern Pagination Dots with Running Progress Bar Indicators */}
      <div className="flex justify-center items-center gap-2 mt-2 md:mt-3">
        {originalBanners.map((_, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={i}
              onClick={() => scrollToSlide(i)}
              className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden transition-all duration-500 relative cursor-pointer"
              style={{ width: isActive ? "32px" : "8px" }}
              aria-label={`Go to slide ${i + 1}`}
            >
              {isActive && (
                <div className="absolute inset-y-0 left-0 bg-secondary rounded-full animate-progress-fill"></div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}



