import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AddToCartButton from "@/components/AddToCartButton";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import { getCachedServicesBySubcategory } from "@/utils/supabase/cachedServiceQueries";
import { getCachedAllSubcategories } from "@/utils/supabase/cachedSubcategoryQueries";

export default async function SubcategoryServiceListingPage({
  params,
}: {
  params: Promise<{ category: string; subcategoryId: string }>;
}) {
  const resolvedParams = await params;
  const { category: categorySlug, subcategoryId } = resolvedParams;

  // Resolve subcategory details from the cache
  const allSubcategories = await getCachedAllSubcategories();
  const subcategory = allSubcategories.find((sub) => sub.id === subcategoryId);

  // Fetch services belonging to this subcategory
  const displayServices = await getCachedServicesBySubcategory(subcategoryId);

  const subcategoryTitle = subcategory?.subcategory_name || "Services";

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Subcategory Title Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-2">
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          {/* Back button points back to Subcategories list page */}
          <Link href={`/customer/services/${categorySlug}`} className="text-on-surface hover:opacity-80 transition-all">
            <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-primary font-black text-lg md:text-xl tracking-tight font-headline">
            {subcategoryTitle}
          </h1>
        </div>
        <p className="text-on-surface-variant text-xs md:text-sm pl-9">
          {(displayServices || []).length} service{(displayServices || []).length !== 1 ? "s" : ""} available
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-40">
        {/* Services Grid (keeping same layout style as original dashboard) */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {(displayServices || []).map((service) => {
            const iconName = service.subcategories?.icon_name || "sparkles";
            const isUpcoming = service.status === "upcoming" || service.base_price === 0 || !service.base_price;

            // Hourly services default to their configured minimum duration so the
            // cart prices the correct number of blocks instead of assuming 60 min.
            const pricingConfig =
              (service.pricing_config as { min_hours?: number } | undefined) || {};
            const selectedDuration =
              service.pricing_model === "hourly"
                ? Math.round(Number(pricingConfig.min_hours ?? 0.5) * 60)
                : null;

            return (
              <div
                key={service.id}
                className="glass-panel group relative w-full overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* z-0 absolute Link covering the card */}
                <Link
                  href={`/customer/services/${categorySlug}/${service.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                  aria-label={service.title}
                />

                {/* z-10 pointer-events-none Card Content */}
                <div className="z-10 pointer-events-none relative flex flex-col w-full">
                  {/* Rectangular banner thumbnail */}
                  <div className="relative w-full aspect-4/3 bg-surface-container-low">
                    <ServiceCardThumbnail
                      imageUrl={service.image_url || service.poster_url}
                      iconName={iconName}
                      alt={service.title}
                      status={isUpcoming ? "upcoming" : service.status}
                      containerClassName="absolute inset-0 w-full h-full"
                      iconClassName="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-emerald-600 drop-shadow-sm"
                    />
                    {service.warranty && (
                      <div className="absolute top-1.5 left-1.5 z-10 bg-surface/90 backdrop-blur-xs text-primary border border-outline-variant/30 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 max-w-[90%] truncate">
                        <span className="material-symbols-outlined text-secondary text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified_user
                        </span>
                        <span className="truncate">{service.warranty}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3 text-center">
                    <span className=" font-headline font-bold text-[11px] sm:text-xs md:text-sm text-on-surface line-clamp-2 leading-tight min-h-9 flex items-center justify-center">
                      {service.title}
                    </span>
                    <div className="flex flex-col items-center gap-0.5 shrink-0 mt-1">
                      {isUpcoming ? (
                        <span className="text-[10px] sm:text-[11px] text-secondary font-black tracking-tight leading-none uppercase bg-primary/95 px-2 py-0.5 rounded-md shadow-xs">
                          Coming Soon
                        </span>
                      ) : (
                        <>
                          <span className="text-[13px] sm:text-[15px] md:text-[17px] text-primary font-black tracking-tight leading-none">
                            ₹{service.base_price}
                          </span>
                          {service.original_price && (
                            <span className="text-[10px] md:text-xs text-on-surface-variant/60 line-through font-medium">
                              ₹{service.original_price}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* z-20 clickable Add to Cart / Notify Me button */}
                <div className="absolute bottom-1.5 right-1.5 z-20">
                  {isUpcoming ? (
                    <Link
                      href={`/customer/services/${categorySlug}/${service.id}`}
                      className="w-7 h-7 sm:w-8 sm:h-8 bg-secondary text-primary rounded-lg flex items-center justify-center shadow-xs hover:bg-secondary/90 transition-colors"
                      title="Notify Me / Join Waitlist"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">notifications_active</span>
                    </Link>
                  ) : (
                    <AddToCartButton
                      item={{
                        serviceId: service.id,
                        title: service.title,
                        iconName: iconName,
                        imageUrl: service.image_url,
                        subcategoryName: service.subcategories?.subcategory_name || "Service",
                        categorySlug: categorySlug,
                        gstApplicable: service.gst_applicable ?? false,
                        variantId: null,
                        selectedDuration,
                        areaSqft: null,
                        quantity: null,
                        distanceKm: null,
                        addons: null,
                        selectedPackages: null,
                      }}
                      compact={true}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {(displayServices || []).length === 0 && (
            <div className="col-span-3 md:col-span-4 lg:col-span-5 text-center py-8 text-on-surface-variant text-sm">
              No active services available in this subcategory right now.
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
