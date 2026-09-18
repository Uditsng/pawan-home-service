import { getServiceThumbnailUrl } from "@/utils/serviceThumbnail";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface CategoryVisualCardProps {
  imageUrl?: string | null;
  iconName?: string;
  title: string;
  footerText: string;
  thumbnailSize?: number;
  dimmed?: boolean;
}

/**
 * Full-bleed category card with a frosted-glass bottom panel.
 * The image (when set) fills the entire card. The bottom strip layers a
 * heavily-blurred, darker duplicate of that image behind the title + count,
 * so the text stays readable on top of the crisp upper image. Falls back to a
 * navy/mint gradient + icon when no image is uploaded.
 */
export function CategoryVisualCard({
  imageUrl,
  iconName,
  title,
  footerText,
  thumbnailSize = 512,
  dimmed = false,
}: CategoryVisualCardProps) {
  const thumb = getServiceThumbnailUrl(imageUrl, thumbnailSize);

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-2xl border border-outline-variant/10 shadow-sm transition-all group ${
        dimmed ? "opacity-75" : ""
      }`}
    >
      {/* Full-bleed foreground image */}
      {thumb ? (
        <img
          src={thumb}
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/85 to-secondary/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
              <ServiceIconComponent
                iconName={iconName || "category"}
                className="w-12 h-12 md:w-14 md:h-14 text-white drop-shadow-md"
              />
            </div>
          </div>
        </>
      )}

      {/* Frosted-glass bottom panel */}
      <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-2">
        <div className="relative overflow-hidden rounded-xl">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-70"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-t from-primary to-secondary/40" />
          )}
          <div className="absolute inset-0 bg-primary/45 backdrop-blur-md" />
          <div className="relative px-2.5 py-2 text-center">
            <p className="font-headline font-bold text-xs sm:text-sm text-white leading-snug line-clamp-2">
              {title}
            </p>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/75 mt-0.5 uppercase tracking-wider">
              {footerText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}