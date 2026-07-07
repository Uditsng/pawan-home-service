"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ServiceIconComponent } from "@/utils/serviceIcon";

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
}

interface LandingGridClientProps {
  categories: Category[];
  availableServices: ServiceWithSubcategory[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  // Cleaning
  "06fe8241-df90-42b3-a6c6-612b189ba54c": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 10C7 8.89543 7.89543 8 8 8H16C16.1046 8 17 8.89543 17 10V20C17 21.1046 16.1046 22 15 22H9C7.89543 22 7 21.1046 7 20V10Z" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M11 13H13" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 16H13" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 7L21.5 8.5L23 9L21.5 9.5L21 11L20.5 9.5L19 9L20.5 8.5L21 7Z" fill="#a6ce37" stroke="#a6ce37" strokeWidth="0.5" />
      <path d="M4 14L4.5 15.5L6 16L4.5 16.5L4 18L3.5 16.5L2 16L3.5 15.5L4 14Z" fill="#a6ce37" stroke="#a6ce37" strokeWidth="0.5" />
      <circle cx="20" cy="15" r="1.5" fill="#a6ce37" />
      <circle cx="21" cy="18" r="1" fill="#002261" />
    </svg>
  ),
  // House Keeping
  "79a4de54-30ad-4ef7-8c35-1d096a605f6e": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.5L12 3L21 9.5V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V9.5Z" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M19 13V19C19 19.5523 18.5523 20 18 20H14V15H10V20H6C5.44772 20 5 19.5523 5 19V13" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 9.5L15.5 11L17 9.5L15.5 8L14 9.5Z" fill="#a6ce37" stroke="#a6ce37" strokeWidth="0.5" />
      <path d="M7 11.5L8 12.5L9 11.5L8 10.5L7 11.5Z" fill="#a6ce37" stroke="#a6ce37" strokeWidth="0.5" />
    </svg>
  ),
  // Pest Control Services
  "aa721151-4604-4c9d-ae07-68960a5f8564": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 5V11C4 16.1 7.4 20.8 12 22C16.6 20.8 20 16.1 20 11V5L12 2Z" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" strokeLinejoin="round" />
      <rect x="10" y="9" width="4" height="6" rx="2" stroke="#002261" strokeWidth="2" />
      <path d="M12 7C12 8 12 9 12 9" stroke="#002261" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 10H10M8 12H10M14 10H16M14 12H16" stroke="#a6ce37" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // Home Repairs & Maintenance
  "4f18fd15-29cd-4aff-b47f-64f68852df4b": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="6" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M12 4V6M12 18V20M4 12H6M18 12H20" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.3 6.3L7.7 7.7M16.3 16.3L17.7 17.7M6.3 17.7L7.7 16.3M16.3 7.7L17.7 6.3" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 8L14 12" stroke="#a6ce37" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 16C17.5 17.5 17 19.5 15.5 21C14 22.5 12 22 10.5 20.5L6 16C4.5 14.5 5 12.5 6.5 11C8 9.5 10 10 11.5 11.5L16 16Z" stroke="#a6ce37" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  // Renovation, Logistics & Events
  "c38e7aa3-7d2d-4a90-8c65-1e8982551e5e": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 5C6 4.44772 6.44772 4 7 4H17C17.5523 4 18 4.44772 18 5V11C18 11.5523 17.5523 12 17 12H7C6.44772 12 6 11.5523 6 11V5Z" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M12 12V19" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 15H20" stroke="#a6ce37" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 15L5 21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21L19 15" stroke="#a6ce37" strokeWidth="2" />
    </svg>
  ),
  // Personal Assistance Services
  "5ba6c71c-30ad-4ef7-8c35-1d096a605f6e": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M5 19C5 15.6863 8.13401 13 12 13C15.866 13 19 15.6863 19 19V20H5V19Z" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  // Grooming & Wellness
  "8fa6c71c-30ad-4ef7-8c35-1d096a605f6e": (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="18" r="3" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <circle cx="18" cy="18" r="3" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M9 15L15 5M15 15L9 5" stroke="#002261" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
};

const getCategoryIcon = (id: string) => {
  if (categoryIcons[id]) return categoryIcons[id];
  // Fallback SVG
  return (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#a6ce37" fillOpacity="0.25" stroke="#002261" strokeWidth="2" />
      <path d="M12 8V16M8 12H16" stroke="#a6ce37" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default function LandingGridClient({ categories, availableServices }: LandingGridClientProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const router = useRouter();

  if (selectedCategoryId) {
    const servicesForCategory = availableServices.filter(
      (s) => s.subcategories?.categories?.id === selectedCategoryId
    );
    const activeCategoryName = categories.find((c) => c.id === selectedCategoryId)?.category_name || "Services";

    return (
      <section className="w-full">
        {/* Category Header with Back Button */}
        <div className="flex items-center gap-3 mb-5 md:mb-6">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-center text-on-surface active:bg-surface-container-high cursor-pointer transition-all active:scale-95 shadow-2xs"
            aria-label="Back to categories"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h3 className="font-headline text-lg md:text-xl font-extrabold text-primary">{activeCategoryName}</h3>
            <p className="text-on-surface-variant text-xs md:text-sm font-medium">Popular services in this category</p>
          </div>
        </div>

        {/* Services Grid (no sticky hovers) */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {servicesForCategory.map((service) => {
            const iconName = service.subcategories?.icon_name || "sparkles";

            return (
              <Link
                href="/login"
                key={service.id}
                className="bg-surface-container-low p-3 md:p-5 rounded-xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm cursor-pointer active:bg-surface-container-high transition-colors"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 mb-2 md:mb-3 flex items-center justify-center transition-transform active:scale-105">
                  <ServiceIconComponent iconName={iconName} className="w-5 h-5 text-emerald-600 drop-shadow-sm" />
                </div>
                <span className="font-headline font-bold text-xs md:text-sm text-on-surface line-clamp-2 leading-tight">{service.title}</span>
                <div className="flex items-center gap-1.5 mt-1 md:mt-1.5">
                  {service.original_price && (
                    <span className="text-[9px] md:text-[10px] text-on-surface-variant/50 line-through">₹{service.original_price}</span>
                  )}
                  <span className="text-[10px] md:text-[11px] text-primary font-bold tracking-tight">₹{service.base_price}</span>
                </div>
              </Link>
            );
          })}

          {servicesForCategory.length === 0 && (
            <div className="col-span-3 md:col-span-4 lg:col-span-5 text-center py-8 text-on-surface-variant text-sm font-semibold">
              No active services available in this category right now.
            </div>
          )}
        </div>
      </section>
    );
  }

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
                  .replace(/\s+/g, "-")
                  .replace(/&/g, "and");
                router.push(`/customer/services/${catSlug}`);
              }}
              key={cat.id}
              className="bg-surface-container-low p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm aspect-square cursor-pointer active:bg-surface-container-high active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 mb-4 flex items-center justify-center text-primary transition-transform active:scale-105">
                {getCategoryIcon(cat.id)}
              </div>
              <span className="font-headline font-bold text-sm md:text-base text-on-surface leading-snug line-clamp-2">
                {cat.category_name}
              </span>
              <span className="text-[10px] md:text-xs text-on-surface-variant mt-1.5 font-bold bg-surface-container-high/60 px-2 py-0.5 rounded-full">
                {serviceCount} {serviceCount === 1 ? "Service" : "Services"}
              </span>
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
