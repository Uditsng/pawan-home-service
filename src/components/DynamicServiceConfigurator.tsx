"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Service, ServiceVariant, ServiceAddon, PricingModel } from "@/lib/types";
import { calculatePricingBreakdown } from "@/utils/pricingEngine";
import AddToCartButton from "@/components/AddToCartButton";

interface DynamicServiceConfiguratorProps {
  service: Service;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  surchargeRules: any[];
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
  const config = service.pricing_config || {};

  // Form selections state
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    return variants[0]?.id || "";
  });

  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    return config.min_hours ? config.min_hours * 60 : 60;
  });

  const [areaSqft, setAreaSqft] = useState<number>(() => {
    return config.min_area || 500;
  });

  const [quantity, setQuantity] = useState<number>(() => {
    return config.min_qty || 1;
  });

  const [distanceKm, setDistanceKm] = useState<number>(1);

  const [selectedAddonIds, setSelectedAddonIds] = useState<Record<string, number>>({});

  // Reset/sync state on config changes
  useEffect(() => {
    if (variants[0]) {
      setSelectedVariantId(variants[0].id);
    }
  }, [variants]);

  // Derived selected objects
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [variants, selectedVariantId]);

  const activeAddons = useMemo(() => {
    return addons
      .filter((a) => selectedAddonIds[a.id] > 0)
      .map((a) => ({
        id: a.id,
        title: a.title,
        price: a.price,
        quantity: selectedAddonIds[a.id],
      }));
  }, [addons, selectedAddonIds]);

  // Compute breakdown dynamically
  const breakdown = useMemo(() => {
    const variantPrice = selectedVariant ? Number(selectedVariant.price) : null;
    return calculatePricingBreakdown({
      pricingModel: model,
      basePrice: Number(service.base_price || 0),
      pricingConfig: config,
      variantPrice,
      durationMinutes,
      areaSqft,
      quantity,
      distanceKm,
      addons: activeAddons,
      scheduledDate: new Date(), // use current time for client preview
      surchargeRules,
      isMember: false, // can check session or user profile in next steps
    });
  }, [
    model,
    service,
    config,
    selectedVariant,
    durationMinutes,
    areaSqft,
    quantity,
    distanceKm,
    activeAddons,
    surchargeRules,
  ]);

  // Handle addon quantity modification
  const handleAddonChange = (addonId: string, qty: number, maxQty: number) => {
    setSelectedAddonIds((prev) => {
      const next = { ...prev };
      const newQty = Math.max(0, Math.min(maxQty, qty));
      if (newQty === 0) {
        delete next[addonId];
      } else {
        next[addonId] = newQty;
      }
      return next;
    });
  };

  // Compile schedule/booking URL params
  const scheduleUrl = useMemo(() => {
    const params = new URLSearchParams({
      serviceId: service.id,
    });
    if (model === "hourly") {
      params.set("duration", durationMinutes.toString());
    } else if (model === "area") {
      params.set("areaSqft", areaSqft.toString());
    } else if (model === "quantity") {
      params.set("quantity", quantity.toString());
    } else if (model === "distance") {
      params.set("distanceKm", distanceKm.toString());
    } else if (model === "hybrid") {
      params.set("duration", durationMinutes.toString());
      params.set("areaSqft", areaSqft.toString());
      params.set("quantity", quantity.toString());
      params.set("distanceKm", distanceKm.toString());
    }
    
    if (selectedVariantId) {
      params.set("variantId", selectedVariantId);
    }
    
    const chosenAddons = Object.entries(selectedAddonIds)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    if (chosenAddons) {
      params.set("addons", chosenAddons);
    }

    return `/customer/checkout/schedule?${params.toString()}`;
  }, [service.id, model, durationMinutes, areaSqft, quantity, distanceKm, selectedVariantId, selectedAddonIds]);

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
      selectedDuration: model === "hourly" ? durationMinutes : undefined,
    };
  }, [service, iconName, breakdown.total_price, subcategoryName, categorySlug, model, durationMinutes]);

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Configuration Controls */}
      <div className="lg:col-span-2 space-y-6">
        {/* 1. Variants Selection (if any) */}
        {variants.length > 0 && (
          <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
            <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">category</span> Select Option / Variant
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none active:scale-[0.99] duration-200 ${
                      isSelected
                        ? "bg-primary/5 border-primary text-primary shadow-xs"
                        : "bg-surface border-outline-variant/15 text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold tracking-tight mb-1">{v.title}</h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                        {v.description || "Tailored option specifically for you."}
                      </p>
                    </div>
                    <div className="flex justify-between items-baseline mt-4 border-t border-outline-variant/10 pt-2">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Starting from</span>
                      <span className="text-sm font-black">₹{v.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. Pricing Model Configurator Inputs */}
        <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
          <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">tune</span> Service Parameters
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
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Select Service Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {[60, 120, 180, 240, 300, 360, 480].map((mins) => {
                  const hrs = mins / 60;
                  const isSelected = durationMinutes === mins;
                  const minH = config.min_hours || 1;
                  const maxH = config.max_hours || 24;
                  if (hrs < minH || hrs > maxH) return null;

                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                          : "bg-surface border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant"
                      }`}
                    >
                      {hrs} Hour{hrs > 1 ? "s" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Area Input */}
          {model === "area" && (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Service Area Size (Sqft)
                </label>
                <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-black text-xs">
                  {areaSqft} Sqft
                </div>
              </div>
              <input
                type="range"
                min={config.min_area || 200}
                max={config.max_area || 5000}
                step={50}
                value={areaSqft}
                onChange={(e) => setAreaSqft(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-2 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold uppercase">
                <span>Min: {config.min_area || 200} Sqft</span>
                <span>Max: {config.max_area || 5000} Sqft</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Manual Input</span>
                  <input
                    type="number"
                    value={areaSqft}
                    onChange={(e) => setAreaSqft(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full border border-outline-variant/20 rounded-lg p-2.5 bg-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs font-bold"
                  />
                </div>
                {config.area_slabs && config.area_slabs.length > 0 && (
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">Slab Rates</span>
                    <div className="bg-surface p-2 rounded-lg border border-outline-variant/15 text-[10px] text-on-surface-variant/80 font-medium space-y-0.5">
                      {config.area_slabs.map((s: { min: number; max?: number; rate: number }, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{s.min}{s.max ? `-${s.max}` : "+"} sqft</span>
                          <span className="font-black text-primary">₹{s.rate}/sqft</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quantity Input */}
          {model === "quantity" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Quantity ({config.unit_name || "units"})
                  </label>
                  <p className="text-[10px] text-on-surface-variant/60 font-medium mt-0.5">
                    Price: ₹{config.price_per_unit || service.base_price} per {config.unit_name || "unit"}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-surface p-1 rounded-xl border border-outline-variant/25 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(config.min_qty || 1, q - 1))}
                    disabled={quantity <= (config.min_qty || 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/10 text-on-surface hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm font-black">remove</span>
                  </button>
                  <span className="w-8 text-center text-sm font-headline font-black text-primary">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(config.max_qty || 100, q + 1))}
                    disabled={quantity >= (config.max_qty || 100)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/10 text-on-surface hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm font-black">add</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Distance Input */}
          {model === "distance" && (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Estimated Travel Distance (KM)
                </label>
                <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-black text-xs">
                  {distanceKm} KM
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={150}
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-2 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold uppercase">
                <span>1 KM</span>
                <span>150 KM</span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/10 text-xs text-on-surface-variant font-medium leading-relaxed">
                Base Fee: <strong>₹{config.base_distance_fee || service.base_price}</strong> (includes first {config.free_km || 0} KM).
                <br />
                Additional distance is billed at <strong>₹{config.price_per_km || 0}/KM</strong>.
              </div>
            </div>
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
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 bg-outline-variant/15 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold text-primary mt-1">
                  <span>1 Hour</span>
                  <span>{durationMinutes / 60} Hours</span>
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
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 bg-outline-variant/15 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold text-primary mt-1">
                  <span>100 sqft</span>
                  <span>{areaSqft} sqft</span>
                  <span>2000 sqft</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. Add-ons Selection */}
        {addons.length > 0 && (
          <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs">
            <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">library_add</span> Available Add-ons
            </h3>
            <div className="space-y-3">
              {addons.map((a) => {
                const currentQty = selectedAddonIds[a.id] || 0;
                const isSelected = currentQty > 0;
                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-surface border-outline-variant/10 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs md:text-sm font-bold text-on-surface truncate">{a.title}</span>
                        {a.is_required && (
                          <span className="bg-red-500/10 text-red-600 font-bold text-[8px] px-1.5 py-0.5 rounded-full border border-red-500/25 tracking-widest uppercase">Required</span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed line-clamp-1">{a.description}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-black text-primary font-headline">₹{a.price}</span>

                      {/* Addon Selector Counter */}
                      <div className="flex items-center gap-2.5 bg-surface-container p-0.5 rounded-lg border border-outline-variant/15">
                        <button
                          type="button"
                          onClick={() => handleAddonChange(a.id, currentQty - 1, a.max_quantity)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 cursor-pointer text-xs"
                          disabled={currentQty === 0}
                        >
                          <span className="material-symbols-outlined text-xs font-black">remove</span>
                        </button>
                        <span className="w-5 text-center text-xs font-headline font-black text-primary">{currentQty}</span>
                        <button
                          type="button"
                          onClick={() => handleAddonChange(a.id, currentQty + 1, a.max_quantity)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 cursor-pointer text-xs"
                          disabled={currentQty >= a.max_quantity}
                        >
                          <span className="material-symbols-outlined text-xs font-black">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Pricing Summary & Checkout Panel */}
      <div className="lg:col-span-1 space-y-6">
        <section className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-xs sticky top-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-xl pointer-events-none" />
          
          <h3 className="text-base font-bold text-primary font-headline mb-4 flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-emerald-600">receipt_long</span> Booking Summary
          </h3>

          <div className="space-y-3 relative z-10 text-xs font-medium text-on-surface-variant">
            {/* Base Price Component */}
            <div className="flex justify-between border-b border-outline-variant/10 pb-2">
              <span>Base Rate ({model})</span>
              <span className="font-bold text-on-surface">₹{breakdown.base_price}</span>
            </div>

            {/* Addons Total */}
            {breakdown.addons_total > 0 && (
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>Add-ons Total</span>
                <span className="font-bold text-on-surface">₹{breakdown.addons_total}</span>
              </div>
            )}

            {/* Travel Fee / General Fees */}
            {breakdown.travel_fee > 0 && (
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>Travel / Visit Surcharge</span>
                <span className="font-bold text-on-surface">₹{breakdown.travel_fee}</span>
              </div>
            )}

            {/* Surcharges breakdown */}
            {breakdown.surcharges && breakdown.surcharges.length > 0 && (
              <div className="space-y-1.5 border-b border-outline-variant/10 pb-2">
                {breakdown.surcharges.map((s, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-secondary font-semibold">{s.name}</span>
                    <span className={`font-bold ${s.amount < 0 ? 'text-green-600' : 'text-on-surface'}`}>
                      {s.amount < 0 ? "-" : "+"}₹{Math.abs(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* GST (18%) */}
            {breakdown.gst_amount > 0 && (
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>GST (18%)</span>
                <span className="font-bold text-on-surface">₹{breakdown.gst_amount}</span>
              </div>
            )}

            {/* Final Payable amount */}
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-sm font-bold text-on-surface font-headline">Total Cost</span>
              <span className="text-2xl font-black text-primary font-headline tracking-tighter">
                ₹{breakdown.total_price}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={scheduleUrl}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:scale-[1.01] hover:shadow-xl active:scale-[0.99] transition-all cursor-pointer block"
            >
              Book Professional Now
            </Link>

            {model !== "inspection" && (
              <AddToCartButton item={cartItem} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
