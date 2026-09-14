"use client";

import { useEffect, useState } from "react";

interface ServiceImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export function ServiceImageCarousel({ images, alt, className }: ServiceImageCarouselProps) {
  const safeImages = (images || []).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeImages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [safeImages.length]);

  if (safeImages.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {safeImages.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={index === 0 ? alt : `${alt} — view ${index + 1}`}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
        />
      ))}
    </div>
  );
}