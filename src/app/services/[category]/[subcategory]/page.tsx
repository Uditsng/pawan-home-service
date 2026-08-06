import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
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
                  className="glass-panel group relative block w-full overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  {/* Rectangular banner thumbnail */}
                  <div className="relative w-full aspect-[4/3] bg-surface-container-low">
                    <ServiceCardThumbnail
                      imageUrl={service.image_url}
                      iconName={iconName}
                      alt={service.title}
                      containerClassName="absolute inset-0 w-full h-full"
                      iconClassName="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-emerald-600 drop-shadow-sm"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-2.5 sm:p-3 text-center">
                    <span className="block font-headline font-bold text-[11px] sm:text-xs md:text-sm text-on-surface line-clamp-2 leading-tight min-h-9 flex items-center justify-center">
                      {service.title}
                    </span>
                    <div className="flex flex-col items-center gap-0.5 shrink-0 mt-1">
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
                  <div className="absolute bottom-1 right-1">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center border border-outline-variant/15 text-emerald-600 shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                      <span className="material-symbols-outlined text-[16px] md:text-[18px] font-bold">
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
