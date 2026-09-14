"use client";

import { useState, useActionState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { OfferCard } from "@/components/Offers/OfferCard";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import type { Offer, OfferType, OfferUsageLimitType } from "@/lib/types";
import type { OfferFormState } from "./actions";

export interface OfferServiceOption {
  id: string;
  title: string;
  subcategory_name: string | null;
  category_name: string | null;
}

interface OfferFormProps {
  action: (prevState: OfferFormState, formData: FormData) => Promise<OfferFormState>;
  services: OfferServiceOption[];
  offer?: Offer | null;
  isEdit?: boolean;
  initialServiceIds?: string[];
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fieldClass =
  "w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-outline-variant/20 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-60 disabled:bg-surface-container-low";
const labelClass = "block text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5";

export function OfferForm({ action, services, offer, isEdit, initialServiceIds }: OfferFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, { type: null, message: null });

  const [offerType, setOfferType] = useState<OfferType>(offer?.offer_type ?? "FIXED_DISCOUNT");
  const [validityModel, setValidityModel] = useState<"fixed_dates" | "relative_days">(offer?.validity_model ?? "fixed_dates");
  const [usageLimitType, setUsageLimitType] = useState<OfferUsageLimitType>(offer?.usage_limit_type ?? "one_time");
  const [eligibility, setEligibility] = useState<Offer["eligibility"]>(offer?.eligibility ?? "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>(initialServiceIds ?? []);
  const [purchasePrice, setPurchasePrice] = useState<number>(offer?.purchase_price ?? 0);
  const [benefitValue, setBenefitValue] = useState<number>(offer?.benefit_value ?? 0);
  const [artworkUrl, setArtworkUrl] = useState<string>(offer?.artwork_url ?? "");

  useEffect(() => {
    if (state.type === "success") {
      router.replace("/admin/offers");
    }
  }, [state.type, router]);

  const serviceGroups = useMemo(() => {
    const groups = new Map<string, OfferServiceOption[]>();
    for (const s of services) {
      const key = s.category_name ?? s.subcategory_name ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }
    const result: { label: string; items: OfferServiceOption[] }[] = [];
    for (const [label, items] of groups.entries()) {
      result.push({ label, items });
    }
    return result;
  }, [services]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (s.category_name) set.add(s.category_name);
    }
    return Array.from(set).sort();
  }, [services]);

  const subcategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (s.category_name === categoryFilter) {
        if (s.subcategory_name) set.add(s.subcategory_name);
      }
    }
    return Array.from(set).sort();
  }, [services, categoryFilter]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return serviceGroups
      .filter((g) => !categoryFilter || g.label === categoryFilter)
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (s) =>
            s.title.toLowerCase().includes(term) &&
            (!subcategoryFilter || s.subcategory_name === subcategoryFilter)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [serviceGroups, searchTerm, categoryFilter, subcategoryFilter]);

  const previewOffer: Offer = {
    id: offer?.id ?? "preview",
    code: "PREVIEW",
    name: "Preview",
    title: "Premium Offer",
    description: null,
    display_text: "Flat discount on your favorite services",
    artwork_url: artworkUrl || null,
    offer_type: offerType,
    purchase_price: purchasePrice,
    benefit_value: benefitValue,
    max_discount: offer?.max_discount ?? null,
    min_booking_amount: offer?.min_booking_amount ?? 0,
    validity_model: validityModel,
    valid_from: offer?.valid_from ?? null,
    valid_until: offer?.valid_until ?? null,
    valid_days: offer?.valid_days ?? null,
    status: "active",
    usage_limit_type: usageLimitType,
    max_redemptions_per_customer: offer?.max_redemptions_per_customer ?? null,
    eligibility: eligibility,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <form action={formAction} className="space-y-6 max-w-5xl">
      {isEdit && offer && <input type="hidden" name="offer_id" value={offer.id} />}
      <input type="hidden" name="service_ids_json" value={JSON.stringify(selectedServices)} />

      {state.type === "error" && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-lg">error</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Something Went Wrong</p>
            <p className="text-xs mt-0.5 font-medium">{state.message}</p>
          </div>
        </div>
      )}

      {/* ─── 1. BASIC INFO ─────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">badge</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Basic Info</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">Identity and marketing copy for the offer card.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="code">
              Offer Code <span className="text-error">*</span>
            </label>
            <input
              id="code"
              name="code"
              required
              placeholder="e.g. FESTIVE100"
              defaultValue={offer?.code ?? ""}
              disabled={isEdit}
              className={`${fieldClass} uppercase font-mono font-bold tracking-wider`}
            />
            {isEdit && <p className="text-[11px] text-on-surface-variant opacity-70 mt-1">Codes cannot be changed after creation.</p>}
          </div>
          <div>
            <label className={labelClass} htmlFor="name">
              Internal Name <span className="text-error">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Monsoon Mega Deal"
              defaultValue={offer?.name ?? ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="title">
              Customer Title <span className="text-error">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Flat ₹100 OFF"
              defaultValue={offer?.title ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="display_text">
              Display Tagline
            </label>
            <input
              id="display_text"
              name="display_text"
              placeholder="Shown on the card (e.g. Valid on all pest control services)"
              defaultValue={offer?.display_text ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>
              Offer Artwork
            </label>
            <ImageUploadField
              name="artwork_url"
              defaultValue={offer?.artwork_url ?? ""}
              onValueChange={setArtworkUrl}
              title="Offer Artwork Image"
              description="Define or upload the image displayed on the offer card. Uploaded images are optimized and stored in the services bucket."
              aspect={16 / 9}
              aspectLabel="16:9"
              outputWidth={1280}
              outputHeight={720}
              fileNameSuffix="offer"
            />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass} htmlFor="description">
              Full Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Terms, conditions, and details shown on the offer page."
              defaultValue={offer?.description ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {/* ─── 2. OFFER VALUE ────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-base">local_activity</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Offer Value</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">What the customer pays and what they get in return. ₹0 price = free claim.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="offer_type">
              Offer Type <span className="text-error">*</span>
            </label>
            <select
              id="offer_type"
              name="offer_type"
              value={offerType}
              onChange={(e) => setOfferType(e.target.value as OfferType)}
              className={fieldClass}
            >
              <option value="FIXED_DISCOUNT">Fixed Discount (₹ off)</option>
              <option value="PERCENTAGE_DISCOUNT">Percentage Discount (% off)</option>
              <option value="SERVICE_CREDIT">Service Credit (wallet-style)</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="purchase_price">
              Purchase Price (₹)
            </label>
            <input
              id="purchase_price"
              name="purchase_price"
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">0 = customers claim it for free.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="benefit_value">
              {offerType === "PERCENTAGE_DISCOUNT" ? "Benefit (% off)" : offerType === "SERVICE_CREDIT" ? "Credit Value (₹)" : "Benefit (₹ off)"}{" "}
              <span className="text-error">*</span>
            </label>
            <input
              id="benefit_value"
              name="benefit_value"
              type="number"
              min="1"
              step="0.01"
              value={benefitValue}
              onChange={(e) => setBenefitValue(Number(e.target.value))}
              className={fieldClass}
            />
          </div>
          {offerType === "PERCENTAGE_DISCOUNT" && (
            <div>
              <label className={labelClass} htmlFor="max_discount">
                Max Discount Cap (₹)
              </label>
              <input
                id="max_discount"
                name="max_discount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional ceiling"
                defaultValue={offer?.max_discount ?? ""}
                className={fieldClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="min_booking_amount">
              Minimum Booking Amount (₹)
            </label>
            <input
              id="min_booking_amount"
              name="min_booking_amount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={offer?.min_booking_amount ?? 0}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">0 = no minimum.</p>
          </div>
        </div>
      </div>

      {/* ─── 3. VALIDITY ───────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">event_available</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Validity</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">When can the offer be bought and how long purchased entitlements last.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div className="md:col-span-1">
            <label className={labelClass}>Validity Model</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                <input
                  type="radio"
                  name="validity_model"
                  value="fixed_dates"
                  checked={validityModel === "fixed_dates"}
                  onChange={() => setValidityModel("fixed_dates")}
                  className="accent-primary"
                />
                Fixed dates
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                <input
                  type="radio"
                  name="validity_model"
                  value="relative_days"
                  checked={validityModel === "relative_days"}
                  onChange={() => setValidityModel("relative_days")}
                  className="accent-primary"
                />
                Valid for N days after purchase
              </label>
            </div>
          </div>

          {validityModel === "fixed_dates" ? (
            <>
              <div>
                <label className={labelClass} htmlFor="valid_from">
                  Start Date
                </label>
                <input
                  id="valid_from"
                  name="valid_from"
                  type="datetime-local"
                  defaultValue={toLocalInput(offer?.valid_from ?? null)}
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="valid_until">
                  End Date & Time
                </label>
                <input
                  id="valid_until"
                  name="valid_until"
                  type="datetime-local"
                  defaultValue={toLocalInput(offer?.valid_until ?? null)}
                  className={fieldClass}
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-3">
              <label className={labelClass} htmlFor="valid_days">
                Days Valid After Purchase
              </label>
              <input
                id="valid_days"
                name="valid_days"
                type="number"
                min="1"
                defaultValue={offer?.valid_days ?? 30}
                className={fieldClass}
              />
              <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
                The sellable window is controlled by the Offer Status; this only sets how long a purchased entitlement stays usable.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. USAGE RULES ────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">tune</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Usage Rules</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">How many times an entitlement can be redeemed and who may buy it.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="usage_limit_type">
              Redemption Limit
            </label>
            <select
              id="usage_limit_type"
              name="usage_limit_type"
              value={usageLimitType}
              onChange={(e) => setUsageLimitType(e.target.value as OfferUsageLimitType)}
              className={fieldClass}
            >
              <option value="one_time">One-time use</option>
              <option value="multiple">Multiple uses</option>
            </select>
          </div>
          {usageLimitType === "multiple" && (
            <div>
              <label className={labelClass} htmlFor="max_redemptions_per_customer">
                Times Per Customer
              </label>
              <input
                id="max_redemptions_per_customer"
                name="max_redemptions_per_customer"
                type="number"
                min="1"
                defaultValue={offer?.max_redemptions_per_customer ?? 3}
                className={fieldClass}
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className={labelClass}>Eligible Buyers</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { v: "all", label: "All customers" },
                  { v: "new", label: "New only (no completed booking)" },
                  { v: "existing", label: "Existing only (≥1 completed booking)" },
                ] as { v: Offer["eligibility"]; label: string }[]
              ).map((opt) => (
                <label
                  key={opt.v}
                  className={`flex items-center gap-2 text-xs font-semibold cursor-pointer px-3 py-2 rounded-xl border transition-all ${
                    eligibility === opt.v
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="eligibility"
                    value={opt.v}
                    checked={eligibility === opt.v}
                    onChange={() => setEligibility(opt.v)}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. ELIGIBLE SERVICES ──────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#059669] shrink-0">
              <span className="material-symbols-outlined text-base">handyman</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary font-headline">Eligible Services</h3>
              <p className="text-[11px] text-on-surface-variant opacity-70">
                The offer applies only to bookings whose services are ALL in this list. Select at least one.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allIds = services.map((s) => s.id);
                setSelectedServices((prev) => Array.from(new Set([...prev, ...allIds])));
              }}
              className="text-[11px] font-bold text-secondary hover:underline"
            >
              Select all
            </button>
            <span className="text-on-surface-variant/30">·</span>
            <button
              type="button"
              onClick={() => setSelectedServices([])}
              className="text-[11px] font-bold text-on-surface-variant hover:text-error hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="relative pt-1 flex flex-col md:flex-row gap-2">
          <div className="relative grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${fieldClass} pl-9`}
            />
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter("");
            }}
            className={`${fieldClass} md:w-64 shrink-0 cursor-pointer`}
          >
            <option value="">All categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by subcategory"
            value={subcategoryFilter}
            onChange={(e) => setSubcategoryFilter(e.target.value)}
            className={`${fieldClass} md:w-64 shrink-0 cursor-pointer`}
          >
            <option value="">All subcategories</option>
            {subcategoryOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/70">Selected:</span>
          {selectedServices.length === 0 ? (
            <span className="text-[11px] font-semibold text-error">None selected — required before saving</span>
          ) : (
            <span className="text-[11px] font-bold text-secondary">
              {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto no-scrollbar">
          {filteredGroups.map((group) => (
            <div
              key={group.label}
              className="bg-surface-container/50 border border-outline-variant/15 rounded-xl p-3.5 space-y-1.5"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">{group.label}</p>
              {group.items.map((s) => {
                const checked = selectedServices.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                      checked ? "bg-secondary/15 text-primary" : "hover:bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(s.id)}
                      className="accent-primary shrink-0"
                    />
                    <span className="flex-1 truncate" title={s.title}>
                      {s.title}
                    </span>
                    {checked && <span className="material-symbols-outlined text-secondary text-base">check_circle</span>}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ─── 6. PREVIEW ────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">visibility</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Live Preview</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">How customers will see this offer.</p>
          </div>
        </div>
        <div className="pt-1 max-w-sm">
          <OfferCard
            offer={{ ...previewOffer, code: previewOffer.code }}
            size="lg"
            footer={
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                {purchasePrice > 0 ? `Get for ₹${purchasePrice}` : "Claim free"}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            }
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-white rounded-xl px-6 py-3 font-bold text-xs uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isPending && <span className="material-symbols-outlined animate-spin text-sm mr-1.5">progress_activity</span>}
          {isEdit ? "Save Changes" : "Create Offer"}
        </Button>
        <Link href="/admin/offers">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="rounded-xl px-6 py-3 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container font-bold text-xs uppercase tracking-widest transition-all"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}