"use client";

import { useEffect, useRef } from "react";
import Image from "next/image"
export default function DashboardCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const originalBanners = [
    { src: "/assets/hero_cleaning_1773410829223.png", title: "Premium Cleaning", subtitle: "Spotless homes, guaranteed." },
    { src: "/assets/indian_pest_control_pro_1776155620526.png", title: "Pest Control", subtitle: "Safe and effective treatments." },
    { src: "/assets/indian_gardening_pro_1776693713648.png", title: "Expert Landscaping", subtitle: "Beautiful gardens year-round." }
  ];

  const banners = [...originalBanners, ...originalBanners, ...originalBanners];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Auto scroll every 3 seconds
    const interval = setInterval(() => {
      // Find the width of one child
      const childWidth = el.firstElementChild?.clientWidth || 0;
      const gap = 16; // 1rem = 16px if gap-4 is used

      const scrollStep = childWidth + gap;

      let nextScroll = el.scrollLeft + scrollStep;

      // If we've scrolled past the middle copy, seamlessly jump back to the start copy
      // Middle of the duplicated list
      const maxScroll = scrollStep * originalBanners.length;

      if (el.scrollLeft >= maxScroll) {
        // Jump without animation
        el.scrollTo({ left: el.scrollLeft - maxScroll, behavior: 'instant' as ScrollBehavior });
        nextScroll = (el.scrollLeft - maxScroll) + scrollStep;
      }

      el.scrollTo({ left: nextScroll, behavior: "smooth" });
    }, 4000);

    return () => clearInterval(interval);
  },);

  return (
    <section className="mb-6 md:mb-8">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 md:gap-4 pb-2 -mx-4 px-4 md:-mx-6 md:px-6"
      >
        {banners.map((banner, idx) => (
          <div key={idx} className="shrink-0 snap-center w-[88%] md:w-[75%] lg:w-[60%] max-w-[768px] aspect-3/2 md:aspect-video rounded-xl md:rounded-2xl overflow-hidden shadow-sm relative">
            <Image
              src={banner.src}
              alt={banner.title}
              loading="lazy"
              className="w-full h-full object-cover"
              width={100}
              height={100}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 text-white">
              <h3 className="font-bold text-xl md:text-2xl lg:text-3xl leading-tight mb-1 md:mb-2 font-headline">{banner.title}</h3>
              <p className="text-white/90 text-xs md:text-sm lg:text-base font-medium">{banner.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
