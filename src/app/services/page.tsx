import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Services | Pavan Home Solutions",
  description: "Browse our complete catalog of professional home services — cleaning, repairs, pest control, plumbing, and more. Book trusted professionals at transparent prices.",
};

interface SubcategoryWithServices {
  id: string;
  subcategory_name: string;
  icon_name: string;
  category_id: string;
}

interface CategoryWithSubcategories {
  id: string;
  category_name: string;
  subcategories: SubcategoryWithServices[];
}

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  base_price: number;
  is_active: boolean;
  subcategory_id: string;
  duration_minutes: number;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function PublicServicesShowcasePage() {
  const supabase = await createClient();

  // Fetch all categories with their subcategories
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id,
      category_name,
      subcategories (
        id,
        subcategory_name,
        icon_name,
        category_id
      )
    `)
    .order("category_name") as { data: CategoryWithSubcategories[] | null };

  // Fetch all active services with subcategory + category joins
  const { data: services } = await supabase
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
    .eq("is_active", true)
    .order("base_price", { ascending: true }) as { data: ServiceRow[] | null };

  const allServices = services || [];
  const allCategories = categories || [];

  // Group services by category name
  const servicesByCategory = new Map<string, ServiceRow[]>();
  for (const service of allServices) {
    const catName = service.subcategories?.categories?.category_name || "Other";
    if (!servicesByCategory.has(catName)) {
      servicesByCategory.set(catName, []);
    }
    servicesByCategory.get(catName)!.push(service);
  }

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative bg-primary overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(166,206,55,0.15)_0%,transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(166,206,55,0.1)_0%,transparent_60%)]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs md:text-sm font-bold text-white/90">{allServices.length} Services Available</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 md:mb-6 tracking-tight font-headline">
              Everything Your Home{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-secondary to-[#d4f07a]">Needs</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-xl mx-auto font-medium leading-relaxed mb-8">
              From deep cleaning to pest control, plumbing to electrical — browse our complete catalog of professional home services.
            </p>

            {/* Quick Category Pills */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {allCategories.map((cat) => {
                const catSlug = cat.category_name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
                const firstIcon = cat.subcategories?.[0]?.icon_name || "home_repair_service";
                return (
                  <a
                    key={cat.id}
                    href={`#cat-${catSlug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white font-bold text-xs md:text-sm hover:bg-white/20 hover:border-secondary/50 transition-all"
                  >
                    <span className="material-symbols-outlined text-secondary text-base">{firstIcon}</span>
                    {cat.category_name}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-16">

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-12 md:mb-16">
          <div className="text-center p-4 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">{allCategories.length}</div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">Categories</div>
          </div>
          <div className="text-center p-4 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">{allServices.length}</div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">Services</div>
          </div>
          <div className="text-center p-4 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">4.9<span className="text-secondary">★</span></div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">Avg Rating</div>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-16 md:space-y-24">
          {allCategories.map((cat) => {
            const catSlug = cat.category_name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
            const catServices = servicesByCategory.get(cat.category_name) || [];

            if (catServices.length === 0) return null;

            return (
              <section key={cat.id} id={`cat-${catSlug}`} className="scroll-mt-24">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-2xl md:text-3xl">
                        {cat.subcategories?.[0]?.icon_name || "home_repair_service"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">{cat.category_name}</h2>
                      <p className="text-xs md:text-sm text-on-surface-variant font-medium">{catServices.length} service{catServices.length !== 1 ? "s" : ""} available</p>
                    </div>
                  </div>
                  <Link
                    href={`/services/${catSlug}`}
                    className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
                  >
                    View all <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>

                {/* Subcategory pills */}
                {cat.subcategories && cat.subcategories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
                    {cat.subcategories.map((sub) => (
                      <div key={sub.id} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-outline-variant/10 text-xs font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-[#059669] text-sm">{sub.icon_name}</span>
                        {sub.subcategory_name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Service Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {catServices.map((service) => {
                    const iconName = service.subcategories?.icon_name || "home_repair_service";
                    const subcatName = service.subcategories?.subcategory_name || "";

                    return (
                      <Link
                        key={service.id}
                        href={`/services/${catSlug}/${service.id}`}
                        className="group relative bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-secondary/30 transition-all duration-300"
                      >
                        {/* Icon */}
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-xl">{iconName}</span>
                        </div>

                        {/* Content */}
                        <h3 className="font-bold text-on-surface text-base md:text-lg mb-1 font-headline leading-tight group-hover:text-primary transition-colors">
                          {service.title}
                        </h3>
                        {subcatName && (
                          <p className="text-xs text-on-surface-variant/70 font-medium mb-3">{subcatName}</p>
                        )}
                        <p className="text-xs md:text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                          {service.description}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                          <div>
                            <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">Starting at</span>
                            <span className="text-lg font-extrabold text-primary">₹{service.base_price}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile View All */}
                <div className="sm:hidden mt-4 text-center">
                  <Link
                    href={`/services/${catSlug}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
                  >
                    View all {cat.category_name} services <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </section>
            );
          })}
        </div>

        {/* Empty state */}
        {allServices.length === 0 && (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">home_repair_service</span>
            </div>
            <h2 className="text-2xl font-extrabold text-on-surface mb-2 font-headline">No Services Yet</h2>
            <p className="text-on-surface-variant mb-6">We&apos;re setting up our service catalog. Check back soon!</p>
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-16 md:mt-24 relative rounded-3xl overflow-hidden p-8 sm:p-10 md:p-16 bg-primary text-center shadow-[0_20px_50px_rgba(30,41,59,0.3)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(166,206,55,0.2)_0%,transparent_70%)]"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-4xl sm:text-5xl mb-4">🏠</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight font-headline">
              Ready to Book?
            </h2>
            <p className="text-sm md:text-base text-white/70 mb-6 sm:mb-8 max-w-md font-medium">
              Sign up for free and get access to all our professional home services at transparent prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-sm font-extrabold text-primary hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(166,206,55,0.5)] active:scale-95 transition-all">
                <span className="material-symbols-outlined text-lg">person_add</span>
                Create Free Account
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 sm:px-8 py-3 sm:py-4 text-sm font-bold text-white hover:bg-white/20 transition-all">
                <span className="material-symbols-outlined text-lg">login</span>
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
