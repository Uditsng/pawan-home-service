"use client";

import Image from "next/image";
import { getServiceThumbnailUrl } from "@/utils/serviceThumbnail";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface ServiceVisualProps {
  imageUrl?: string | null;
  iconName?: string;
  alt?: string;
  containerClassName?: string;
  iconClassName?: string;
  thumbnailSize?: number;
}

/**
 * Shared visual tile for categories & subcategories.
 * Shows the admin-uploaded WebP image when present; otherwise falls back to
 * the subcategory SVG icon, then to a generic placeholder shape.
 */
export function ServiceVisual({
  imageUrl,
  iconName,
  alt = "Category",
  containerClassName = "",
  iconClassName = "",
  thumbnailSize = 256,
}: ServiceVisualProps) {
  const thumb = getServiceThumbnailUrl(imageUrl, thumbnailSize);

  if (thumb) {
    return (
      <div className={`relative overflow-hidden ${containerClassName}`}>
        <Image
          src={thumb}
          alt={alt}
          fill
          sizes={`(max-width: 768px) 100vw, ${thumbnailSize}px`}
          draggable={false}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${containerClassName}`}>
      {iconName ? (
        <ServiceIconComponent
          iconName={iconName}
          className={`drop-shadow-sm ${iconClassName || ""}`}
        />
      ) : (
        <svg
          className={iconClassName || "w-12 h-12"}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="8" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
          <path d="M12 8V16M8 12H16" stroke="#a6ce37" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}