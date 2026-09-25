"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface BannerItem {
  src: string;
  title: string;
  link: string;
}

interface DashboardCarouselProps {
  banners: BannerItem[];
}

function getSlideElements(container: HTMLDivElement): HTMLAnchorElement[] {
  return Array.from(container.children).filter(
    (child): child is HTMLAnchorElement => child instanceof HTMLAnchorElement
  );
}

function getScrollPositionForIndex(container: HTMLDivElement, index: number): number | null {
  const slide = getSlideElements(container)[index];
  if (!slide) return null;

  const containerRect = container.getBoundingClientRect();
  const slideRect = slide.getBoundingClientRect();
  const slideOffset = slideRect.left - containerRect.left + container.scrollLeft;
  const alignmentOffset = (container.clientWidth - slide.offsetWidth) / 2;

  return slideOffset - alignmentOffset;
}

function getCenteredSlideIndex(container: HTMLDivElement): number | null {
  const slides = getSlideElements(container);
  if (slides.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  const containerCenter = containerRect.left + container.clientWidth / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const slideRect = slide.getBoundingClientRect();
    const slideCenter = slideRect.left + slideRect.width / 2;
    const distance = Math.abs(slideCenter - containerCenter);

    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });

  return closestIndex;
}

function getLogicalIndex(physicalIndex: number, count: number): number {
  return ((physicalIndex % count) + count) % count;
}

function getClosestPhysicalIndex(logicalIndex: number, count: number, currentPhysicalIndex: number): number {
  let closestIndex = logicalIndex;
  let closestDistance = Math.abs(logicalIndex - currentPhysicalIndex);

  [count + logicalIndex, count * 2 + logicalIndex].forEach((candidate) => {
    const distance = Math.abs(candidate - currentPhysicalIndex);
    if (distance < closestDistance) {
      closestIndex = candidate;
      closestDistance = distance;
    }
  });

  return closestIndex;
}

function scrollToPhysicalIndex(
  container: HTMLDivElement,
  index: number,
  behavior: ScrollBehavior
): boolean {
  const left = getScrollPositionForIndex(container, index);
  if (left === null) return false;

  container.scrollTo({ left, behavior });
  return true;
}

export default function DashboardCarousel({ banners }: DashboardCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIndex, setCenterIndex] = useState(banners.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 0) return;

    let resizeFrameId: number | undefined;
    const positionAtCurrentSlide = () => {
      const currentIndex = getCenteredSlideIndex(el) ?? count;
      scrollToPhysicalIndex(el, currentIndex, "instant" as ScrollBehavior);
      setCenterIndex(currentIndex);
      setActiveIndex(getLogicalIndex(currentIndex, count));
    };

    const initialFrameId = window.requestAnimationFrame(() => {
      scrollToPhysicalIndex(el, count, "instant" as ScrollBehavior);
      setCenterIndex(count);
      setActiveIndex(0);
    });

    const handleResize = () => {
      if (resizeFrameId !== undefined) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = window.requestAnimationFrame(positionAtCurrentSlide);
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);

    return () => {
      window.cancelAnimationFrame(initialFrameId);
      if (resizeFrameId !== undefined) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      observer?.disconnect();
    };
  }, [count]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || count <= 0) return;

    const currentIndex = getCenteredSlideIndex(el);
    if (currentIndex === null) return;

    setCenterIndex(currentIndex);
    setActiveIndex(getLogicalIndex(currentIndex, count));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 0) return;

    const interval = window.setInterval(() => {
      const currentIndex = getCenteredSlideIndex(el) ?? centerIndex;
      const nextLogicalIndex = (getLogicalIndex(currentIndex, count) + 1) % count;
      const targetIndex = getClosestPhysicalIndex(nextLogicalIndex, count, currentIndex);
      scrollToPhysicalIndex(el, targetIndex, "smooth");
    }, 5000);

    return () => window.clearInterval(interval);
  }, [centerIndex, count]);

  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el || count <= 0) return;

    const currentIndex = getCenteredSlideIndex(el) ?? centerIndex;
    const targetIndex = getClosestPhysicalIndex(index, count, currentIndex);
    scrollToPhysicalIndex(el, targetIndex, "smooth");
  };

  if (count === 0) return null;

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
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 md:gap-4 pb-0.5 -mx-4 px-4 md:-mx-6 md:px-6 scroll-smooth"
      >
        {[...banners, ...banners, ...banners].map((banner, idx) => {
          const isCenter = idx === centerIndex;
          return (
            <Link
              key={idx}
              href={banner.link}
              className={`shrink-0 snap-center w-[88%] md:w-[75%] lg:w-[calc((100%-2rem)/3)] max-w-3xl aspect-video rounded-2xl overflow-hidden relative border transition-all duration-700 ease-out block group cursor-pointer ${
                isCenter
                  ? "scale-100 opacity-100 z-10 shadow-[0_16px_36px_rgba(0,34,97,0.12)] border-outline-variant/30"
                  : "scale-[0.93] sm:scale-[0.91] opacity-45 blur-[0.4px] z-0 border-transparent"
              }`}
            >
              <div className="relative w-full h-full">
                {banner.src.startsWith("http") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={banner.src}
                    alt={banner.title}
                    className="object-cover absolute inset-0 w-full h-full transform group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                ) : (
                  <Image
                    src={banner.src}
                    alt={banner.title}
                    fill
                    priority={idx === count}
                    className="object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    sizes="(max-width: 767px) 88vw, (max-width: 1023px) 75vw, 32vw"
                  />
                )}

                {/* Subtle glassmorphic visual highlight on hover */}
                <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modern Pagination Dots with Running Progress Bar Indicators */}
      <div className="flex justify-center items-center gap-2 mt-2 md:mt-3">
        {banners.map((_, i) => {
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