"use client";

import Link from "next/link";
import { CategoryVisualCard } from "@/components/CategoryVisualCard";
import type { LandingService } from "@/utils/supabase/cachedServiceQueries";
import type { Category } from "@/utils/supabase/cachedCategoryQueries";

interface LandingGridClientProps {
  categories: Category[];
  availableServices: LandingService[];
}

/** Matches the slug normalization used by the /services catalog routes. */
function categorySlug(name: string) {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-").replace(/[-_]+/g, "-");
}

export default function LandingGridClient({ categories, availableServices }: LandingGridClientProps) {
  return (
    <section className="w-full">
      <div className="mb-5 md:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">Popular Near You</h2>
        <p className="text-on-surface-variant text-xs md:text-sm font-medium mt-1">Select a category to view available services</p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => {
          // Count services in this category
          const serviceCount = availableServices.filter(
            (s) => s.subcategories?.categories?.id === cat.id
          ).length;

          return (
            <Link
              key={cat.id}
              href={`/services/${categorySlug(cat.category_name)}`}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] transition-transform"
            >
              <CategoryVisualCard
                imageUrl={cat.image_url}
                iconName="category"
                title={cat.category_name}
                footerText={`${serviceCount} ${serviceCount === 1 ? "Service" : "Services"}`}
              />
            </Link>
          );
        })}

        {categories.length === 0 && (
          <div className="col-span-2 sm:col-span-4 text-center py-8">
            <p className="text-on-surface-variant text-sm font-semibold">No categories available right now.</p>
            <Link
              href="/services"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Browse all services
              <span className="material-symbols-outlined text-[18px]" aria-hidden>arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
