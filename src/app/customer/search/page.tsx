import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import SearchInput from "@/components/SearchInput";
import Link from "next/link";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface CategoryResult {
  id: string;
  category_name: string;
}

interface SubcategoryResult {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    category_name: string;
  } | null;
}

interface ServiceResult {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  category?: string;
  subcategory_id: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

const getCategoryIconName = (categoryName: string) => {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("clean")) return "cleaning_services";
  if (normalized.includes("pest")) return "bug_report";
  if (normalized.includes("repair") || normalized.includes("maintenance")) return "build";
  if (normalized.includes("renov") || normalized.includes("logistics")) return "local_shipping";
  if (normalized.includes("personal") || normalized.includes("assist")) return "diversity_3";
  if (normalized.includes("groom") || normalized.includes("wellness")) return "content_cut";
  return "category";
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { q } = await searchParams;

  let categoriesResults: CategoryResult[] = [];
  let subcategoriesResults: SubcategoryResult[] = [];
  let servicesResults: ServiceResult[] = [];

  if (q) {
    const searchQuery = q.trim();

    // Perform queries in parallel for better performance
    const [servicesRes, subcategoriesRes, categoriesRes] = await Promise.all([
      // Search Services
      supabase
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
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .eq("is_active", true)
        .limit(15),

      // Search Subcategories
      supabase
        .from("subcategories")
        .select(`
          id,
          subcategory_name,
          icon_name,
          categories (
            category_name
          )
        `)
        .ilike("subcategory_name", `%${searchQuery}%`)
        .limit(10),

      // Search Categories
      supabase
        .from("categories")
        .select("id, category_name")
        .ilike("category_name", `%${searchQuery}%`)
        .limit(5),
    ]);

    if (servicesRes.data) {
      servicesResults = servicesRes.data as unknown as ServiceResult[];
    }
    if (subcategoriesRes.data) {
      subcategoriesResults = subcategoriesRes.data as unknown as SubcategoryResult[];
    }
    if (categoriesRes.data) {
      categoriesResults = categoriesRes.data as CategoryResult[];
    }
  }

  const hasResults =
    categoriesResults.length > 0 ||
    subcategoriesResults.length > 0 ||
    servicesResults.length > 0;

  const getSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <SearchInput defaultValue={q || ""} />

        {q ? (
          <div className="mt-6 md:mt-8 space-y-8">
            <h2 className="font-bold text-base md:text-lg text-on-surface">
              Results for &quot;{q}&quot;
            </h2>

            {hasResults ? (
              <div className="space-y-6">
                {/* 1. Categories Section */}
                {categoriesResults.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-3 pl-1">
                      Categories
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoriesResults.map((cat) => {
                        const catSlug = getSlug(cat.category_name);
                        const iconName = getCategoryIconName(cat.category_name);

                        return (
                          <Link
                            key={cat.id}
                            href={`/customer/services/${catSlug}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <ServiceIconComponent
                                  iconName={iconName}
                                  className="w-5 h-5 text-[#059669] drop-shadow-sm"
                                />
                              </div>
                              <div>
                                <span className="font-bold text-on-surface text-sm md:text-base">
                                  {cat.category_name}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/40">
                              chevron_right
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 2. Subcategories Section */}
                {subcategoriesResults.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-3 pl-1">
                      Subcategories
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subcategoriesResults.map((sub) => {
                        const parentCatName = sub.categories?.category_name || "Services";
                        const catSlug = getSlug(parentCatName);
                        const iconName = sub.icon_name || "sparkles";

                        return (
                          <Link
                            key={sub.id}
                            href={`/customer/services/${catSlug}/sub/${sub.id}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <ServiceIconComponent
                                  iconName={iconName}
                                  className="w-5 h-5 text-[#059669] drop-shadow-sm"
                                />
                              </div>
                              <div>
                                <span className="font-bold text-on-surface text-sm md:text-base block">
                                  {sub.subcategory_name}
                                </span>
                                <span className="text-[10px] md:text-xs text-on-surface-variant font-medium">
                                  in {parentCatName}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/40">
                              chevron_right
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 3. Services Section */}
                {servicesResults.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-3 pl-1">
                      Services
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {servicesResults.map((service) => {
                        const iconName = service.subcategories?.icon_name || "sparkles";
                        const catSlug = getSlug(
                          service.subcategories?.categories?.category_name ||
                            service.category ||
                            "services"
                        );

                        return (
                          <Link
                            href={`/customer/services/${catSlug}/${service.id}`}
                            key={service.id}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center gap-3 md:gap-4 hover:border-primary/20 transition-colors"
                          >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                              <ServiceIconComponent
                                iconName={iconName}
                                className="w-5 h-5 md:w-6 md:h-6 text-[#059669] drop-shadow-sm"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-on-surface leading-tight text-sm md:text-base truncate">
                                {service.title}
                              </h3>
                              <p className="text-[10px] md:text-[11px] text-on-surface-variant mt-0.5 md:mt-1 line-clamp-1">
                                {service.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end whitespace-nowrap">
                              {service.original_price && (
                                <span className="text-[10px] md:text-xs text-on-surface-variant/50 line-through">
                                  ₹{service.original_price}
                                </span>
                              )}
                              <span className="font-bold text-primary text-sm md:text-base">
                                ₹{service.base_price}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-12 md:py-16">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-on-surface-variant/40 mb-4">
                  search_off
                </span>
                <h3 className="font-bold text-base md:text-lg text-on-surface">No results found</h3>
                <p className="text-on-surface-variant mt-2 text-sm md:text-base">
                  Try searching for something like &quot;fan&quot;, &quot;cleaning&quot; or &quot;ac repair&quot;
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 md:mt-8">
            <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-on-surface-variant">Popular Searches</h2>
            <div className="flex flex-wrap gap-2">
              {["Deep Cleaning", "AC Service", "Electrician", "Plumber", "Fan"].map((term) => (
                <Link
                  key={term}
                  href={`/customer/search?q=${term}`}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-surface-container-low rounded-full text-xs md:text-sm font-medium text-on-surface-variant border border-outline-variant/10 hover:border-primary/50 transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
