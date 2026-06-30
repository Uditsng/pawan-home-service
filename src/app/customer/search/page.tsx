import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import SearchInput from "@/components/SearchInput";
import Link from "next/link";
import { ServiceIconComponent } from "@/utils/serviceIcon";


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { q } = await searchParams;
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

  let results: ServiceResult[] = [];

  if (q) {
    // Perform ILIKE search against services table on title and description
    const { data } = await supabase
      .from('services')
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
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(20);

    if (data) {
      results = data as unknown as ServiceResult[];
    }
  }

  return (

    <div className="bg-surface font-body text-on-surface min-h-screen pb-24">

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <SearchInput defaultValue={q || ""} />

        {q ? (
          <div className="mt-6 md:mt-8">
            <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-on-surface">
              Results for &quot;{q}&quot;
            </h2>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {results.map((service) => {
                  const iconName = service.subcategories?.icon_name || "sparkles";
                  const catSlug = (service.subcategories?.categories?.category_name || service.category || "services")
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/&/g, "and");

                  return (
                    <Link
                      href={`/customer/services/${catSlug}/${service.id}`}
                      key={service.id}
                      className="bg-surface-container-lowest p-3 md:p-4 rounded-xl md:rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-3 md:gap-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                        <ServiceIconComponent iconName={iconName} className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 drop-shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-on-surface leading-tight text-sm md:text-base truncate">{service.title}</h3>
                        <p className="text-[10px] md:text-[11px] text-on-surface-variant mt-0.5 md:mt-1 line-clamp-1">{service.description}</p>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap">
                        {service.original_price && (
                          <span className="text-[10px] md:text-xs text-on-surface-variant/50 line-through">₹{service.original_price}</span>
                        )}
                        <span className="font-bold text-primary text-sm md:text-base">
                          ₹{service.base_price}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 md:py-12">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-outline-variant mb-4">search_off</span>
                <h3 className="font-bold text-base md:text-lg text-on-surface">No services found</h3>
                <p className="text-on-surface-variant mt-2 text-sm md:text-base">Try searching for something like &quot;cleaning&quot; or &quot;ac repair&quot;</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 md:mt-8">
            <h2 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-on-surface-variant">Popular Searches</h2>
            <div className="flex flex-wrap gap-2">
              {['Deep Cleaning', 'AC Service', 'Electrician', 'Plumber'].map(term => (
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
