import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCachedCategories } from "@/utils/supabase/cachedCategoryQueries";
import { getCachedAllSubcategories } from "@/utils/supabase/cachedSubcategoryQueries";
import { ServiceIconComponent } from "@/utils/serviceIcon";

const normalizeSlug = (str: string) =>
  str.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-").replace(/[-_]+/g, "-");

export default async function PublicServicesPage() {
  const [categories, allSubcategories] = await Promise.all([
    getCachedCategories(),
    getCachedAllSubcategories(),
  ]);

  const grouped = (categories || []).map((cat) => {
    const slug = normalizeSlug(cat.category_name);
    const subs = (allSubcategories || []).filter(
      (sub) => sub.categories?.category_name === cat.category_name
    );
    return { ...cat, slug, subcategories: subs };
  });

  return (
    <>
      <Header />
      <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-2">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <Link href="/" className="text-on-surface hover:opacity-80 transition-all flex items-center">
              <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
            </Link>
            <h1 className="text-primary font-black text-2xl md:text-3xl tracking-tight font-headline">
              All Services
            </h1>
          </div>
          <p className="text-on-surface-variant text-xs md:text-sm pl-9">
            Browse our full range of professional home services
          </p>
        </div>

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-20 space-y-10">
          {grouped.map((cat) => (
            <section key={cat.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-primary font-black text-lg md:text-xl tracking-tight font-headline">
                  {cat.category_name}
                </h2>
                <Link
                  href={`/services/${cat.slug}`}
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {cat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/services/${cat.slug}/${sub.id}`}
                    className="bg-surface-container-low p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm aspect-square cursor-pointer hover:bg-surface-container-high active:scale-95 transition-all"
                  >
                    <div className="w-14 h-14 md:w-18 md:h-18 rounded-xl md:rounded-2xl bg-green-500/10 mb-3 md:mb-4 flex items-center justify-center text-[#059669]">
                      <ServiceIconComponent
                        iconName={sub.icon_name || "sparkles"}
                        className="w-8 h-8 md:w-10 md:h-10 text-[#059669] drop-shadow-sm"
                      />
                    </div>
                    <span className="font-headline font-bold text-[13px] md:text-base text-on-surface leading-tight line-clamp-2">
                      {sub.subcategory_name}
                    </span>
                  </Link>
                ))}
                {cat.subcategories.length === 0 && (
                  <p className="col-span-full text-sm text-on-surface-variant py-4">
                    No services available in this category yet.
                  </p>
                )}
              </div>
            </section>
          ))}

          {grouped.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">construction</span>
              </div>
              <p className="font-bold text-base md:text-lg text-on-surface mb-2">No services available</p>
              <p className="text-on-surface-variant text-sm">Check back soon — we are adding new services regularly.</p>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
