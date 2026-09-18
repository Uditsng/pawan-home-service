"use client";

import { useRouter } from "next/navigation";
import { CategoryVisualCard } from "@/components/CategoryVisualCard";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  category?: string;
  subcategory_id: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      id: string;
      category_name: string;
    } | null;
  } | null;
}

interface Category {
  id: string;
  category_name: string;
  image_url?: string | null;
}

interface LandingGridClientProps {
  categories: Category[];
  availableServices: ServiceWithSubcategory[];
}

export default function LandingGridClient({ categories, availableServices }: LandingGridClientProps) {
  const router = useRouter();

  return (
    <section className="w-full">
      <div className="mb-5 md:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">Popular Near You</h2>
        <p className="text-on-surface-variant text-xs md:text-sm font-medium mt-1">Select a category to view available services</p>
      </div>

      {/* Categories Grid (no sticky hover styles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat) => {
          // Count services in this category
          const serviceCount = availableServices.filter(
            (s) => s.subcategories?.categories?.id === cat.id
          ).length;

          return (
            <div
              onClick={() => {
                const catSlug = cat.category_name
                  .toLowerCase()
                  .replace(/[,\s]+/g, "-")
                  .replace(/&/g, "and");
                router.push(`/services/${catSlug}`);
              }}
              key={cat.id}
              className="cursor-pointer active:scale-95 transition-transform"
            >
              <CategoryVisualCard
                imageUrl={cat.image_url}
                iconName="category"
                title={cat.category_name}
                footerText={`${serviceCount} ${serviceCount === 1 ? "Service" : "Services"}`}
              />
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="col-span-2 sm:col-span-4 text-center py-8 text-on-surface-variant text-sm font-semibold">
            No categories available.
          </div>
        )}
      </div>
    </section>
  );
}
