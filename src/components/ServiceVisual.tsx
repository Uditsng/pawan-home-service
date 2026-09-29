"use client";

import { getServiceThumbnailUrl } from "@/utils/serviceThumbnail";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { useImageFallback } from "@/hooks/useImageFallback";

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
 * Shows the admin-uploaded image when present; otherwise falls back to
 * the subcategory SVG icon, then to a generic placeholder shape.
 *
 * Uses a plain <img> rather than next/image because Next's optimizer refuses to
 * proxy Supabase storage URLs (their DNS resolves to a private range, which
 * trips Next's SSRF protection). An unavailable Supabase transformation
 * (HTTP 403 with no quota) retries the original object URL first.
 */
export function ServiceVisual({
  imageUrl,
  iconName,
  alt = "Category",
  containerClassName = "",
  iconClassName = "",
  thumbnailSize = 256,
}: ServiceVisualProps) {
  const { stage, onError } = useImageFallback(imageUrl);
  const showImage = stage !== "none" && !!imageUrl;
  const src = stage === "transformed" ? getServiceThumbnailUrl(imageUrl, thumbnailSize) : imageUrl ?? null;

  if (showImage) {
    return (
      <div className={`relative overflow-hidden ${containerClassName}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src as string}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={onError}
          className="absolute inset-0 w-full h-full object-cover"
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