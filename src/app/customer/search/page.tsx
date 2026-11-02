import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import SearchInput from "@/components/SearchInput";
import Link from "next/link";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import { ServiceVisual } from "@/components/ServiceVisual";
import { parseSearchTokens, calculateRelevanceScore } from "@/utils/searchEngine";

interface CategoryResult {
  id: string;
  category_name: string;
  image_url?: string | null;
  score?: number;
}

interface SubcategoryResult {
  id: string;
  subcategory_name: string;
  icon_name: string;
  image_url?: string | null;
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

const DEFAULT_POPULAR_TERMS = [
  "AC Service",
  "Sofa Cleaning",
  "Bathroom Cleaning",
  "Pest Control",
  "Electrician",
  "Plumber",
  "Painting",
];

const sanitizePostgrestTerm = (term: string) =>
  term.replace(/[,()"\\]/g, " ").trim();

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

    // Record search telemetry (safely capped to 80 chars)
    try {
      await supabase.rpc("record_search", { p_term: searchQuery.slice(0, 80) });
    } catch {
      // Best-effort: analytics must never block the search page
    }

    // Build targeted query filters with PostgREST syntax sanitization
    const sanitizedQuery = sanitizePostgrestTerm(normalizedQuery);
    const serviceFilterParts: string[] = [];
    const subcategoryFilterParts: string[] = [];
    const categoryFilterParts: string[] = [];

    if (sanitizedQuery.length > 0) {
      serviceFilterParts.push(`title.ilike.%${sanitizedQuery}%`, `title.ilike.${sanitizedQuery}%`);
      subcategoryFilterParts.push(`subcategory_name.ilike.%${sanitizedQuery}%`, `subcategory_name.ilike.${sanitizedQuery}%`);
      categoryFilterParts.push(`category_name.ilike.%${sanitizedQuery}%`, `category_name.ilike.${sanitizedQuery}%`);
    }

    // Acronym & Short Token Filters (word boundary)
    for (const st of shortTokens) {
      const cleanSt = sanitizePostgrestTerm(st);
      if (cleanSt.length > 0) {
        serviceFilterParts.push(`title.ilike.${cleanSt}%`, `title.ilike.% ${cleanSt}%`);
        subcategoryFilterParts.push(`subcategory_name.ilike.${cleanSt}%`, `subcategory_name.ilike.% ${cleanSt}%`);
        categoryFilterParts.push(`category_name.ilike.${cleanSt}%`, `category_name.ilike.% ${cleanSt}%`);
      }
    }

    // Long Tokens (>3 chars)
    for (const lt of longTokens) {
      const cleanLt = sanitizePostgrestTerm(lt);
      if (cleanLt.length > 0) {
        serviceFilterParts.push(`title.ilike.%${cleanLt}%`, `description.ilike.%${cleanLt}%`);
        subcategoryFilterParts.push(`subcategory_name.ilike.%${cleanLt}%`);
        categoryFilterParts.push(`category_name.ilike.%${cleanLt}%`);
      }
    }

    // Synonyms & Intent Expansions
    for (const exp of expandedTerms.slice(0, 8)) {
      const cleanExp = sanitizePostgrestTerm(exp);
      if (cleanExp.length > 3) {
        serviceFilterParts.push(`title.ilike.%${cleanExp}%`);
        subcategoryFilterParts.push(`subcategory_name.ilike.%${cleanExp}%`);
      }
    }

    const serviceOrFilter = Array.from(new Set(serviceFilterParts)).join(",");
    const subcategoryOrFilter = Array.from(new Set(subcategoryFilterParts)).join(",");
    const categoryOrFilter = Array.from(new Set(categoryFilterParts)).join(",");

    // Perform queries in parallel with generous fetch limits
    const [servicesRes, subcategoriesRes, categoriesRes] = await Promise.all([
      // Search Services (limit 80 candidates for high precision scoring)
      serviceOrFilter.length > 0
        ? supabase
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
            .limit(80)
        : Promise.resolve({ data: [] }),

      // Search Subcategories
      subcategoryOrFilter.length > 0
        ? supabase
            .from("subcategories")
            .select(`
              id,
              subcategory_name,
              icon_name,
              image_url,
              categories (
                category_name
              )
            `)
            .or(subcategoryOrFilter)
            .limit(15)
        : Promise.resolve({ data: [] }),

      // Search Categories
      categoryOrFilter.length > 0
        ? supabase
            .from("categories")
            .select("id, category_name, image_url")
            .or(categoryOrFilter)
            .limit(8)
        : Promise.resolve({ data: [] }),
    ]);

    if (servicesRes.data) {
      const rawList = servicesRes.data as ServiceResult[];
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
        .slice(0, 25);
    }

    if (subcategoriesRes.data) {
      const rawSubList = subcategoriesRes.data as SubcategoryResult[];
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
    // Load real popular search terms ranked by search volume
    try {
      const { data: popularData } = await supabase.rpc("get_popular_search_terms", {
        p_limit: 10,
      });
      const popularRows = popularData as { term: string }[] | null;
      if (popularRows) {
        popularSearchTerms = popularRows.map((row) => row.term).filter((t) => t.length > 0);
      }
    } catch {
      // Keep section fallback on failure
    }
  }

  const hasResults =
    categoriesResults.length > 0 ||
    subcategoriesResults.length > 0 ||
    servicesResults.length > 0;

  const getSlug = (name: string) =>
    name.toLowerCase().replace(/[,\s]+/g, "-").replace(/&/g, "and");

  const displayPopularTerms =
    popularSearchTerms.length > 0 ? popularSearchTerms : DEFAULT_POPULAR_TERMS;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 w-full max-w-full overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 w-full min-w-0 overflow-x-hidden">
        {/* Semantic Page Header */}
        <section className="mb-4">
          <h1 className="font-headline text-xl sm:text-2xl font-black text-on-surface tracking-tight">
            Find Services & Repairs
          </h1>
          <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-0.5">
            Search verified professionals across cleaning, maintenance & pest control
          </p>
        </section>

        <SearchInput defaultValue={q || ""} />

        {q ? (
          <div className="mt-4 md:mt-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-base md:text-lg text-on-surface">
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
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold font-headline">
                        Matching Subcategories
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subcategoriesResults.map((sub) => {
                        const parentCatName = sub.categories?.category_name || "Services";
                        const catSlug = getSlug(parentCatName);

                        return (
                          <Link
                            key={sub.id}
                            href={`/customer/services/${catSlug}/sub/${sub.id}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                <ServiceVisual
                                  imageUrl={sub.image_url}
                                  iconName={sub.icon_name || "sparkles"}
                                  alt={sub.subcategory_name}
                                  containerClassName="w-full h-full"
                                  iconClassName="w-5 h-5 text-secondary"
                                  thumbnailSize={96}
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
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold font-headline">
                        Services ({servicesResults.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full max-w-full min-w-0">
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
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center gap-3 md:gap-4 hover:border-primary/30 hover:shadow-sm transition-all group w-full max-w-full min-w-0 overflow-hidden"
                          >
                            <ServiceCardThumbnail
                              imageUrl={service.image_url || service.poster_url}
                              iconName={iconName}
                              alt={service.title}
                              status={service.status}
                              containerClassName="w-16 h-14 md:w-20 md:h-16 rounded-xl shrink-0"
                              iconClassName="w-5 h-5 md:w-6 md:h-6 text-secondary drop-shadow-sm"
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
                                      ₹{Math.round(service.original_price)}
                                    </span>
                                  )}
                                  <span className="font-bold text-primary text-sm md:text-base">
                                    ₹{Math.round(service.base_price)}
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
                      <h3 className="text-xs uppercase tracking-wider text-on-surface-variant font-bold font-headline">
                        Browse by Category
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoriesResults.map((cat) => {
                        const catSlug = getSlug(cat.category_name);

                        return (
                          <Link
                            key={cat.id}
                            href={`/customer/services/${catSlug}`}
                            className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 shadow-xs flex items-center justify-between hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                <ServiceVisual
                                  imageUrl={cat.image_url}
                                  alt={cat.category_name}
                                  containerClassName="w-full h-full"
                                  iconClassName="w-5 h-5 text-secondary"
                                  thumbnailSize={96}
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-on-surface text-sm md:text-base group-hover:text-primary transition-colors block truncate">
                                  {cat.category_name}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0">
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
              /* Elevated Empty State with Illustration, Suggestions & Actionable CTA */
              <div className="glass-panel text-center py-10 sm:py-14 px-4 sm:px-8 bg-surface-container-lowest/80 rounded-2xl border border-outline-variant/15 flex flex-col items-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-secondary">
                    search_off
                  </span>
                </div>
                <h3 className="font-headline font-bold text-base sm:text-lg text-primary">
                  No services found for &quot;{q}&quot;
                </h3>
                <p className="text-on-surface-variant mt-1.5 text-xs sm:text-sm max-w-sm mx-auto">
                  We couldn&apos;t find matching services. Try searching with different keywords or tap a popular suggestion below.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-5 mb-6 max-w-md">
                  {DEFAULT_POPULAR_TERMS.slice(0, 5).map((term) => (
                    <Link
                      key={term}
                      href={`/customer/search?q=${encodeURIComponent(term)}`}
                      className="px-3 py-1 bg-surface-container-low rounded-full text-xs font-semibold text-on-surface-variant border border-outline-variant/15 hover:border-primary/50 hover:bg-surface-container transition-colors"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/customer/dashboard"
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs sm:text-sm transition-transform active:scale-95 hover:bg-primary/90 shadow-md flex items-center gap-2"
                >
                  <span>Browse All Categories</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 md:mt-8">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <span className="material-symbols-outlined text-sm text-secondary">trending_up</span>
              <h2 className="font-bold text-sm md:text-base text-on-surface uppercase tracking-wider font-headline">
                Popular Searches
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayPopularTerms.map((term) => (
                <Link
                  key={term}
                  href={`/customer/search?q=${encodeURIComponent(term)}`}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-surface-container-low rounded-full text-xs md:text-sm font-medium text-on-surface-variant border border-outline-variant/10 hover:border-primary/50 hover:bg-surface-container transition-colors"
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
