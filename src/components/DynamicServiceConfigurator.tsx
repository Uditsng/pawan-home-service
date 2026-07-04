"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Service, ServiceVariant, ServiceAddon, PricingModel, ServicePricingRule } from "@/lib/types";
import { calculatePricingBreakdown, formatDuration } from "@/utils/pricingEngine";
import AddToCartButton from "@/components/AddToCartButton";
import { BookingState } from "@/utils/bookingValidation";
import VariantSelector from "./booking/VariantSelector";
import AreaSelector from "./booking/AreaSelector";
import QuantitySelector from "./booking/QuantitySelector";
import DistanceSelector from "./booking/DistanceSelector";
import AddonSelector from "./booking/AddonSelector";
import PriceSummary from "./booking/PriceSummary";

interface DynamicServiceConfiguratorProps {
  service: Service;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  surchargeRules: ServicePricingRule[];
  categorySlug: string;
  subcategoryName: string;
  iconName: string;
}

export default function DynamicServiceConfigurator({
  service,
  variants = [],
  addons = [],
  surchargeRules = [],
  categorySlug,
  subcategoryName,
  iconName,
}: DynamicServiceConfiguratorProps) {
  const model = (service.pricing_model || "fixed") as PricingModel;
  const config = (service.pricing_config || {}) as Record<string, unknown>;

  // Initialize booking state dynamically based on the pricing model
  const [bookingState, setBookingState] = useState<BookingState>(() => {
    const minHours = Number(config.min_hours ?? 1);
    const minArea = Number(config.min_area ?? 500);
    const minQty = Number(config.min_qty ?? 1);

    return {
      serviceId: service.id,
      pricingModel: model,
      selectedVariantId: variants[0]?.id || null,
      selectedAddons: {},
      areaSqft: model === "area" || model === "hybrid" ? minArea : null,
      quantity: model === "quantity" || model === "hybrid" ? minQty : null,
      durationMinutes: model === "hourly" || model === "hybrid" ? minHours * 60 : null,
      distanceKm: model === "distance" || model === "hybrid" ? 1 : null,
      date: null,
      time: null,
      addressId: null,
      formAnswers: {},
    };
  });

  // Handlers for state updates
  const handleVariantSelect = (variantId: string) => {
    setBookingState((prev) => ({ ...prev, selectedVariantId: variantId }));
  };

  const handleAreaChange = (area: number) => {
    setBookingState((prev) => ({ ...prev, areaSqft: area }));
  };

  const handleQuantityChange = (qty: number) => {
    setBookingState((prev) => ({ ...prev, quantity: qty }));
  };

  const handleDistanceChange = (km: number) => {
    setBookingState((prev) => ({ ...prev, distanceKm: km }));
  };

  const handleAddonChange = (addonId: string, qty: number, maxQty: number) => {
    setBookingState((prev) => {
      const nextAddons = { ...prev.selectedAddons };
      const newQty = Math.max(0, Math.min(maxQty, qty));
      if (newQty === 0) {
        delete nextAddons[addonId];
      } else {
        nextAddons[addonId] = newQty;
      }
      return { ...prev, selectedAddons: nextAddons };
    });
  };

  // Derived selected variant
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === bookingState.selectedVariantId) || null;
  }, [variants, bookingState.selectedVariantId]);

  // Derived active addons list
  const activeAddons = useMemo(() => {
    return addons
      .filter((a) => (bookingState.selectedAddons[a.id] || 0) > 0)
      .map((a) => ({
        id: a.id,
        title: a.title,
        price: a.price,
        quantity: bookingState.selectedAddons[a.id],
      }));
  }, [addons, bookingState.selectedAddons]);

  // Compute breakdown dynamically via Centralized Pricing Engine
  const breakdown = useMemo(() => {
    const variantPrice = selectedVariant ? Number(selectedVariant.price) : null;
    return calculatePricingBreakdown({
      pricingModel: model,
      basePrice: Number(service.base_price || 0),
      pricingConfig: service.pricing_config || {},
      variantPrice,
      durationMinutes: bookingState.durationMinutes || undefined,
      areaSqft: bookingState.areaSqft || undefined,
      quantity: bookingState.quantity || undefined,
      distanceKm: bookingState.distanceKm || undefined,
      addons: activeAddons,
      scheduledDate: new Date(),
      surchargeRules,
      isMember: false,
    });
  }, [
    model,
    service,
    selectedVariant,
    bookingState.durationMinutes,
    bookingState.areaSqft,
    bookingState.quantity,
    bookingState.distanceKm,
    activeAddons,
    surchargeRules,
  ]);

  // Compile schedule/booking URL params
  const scheduleUrl = useMemo(() => {
    const params = new URLSearchParams({
      serviceId: service.id,
    });

    if (model === "hourly" && bookingState.durationMinutes) {
      params.set("duration", bookingState.durationMinutes.toString());
    } else if (model === "area" && bookingState.areaSqft) {
      params.set("areaSqft", bookingState.areaSqft.toString());
    } else if (model === "quantity" && bookingState.quantity) {
      params.set("quantity", bookingState.quantity.toString());
    } else if (model === "distance" && bookingState.distanceKm) {
      params.set("distanceKm", bookingState.distanceKm.toString());
    } else if (model === "hybrid") {
      if (bookingState.durationMinutes) params.set("duration", bookingState.durationMinutes.toString());
      if (bookingState.areaSqft) params.set("areaSqft", bookingState.areaSqft.toString());
      if (bookingState.quantity) params.set("quantity", bookingState.quantity.toString());
      if (bookingState.distanceKm) params.set("distanceKm", bookingState.distanceKm.toString());
    }

    if (bookingState.selectedVariantId) {
      params.set("variantId", bookingState.selectedVariantId);
    }

    const chosenAddons = Object.entries(bookingState.selectedAddons)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    if (chosenAddons) {
      params.set("addons", chosenAddons);
    }

    return `/customer/checkout/schedule?${params.toString()}`;
  }, [service.id, model, bookingState,]);

  // Cart item compile
  const cartItem = useMemo(() => {
    return {
      serviceId: service.id,
      title: service.title,
      iconName,
      basePrice: breakdown.total_price,
      subcategoryName,
      categorySlug,
      pricingModel: model,
      selectedDuration: model === "hourly" ? (bookingState.durationMinutes || undefined) : undefined,
    };
  }, [service, iconName, breakdown.total_price, subcategoryName, categorySlug, model, bookingState.durationMinutes]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">
      {/* 1. Variants Selection (if any) */}
      <VariantSelector
        variants={variants}
        selectedVariantId={bookingState.selectedVariantId}
        onSelect={handleVariantSelect}
      />

      {/* 2. Pricing Model Configurator Inputs */}
      <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
        <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">
            {model === "hourly" ? "schedule" : "tune"}
          </span>{" "}
          {model === "hourly" ? "Select service duration" : "Service Parameters"}
        </h3>

        {/* Fixed Price (No Inputs) */}
        {model === "fixed" && (
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            This service has a standard flat fee. Simply select any required add-ons and proceed to check out.
          </p>
        )}

        {/* Inspection Fee */}
        {model === "inspection" && (
          <div className="space-y-2">
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              This is an <strong>Inspection & Quotation-based service</strong>.
            </p>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside bg-surface p-3.5 rounded-xl border border-outline-variant/10 font-medium">
              <li>You pay a minimal base inspection fee of <strong>₹{breakdown.base_price}</strong> now.</li>
              <li>The professional visits and examines the work.</li>
              <li>They submit a detailed quotation (labor + materials) in the app.</li>
              <li>Work starts only after you review and approve the quotation!</li>
            </ul>
          </div>
        )}

        {/* Hourly Inputs */}
        {model === "hourly" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {[30, 60, 90, 120, 180].map((mins) => {
                const hrs = mins / 60;
                const isSelected = bookingState.durationMinutes === mins;
                const minH = Number(config.min_hours || 0.5);
                const maxH = Number(config.max_hours || 24);
                if (hrs < minH || hrs > maxH) return null;

                const label = formatDuration(mins);

                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setBookingState((prev) => ({ ...prev, durationMinutes: mins }))}
                    className={`px-5 py-3 rounded-2xl border font-bold text-xs transition-all duration-200 cursor-pointer flex-1 min-w-[90px] text-center justify-center items-center active:scale-95 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-surface border-outline-variant/20 hover:bg-surface-container-low hover:border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Area Input */}
        {model === "area" && (
          <AreaSelector
            areaSqft={bookingState.areaSqft || 500}
            minArea={Number(config.min_area || 200)}
            maxArea={Number(config.max_area || 5000)}
            areaSlabs={config.area_slabs as { min: number; max?: number; rate: number }[] | undefined}
            onChange={handleAreaChange}
          />
        )}

        {/* Quantity Input */}
        {model === "quantity" && (
          <QuantitySelector
            quantity={bookingState.quantity || 1}
            minQty={Number(config.min_qty || 1)}
            maxQty={Number(config.max_qty || 100)}
            unitName={String(config.unit_name || "units")}
            pricePerUnit={Number(config.price_per_unit || service.base_price)}
            onChange={handleQuantityChange}
          />
        )}

        {/* Distance Input */}
        {model === "distance" && (
          <DistanceSelector
            distanceKm={bookingState.distanceKm || 1}
            baseDistanceFee={Number(config.base_distance_fee || service.base_price)}
            freeKm={Number(config.free_km || 0)}
            pricePerKm={Number(config.price_per_km || 0)}
            onChange={handleDistanceChange}
          />
        )}

        {/* Hybrid Inputs */}
        {model === "hybrid" && (
          <div className="space-y-4 divide-y divide-outline-variant/15">
            <div className="pt-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Duration (Hours)</label>
              <input
                type="range"
                min={60}
                max={480}
                step={60}
                value={bookingState.durationMinutes || 60}
                onChange={(e) => setBookingState((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) }))}
                className="w-full accent-primary h-1.5 bg-outline-variant/15 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-primary mt-1">
                <span>1 Hour</span>
                <span>{(bookingState.durationMinutes || 60) / 60} Hours</span>
                <span>8 Hours</span>
              </div>
            </div>
            <div className="pt-4">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Area Size (Sqft)</label>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={bookingState.areaSqft || 500}
                onChange={(e) => setBookingState((prev) => ({ ...prev, areaSqft: parseInt(e.target.value, 10) }))}
                className="w-full accent-primary h-1.5 bg-outline-variant/15 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-primary mt-1">
                <span>100 sqft</span>
                <span>{bookingState.areaSqft} sqft</span>
                <span>2000 sqft</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Add-ons Selection */}
      <AddonSelector
        addons={addons}
        selectedAddonIds={bookingState.selectedAddons}
        onChange={handleAddonChange}
      />

      {/* 4. Price Summary Bottom Sticky Bar */}
      <PriceSummary
        breakdown={breakdown}
        pricingModel={model}
        variant="sticky"
        cartButton={
          model !== "inspection" && (
            <AddToCartButton
              item={cartItem}
              className="flex-none! w-auto! rounded-xl! px-4 md:px-6 h-10 md:h-12 text-xs md:text-sm font-bold transition-all duration-200 active:scale-95"
            />
          )
        }
        bookButton={
          <Link
            href={scheduleUrl}
            className="h-10 md:h-12 px-6 md:px-8 py-2.5 md:py-3 bg-primary text-white rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center font-headline"
          >
            Book Now
          </Link>
        }
      />
    </div>
  );
}
