"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

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
  duration_minutes?: number;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

interface ServicesShowcaseClientProps {
  categories: CategoryWithSubcategories[];
  services: ServiceRow[];
}

export default function ServicesShowcaseClient({
  categories,
  services,
}: ServicesShowcaseClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (categories.length > 0) {
      return categories[0].category_name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/&/g, "and");
    }
    return "";
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    if (categories.length > 0) {
      return { [categories[0].id]: true };
    }
    return {};
  });

  const isScrollingRef = useRef<boolean>(false);
  const navRowRef = useRef<HTMLDivElement>(null);

  // Group services by category name
  const servicesByCategory = new Map<string, ServiceRow[]>();
  for (const service of services) {
    const catName = service.subcategories?.categories?.category_name || "Other";
    if (!servicesByCategory.has(catName)) {
      servicesByCategory.set(catName, []);
    }
    servicesByCategory.get(catName)!.push(service);
  }


  // ScrollSpy active category and auto-scroll active chip into center
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-120px 0px -60% 0px", // triggers when category is near top (accounting for header + sticky nav heights)
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id && id.startsWith("cat-")) {
            const slug = id.substring(4);
            setActiveCategory(slug);

            // Center the active chip in the category nav scrollbar
            const chipElement = document.getElementById(`chip-${slug}`);
            if (chipElement && navRowRef.current) {
              const row = navRowRef.current;
              const rowWidth = row.offsetWidth;
              const chipLeft = chipElement.offsetLeft;
              const chipWidth = chipElement.offsetWidth;
              row.scrollTo({
                left: chipLeft - rowWidth / 2 + chipWidth / 2,
                behavior: "smooth",
              });
            }
          }
        }
      });
    }, observerOptions);

    categories.forEach((cat) => {
      const catSlug = cat.category_name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/&/g, "and");
      const element = document.getElementById(`cat-${catSlug}`);
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [categories]);

  // Smooth scroll handler with offset for sticky header
  const handleCategoryClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
    catId: string
  ) => {
    e.preventDefault();

    // Ensure category is expanded on mobile
    setExpandedCategories((prev) => ({ ...prev, [catId]: true }));

    const element = document.getElementById(`cat-${slug}`);
    if (element) {
      const headerHeight = 72; // Header size
      const navHeight = 60; // Sticky sub-header category nav size
      const offset = headerHeight + navHeight + 8;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      isScrollingRef.current = true;
      setActiveCategory(slug);

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Re-enable scroll spy updates after animation settles
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 750);
    }
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <>
      {/* Hero Section (40-50% height reduction on mobile) */}
      <section className="relative bg-primary overflow-hidden">
        {/* Decorative background orbs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(166,206,55,0.12)_0%,transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(166,206,55,0.08)_0%,transparent_60%)]"></div>

        {/* Compact padding on mobile py-8, standard on desktop py-16/24 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-16 md:py-20 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Service Count Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full mb-4 md:mb-6">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs font-bold text-white/90">
                {services.length} Services Available
              </span>
            </div>

            {/* Headline with adjusted spacing */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 md:mb-5 tracking-tight font-headline">
              Everything Your Home{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-secondary to-secondary/70">
                Needs
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-white/70 max-w-xl mx-auto font-medium leading-relaxed mb-6 md:mb-8">
              From deep cleaning to pest control, plumbing to electrical — browse our complete catalog of professional home services.
            </p>

            {/* Quick Category Pills - Hidden on Mobile (replaced by sticky bar below) */}
            <div className="hidden sm:flex flex-wrap justify-center gap-2 md:gap-3">
              {categories.map((cat) => {
                const catSlug = cat.category_name
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/&/g, "and");
                const firstIcon = cat.subcategories?.[0]?.icon_name || "home_repair_service";
                return (
                  <a
                    key={cat.id}
                    href={`#cat-${catSlug}`}
                    onClick={(e) => handleCategoryClick(e, catSlug, cat.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full text-white font-bold text-xs md:text-sm hover:bg-white/20 hover:border-secondary/50 transition-all"
                  >
                    <span className="material-symbols-outlined text-secondary text-base">
                      {firstIcon}
                    </span>
                    {cat.category_name}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z"
              fill="#F8FAFC"
            />
          </svg>
        </div>
      </section>

      {/* Sticky Category Navigation */}
      <div className="sticky top-[72px] md:top-[80px] z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/15 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4">
          <div
            ref={navRowRef}
            className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x py-0.5"
          >
            {categories.map((cat) => {
              const catSlug = cat.category_name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/&/g, "and");
              const isActive = activeCategory === catSlug;
              const firstIcon = cat.subcategories?.[0]?.icon_name || "home_repair_service";
              return (
                <a
                  key={cat.id}
                  id={`chip-${catSlug}`}
                  href={`#cat-${catSlug}`}
                  onClick={(e) => handleCategoryClick(e, catSlug, cat.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs shrink-0 transition-all select-none snap-start active:scale-95 duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      isActive ? "text-secondary" : "text-[#059669]"
                    }`}
                  >
                    {firstIcon}
                  </span>
                  {cat.category_name}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-12">

        {/* Stats Bar Redesign */}
        {/* Mobile: Horizontal scrolling row of compact pills */}
        <div className="flex sm:hidden gap-1 overflow-x-auto no-scrollbar pb-2 -mx-2 my-6">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest border border-outline-variant/15 rounded-full shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-sm text-[#059669]">category</span>
            <span className="text-[10px] font-bold text-primary">
              {categories.length} Categories
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest border border-outline-variant/15 rounded-full shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-sm text-[#059669]">
              home_repair_service
            </span>
            <span className="text-[10px] font-bold text-primary">
              {services.length} Services
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest border border-outline-variant/15 rounded-full shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-sm text-secondary">star</span>
            <span className="text-[10px] font-bold text-primary">4.9★ Rated</span>
          </div>
        </div>

        {/* Desktop: Standard large cards grid */}
        <div className="hidden sm:grid grid-cols-3 gap-4 mb-10 md:mb-16 ">
          <div className="text-center p-3 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">
              {categories.length}
            </div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">
              Categories
            </div>
          </div>
          <div className="text-center p-3 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">
              {services.length}
            </div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">
              Services
            </div>
          </div>
          <div className="text-center p-3 md:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="text-2xl md:text-3xl font-extrabold text-primary">
              4.9<span className="text-secondary">★</span>
            </div>
            <div className="text-xs md:text-sm text-on-surface-variant font-bold mt-1">
              Avg Rating
            </div>
          </div>
        </div>

        {/* Category Sections (accordion logic on mobile, static on desktop) */}
        <div className="space-y-6 sm:space-y-16 md:space-y-24">
          {categories.map((cat) => {
            const catSlug = cat.category_name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/&/g, "and");
            const catServices = servicesByCategory.get(cat.category_name) || [];

            if (catServices.length === 0) return null;

            const isExpanded = expandedCategories[cat.id] ?? false;

            return (
              <section
                key={cat.id}
                id={`cat-${catSlug}`}
                className="scroll-mt-36 sm:scroll-mt-40 border-b border-outline-variant/10 pb-6 sm:pb-0 last:border-0"
              >
                {/* Category Header: Button toggle on mobile, static info block on desktop */}
                <div
                  className="flex items-center justify-between mb-6 md:mb-8 cursor-pointer sm:cursor-default select-none group bg-amber-100 rounded-xl"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-green-500/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-xl md:text-3xl">
                        {cat.subcategories?.[0]?.icon_name || "home_repair_service"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
                        {cat.category_name}
                      </h2>
                      <p className="text-[10px] sm:text-xs md:text-sm text-on-surface-variant font-semibold">
                        {catServices.length} service{catServices.length !== 1 ? "s" : ""}{" "}
                        available
                      </p>
                    </div>
                  </div>

                  {/* Header actions: Desktop View-All / Mobile Chevron */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/services/${catSlug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
                    >
                      View all{" "}
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>

                    <button
                      className="sm:hidden w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary active:scale-90 transition-transform"
                      aria-label={isExpanded ? "Collapse category" : "Expand category"}
                    >
                      <span
                        className={`material-symbols-outlined text-lg transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>
                </div>

                {/* Main section contents (hidden on mobile when collapsed, always open on desktop) */}
                <div
                  className={`grid transition-all duration-200 ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 sm:grid-rows-[1fr] sm:opacity-100"
                  } overflow-hidden`}
                >
                  <div className="min-h-0 space-y-4">

                    {/* Services Cards Grid / List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                      {catServices.map((service) => {
                        const iconName = service.subcategories?.icon_name || "home_repair_service";
                        const subcatName = service.subcategories?.subcategory_name || "";

                        return (
                          <div key={service.id} className="w-full">
                            {/* Mobile Compact List View (sm:hidden) */}
                            <Link
                              href={`/services/${catSlug}/${service.id}`}
                              className="sm:hidden flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-xs active:bg-surface-container-low transition-all"
                            >
                              {/* Left side icon */}
                              <div className="w-11 h-11 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-lg">
                                  {iconName}
                                </span>
                              </div>

                              {/* Center details */}
                              <div className="grow min-w-0">
                                <h3 className="font-bold text-on-surface text-sm font-headline leading-tight line-clamp-1">
                                  {service.title}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {subcatName && (
                                    <span className="text-[10px] text-on-surface-variant/70 font-semibold truncate max-w-[120px]">
                                      {subcatName}
                                    </span>
                                  )}
                                  {service.duration_minutes && (
                                    <>
                                      <span className="text-on-surface-variant/30 text-[10px]">•</span>
                                      <span className="text-[10px] text-on-surface-variant/70 font-medium inline-flex items-center gap-0.5 shrink-0">
                                        <span className="material-symbols-outlined text-[11px] leading-none">
                                          schedule
                                        </span>
                                        {service.duration_minutes}m
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="text-xs font-extrabold text-primary mt-1">
                                  ₹{service.base_price}
                                </div>
                              </div>

                              {/* Right side Arrow Action (Always visible, fits touch target requirements) */}
                              <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-primary shrink-0 active:scale-90 transition-transform">
                                <span className="material-symbols-outlined text-sm font-bold">
                                  arrow_forward
                                </span>
                              </div>
                            </Link>

                            {/* Desktop Elegant Grid Card (hidden sm:block) */}
                            <Link
                              href={`/services/${catSlug}/${service.id}`}
                              className="hidden sm:flex flex-col justify-between h-full bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-secondary/30 transition-all duration-300 group"
                            >
                              <div>
                                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shrink-0">
                                  <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-xl">
                                    {iconName}
                                  </span>
                                </div>

                                <h3 className="font-bold text-on-surface text-base md:text-lg mb-1 font-headline leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                  {service.title}
                                </h3>

                                {subcatName && (
                                  <p className="text-xs text-on-surface-variant/70 font-medium mb-3">
                                    {subcatName}
                                  </p>
                                )}

                                <p className="text-xs md:text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                                  {service.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10 mt-auto">
                                <div>
                                  <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">
                                    Starting at
                                  </span>
                                  <span className="text-lg font-extrabold text-primary">
                                    ₹{service.base_price}
                                  </span>
                                </div>

                                {/* Arrow/Action (Always visible on touch, smooth transform on hover) */}
                                <div className="flex items-center gap-1 text-xs font-bold text-secondary group-hover:translate-x-1 transition-transform">
                                  View Details
                                  <span className="material-symbols-outlined text-sm">
                                    arrow_forward
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile category view all link */}
                    <div className="sm:hidden pt-2 text-center">
                      <Link
                        href={`/services/${catSlug}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline"
                      >
                        View all {cat.category_name} services{" "}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Empty state */}
        {services.length === 0 && (
          <div className="text-center py-16 md:py-24">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">
                home_repair_service
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-on-surface mb-2 font-headline">
              No Services Yet
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mb-6">
              We&apos;re setting up our service catalog. Check back soon!
            </p>
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-12 md:mt-24 relative rounded-3xl overflow-hidden p-6 sm:p-10 md:p-16 bg-primary text-center shadow-ambient">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(166,206,55,0.18)_0%,transparent_70%)]"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-3xl sm:text-5xl mb-3 sm:mb-4">🏠</div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 sm:mb-3 leading-tight tracking-tight font-headline">
              Ready to Book?
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-white/70 mb-6 sm:mb-8 max-w-md font-medium">
              Sign up for free and get access to all our professional home services at transparent prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-secondary rounded-full px-6 py-3 text-xs sm:text-sm font-extrabold text-primary hover:-translate-y-0.5 active:scale-95 transition-all shadow-[0_8px_20px_rgba(166,206,55,0.4)]"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base">login</span>
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
