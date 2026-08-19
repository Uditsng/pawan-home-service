import Link from "next/link";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";

interface ComingSoonStripProps {
  services: UpcomingService[];
  hrefFor: (service: UpcomingService) => string;
}

/**
 * Compact horizontal "Coming Soon" strip rendered on the public landing page and
 * the customer dashboard. Cards show icon, title, tagline and a Notify Me pill —
 * no poster image. Clicking a card takes the user to the dedicated Coming Soon
 * detail page where the 9:16 poster is displayed.
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

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {services.map((service) => {
          const iconName = service.subcategories?.icon_name || "home_repair_service";
          return (
            <Link
              key={service.id}
              href={hrefFor(service)}
              className="group shrink-0 w-64 sm:w-72 flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm p-4 hover:-translate-y-1 hover:shadow-lg hover:border-secondary/30 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">
                    {iconName}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-secondary bg-secondary/10 border border-secondary/25 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    Coming Soon
                  </span>
                  <h3 className="text-sm font-bold text-primary leading-tight line-clamp-2 mt-1.5">
                    {service.title}
                  </h3>
                </div>
              </div>

              {service.description && (
                <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2 mt-2">
                  {service.description}
                </p>
              )}

              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-primary bg-secondary/10 border border-secondary/25 rounded-full px-3 py-1.5 mt-3 w-max group-hover:bg-secondary transition-colors duration-300">
                Notify Me
                <span className="material-symbols-outlined text-[12px]">notifications_active</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}