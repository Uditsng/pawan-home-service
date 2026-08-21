"use client";

import { useState } from "react";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { getServiceThumbnailUrl } from "@/utils/serviceThumbnail";

interface ServiceCardThumbnailProps {
  imageUrl?: string | null;
  iconName: string;
  containerClassName: string;
  iconClassName: string;
  alt?: string;
  status?: string;
}

/**
 * Replaces the repetitive service icon on listing cards with a thumbnail of
 * the service's actual image. Falls back to the dynamic subcategory icon when
 * no image exists or the image fails to load, so a broken image is never shown
 * and the container is never left empty.
 *
 * Uses a plain <img> (not next/image) because Next's optimizer refuses to
 * proxy Supabase storage URLs (their DNS resolves to a private IPv6 range,
 * which trips Next's SSRF protection). The browser fetches the public storage
 * URL directly, keeping payload tiny via Supabase image transformations.
 */
export default function ServiceCardThumbnail({
  imageUrl,
  iconName,
  containerClassName,
  iconClassName,
  alt = "",
  // status,
}: ServiceCardThumbnailProps) {
  const [source, setSource] = useState<"transformed" | "original" | "icon">(() =>
    imageUrl ? "transformed" : "icon"
  );

  // const isUpcoming = status === "upcoming";

  if (source === "icon" || !imageUrl) {
    return (
      <div
        className={`bg-green-500/10 flex items-center justify-center shrink-0 relative ${containerClassName}`}
      >
        <ServiceIconComponent iconName={iconName} className={iconClassName} />
        {/* {isUpcoming && (
          <div className="absolute top-1.5 right-1.5 z-10 bg-primary/90 text-secondary border border-secondary/30 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span>Coming Soon</span>
          </div>
        )} */}
      </div>
    );
  }

  const src =
    source === "transformed" ? getServiceThumbnailUrl(imageUrl) : imageUrl;

  return (
    <div
      className={`relative overflow-hidden bg-surface-container-low shrink-0 ${containerClassName}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src as string}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
        onError={() =>
          setSource((prev) => (prev === "transformed" ? "original" : "icon"))
        }
      />
      {/* {isUpcoming && (
        <div className="absolute top-1.5 right-1.5 z-10 bg-primary/90 text-secondary border border-secondary/30 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span>Coming Soon</span>
        </div>
      )} */}
    </div>
  );
}