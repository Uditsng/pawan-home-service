import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { getCachedServicesBySubcategory } from "@/utils/supabase/cachedServiceQueries";
import { getCachedAllSubcategories } from "@/utils/supabase/cachedSubcategoryQueries";

export default async function PublicSubcategoryServiceListingPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const resolvedParams = await params;
  const { category: categorySlug, subcategory: subcategoryId } = resolvedParams;

  // Resolve subcategory details from the cache
  const allSubcategories = await getCachedAllSubcategories();
  const subcategory = allSubcategories.find((sub) => sub.id === subcategoryId);

  if (!subcategory) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-surface font-body text-on-surface antialiased p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">error</span>
            </div>
            <h1 className="text-primary font-black text-xl md:text-2xl tracking-tight mb-2">Subcategory Not Found</h1>
            <p className="text-on-surface-variant text-sm mb-6">
              We couldn&apos;t find the subcategory you are looking for. It might have been moved or deleted.
            </p>
            <Link
              href="/services"
              className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/95 transition-all text-sm shadow-sm"
            >
              Back to All Services
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Fetch active services belonging to this subcategory
  const displayServices = await getCachedServicesBySubcategory(subcategoryId);

  const servicesList = displayServices || [];
  const subcategoryTitle = subcategory.subcategory_name || "Services";

  return (
    <>
      <Header />
      <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
        {/* Header Bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-2">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <Link
              href={`/services/${categorySlug}`}
              className="text-on-surface hover:opacity-80 transition-all flex items-center"
            >
              <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
            </Link>
            <h1 className="text-primary font-black text-2xl md:text-3xl tracking-tight font-headline">
              {subcategoryTitle}
            </h1>
          </div>
          <p className="text-on-surface-variant text-xs md:text-sm pl-9">
            {servicesList.length} service{servicesList.length !== 1 ? "s" : ""} available
          </p>
        </div>

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-20">
          {/* Services Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {servicesList.map((service) => {
              const iconName = service.subcategories?.icon_name || "sparkles";

              return (
                <Link
                  key={service.id}
                  href="/login"
                  className="relative group bg-surface-container-low p-3 sm:p-4 md:p-5 rounded-xl flex flex-col items-center justify-start text-center border border-outline-variant/10 shadow-xs transition-all h-auto min-h-[140px] sm:min-h-[155px] md:min-h-[175px] w-full cursor-pointer hover:bg-surface-container-high"
                >
                  {/* Card Content */}
                  <div className="flex flex-col items-center w-full pt-1">
                    {/* Icon Container conforming to Premium CSS standard */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-xl bg-green-500/10 mb-2 sm:mb-2.5 md:mb-3 flex items-center justify-center shrink-0">
                      <ServiceIconComponent
                        iconName={iconName}
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 text-emerald-600 drop-shadow-sm"
                      />
                    </div>

                    {/* Title */}
                    <div className="min-h-10 flex items-center justify-center w-full px-1 mb-1.5">
                      <span className="font-headline font-bold text-[11px] sm:text-xs md:text-sm text-on-surface line-clamp-2 leading-tight w-full">
                        {service.title}
                      </span>
                    </div>

                    {/* Prices */}
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

                  {/* Add button mimic */}
                  <div className="absolute bottom-2 right-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center bg-surface-container-lowest border border-outline-variant/15 text-emerald-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                      <span className="material-symbols-outlined text-[20px] md:text-[22px] font-bold">
                        add
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {servicesList.length === 0 && (
              <div className="col-span-full py-16 md:py-20 text-center">
                <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                    category
                  </span>
                </div>
                <p className="font-bold text-base md:text-lg text-on-surface mb-2">No services available</p>
                <p className="text-on-surface-variant text-sm">
                  There are currently no active services in this subcategory.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
