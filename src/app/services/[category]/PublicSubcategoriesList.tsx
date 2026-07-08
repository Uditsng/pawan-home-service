"use client";

import { useState } from "react";
import Link from "next/link";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface Subcategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    id: string;
    category_name: string;
  } | null;
}

interface PublicSubcategoriesListProps {
  subcategories: Subcategory[];
  categoryTitle: string;
  categorySlug: string;
}

export default function PublicSubcategoriesList({
  subcategories,
  categoryTitle,
  categorySlug,
}: PublicSubcategoriesListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter subcategories based on search input
  const filteredSubcategories = subcategories.filter((sub) =>
    sub.subcategory_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-2">
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          <Link href="/" className="text-on-surface hover:opacity-80 transition-all flex items-center">
            <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-primary font-black text-2xl md:text-3xl tracking-tight font-headline">
            {categoryTitle}
          </h1>
        </div>
        <p className="text-on-surface-variant text-xs md:text-sm pl-9">
          {subcategories.length} subcategor{subcategories.length !== 1 ? "ies" : "y"} available
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-20">
        {/* Search Bar */}
        <section className="mb-6 md:mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-14 pr-6 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_4px_12px_rgba(15,23,42,0.02)] focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline text-on-surface font-xs outline-none"
              placeholder={`Search within ${categoryTitle}...`}
            />
          </div>
        </section>

        {/* Subcategories Square Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredSubcategories.map((sub) => {
            const iconName = sub.icon_name || "sparkles";

            return (
              <Link
                key={sub.id}
                href={`/services/${categorySlug}/${sub.id}`}
                className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm aspect-square cursor-pointer hover:bg-surface-container-high active:scale-95 transition-all"
              >
                {/* Icon Container conforming to Premium CSS standard */}
                <div className="w-14 h-14 md:w-18 md:h-18 rounded-xl md:rounded-2xl bg-green-500/10 mb-3 md:mb-4 flex items-center justify-center text-[#059669] transition-transform active:scale-105">
                  <ServiceIconComponent
                    iconName={iconName}
                    className="w-8 h-8 md:w-10 md:h-10 text-[#059669] drop-shadow-sm"
                  />
                </div>
                <span className="font-headline font-bold text-[13px] md:text-base text-on-surface leading-tight md:leading-snug line-clamp-2">
                  {sub.subcategory_name}
                </span>
              </Link>
            );
          })}

          {filteredSubcategories.length === 0 && (
            <div className="col-span-full py-16 md:py-20 text-center">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">search_off</span>
              </div>
              <p className="font-bold text-base md:text-lg text-on-surface mb-2">No subcategories found</p>
              <p className="text-on-surface-variant text-sm">
                We couldn&apos;t find subcategories matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
