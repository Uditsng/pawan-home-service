import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import CustomerHeader from "@/components/CustomerHeader";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  description: string;
  base_price: number;
  is_active: boolean;
  subcategory_id: string;
  category?: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function CategoryServiceListingPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams.category;

  const supabase = await createClient();

  // Fetch services with full relational data (subcategory → category), matching by category_name
  const { data: allServices } = await supabase
    .from("services")
    .select(`
      *,
      subcategories (
        subcategory_name,
        icon_name,
        categories (
          category_name
        )
      )
    `)
    .eq("is_active", true) as { data: ServiceWithSubcategory[] | null };

  // Filter services whose parent category matches the slug (case-insensitive, dash/underscore/comma/space normalized, & converted to and)
  const normalizeSlug = (str: string) => str.toLowerCase().replace(/&/g, "and").replace(/[-_,\s]+/g, " ").trim();
  const targetSlug = normalizeSlug(categorySlug);

  const displayServices = (allServices || []).filter((service) => {
    const catName = service.subcategories?.categories?.category_name || service.category || "";
    return normalizeSlug(catName) === targetSlug;
  });

  // Derive the display title from the first matching service's category, or format the slug
  const categoryTitle = displayServices.length > 0
    ? displayServices[0].subcategories?.categories?.category_name || categorySlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    : categorySlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <CustomerHeader />

      {/* Category Title Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-2">
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          <Link href="/dashboard" className="text-on-surface hover:opacity-80 transition-all">
            <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-primary font-black text-lg md:text-xl tracking-tight font-headline">{categoryTitle}</h1>
        </div>
        <p className="text-on-surface-variant text-xs md:text-sm pl-9">
          {displayServices.length} service{displayServices.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-40">
        {/* Dynamic Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {displayServices.map((service) => {
            const iconName = service.subcategories?.icon_name || "home_repair_service";
            const subcatName = service.subcategories?.subcategory_name || "Service";

            return (
              <article key={service.id} className="group bg-surface-container-lowest rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row border border-outline-variant/10">
                {/* Icon Section */}
                <div className="w-full md:w-48 h-32 md:h-auto overflow-hidden bg-surface-container-low flex items-center justify-center p-4 relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500/10 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl md:text-4xl text-[#059669] drop-shadow-sm">{iconName}</span>
                  </div>
                </div>
                {/* Content Section */}
                <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-lg md:text-xl font-bold font-headline text-on-surface tracking-tight">{service.title}</h2>
                      <span className="text-secondary font-bold text-lg md:text-xl shrink-0 ml-2">₹{service.base_price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs md:text-sm mb-3 md:mb-4">
                      <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant/60">{iconName}</span>
                      {subcatName}
                    </div>
                    <div className="space-y-2 mb-4 md:mb-6">
                      <p className="text-xs md:text-[13px] font-medium text-on-surface-variant/80 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3">
                    <Link href={`/services/${categorySlug}/${service.id}`} className="flex-1 text-center py-2.5 md:py-3 text-xs md:text-sm font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                      View Details
                    </Link>
                    <Link href={`/checkout/schedule?serviceId=${service.id}`} className="flex-1 py-2.5 md:py-3 text-xs md:text-sm font-semibold text-on-primary bg-primary-gradient rounded-lg shadow-lg shadow-primary/10 hover:opacity-90 transition-all text-center">
                      Book Now
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          {displayServices.length === 0 && (
            <div className="col-span-full py-16 md:py-20 text-center">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">search_off</span>
              </div>
              <p className="font-bold text-base md:text-lg text-on-surface mb-2">No services found</p>
              <p className="text-on-surface-variant text-sm mb-6">We couldn&apos;t find services in this category yet.</p>
              <Link href="/services" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-base">explore</span>
                Browse All Services
              </Link>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
