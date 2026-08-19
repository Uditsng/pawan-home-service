import Link from "next/link";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";

interface ComingSoonStripProps {
  services: UpcomingService[];
  hrefFor: (service: UpcomingService) => string;
}

/**
 * Horizontal "Coming Soon" banner strip rendered on the public landing page and
 * the customer dashboard. Cards link through to the dedicated Coming Soon page
 * (via the provided hrefFor builder, which differs per portal).
 */
export function ComingSoonStrip({ services, hrefFor }: ComingSoonStripProps) {
  if (!services || services.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-secondary text-lg">schedule</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Coming Soon</span>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-primary font-headline tracking-tight">Launching Soon at PHS</h2>
      <p className="text-xs text-on-surface-variant font-medium mt-0.5 mb-4">
        Be the first to know when these services go live.
      </p>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {services.map((service) => (
          <Link
            key={service.id}
            href={hrefFor(service)}
            className="group shrink-0 w-40 sm:w-44 flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
          >
            <div className="relative aspect-[9/16] w-full bg-surface-container-low overflow-hidden">
              {service.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.poster_url}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-linear-to-br from-primary/10 via-surface-container-low to-secondary/10">
                  <span className="material-symbols-outlined text-4xl text-primary/30 group-hover:scale-110 transition-transform duration-300">
                    schedule
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                    Poster coming soon
                  </span>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-xs">
                Coming Soon
              </div>
            </div>
            <div className="p-3 space-y-1 grow flex flex-col">
              <h3 className="text-xs font-bold text-primary leading-tight line-clamp-2">{service.title}</h3>
              {service.description && (
                <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2">{service.description}</p>
              )}
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary bg-secondary/10 border border-secondary/25 rounded-full px-3 py-1.5 mt-auto w-max group-hover:bg-secondary group-hover:text-primary transition-colors duration-300">
                Notify Me
                <span className="material-symbols-outlined text-[12px]">notifications_active</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}