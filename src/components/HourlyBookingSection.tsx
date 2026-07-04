"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { formatDuration } from "@/utils/pricingEngine";

interface PricingOption {
  duration_minutes: number;
  price: number;
  original_price?: number;
}

interface HourlyBookingSectionProps {
  serviceId: string;
  serviceTitle: string;
  iconName: string;
  categorySlug: string;
  subcategoryName: string;
  basePrice: number;
  pricingModel: "fixed" | "hourly";
  pricingOptions: PricingOption[];
  packages?: { id: string; title: string; price: number; original_price?: number }[];
}

export default function HourlyBookingSection({
  serviceId,
  serviceTitle,
  iconName,
  categorySlug,
  subcategoryName,
  basePrice,
  pricingModel,
  pricingOptions = [],
  packages = [],
}: HourlyBookingSectionProps) {
  const isHourly = pricingModel === "hourly";

  // Default to 1 hour (60 mins) or first option if available
  const initialDuration = useMemo(() => {
    if (!isHourly || pricingOptions.length === 0) return 60;
    const hasOneHour = pricingOptions.find((o) => o.duration_minutes === 60);
    return hasOneHour ? 60 : pricingOptions[0].duration_minutes;
  }, [isHourly, pricingOptions]);

  const [selectedDuration, setSelectedDuration] = useState<number>(initialDuration);

  // Default to first package selected if packages are present
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(() => {
    if (packages && packages.length > 0) {
      return [packages[0].id];
    }
    return [];
  });

  const activePrice = useMemo(() => {
    if (isHourly && pricingOptions.length > 0) {
      const option = pricingOptions.find((o) => o.duration_minutes === selectedDuration);
      return option ? Number(option.price) : basePrice;
    }
    if (!isHourly && packages && packages.length > 0) {
      if (selectedPackageIds.length === 0) return 0;
      return selectedPackageIds.reduce((sum, id) => {
        const pkg = packages.find((p) => p.id === id);
        return sum + (pkg ? Number(pkg.price) : 0);
      }, 0);
    }
    return basePrice;
  }, [isHourly, selectedDuration, pricingOptions, basePrice, packages, selectedPackageIds]);

  const durationLabel = (minutes: number) => {
    return formatDuration(minutes);
  };

  const scheduleUrl = useMemo(() => {
    const params = new URLSearchParams({
      serviceId,
    });
    if (isHourly) {
      params.set("duration", selectedDuration.toString());
    } else if (packages && packages.length > 0 && selectedPackageIds.length > 0) {
      params.set("selectedPackages", selectedPackageIds.join(","));
    }
    return `/customer/checkout/schedule?${params.toString()}`;
  }, [serviceId, selectedDuration, isHourly, packages, selectedPackageIds]);

  const hasPackages = !isHourly && packages && packages.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Package Selection Card (for Fixed Services with Packages) */}
      {hasPackages && (
        <section className="max-w-3xl mx-auto">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-secondary/10 px-3 py-1 rounded-full text-secondary font-bold text-xs border border-secondary/20">
                <span className="material-symbols-outlined text-xs font-bold">checklist</span> Service Selection
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-on-surface font-headline tracking-tighter">
                Select Your Services
              </h3>
              <p className="text-xs md:text-sm text-on-surface-variant max-w-lg leading-relaxed font-medium">
                Choose one or more items from our menu below. Your final quote will update dynamically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {packages.map((pkg) => {
                  const isChecked = selectedPackageIds.includes(pkg.id);
                  const toggleCheck = () => {
                    setSelectedPackageIds((prev) => {
                      if (prev.includes(pkg.id)) {
                        if (prev.length === 1) return prev; // Keep at least one selected
                        return prev.filter((id) => id !== pkg.id);
                      }
                      return [...prev, pkg.id];
                    });
                  };

                  return (
                    <div
                      key={pkg.id}
                      onClick={toggleCheck}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none active:scale-[0.99] duration-200 ${
                        isChecked
                          ? "bg-primary/5 border-primary text-primary shadow-xs"
                          : "bg-surface border-outline-variant/15 text-on-surface hover:bg-surface-container-low hover:border-outline-variant/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`material-symbols-outlined text-xl shrink-0 ${isChecked ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                          {isChecked ? "check_box" : "check_box_outline_blank"}
                        </span>
                        <span className="text-xs md:text-sm font-bold truncate pr-2">{pkg.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pkg.original_price && Number(pkg.original_price) > Number(pkg.price) && (
                          <span className="text-[10px] md:text-xs line-through opacity-50 font-semibold">₹{pkg.original_price}</span>
                        )}
                        <span className="text-xs md:text-sm font-black">₹{pkg.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Pricing & Duration Selection Card */}
      {isHourly && pricingOptions.length > 0 && (
        <section className="max-w-3xl mx-auto">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4 flex-1">
                <div className="inline-flex items-center gap-1.5 bg-secondary/10 px-3 py-1 rounded-full text-secondary font-bold text-xs border border-secondary/20">
                  <span className="material-symbols-outlined text-xs font-bold">schedule</span> Duration Selection
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-on-surface font-headline tracking-tighter">
                  Select Service Duration
                </h3>
                
                {/* Duration options list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {pricingOptions.map((opt) => {
                    const isSelected = selectedDuration === opt.duration_minutes;
                    return (
                      <button
                        key={opt.duration_minutes}
                        type="button"
                        onClick={() => setSelectedDuration(opt.duration_minutes)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          isSelected
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/10"
                            : "bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low hover:border-outline-variant/30"
                        }`}
                      >
                        {durationLabel(opt.duration_minutes)}
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          {opt.original_price && Number(opt.original_price) > Number(opt.price) && (
                            <span className="text-[9px] line-through opacity-60">₹{opt.original_price}</span>
                          )}
                          <span className={isSelected ? "text-[10px] text-white" : "text-[10px] text-on-surface"}>₹{opt.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Price Display */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 min-w-[220px] shadow-xs flex flex-col justify-center shrink-0">
                <span className="text-[10px] md:text-xs text-on-surface-variant font-bold uppercase tracking-wider block mb-1">
                  Selected Duration Price
                </span>
                {(() => {
                  const currentOpt = pricingOptions.find(o => o.duration_minutes === selectedDuration);
                  const origPrice = currentOpt?.original_price;
                  return (
                    <div className="flex flex-col mb-2">
                      {origPrice && Number(origPrice) > Number(activePrice) && (
                        <span className="text-xs line-through text-on-surface-variant/60 font-medium">₹{origPrice}</span>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-primary font-headline tracking-tighter">₹{activePrice}</span>
                        <span className="text-xs text-on-surface-variant font-medium">/ {durationLabel(selectedDuration)}</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="border-t border-outline-variant/30 pt-2 mt-2">
                  <span className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider block mb-1">Pricing Model</span>
                  <span className="text-xs text-secondary font-extrabold">Duration-Based Billing</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Customer Dispute Warnings / Disclaimer */}
      {isHourly && (
        <section className="max-w-3xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 shadow-xs">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">gavel</span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-on-surface">Hourly Service Policy & Terms</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                • Hourly services are charged based on booked time, not task completion.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                • If additional time is required, your professional may request an extension. Additional work will continue only after your approval and payment.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 4. Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/30 p-3 md:p-4 z-50 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg md:text-xl font-extrabold font-headline text-on-surface tracking-tighter">₹{activePrice}</span>
            </div>
            <div className="text-[10px] md:text-xs text-on-surface-variant font-medium">
              {isHourly
                ? `Price for ${durationLabel(selectedDuration)}`
                : hasPackages
                ? `${selectedPackageIds.length} Selected Package${selectedPackageIds.length === 1 ? "" : "s"}`
                : "Standard Fixed Rate"}
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[280px]">
            <AddToCartButton
              item={{
                serviceId,
                title: serviceTitle,
                iconName,
                basePrice: activePrice,
                subcategoryName,
                categorySlug,
                pricingModel,
                selectedDuration: isHourly ? selectedDuration : undefined,
                selectedPackages: hasPackages ? selectedPackageIds.join(",") : undefined,
              }}
            />
            <Link
              href={scheduleUrl}
              className="px-6 md:px-8 py-2.5 text-xs md:text-sm bg-primary text-white font-headline font-bold rounded-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center shrink-0"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
