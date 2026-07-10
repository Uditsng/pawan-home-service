import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AddToCartButton from "@/components/AddToCartButton";
import { ServiceIconComponent } from "@/utils/serviceIcon";
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

            return (
              <div
                key={service.id}
                className="relative group bg-surface-container-low p-3 sm:p-4 md:p-5 rounded-xl flex flex-col items-center justify-start text-center border border-outline-variant/10 shadow-xs transition-all h-auto min-h-[140px] sm:min-h-[155px] md:min-h-[175px] w-full"
              >
                {/* z-0 absolute Link covering the card */}
                <Link
                  href={`/customer/services/${categorySlug}/${service.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                />

                {/* z-10 pointer-events-none Card Content */}
                <div className="z-10 pointer-events-none flex flex-col items-center w-full pt-1">
                  {/* Icon: 48px phones → 56px sm → 64px md → 72px lg */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-xl bg-green-500/10 mb-2 sm:mb-2.5 md:mb-3 flex items-center justify-center shrink-0">
                    <ServiceIconComponent
                      iconName={iconName}
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 text-emerald-600 drop-shadow-sm"
                    />
                  </div>
                  {/* Title: reserved min-height so cards in a row stay aligned */}
                  <div className="min-h-10 flex items-center justify-center w-full px-1 mb-1.5">
                    <span className="font-headline font-bold text-[11px] sm:text-xs md:text-sm text-on-surface line-clamp-2 leading-tight w-full">
                      {service.title}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <span className="text-[13px] sm:text-[15px] md:text-[17px] text-primary font-black tracking-tight leading-none">
                      ₹{service.base_price}
                    </span>
                    {service.original_price && (
                      <span className="text-[10px] md:text-xs text-on-surface-variant/60 line-through font-medium">
                        ₹{service.original_price}
                      </span>
                    )}
                  </div>
                </div>

                {/* z-20 clickable Add to Cart button */}
                <div className="absolute bottom-2 right-2 z-20">
                  <AddToCartButton
                    item={{
                      serviceId: service.id,
                      title: service.title,
                      iconName: iconName,
                      basePrice: service.base_price,
                      subcategoryName: service.subcategories?.subcategory_name || "Service",
                      categorySlug: categorySlug,
                    }}
                    compact={true}
                  />
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
