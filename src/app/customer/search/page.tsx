import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import SearchInput from "@/components/SearchInput";
import Link from "next/link";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { parseSearchTokens, calculateRelevanceScore } from "@/utils/searchEngine";

interface CategoryResult {
  id: string;
  category_name: string;
  score?: number;
}

interface SubcategoryResult {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    category_name: string;
  } | null;
  score?: number;
}

interface ServiceResult {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  category?: string;
  image_url?: string | null;
  poster_url?: string | null;
  subcategory_id: string;
  status?: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    } | null;
  } | null;
}

const getCategoryIconName = (categoryName: string) => {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("clean")) return "cleaning_services";
  if (normalized.includes("pest")) return "bug_report";
  if (normalized.includes("repair") || normalized.includes("maintenance")) return "construction";
  if (normalized.includes("renov") || normalized.includes("logistics")) return "truck-inbound-svgrepo-com";
  if (normalized.includes("personal") || normalized.includes("assist")) return "save_water";
  if (normalized.includes("groom") || normalized.includes("wellness")) return "carpenter";
  return "cleaning_services";
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
  let popularSearchTerms: string[] = [];

  if (q && q.trim().length > 0) {
    const searchQuery = q.trim();
    const parsed = parseSearchTokens(searchQuery);
    const { normalizedQuery, shortTokens, longTokens, expandedTerms } = parsed;

    // Record this real search for the dynamic "Popular Searches" feed
    try {
      await supabase.rpc("record_search", { p_term: searchQuery });
    } catch {
      // Best-effort: analytics must never block the search page
    }

    // Build targeted query filters
    const serviceFilterParts: string[] = [
      `title.ilike.%${normalizedQuery}%`,
      `title.ilike.${normalizedQuery}%`,
    ];

    const subcategoryFilterParts: string[] = [
      `subcategory_name.ilike.%${normalizedQuery}%`,
      `subcategory_name.ilike.${normalizedQuery}%`,
    ];

    const categoryFilterParts: string[] = [
      `category_name.ilike.%${normalizedQuery}%`,
      `category_name.ilike.${normalizedQuery}%`,
    ];

    // Acronym & Short Token Filters (word boundary only)
    for (const st of shortTokens) {
      serviceFilterParts.push(`title.ilike.${st}%`);
      serviceFilterParts.push(`title.ilike.% ${st}%`);
      subcategoryFilterParts.push(`subcategory_name.ilike.${st}%`);
      subcategoryFilterParts.push(`subcategory_name.ilike.% ${st}%`);
      categoryFilterParts.push(`category_name.ilike.${st}%`);
      categoryFilterParts.push(`category_name.ilike.% ${st}%`);
    }

    // Long Tokens (>3 chars)
    for (const lt of longTokens) {
      serviceFilterParts.push(`title.ilike.%${lt}%`);
      serviceFilterParts.push(`description.ilike.%${lt}%`);
      subcategoryFilterParts.push(`subcategory_name.ilike.%${lt}%`);
      categoryFilterParts.push(`category_name.ilike.%${lt}%`);
    }

    // Synonyms & Intent Expansions
    for (const exp of expandedTerms.slice(0, 8)) {
      if (exp.length > 3) {
        serviceFilterParts.push(`title.ilike.%${exp}%`);
        subcategoryFilterParts.push(`subcategory_name.ilike.%${exp}%`);
      }
    }

    const serviceOrFilter = Array.from(new Set(serviceFilterParts)).join(",");
    const subcategoryOrFilter = Array.from(new Set(subcategoryFilterParts)).join(",");
    const categoryOrFilter = Array.from(new Set(categoryFilterParts)).join(",");

    // Perform queries in parallel with generous fetch limits
    const [servicesRes, subcategoriesRes, categoriesRes] = await Promise.all([
      // Search Services (limit 80 candidates for high precision scoring)
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
        .or(serviceOrFilter)
        .eq("is_active", true)
        .in("status", ["published", "upcoming"])
        .limit(80),

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
        .or(subcategoryOrFilter)
        .limit(15),

      // Search Categories
      supabase
        .from("categories")
        .select("id, category_name")
        .or(categoryOrFilter)
        .limit(8),
    ]);

    if (servicesRes.data) {
      const rawList = servicesRes.data as unknown as ServiceResult[];
      servicesResults = rawList
        .map((s) => ({
          service: s,
          score: calculateRelevanceScore(
            {
              title: s.title,
              description: s.description || "",
              subcategoryName: s.subcategories?.subcategory_name || "",
              categoryName: s.subcategories?.categories?.category_name || s.category || "",
            },
            parsed
          ),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.service)
        .slice(0, 25); // Increased from 15 to 25 results
    }

    if (subcategoriesRes.data) {
      const rawSubList = subcategoriesRes.data as unknown as SubcategoryResult[];
      subcategoriesResults = rawSubList
        .map((sub) => ({
          ...sub,
          score: calculateRelevanceScore(
            {
              title: sub.subcategory_name,
              subcategoryName: sub.subcategory_name,
              categoryName: sub.categories?.category_name || "",
            },
            parsed
          ),
        }))
        .filter((item) => (item.score ?? 0) > 0)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
    }

    if (categoriesRes.data) {
      const rawCatList = categoriesRes.data as CategoryResult[];
      categoriesResults = rawCatList
        .map((cat) => ({
          ...cat,
          score: calculateRelevanceScore(
            {
              title: cat.category_name,
              categoryName: cat.category_name,
            },
            parsed
          ),
        }))
        .filter((item) => (item.score ?? 0) > 0)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);
    }
  }

  if (!q) {
    // Load real popular search terms ranked by actual search volume
    try {
      const { data: popularData } = await supabase.rpc("get_popular_search_terms", {
        p_limit: 10,
      });
      const popularRows = popularData as { term: string }[] | null;
      if (popularRows) {
        popularSearchTerms = popularRows.map((row) => row.term).filter((t) => t.length > 0);
      }
    } catch {
      // Keep the section empty on failure rather than blocking the page
    }
  }

  const hasResults =
    categoriesResults.length > 0 ||
    subcategoriesResults.length > 0 ||
    servicesResults.length > 0;

  const getSlug = (name: string) =>
    name.toLowerCase().replace(/[,\s]+/g, "-").replace(/&/g, "and");

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <SearchInput defaultValue={q || ""} />

        {q ? (
          <div className="mt-4 md:mt-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base md:text-lg text-on-surface">
                Results for &quot;{q}&quot;
              </h2>
              {hasResults && (
                <span className="text-xs text-on-surface-variant font-medium">
                  {servicesResults.length} {servicesResults.length === 1 ? "service" : "services"} found
                </span>
              )}
            </div>

            {hasResults ? (
              <div className="space-y-8">
                {/* 1. Subcategories Section (Prominently Placed at the Top) */}
                {subcategoriesResults.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <span className="material-symbols-outlined text-sm text-secondary">category</span>
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                        Matching Subcategories
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subcategoriesResults.map((sub) => {
                        const parentCatName = sub.categories?.category_name || "Services";
                        const catSlug = getSlug(parentCatName);
                        const iconName = sub.icon_name || "sparkles";

                        return (
                          <Link
                            key={sub.id}
                            href={`/customer/services/${catSlug}/sub/${sub.id}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <ServiceIconComponent
                                  iconName={iconName}
                                  className="w-5 h-5 text-[#059669] drop-shadow-sm"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-on-surface text-sm md:text-base block truncate group-hover:text-primary transition-colors">
                                  {sub.subcategory_name}
                                </span>
                                <span className="text-[10px] md:text-xs text-on-surface-variant font-medium block truncate">
                                  in {parentCatName}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                              chevron_right
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 2. Services Section (Up to 25 items) */}
                {servicesResults.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <span className="material-symbols-outlined text-sm text-secondary">home_repair_service</span>
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                        Services ({servicesResults.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {servicesResults.map((service) => {
                        const iconName = service.subcategories?.icon_name || "sparkles";
                        const catSlug = getSlug(
                          service.subcategories?.categories?.category_name ||
                          service.category ||
                          "services"
                        );
                        const isUpcoming = service.status === "upcoming";

                        return (
                          <Link
                            href={`/customer/services/${catSlug}/${service.id}`}
                            key={service.id}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center gap-3 md:gap-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                          >
                            <ServiceCardThumbnail
                              imageUrl={service.image_url || service.poster_url}
                              iconName={iconName}
                              alt={service.title}
                              status={service.status}
                              containerClassName="w-16 h-14 md:w-20 md:h-16 rounded-xl shrink-0"
                              iconClassName="w-5 h-5 md:w-6 md:h-6 text-[#059669] drop-shadow-sm"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-on-surface leading-tight text-sm md:text-base truncate group-hover:text-primary transition-colors">
                                {service.title}
                              </h3>
                              <p className="text-[10px] md:text-[11px] text-on-surface-variant mt-0.5 md:mt-1 line-clamp-1">
                                {service.description}
                              </p>
                              {service.subcategories?.subcategory_name && (
                                <span className="inline-block text-[9px] font-semibold text-on-surface-variant/70 bg-surface-container px-1.5 py-0.5 rounded mt-1">
                                  {service.subcategories.subcategory_name}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end whitespace-nowrap shrink-0">
                              {isUpcoming ? (
                                <span className="text-[10px] md:text-xs text-secondary font-black tracking-tight uppercase bg-primary/90 px-2 py-0.5 rounded-md">
                                  Coming Soon
                                </span>
                              ) : (
                                <>
                                  {service.original_price && (
                                    <span className="text-[10px] md:text-xs text-on-surface-variant/50 line-through">
                                      ₹{service.original_price}
                                    </span>
                                  )}
                                  <span className="font-bold text-primary text-sm md:text-base">
                                    ₹{service.base_price}
                                  </span>
                                </>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 3. Categories Section */}
                {categoriesResults.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <span className="material-symbols-outlined text-sm text-secondary">grid_view</span>
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                        Browse by Category
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoriesResults.map((cat) => {
                        const catSlug = getSlug(cat.category_name);
                        const iconName = getCategoryIconName(cat.category_name);

                        return (
                          <Link
                            key={cat.id}
                            href={`/customer/services/${catSlug}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <ServiceIconComponent
                                  iconName={iconName}
                                  className="w-5 h-5 text-[#059669] drop-shadow-sm"
                                />
                              </div>
                              <div>
                                <span className="font-bold text-on-surface text-sm md:text-base group-hover:text-primary transition-colors">
                                  {cat.category_name}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors">
                              chevron_right
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-12 md:py-16 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-on-surface-variant/40 mb-4">
                  search_off
                </span>
                <h3 className="font-bold text-base md:text-lg text-on-surface">No results found</h3>
                <p className="text-on-surface-variant mt-2 text-sm md:text-base max-w-sm mx-auto">
                  Try searching for something like &quot;AC&quot;, &quot;Sofa Cleaning&quot;, &quot;Cockroach&quot; or &quot;Plumber&quot;.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 md:mt-8">
            <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-on-surface-variant">Popular Searches</h2>
            {popularSearchTerms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularSearchTerms.map((term) => (
                  <Link
                    key={term}
                    href={`/customer/search?q=${encodeURIComponent(term)}`}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-surface-container-low rounded-full text-xs md:text-sm font-medium text-on-surface-variant border border-outline-variant/10 hover:border-primary/50 transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">
                No searches recorded yet — start typing above to find a service.
              </p>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
