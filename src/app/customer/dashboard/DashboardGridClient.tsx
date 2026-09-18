"use client";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import UnserviceableHeroBanner from "@/components/UnserviceableHeroBanner";
import DashboardCarousel from "./DashboardCarousel";
import { ComingSoonStrip } from "@/components/ComingSoonStrip";
import { UpcomingService } from "@/utils/supabase/cachedServiceQueries";


import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryVisualCard } from "@/components/CategoryVisualCard";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  category?: string;
  image_url?: string | null;
  poster_url?: string | null;
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

interface DashboardGridClientProps {
  categories: Category[];
  availableServices: ServiceWithSubcategory[];
  upcomingServices?: UpcomingService[];
  isServiceable?: boolean;
  hasAddress?: boolean;
  userPincode?: string;
  userCity?: string;
}

export default function DashboardGridClient({
  categories,
  availableServices,
  upcomingServices = [],
  isServiceable = true,
  hasAddress = true,
  userPincode = "",
  userCity = "",
}: DashboardGridClientProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  const triggerChangeLocation = () => {
    // Trigger location header button or navigate to addresses
    const headerBtn = document.querySelector('button[title*="address"], header button') as HTMLButtonElement | null;
    if (headerBtn) {
      headerBtn.click();
    } else {
      router.push("/customer/profile/addresses");
    }
  };

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = userPincode
      ? `⚠️ PHS service is not yet live in pincode ${userPincode}. Click "Notify Me!" to request launch.`
      : `⚠️ PHS service is not yet live in your area. Click "Notify Me!" to request launch.`;
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (selectedCategoryId) {
    const servicesForCategory = availableServices.filter(
      (s) => s.subcategories?.categories?.id === selectedCategoryId
    );
    const activeCategoryName = categories.find((c) => c.id === selectedCategoryId)?.category_name || "Services";

    return (
      <section className="mb-8 md:mb-12">
        {/* Category Header with Back Button */}
        <div className="flex items-center gap-3 mb-5 md:mb-6">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-center text-on-surface active:bg-surface-container-high cursor-pointer transition-all active:scale-95"
            aria-label="Back to categories"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h3 className="font-headline text-lg md:text-xl font-extrabold text-on-surface">{activeCategoryName}</h3>
            <p className="text-on-surface-variant text-xs md:text-sm">Available services in this category</p>
          </div>
        </div>

        {/* Services Grid (keeping same layout style without sticking hovers) */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {servicesForCategory.map((service) => {
            const iconName = service.subcategories?.icon_name || "sparkles";
            const catSlug = (service.subcategories?.categories?.category_name || service.category || "services")
              .toLowerCase().replace(/[,\s]+/g, "-").replace(/&/g, "and");
            const isUpcoming = service.base_price === 0 || !service.base_price;

            return (
              <Link
                href={`/customer/services/${catSlug}/${service.id}`}
                key={service.id}
                className="glass-panel group relative block w-full overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="relative w-full aspect-4/3 bg-surface-container-low">
                  <ServiceCardThumbnail
                    imageUrl={service.image_url || service.poster_url}
                    iconName={iconName}
                    alt={service.title}
                    status={isUpcoming ? "upcoming" : undefined}
                    containerClassName="absolute inset-0 w-full h-full"
                    iconClassName="w-10 h-10 md:w-12 md:h-12 text-emerald-600 drop-shadow-sm"
                  />
                </div>
                <div className="p-2.5 sm:p-3 text-center">
                  <span className="block font-headline font-bold text-xs md:text-sm text-on-surface line-clamp-2 leading-tight min-h-9 items-center justify-center">{service.title}</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {isUpcoming ? (
                      <span className="text-[10px] sm:text-[11px] text-secondary font-black tracking-tight leading-none uppercase bg-primary/95 px-2 py-0.5 rounded-md shadow-xs">
                        Coming Soon
                      </span>
                    ) : (
                      <>
                        {service.original_price && (
                          <span className="text-[9px] md:text-[10px] text-on-surface-variant/50 line-through">₹{service.original_price}</span>
                        )}
                        <span className="text-[10px] md:text-[11px] text-primary font-bold tracking-tight">₹{service.base_price}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {servicesForCategory.length === 0 && (
            <div className="col-span-3 md:col-span-4 lg:col-span-5 text-center py-8 text-on-surface-variant text-sm">
              No active services available in this category right now.
            </div>
          )}
        </div>
      </section>
    );
  }

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
            <span className="material-symbols-outlined text-secondary text-base">location_on</span>
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
        <>
          <DashboardCarousel />
        </>
      )}

      {/* Services We Offer Section */}
      <section className="mb-8 md:mb-12">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-headline text-lg md:text-xl font-extrabold text-on-surface">
              {!isServiceable ? "Services we offer" : "Explore Categories"}
            </h3>
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
            const serviceCount = availableServices.filter(
              (s) => s.subcategories?.categories?.id === cat.id
            ).length;

            return (
              <div
                key={cat.id}
                onClick={(e) => {
                  if (!isServiceable) {
                    handleBlockedClick(e);
                    return;
                  }
                  const catSlug = cat.category_name
                    .toLowerCase()
                    .replace(/[,\s]+/g, "-")
                    .replace(/&/g, "and");
                  router.push(`/customer/services/${catSlug}`);
                }}
                className={
                  !isServiceable
                    ? "cursor-not-allowed active:scale-95 transition-transform"
                    : "cursor-pointer active:scale-95 transition-transform"
                }
              >
                <CategoryVisualCard
                  imageUrl={cat.image_url}
                  iconName="category"
                  title={cat.category_name}
                  footerText={
                    !isServiceable ? "Coverage Pending" : `${serviceCount} ${serviceCount === 1 ? "Service" : "Services"}`
                  }
                  dimmed={!isServiceable}
                />
              </div>
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
        <div className="bg-yellow-100 rounded-2xl">
          <ComingSoonStrip
            services={upcomingServices}
            hrefFor={(service) => {
              const catName = service.subcategories?.categories?.category_name || "services";
              const catSlug = catName.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
              return `/customer/services/${catSlug}/${service.id}`;
            }}
          />
        </div>
      )}
    </div>
  );
}
