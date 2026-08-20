import Link from "next/link";
import Image from "next/image";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";
import { ComingSoonScroller } from "./ComingSoonScroller";

interface ComingSoonStripProps {
  services: UpcomingService[];
  hrefFor: (service: UpcomingService) => string;
}

export function ComingSoonStrip({ services, hrefFor }: ComingSoonStripProps) {
  if (!services || services.length === 0) return null;

  return (
    <section aria-label="Upcoming Services" className="w-full">
      <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 bg-linear-to-r from-secondary-container/40 via-surface-container-lowest to-info-container/30 border border-outline-variant/25 shadow-xs overflow-hidden">
        {/* Subtle Ambient Light Accents */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-40 h-40 bg-info/5 rounded-full blur-2xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 mb-3 sm:mb-4 pr-16 sm:pr-20">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary font-headline">
              UPCOMING SERVICES
            </h2>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          </div>
          <p className="text-[11px] sm:text-xs text-on-surface-variant font-medium mt-0.5">
            Something exciting is on the way
          </p>
        </div>

        {/* Horizontal Swipable Rail */}
        <ComingSoonScroller totalItems={services.length}>
          {services.map((service) => {
            const iconName = service.subcategories?.icon_name || "home_repair_service";
            const categoryName =
              service.subcategories?.categories?.category_name ||
              service.subcategories?.subcategory_name ||
              "New Offering";

            return (
              <Link
                key={service.id}
                href={hrefFor(service)}
                className="group/card shrink-0 snap-start w-[82vw] max-w-70 sm:w-72 md:w-76 flex flex-col justify-between bg-surface-container-lowest rounded-xl sm:rounded-2xl border border-outline-variant/30 shadow-2xs p-3 sm:p-3.5 hover:-translate-y-1 hover:shadow-xs hover:border-secondary/60 transition-all duration-200 relative overflow-hidden"
              >
                <div>
                  {/* Poster Thumbnail or Clean Icon Header */}
                  {service.poster_url ? (
                    <div className="relative w-full aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-surface-container-low mb-2.5 border border-outline-variant/15">
                      <Image
                        src={service.poster_url}
                        alt={service.title}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 280px, 320px"
                        className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-outline-variant/15">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover/card:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-2xs">
                          {iconName}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant truncate">
                        {categoryName}
                      </span>
                    </div>
                  )}

                  {/* Service Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-primary font-headline leading-tight line-clamp-1">
                    {service.title}
                  </h3>

                  {/* Service Description */}
                  {service.description && (
                    <p className="text-[11px] text-on-surface-variant font-normal leading-relaxed line-clamp-1 mt-0.5">
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Card Action CTA */}
                <div className="mt-2.5 pt-2 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-primary group-hover/card:text-secondary-fixed-variant transition-colors">
                    <span className="material-symbols-outlined text-sm text-secondary group-hover/card:rotate-12 transition-transform">
                      notifications_active
                    </span>
                    Notify Me
                  </span>

                  <span className="w-5.5 h-5.5 rounded-full bg-surface-container-low group-hover/card:bg-secondary text-primary flex items-center justify-center transition-all duration-200 group-hover/card:translate-x-0.5">
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </ComingSoonScroller>
      </div>
    </section>
  );
}