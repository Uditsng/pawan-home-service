/**
 * Cart Catalog — pure mapping between raw cart items + catalog data and the
 * pricing engine. Shared by the client (instant cart/checkout totals) and the
 * server (payment authority) so both compute identical numbers.
 */
import type { CartItem, PricingModel, ServicePricingRule } from "@/lib/types";
import { calculatePricingBreakdown } from "./pricingEngine";
import type { CartLineItem, PricingInput } from "./types";

export interface CartServiceSource {
  base_price: number;
  pricing_model: PricingModel | null;
  pricing_config: unknown;
  gst_applicable?: boolean | null;
}

export interface CartAddonSource {
  title: string;
  price: number;
}

/**
 * Denormalized catalog snapshot needed to price a cart without touching the DB.
 * Produced server-side by the cached catalog action; consumed client-side.
 */
export interface CartCatalog {
  services: Record<string, CartServiceSource>;
  variants: Record<string, number>; // variantId → price
  addons: Record<string, CartAddonSource>; // addonId → { title, price }
  rules: Record<string, ServicePricingRule[]>; // serviceId → applicable rules (incl. global)
  taxRate: number;
  gstEnabled: boolean;
}

/**
 * Parses a `CartItem.addons` string like `"id:2,id2:1"` into engine addon rows.
 */
export function parseCartAddons(
  addonsStr: string | null | undefined,
  addons: CartCatalog["addons"]
): { id: string; title: string; price: number; quantity: number }[] {
  if (!addonsStr) return [];
  const parsed: { id: string; title: string; price: number; quantity: number }[] = [];
  for (const pair of addonsStr.split(",")) {
    const [id, qtyStr] = pair.split(":");
    const qty = parseInt(qtyStr, 10) || 0;
    const match = addons[id];
    if (match && qty > 0) {
      parsed.push({ id, title: match.title, price: Number(match.price), quantity: qty });
    }
  }
  return parsed;
}

/**
 * Maps a raw service pricing rule row into the engine's surcharge-rule shape.
 */
export function mapPricingRule(rule: ServicePricingRule): NonNullable<PricingInput["surchargeRules"]>[number] {
  const cond = rule.conditions || {};
  return {
    name: rule.name,
    rule_type: rule.rule_type,
    amount_type: rule.amount_type,
    amount_value: Number(rule.amount_value),
    is_active: rule.is_active,
    conditions: {
      days_of_week: Array.isArray(cond.days_of_week) ? cond.days_of_week : undefined,
      hours_range:
        Array.isArray(cond.hours_range) && cond.hours_range.length === 2
          ? (cond.hours_range as [string, string])
          : undefined,
      dates: Array.isArray(cond.dates) ? cond.dates : undefined,
      pincodes: Array.isArray(cond.pincodes) ? cond.pincodes : undefined,
    },
  };
}

/**
 * Builds the pricing engine input for a single cart item from catalog data.
 * Returns null if the service is missing from the catalog.
 */
export function buildCartPricingInput(
  item: CartItem,
  catalog: CartCatalog,
  options?: {
    scheduledDate?: string | Date;
    pincode?: string;
    couponAmountForLine?: number;
    offerAmountForLine?: number;
  }
): PricingInput | null {
  const service = catalog.services[item.serviceId];
  if (!service) return null;

  const variantPrice = item.variantId ? (catalog.variants[item.variantId] ?? null) : null;

  return {
    pricingModel: (service.pricing_model || "fixed") as PricingModel,
    basePrice: Number(service.base_price || 0),
    pricingConfig: (service.pricing_config || {}) as PricingInput["pricingConfig"],
    variantPrice: variantPrice !== null ? Number(variantPrice) : null,
    durationMinutes: item.selectedDuration ?? undefined,
    areaSqft: item.areaSqft ?? undefined,
    quantity: item.quantity ?? undefined,
    distanceKm: item.distanceKm ?? undefined,
    addons: parseCartAddons(item.addons, catalog.addons),
    scheduledDate: options?.scheduledDate,
    pincode: options?.pincode,
    surchargeRules: (catalog.rules[item.serviceId] || []).map(mapPricingRule),
    couponAmountForLine: options?.couponAmountForLine,
    offerAmountForLine: options?.offerAmountForLine,
    gstRate: catalog.taxRate,
    gstEnabled: catalog.gstEnabled,
    gstApplicable: item.gstApplicable ?? service.gst_applicable ?? true,
  };
}

/**
 * Computes per-service breakdowns for every cart item.
 */
export function computeCartLineItems(
  items: CartItem[],
  catalog: CartCatalog,
  options?: {
    scheduledDate?: string | Date;
    pincode?: string;
    /** Order-level coupon discount distributed per service (see applyOrderLevelCoupon). */
    couponAllocation?: Record<string, number>;
    offerAmountsByService?: Record<string, number>;
  }
): CartLineItem[] {
  const lineItems: CartLineItem[] = [];
  for (const item of items) {
    const input = buildCartPricingInput(item, catalog, {
      ...options,
      couponAmountForLine: options?.couponAllocation?.[item.serviceId],
      offerAmountForLine: options?.offerAmountsByService?.[item.serviceId],
    });
    if (!input) continue;
    lineItems.push({ serviceId: item.serviceId, breakdown: calculatePricingBreakdown(input) });
  }
  return lineItems;
}
