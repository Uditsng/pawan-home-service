import Link from "next/link";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";
import { WaitlistButton } from "./WaitlistButton";

interface ComingSoonPageProps {
  service: UpcomingService;
  initialWaitlisted: boolean;
  waitlistCount: number;
  backHref: string;
  backLabel?: string;
}

/**
 * Shared "Coming Soon" detail page rendered for both the public route
 * (/services/upcoming/[serviceId]) and the customer portal service detail page
 * when the service is not yet bookable. Includes the waitlist CTA.
 */
export function ComingSoonPage({
  service,
  initialWaitlisted,
  waitlistCount,
  backHref,
  backLabel = "Back",
}: ComingSoonPageProps) {
  const iconName = service.subcategories?.icon_name || "home_repair_service";
  const categoryName =
    service.subcategories?.categories?.category_name ||
    service.subcategories?.subcategory_name ||
    "Services";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href={backHref}
        className="text-on-surface-variant hover:text-primary flex items-center gap-1 mb-6 font-bold text-sm"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span> {backLabel}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 lg:gap-12 items-start">
        {/* Poster */}
        <div className="mx-auto w-56 md:w-full">
          <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-outline-variant/20 shadow-xl shadow-primary/10 bg-surface-container-low">
            {service.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={service.poster_url}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary/15">image</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">
                  {iconName}
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-secondary bg-secondary/10 border border-secondary/20 px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Coming Soon
                </span>
                <p className="text-[10px] text-on-surface-variant/70 font-semibold uppercase tracking-wider mt-1">
                  {categoryName}
                </p>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary font-headline">
              {service.title}
            </h1>
            {service.description && (
              <p className="mt-4 text-sm text-on-surface-variant leading-relaxed max-w-2xl">
                {service.description}
              </p>
            )}
          </div>

          {/* Waitlist CTA */}
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  notifications
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary font-headline">Be first to book</h3>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  {waitlistCount > 0
                    ? `${waitlistCount} people already waiting`
                    : "No one's waiting yet — be the first!"}
                </p>
              </div>
            </div>
            <WaitlistButton serviceId={service.id} initialWaitlisted={initialWaitlisted} />
            <p className="text-[10px] text-on-surface-variant/70">
              You&apos;ll be notified when this service launches. No spam, ever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}