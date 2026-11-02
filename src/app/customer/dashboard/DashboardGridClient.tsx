"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UnserviceableHeroBanner from "@/components/UnserviceableHeroBanner";
import DashboardCarousel, { type BannerItem } from "./DashboardCarousel";
import { ComingSoonStrip } from "@/components/ComingSoonStrip";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";
import { CategoryVisualCard } from "@/components/CategoryVisualCard";

interface Category {
  id: string;
  category_name: string;
  image_url?: string | null;
}

interface ServiceCountLookup {
  subcategories?: {
    categories?: {
      id?: string;
    } | null;
  } | null;
}

interface DashboardGridClientProps {
  categories: Category[];
  categoryServiceCounts?: Record<string, number>;
  availableServices?: ServiceCountLookup[];
  upcomingServices?: UpcomingService[];
  banners?: BannerItem[];
  isServiceable?: boolean;
  hasAddress?: boolean;
  userPincode?: string;
  userCity?: string;
}

export default function DashboardGridClient({
  categories,
  categoryServiceCounts,
  availableServices = [],
  upcomingServices = [],
  banners = [],
  isServiceable = true,
  hasAddress = true,
  userPincode = "",
  userCity = "",
}: DashboardGridClientProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const triggerChangeLocation = () => {
    router.push("/customer/profile/addresses");
  };

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const msg = userPincode
      ? `⚠️ Service is not yet live in pincode ${userPincode}. Click "Notify Me!" above.`
      : `⚠️ Service is not yet live in your area. Click "Notify Me!" above.`;
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Blocked Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-white text-xs md:text-sm font-bold px-6 py-3 rounded-2xl shadow-xl border border-secondary/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-secondary text-base">info</span>
          {toastMessage}
        </div>
      )}

      {/* No Address Prompt */}
      {!hasAddress && (
        <div className="bg-secondary/15 border border-secondary/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-primary">
            <span className="material-symbols-outlined text-secondary text-base">place</span>
            <span>Check service availability in your area</span>
          </div>
          <button
            type="button"
            onClick={triggerChangeLocation}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shrink-0"
          >
            Set Location
          </button>
        </div>
      )}

      {/* Unserviceable Hero Banner vs Serviceable Carousel */}
      {!isServiceable ? (
        <UnserviceableHeroBanner
          currentPincode={userPincode}
          currentCity={userCity}
          onChangeLocationClick={triggerChangeLocation}
        />
      ) : (
        <DashboardCarousel banners={banners} />
      )}

      {/* Services We Offer Section */}
      <section className="mb-8 md:mb-12">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-headline text-lg md:text-xl font-extrabold text-on-surface">
              {!isServiceable ? "Services We Offer" : "Explore Categories"}
            </h2>
            <p className="text-on-surface-variant text-xs md:text-sm">
              {!isServiceable
                ? "Services will be available as soon as PHS launches in your area"
                : "Select a category to view available services"}
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const serviceCount =
              categoryServiceCounts?.[cat.id] ??
              availableServices.filter((s) => s.subcategories?.categories?.id === cat.id).length;

            const catSlug = cat.category_name
              .toLowerCase()
              .replace(/[,\s]+/g, "-")
              .replace(/&/g, "and");

            if (!isServiceable) {
              return (
                <div
                  key={cat.id}
                  onClick={handleBlockedClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleBlockedClick(e as unknown as React.MouseEvent);
                    }
                  }}
                  className="cursor-not-allowed active:scale-98 transition-transform"
                >
                  <CategoryVisualCard
                    imageUrl={cat.image_url}
                    iconName="category"
                    title={cat.category_name}
                    footerText="Coverage Pending"
                    dimmed
                  />
                </div>
              );
            }

            return (
              <Link
                key={cat.id}
                href={`/customer/services/${catSlug}`}
                className="cursor-pointer active:scale-98 transition-transform block group"
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
            <div className="col-span-2 sm:col-span-4 text-center py-8 text-on-surface-variant text-sm">
              No categories available.
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Services (Coming Soon) */}
      {upcomingServices.length > 0 && (
        <ComingSoonStrip
          services={upcomingServices}
          hrefFor={(service) => {
            const catName = service.subcategories?.categories?.category_name || "services";
            const catSlug = catName.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
            return `/customer/services/${catSlug}/${service.id}`;
          }}
        />
      )}
    </div>
  );
}
