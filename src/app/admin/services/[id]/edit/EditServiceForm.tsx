"use client";

import { useState, useActionState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { PricingModel, ServiceVariant, ServiceAddon } from "@/lib/types";
import { calculatePricingBreakdown, formatDuration, PricingInput } from "@/utils/pricingEngine";
import { FormFieldConfig } from "@/utils/bookingValidation";

type Subcategory = {
  id: string;
  subcategory_name: string;
  icon_name: string;
};

type Category = {
  id: string;
  category_name: string;
  subcategories: Subcategory[];
};

type FormActionState = {
  type: "success" | "error" | null;
  message: string | null;
};

type ServiceInitialData = {
  id: string;
  title: string;
  subcategory_id: string | null;
  image_url?: string | null;
  base_price: number;
  original_price?: number | null;
  price_breakdown?: string | null;
  description: string;
  pricing_model?: string;
  pricing_config?: PricingInput["pricingConfig"];
  form_fields?: FormFieldConfig[];
  gst_applicable?: boolean;
  status?: string | null;
  page_content?: {
    included_features?: string[] | null;
    excluded_features?: string[] | null;
    faqs?: { question: string; answer: string }[] | null;
  } | null;
};

export function EditServiceForm({
  categories,
  initialData,
  initialDurationRates = [],
  initialVariants = [],
  initialAddons = [],
  action
}: {
  categories: Category[];
  initialData: ServiceInitialData;
  initialDurationRates?: { duration: number; price: number }[];
  initialVariants?: ServiceVariant[];
  initialAddons?: ServiceAddon[];
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
}) {
  const [state, formAction, isPending] = useActionState(action, { type: null, message: null });

  // Tab State
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "variants" | "addons" | "content" | "preview" >("basic");

  // Core Form States
  const [title, setTitle] = useState(initialData.title);
  const [basePrice, setBasePrice] = useState(Number(initialData.base_price || 0));
  const [originalPrice, setOriginalPrice] = useState<number | null>(initialData.original_price ? Number(initialData.original_price) : null);
  const [description, setDescription] = useState(initialData.description);
  const [gstApplicable, setGstApplicable] = useState(initialData.gst_applicable !== false);
  const [pricingModel, setPricingModel] = useState(initialData.pricing_model || "fixed");

  // Selected Icon Preview
  const initialIcon = categories.flatMap(c => c.subcategories).find(s => s.id === initialData.subcategory_id)?.icon_name || "sparkles";
  const [selectedIcon, setSelectedIcon] = useState<string>(initialIcon);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string>(initialData.subcategory_id || "");

  // Page Content Lists
  const pageContent = initialData.page_content || {};
  const [includedItems, setIncludedItems] = useState<string[]>(pageContent.included_features?.length ? pageContent.included_features : [""]);
  const [excludedItems, setExcludedItems] = useState<string[]>(pageContent.excluded_features?.length ? pageContent.excluded_features : [""]);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>(pageContent.faqs?.length ? pageContent.faqs : [{ question: "", answer: "" }]);

  // Hourly Duration Table
  const [durationRates, setDurationRates] = useState<{ duration: number; price: number }[]>(
    initialDurationRates.length > 0 ? initialDurationRates : [{ duration: 60, price: 199 }]
  );

  // Area Builder Config preloading
  const pricingConfig = initialData.pricing_config || {};
  const [areaStrategy, setAreaStrategy] = useState<"flat" | "slab">(pricingConfig.area_slabs?.length ? "slab" : "flat");
  const [areaPricePerSqft, setAreaPricePerSqft] = useState(Number(pricingConfig.price_per_sqft || 2));
  const [areaMin, setAreaMin] = useState(Number(pricingConfig.min_area || 200));
  const [areaMax, setAreaMax] = useState(Number(pricingConfig.max_area || 5000));
  const areaStep = 1;
  const [areaSlabs, setAreaSlabs] = useState<{ min: number; max?: number; rate: number }[]>(
    pricingConfig.area_slabs?.length ? pricingConfig.area_slabs : [
      { min: 0, max: 500, rate: 1.5 },
      { min: 501, max: 1000, rate: 1.2 }
    ]
  );

  // Quantity Builder Config preloading
  const [qtyUnitName, setQtyUnitName] = useState(String(pricingConfig.unit_name || "Unit"));
  const [qtyRate, setQtyRate] = useState(Number(pricingConfig.price_per_unit || 150));
  const [qtyMin, setQtyMin] = useState(Number(pricingConfig.min_qty || 1));
  const [qtyMax, setQtyMax] = useState(Number(pricingConfig.max_qty || 100));

  // Distance Builder Config preloading
  const [distanceBaseFee, setDistanceBaseFee] = useState(Number(pricingConfig.base_distance_fee || 199));
  const [distanceFreeKm, setDistanceFreeKm] = useState(Number(pricingConfig.free_km || 5));
  const [distanceRatePerKm, setDistanceRatePerKm] = useState(Number(pricingConfig.price_per_km || 15));

  // Inspection Fee preloading
  const [inspectionFee, setInspectionFee] = useState(Number(pricingConfig.inspection_fee || 99));

  // Hybrid Config preloading
  const hybridComponents = pricingConfig.hybrid_components || {};
  const [hybridBaseFee, setHybridBaseFee] = useState(Number(hybridComponents.base_fee || 299));
  const [hybridHourlyRate, setHybridHourlyRate] = useState(Number(hybridComponents.hourly_rate || 100));
  const [hybridDistanceRate, setHybridDistanceRate] = useState(Number(hybridComponents.distance_rate || 10));
  const [hybridQtyRate, setHybridQtyRate] = useState(Number(hybridComponents.quantity_rate || 50));

  // Dynamic Booking Form Fields
  const formFields = initialData.form_fields || [];

  // Variants & Addons Lists
  const [variantsList, setVariantsList] = useState<{ title: string; description: string; price: number; original_price: number | null; duration_minutes: number | null }[]>(
    initialVariants.map(v => ({
      title: v.title,
      description: v.description || "",
      price: Number(v.price),
      original_price: v.original_price ? Number(v.original_price) : null,
      duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null
    }))
  );

  const [addonsList, setAddonsList] = useState<{ title: string; description: string; price: number; is_required: boolean; max_quantity: number }[]>(
    initialAddons.map(a => ({
      title: a.title,
      description: a.description || "",
      price: Number(a.price),
      is_required: a.is_required === true,
      max_quantity: Number(a.max_quantity) || 1
    }))
  );

  // Live Preview Selections
  const [prevVariantIdx, setPrevVariantIdx] = useState<number | null>(null);
  const [prevAddonsQty, setPrevAddonsQty] = useState<Record<number, number>>({});
  const [prevAreaSqft, setPrevAreaSqft] = useState(500);
  const [prevQty, setPrevQty] = useState(1);
  const [prevDistanceKm, setPrevDistanceKm] = useState(1);
  const [prevDurationMins, setPrevDurationMins] = useState(60);

  // Subcategory select change
  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subcatId = e.target.value;
    setSelectedSubcatId(subcatId);
    for (const cat of categories) {
      const subcat = cat.subcategories.find((s) => s.id === subcatId);
      if (subcat) {
        setSelectedIcon(subcat.icon_name);
        return;
      }
    }
    setSelectedIcon("sparkles");
  };

  // List helpers
  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number, val: string) =>
    setter((prev) => { const n = [...prev]; n[i] = val; return n; });
  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((prev) => [...prev, ""]);
  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number) =>
    setter((prev) => prev.filter((_, idx) => idx !== i));

  // FAQ helpers
  const updateFaq = (i: number, field: "question" | "answer", val: string) =>
    setFaqs((prev) => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
  const addFaq = () => setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setFaqs((prev) => prev.filter((_, idx) => idx !== i));

  // Compile pricing config object
  const pricingConfigObj = useMemo(() => {
    const cfg: PricingInput["pricingConfig"] = {};
    if (pricingModel === "area") {
      cfg.min_area = areaMin;
      cfg.max_area = areaMax;
      cfg.area_pricing_mode = "flat";
      if (areaStrategy === "flat") {
        cfg.price_per_sqft = areaPricePerSqft;
      } else {
        cfg.area_slabs = areaSlabs;
      }
    } else if (pricingModel === "quantity") {
      cfg.price_per_unit = qtyRate;
      cfg.min_qty = qtyMin;
      cfg.max_qty = qtyMax;
      cfg.unit_name = qtyUnitName;
    } else if (pricingModel === "hourly") {
      cfg.price_per_hour = basePrice;
      cfg.min_hours = 0.5; // Always show from 30min
      cfg.max_hours = 3.0; // Always show up to 3 hours
    } else if (pricingModel === "distance") {
      cfg.base_distance_fee = distanceBaseFee;
      cfg.free_km = distanceFreeKm;
      cfg.price_per_km = distanceRatePerKm;
    } else if (pricingModel === "inspection") {
      cfg.inspection_fee = inspectionFee;
    } else if (pricingModel === "hybrid") {
      cfg.hybrid_components = {
        base_fee: hybridBaseFee,
        hourly_rate: hybridHourlyRate,
        distance_rate: hybridDistanceRate,
        quantity_rate: hybridQtyRate
      };
    }
    return cfg;
  }, [
    pricingModel, areaMin, areaMax, areaStrategy, areaPricePerSqft, areaSlabs,
    qtyRate, qtyMin, qtyMax, qtyUnitName, basePrice,
    distanceBaseFee, distanceFreeKm, distanceRatePerKm, inspectionFee,
    hybridBaseFee, hybridHourlyRate, hybridDistanceRate, hybridQtyRate
  ]);

  // Preview Calculations
  const previewBreakdown = useMemo(() => {
    const selectedVariant = prevVariantIdx !== null ? variantsList[prevVariantIdx] : null;
    const variantPrice = selectedVariant ? Number(selectedVariant.price) : null;

    const activeAddons = addonsList
      .map((a, idx) => ({
        id: String(idx),
        title: a.title,
        price: Number(a.price),
        quantity: prevAddonsQty[idx] || 0,
      }))
      .filter((a) => a.quantity > 0);

    return calculatePricingBreakdown({
      pricingModel: pricingModel as PricingModel,
      basePrice: basePrice,
      pricingConfig: pricingConfigObj,
      variantPrice,
      durationMinutes: prevDurationMins,
      areaSqft: prevAreaSqft,
      quantity: prevQty,
      distanceKm: prevDistanceKm,
      addons: activeAddons,
      gstApplicable: gstApplicable,
    });
  }, [
    pricingModel, basePrice, pricingConfigObj, prevVariantIdx, variantsList,
    addonsList, prevAddonsQty, prevDurationMins, prevAreaSqft, prevQty,
    prevDistanceKm, gstApplicable
  ]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.type === "error" && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}
      {state?.type === "success" && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex border-b border-outline-variant/30 gap-1 overflow-x-auto no-scrollbar">
        {([
          { id: "basic", label: "Basic Info", icon: "info" },
          { id: "pricing", label: "Pricing & Slabs", icon: "payments" },
          { id: "variants", label: "Variants", icon: "category" },
          { id: "addons", label: "Add-ons", icon: "library_add" },
          { id: "content", label: "Page Content", icon: "description" },
          { id: "preview", label: "Live Preview", icon: "visibility" }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/15 shadow-sm min-h-[400px]">

        {/* TAB 1: BASIC INFO */}
        <div className={activeTab === "basic" ? "space-y-6 animate-fade-in" : "hidden"}>
          <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2">Core Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Service Title</label>
              <input
                name="title"
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
                placeholder="e.g. Sofa Cleaning"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Select Sub-category</label>
              <div className="flex gap-4">
                <select
                  name="subcategory_id"
                  required
                  value={selectedSubcatId}
                  onChange={handleSubcategoryChange}
                  className="grow border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
                >
                  <option value="">-- Choose a sub-category --</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={cat.category_name}>
                      {cat.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="rounded-xl bg-green-500/10 p-3 flex items-center justify-center min-w-[44px] shrink-0">
                  <ServiceIconComponent iconName={selectedIcon} className="w-5 h-5 text-emerald-600 drop-shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Service Image</label>
            <ImageUploadField defaultValue={initialData.image_url || ""} />
          </div>
        </div>

        {/* TAB 2: PRICING CONFIGURATION */}
        <div className={activeTab === "pricing" ? "space-y-6 animate-fade-in" : "hidden"}>
          <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2">Pricing Strategy</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pricing Model</label>
                <select
                  name="pricing_model"
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value)}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
                >
                  <option value="fixed">Fixed Pricing (Outcome-Based)</option>
                  <option value="hourly">Hourly Pricing (Duration-Based)</option>
                  <option value="area">Area Pricing (Sqft-Based)</option>
                  <option value="quantity">Quantity Pricing (Unit-Based)</option>
                  <option value="distance">Distance Pricing (KM-Based)</option>
                  <option value="inspection">Inspection Pricing (Quotation-Based)</option>
                  <option value="hybrid">Hybrid Pricing (Combined Components)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Base / Starting Price (₹)</label>
                <input
                  name="base_price"
                  required
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Original Strike Price (Optional) (₹)</label>
                <input
                  name="original_price"
                  type="number"
                  step="0.01"
                  value={originalPrice || ""}
                  onChange={(e) => setOriginalPrice(e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold text-primary"
                  placeholder="e.g. 999"
                />
              </div>
            </div>

            {/* GST Check */}
            <div className="flex items-center gap-3 bg-surface p-4 rounded-2xl border border-outline-variant/10">
              <input
                type="checkbox"
                name="gst_applicable"
                id="gst_applicable"
                checked={gstApplicable}
                onChange={(e) => setGstApplicable(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary rounded border-outline-variant"
              />
              <label htmlFor="gst_applicable" className="text-xs font-bold text-on-surface-variant select-none cursor-pointer">
                GST (18%) Applicable to this service
              </label>
            </div>

            {/* Area Settings Builder */}
            {pricingModel === "area" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">home_work</span> Area Slabs & Rates Configurator
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Pricing Strategy</label>
                    <select
                      value={areaStrategy}
                      onChange={(e) => setAreaStrategy(e.target.value as "flat" | "slab")}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    >
                      <option value="flat">Flat Rate per Sqft</option>
                      <option value="slab">Slab Pricing Mode</option>
                    </select>
                  </div>
                  {areaStrategy === "flat" && (
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Rate per Sqft (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={areaPricePerSqft}
                        onChange={(e) => setAreaPricePerSqft(parseFloat(e.target.value) || 0)}
                        className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Min Area (Sqft)</label>
                    <input
                      type="number"
                      value={areaMin}
                      onChange={(e) => setAreaMin(parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Max Area (Sqft)</label>
                    <input
                      type="number"
                      value={areaMax}
                      onChange={(e) => setAreaMax(parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                </div>

                {areaStrategy === "slab" && (
                  <div className="pt-3 border-t border-outline-variant/10 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-primary font-headline">Slabs Definition Table</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setAreaSlabs([...areaSlabs, { min: 0, rate: 1 }])}
                        className="text-xs text-secondary font-black"
                      >
                        + Add Slab
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {areaSlabs.map((slab, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">From Area (Sqft)</label>
                            <input
                              type="number"
                              value={slab.min}
                              onChange={(e) => {
                                const c = [...areaSlabs];
                                c[i].min = parseInt(e.target.value, 10) || 0;
                                setAreaSlabs(c);
                              }}
                              className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">To Area (Optional)</label>
                            <input
                              type="number"
                              value={slab.max || ""}
                              onChange={(e) => {
                                const c = [...areaSlabs];
                                c[i].max = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                setAreaSlabs(c);
                              }}
                              className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                              placeholder="Infinity"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-0.5">Rate per Sqft (₹)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={slab.rate}
                              onChange={(e) => {
                                const c = [...areaSlabs];
                                c[i].rate = parseFloat(e.target.value) || 0;
                                setAreaSlabs(c);
                              }}
                              className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setAreaSlabs(areaSlabs.filter((_, idx) => idx !== i))}
                            className="mt-4.5 p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hourly Settings Builder */}
            {pricingModel === "hourly" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span> Duration Rates configuration
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">Configure duration options and respective prices.</p>
                <div className="space-y-2">
                  {durationRates.map((rate, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant mb-0.5">Duration</label>
                        <select
                          value={rate.duration}
                          onChange={(e) => {
                            const c = [...durationRates];
                            c[i].duration = parseInt(e.target.value, 10);
                            setDurationRates(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        >
                          <option value={30}>30min</option>
                          <option value={60}>60min</option>
                          <option value={90}>90mins</option>
                          <option value={120}>2hours</option>
                          <option value={180}>3 hours</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant mb-0.5">Price (₹)</label>
                        <input
                          type="number"
                          value={rate.price}
                          onChange={(e) => {
                            const c = [...durationRates];
                            c[i].price = parseFloat(e.target.value) || 0;
                            setDurationRates(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setDurationRates(durationRates.filter((_, idx) => idx !== i))}
                        className="mt-4 text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDurationRates([...durationRates, { duration: 60, price: 199 }])}
                    className="w-full text-xs text-secondary mt-2"
                  >
                    + Add Duration Option
                  </Button>
                </div>
              </div>
            )}

            {/* Quantity Settings Builder */}
            {pricingModel === "quantity" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">shopping_bag</span> Quantity configuration
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Name</label>
                    <input
                      type="text"
                      value={qtyUnitName}
                      onChange={(e) => setQtyUnitName(e.target.value)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                      placeholder="e.g. Sofa Seat"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Rate per Unit (₹)</label>
                    <input
                      type="number"
                      value={qtyRate}
                      onChange={(e) => setQtyRate(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Min Quantity</label>
                    <input
                      type="number"
                      value={qtyMin}
                      onChange={(e) => setQtyMin(parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Max Quantity</label>
                    <input
                      type="number"
                      value={qtyMax}
                      onChange={(e) => setQtyMax(parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Distance Settings Builder */}
            {pricingModel === "distance" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">local_shipping</span> Distance configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Base Distance Fee (₹)</label>
                    <input
                      type="number"
                      value={distanceBaseFee}
                      onChange={(e) => setDistanceBaseFee(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Free Travel Limit (KM)</label>
                    <input
                      type="number"
                      value={distanceFreeKm}
                      onChange={(e) => setDistanceFreeKm(parseInt(e.target.value, 10) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Rate per KM (₹)</label>
                    <input
                      type="number"
                      value={distanceRatePerKm}
                      onChange={(e) => setDistanceRatePerKm(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Inspection Settings Builder */}
            {pricingModel === "inspection" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">search</span> Inspection configuration
                </h3>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Base Inspection Fee (₹)</label>
                  <input
                    type="number"
                    value={inspectionFee}
                    onChange={(e) => setInspectionFee(parseFloat(e.target.value) || 0)}
                    className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold max-w-xs"
                  />
                </div>
              </div>
            )}

            {/* Hybrid Settings Builder */}
            {pricingModel === "hybrid" && (
              <div className="p-5 bg-surface rounded-2xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">combine_columns</span> Hybrid components configuration
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Base Fee (₹)</label>
                    <input
                      type="number"
                      value={hybridBaseFee}
                      onChange={(e) => setHybridBaseFee(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Hourly Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={hybridHourlyRate}
                      onChange={(e) => setHybridHourlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Distance Rate (₹/km)</label>
                    <input
                      type="number"
                      value={hybridDistanceRate}
                      onChange={(e) => setHybridDistanceRate(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Qty Unit Rate (₹/unit)</label>
                    <input
                      type="number"
                      value={hybridQtyRate}
                      onChange={(e) => setHybridQtyRate(parseFloat(e.target.value) || 0)}
                      className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* TAB 3: VARIANTS */}
        <div className={activeTab === "variants" ? "space-y-6 animate-fade-in" : "hidden"}>
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <h2 className="text-primary font-bold text-base font-headline">Service Variants</h2>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setVariantsList([...variantsList, { title: "", description: "", price: 299, original_price: null, duration_minutes: null }])}
                className="text-xs text-secondary font-black"
              >
                + Add Variant Option
              </Button>
            </div>

            <div className="space-y-4">
              {variantsList.length === 0 ? (
                <p className="text-xs text-on-surface-variant font-medium py-4 text-center">No variants created. Add a variant to offer options like Single Door vs Double Door.</p>
              ) : (
                variantsList.map((v, i) => (
                  <div key={i} className="bg-surface p-4 rounded-2xl border border-outline-variant/15 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => setVariantsList(variantsList.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Variant Title</label>
                        <input
                          type="text"
                          required
                          value={v.title}
                          onChange={(e) => {
                            const c = [...variantsList];
                            c[i].title = e.target.value;
                            setVariantsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                          placeholder="e.g. Double Door"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={v.price}
                          onChange={(e) => {
                            const c = [...variantsList];
                            c[i].price = parseFloat(e.target.value) || 0;
                            setVariantsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Strike Price (Optional)</label>
                        <input
                          type="number"
                          value={v.original_price || ""}
                          onChange={(e) => {
                            const c = [...variantsList];
                            c[i].original_price = e.target.value ? parseFloat(e.target.value) : null;
                            setVariantsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Description</label>
                        <input
                          type="text"
                          value={v.description}
                          onChange={(e) => {
                            const c = [...variantsList];
                            c[i].description = e.target.value;
                            setVariantsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                          placeholder="Brief description of this variant"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Duration impact (Minutes)</label>
                        <input
                          type="number"
                          value={v.duration_minutes || ""}
                          onChange={(e) => {
                            const c = [...variantsList];
                            c[i].duration_minutes = e.target.value ? parseInt(e.target.value, 10) : null;
                            setVariantsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                          placeholder="Overrides service base duration"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>

        {/* TAB 4: ADDONS */}
        <div className={activeTab === "addons" ? "space-y-6 animate-fade-in" : "hidden"}>
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <h2 className="text-primary font-bold text-base font-headline">Service Add-ons</h2>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddonsList([...addonsList, { title: "", description: "", price: 99, is_required: false, max_quantity: 5 }])}
                className="text-xs text-secondary font-black"
              >
                + Add Add-on Option
              </Button>
            </div>

            <div className="space-y-4">
              {addonsList.length === 0 ? (
                <p className="text-xs text-on-surface-variant font-medium py-4 text-center">No addons configured. Add addons like Sanitization Spray, Extra Pillow cover cleaning.</p>
              ) : (
                addonsList.map((a, i) => (
                  <div key={i} className="bg-surface p-4 rounded-2xl border border-outline-variant/15 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => setAddonsList(addonsList.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Addon Title</label>
                        <input
                          type="text"
                          required
                          value={a.title}
                          onChange={(e) => {
                            const c = [...addonsList];
                            c[i].title = e.target.value;
                            setAddonsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                          placeholder="e.g. Extra Pillow Cleaning"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={a.price}
                          onChange={(e) => {
                            const c = [...addonsList];
                            c[i].price = parseFloat(e.target.value) || 0;
                            setAddonsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Max Quantity</label>
                        <input
                          type="number"
                          value={a.max_quantity}
                          onChange={(e) => {
                            const c = [...addonsList];
                            c[i].max_quantity = parseInt(e.target.value, 10) || 1;
                            setAddonsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Description</label>
                        <input
                          type="text"
                          value={a.description}
                          onChange={(e) => {
                            const c = [...addonsList];
                            c[i].description = e.target.value;
                            setAddonsList(c);
                          }}
                          className="w-full border border-outline-variant/20 rounded-lg p-2 bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                          placeholder="Description of addon"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-4">
                        <input
                          type="checkbox"
                          id={`addon_req_${i}`}
                          checked={a.is_required}
                          onChange={(e) => {
                            const c = [...addonsList];
                            c[i].is_required = e.target.checked;
                            setAddonsList(c);
                          }}
                          className="w-4 h-4 text-primary focus:ring-primary rounded border-outline-variant"
                        />
                        <label htmlFor={`addon_req_${i}`} className="text-xs font-bold text-on-surface-variant select-none cursor-pointer">
                          Required to check out
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>

        {/* TAB 5: CONTENT (DESCRIPTION, INCLUSIONS/EXCLUSIONS, FAQS) */}
        <div className={activeTab === "content" ? "space-y-6 animate-fade-in" : "hidden"}>
            <div>
              <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2 mb-3">About The Service</h2>
              <textarea
                name="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs"
                placeholder="Detailed description for the landing page..."
              />
            </div>

            <div>
              <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2 mb-3">Inclusions & Exclusions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">What&apos;s Included</label>
                  {includedItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateListItem(setIncludedItems, i, e.target.value)}
                        className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs"
                        placeholder="e.g. Complete vacuuming"
                      />
                      {includedItems.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeListItem(setIncludedItems, i)} className="px-3">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  <input type="hidden" name="included_features" value={includedItems.filter(Boolean).join('\n')} />
                  <Button type="button" variant="ghost" onClick={() => addListItem(setIncludedItems)} className="w-full text-xs text-secondary">+ Add Inclusion</Button>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">What&apos;s Excluded</label>
                  {excludedItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateListItem(setExcludedItems, i, e.target.value)}
                        className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-xs"
                        placeholder="e.g. Wall cleaning"
                      />
                      {excludedItems.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeListItem(setExcludedItems, i)} className="px-3">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </Button>
                      )}
                    </div>
                  ))}
                  <input type="hidden" name="excluded_features" value={excludedItems.filter(Boolean).join('\n')} />
                  <Button type="button" variant="ghost" onClick={() => addListItem(setExcludedItems)} className="w-full text-xs text-secondary">+ Add Exclusion</Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2 mb-3">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="flex flex-col gap-2 relative bg-surface p-3 rounded-2xl border border-outline-variant/20">
                    {faqs.length > 1 && (
                      <button type="button" onClick={() => removeFaq(i)} className="absolute top-2 right-2 text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => updateFaq(i, "question", e.target.value)}
                      className="w-full border-none rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-xs font-semibold pr-8 text-primary"
                      placeholder="Question?"
                    />
                    <textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(i, "answer", e.target.value)}
                      rows={2}
                      className="w-full border-none rounded-lg p-2 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-xs text-primary"
                      placeholder="Answer..."
                    />
                  </div>
                ))}
                <input type="hidden" name="faqs_json" value={JSON.stringify(faqs.filter((f) => f.question.trim() && f.answer.trim()))} />
                <Button type="button" variant="ghost" onClick={addFaq} className="w-full text-xs text-secondary">+ Add FAQ Question</Button>
              </div>
            </div>
        </div>

        {/* TAB 6: LIVE PREVIEW */}
        <div className={activeTab === "preview" ? "space-y-6 animate-fade-in" : "hidden"}>
          <h2 className="text-primary font-bold text-base font-headline border-b border-outline-variant/10 pb-2">Customer Booking Preview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Visual Preview Render */}
              <div className="border border-outline-variant/25 rounded-3xl p-5 md:p-6 bg-surface shadow-xs space-y-6 max-w-md mx-auto w-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{selectedIcon}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-primary font-headline leading-tight">{title || "Service"}</h3>
                    <p className="text-[10px] text-on-surface-variant/70 font-semibold uppercase tracking-wider">Kanpur Service Center</p>
                  </div>
                </div>

                {/* Variants List Mock */}
                {variantsList.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Select Option</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {variantsList.map((v, idx) => {
                        const isSelected = prevVariantIdx === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setPrevVariantIdx(isSelected ? null : idx)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary/5 border-primary text-primary"
                                : "bg-surface border-outline-variant/10 text-on-surface"
                            }`}
                          >
                            <h4 className="text-xs font-bold">{v.title || `Variant ${idx + 1}`}</h4>
                            <span className="text-[10px] font-black block mt-2">₹{v.price}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pricing Model Input Slider/Counter */}
                <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Service Parameters</p>
                  {pricingModel === "fixed" && (
                    <p className="text-xs text-on-surface-variant">Standard flat rate pricing.</p>
                  )}
                  {pricingModel === "inspection" && (
                    <p className="text-xs text-on-surface-variant">Base inspection fee details.</p>
                  )}
                  {pricingModel === "hourly" && (
                    <div className="flex flex-wrap gap-1.5">
                      {[30, 60, 90, 120, 180].map((mins) => {
                        const isSelected = prevDurationMins === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setPrevDurationMins(mins)}
                            className={`px-3.5 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                              isSelected
                                ? "bg-primary text-white border-primary"
                                : "bg-surface border-outline-variant/10 text-on-surface-variant"
                            }`}
                          >
                            {formatDuration(mins)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {pricingModel === "area" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>Area Selected</span>
                        <span className="text-primary">{prevAreaSqft} Sqft</span>
                      </div>
                      <input
                        type="range"
                        min={areaMin}
                        max={areaMax}
                        step={areaStep}
                        value={prevAreaSqft}
                        onChange={(e) => setPrevAreaSqft(parseInt(e.target.value, 10))}
                        className="w-full accent-primary h-1.5 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                  {pricingModel === "quantity" && (
                    <div className="flex justify-between items-center bg-surface-container/30 p-2 rounded-xl border border-outline-variant/10">
                      <span className="text-xs font-bold text-on-surface-variant">{qtyUnitName}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrevQty(Math.max(qtyMin, prevQty - 1))}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-primary w-5 text-center">{prevQty}</span>
                        <button
                          type="button"
                          onClick={() => setPrevQty(Math.min(qtyMax, prevQty + 1))}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  {pricingModel === "distance" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>Distance Selected</span>
                        <span className="text-primary">{prevDistanceKm} KM</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={150}
                        value={prevDistanceKm}
                        onChange={(e) => setPrevDistanceKm(parseInt(e.target.value, 10))}
                        className="w-full accent-primary h-1.5 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Add-ons Mock Selector */}
                {addonsList.length > 0 && (
                  <div className="space-y-2.5 pt-4 border-t border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Add-ons Available</p>
                    <div className="space-y-1.5">
                      {addonsList.map((a, idx) => {
                        const currentQty = prevAddonsQty[idx] || 0;
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-surface-container/20 rounded-xl border border-outline-variant/10">
                            <div>
                              <p className="font-bold text-primary">{a.title || `Addon ${idx + 1}`}</p>
                              <p className="text-[9px] text-on-surface-variant/80 font-medium">₹{a.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPrevAddonsQty({ ...prevAddonsQty, [idx]: Math.max(0, currentQty - 1) })}
                                className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-[10px]"
                              >
                                -
                              </button>
                              <span className="font-black text-xs text-primary">{currentQty}</span>
                              <button
                                type="button"
                                onClick={() => setPrevAddonsQty({ ...prevAddonsQty, [idx]: Math.min(a.max_quantity, currentQty + 1) })}
                                className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-[10px]"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Simulated Bill Calculation Output */}
                <div className="pt-4 border-t border-outline-variant/20 text-xs font-semibold text-on-surface-variant space-y-1">
                  <div className="flex justify-between">
                    <span>Base Calculated Price</span>
                    <span>₹{previewBreakdown.base_price}</span>
                  </div>
                  {previewBreakdown.addons_total > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons Subtotal</span>
                      <span>+₹{previewBreakdown.addons_total}</span>
                    </div>
                  )}
                  {previewBreakdown.gst_amount > 0 && (
                    <div className="flex justify-between">
                      <span>GST (18%)</span>
                      <span>+₹{previewBreakdown.gst_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-primary border-t border-outline-variant/10 pt-2 mt-1">
                    <span>Total Invoice Estimated</span>
                    <span>₹{previewBreakdown.total_price}</span>
                  </div>
                </div>
              </div>

              {/* Developer Specs Panel */}
              <div className="bg-surface p-5 rounded-3xl border border-outline-variant/15 space-y-4">
                <h3 className="text-sm font-bold text-primary font-headline border-b border-outline-variant/10 pb-2">
                  Pricing Configuration Summary
                </h3>
                <pre className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 font-mono text-[10px] text-on-surface-variant overflow-x-auto">
                  {JSON.stringify(pricingConfigObj, null, 2)}
                </pre>
                <p className="text-[10px] text-on-surface-variant/70 leading-normal">
                  This JSON config reflects the dynamic structure that will be serialized and saved to the database. It is evaluated at checkout by the PHS Pricing Engine.
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Hidden Inputs */}
      <input type="hidden" name="pricing_config_json" value={JSON.stringify(pricingConfigObj)} />
      <input type="hidden" name="variants_json" value={JSON.stringify(variantsList.filter((v) => v.title.trim()))} />
      <input type="hidden" name="addons_json" value={JSON.stringify(addonsList.filter((a) => a.title.trim()))} />
      <input type="hidden" name="form_fields_json" value={JSON.stringify(formFields)} />

      {/* Save Button Bar */}
      <div className="flex justify-end gap-3 border-t border-outline-variant/10 pt-4 sticky bottom-0 bg-surface-container-lowest py-3 z-10">
        <Button type="submit" name="status" value="draft" variant="slate" size="lg" disabled={isPending}>
          {isPending ? "Saving..." : "Save as Draft"}
        </Button>
        <Button type="submit" name="status" value="published" variant="primary" size="lg" disabled={isPending}>
          {isPending ? "Saving..." : "Publish Service"}
        </Button>
      </div>
    </form>
  );
}
