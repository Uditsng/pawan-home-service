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
  backLabel = "Back to Services",
}: ComingSoonPageProps) {
  const iconName = service.subcategories?.icon_name || "home_repair_service";
  const categoryName =
    service.subcategories?.categories?.category_name ||
    service.subcategories?.subcategory_name ||
    "Services";

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-140px)] flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 bg-red-200">
      {/* Subtle ambient lighting glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-125 h-96 sm:h-125 bg-secondary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <div className="mb-4 sm:mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-on-surface-variant hover:text-primary transition-colors py-1 group"
          >
            <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            <span>{backLabel}</span>
          </Link>
        </div>

        {/* Main Card Container */}
        <div className="relative bg-surface-container-lowest/70 backdrop-blur-md rounded-3xl border border-outline-variant/30 p-5 sm:p-8 lg:p-10 shadow-ambient">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[290px_1fr] gap-6 sm:gap-8 lg:gap-10 items-center">
            {/* Poster Column */}
            <div className="mx-auto w-full max-w-60 sm:max-w-65 md:max-w-none">
              <div className="relative group">
                {/* Ambient back-glow behind the poster */}
                <div className="absolute -inset-2.5 bg-linear-to-tr from-primary/15 via-secondary/20 to-primary/10 rounded-4xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none -z-10" />

                <div className="relative aspect-9/16 rounded-2xl sm:rounded-3xl overflow-hidden border border-outline-variant/40 shadow-xl shadow-primary/10 bg-surface-container-low">
                  {service.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.poster_url}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-linear-to-b from-surface-container-low to-surface-container">
                      <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-2xl text-[#059669]">
                          {iconName}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-primary">Preview Poster</p>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1">Coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Column */}
            <div className="space-y-4 sm:space-y-5">
              {/* Header Badges & Category */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Intentional Launch Status Badge with Pulse */}
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-primary text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                    </span>
                    <span>Coming Soon</span>
                  </span>

                  {/* Category Pill */}
                  {/* <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[13px] text-[#059669]">
                      {iconName}
                    </span>
                    <span className="truncate max-w-45">{categoryName}</span>
                  </div> */}
                </div>

                {/* Service Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-primary font-headline leading-tight pt-1">
                  {service.title}
                </h1>
              </div>

              {/* Description */}
              {service.description && (
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-normal max-w-xl">
                  {service.description}
                </p>
              )}

              {/* Emotional Launch Highlight */}
              <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-surface-container/60 border border-outline-variant/20 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary">
                    Something new for {categoryName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/80 font-medium truncate">
                    Be among the first to know when bookings open.
                  </p>
                </div>
              </div>

              {/* Notification CTA Card */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/25 shadow-xs p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-lg sm:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      notifications_active
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-primary font-headline">
                      Be the first to know
                    </h3>
                    <p className="text-[11px] text-on-surface-variant font-medium truncate">
                      {waitlistCount > 0
                        ? `${waitlistCount} ${waitlistCount === 1 ? "person is" : "people are"} already waiting for launch`
                        : "Get notified the moment this service becomes available."}
                    </p>
                  </div>
                </div>

                <div className="pt-0.5">
                  <WaitlistButton serviceId={service.id} initialWaitlisted={initialWaitlisted} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}