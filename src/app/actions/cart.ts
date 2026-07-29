"use server";

import { createClient } from "@/utils/supabase/server";
import { calculatePricingBreakdown, PricingInput } from "@/utils/pricingEngine";
import { PricingModel, CartItem } from "@/lib/types";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export interface CartPricesResult {
  prices: Record<string, { totalPrice: number; gstAmount: number; priceWithoutGst: number }>;
  subtotal: number;
  totalGst: number;
}

export async function getCartPricesAction(items: CartItem[]): Promise<CartPricesResult> {
  if (items.length === 0) {
    return { prices: {}, subtotal: 0, totalGst: 0 };
  }

  const supabase = await createClient();

  const serviceIds = items.map(i => i.serviceId);

  const [{ data: services }, platformSettings] = await Promise.all([
    supabase
      .from("services")
      .select("id, base_price, pricing_model, pricing_config, gst_applicable")
      .in("id", serviceIds)
      .eq("status", "published"),
    fetchPlatformSettings(supabase),
  ]);

  if (!services || services.length === 0) {
    return { prices: {}, subtotal: 0, totalGst: 0 };
  }

  const variantIds = items
    .map(i => i.variantId)
    .filter(Boolean) as string[];

  const allAddonIds = items
    .flatMap(i => (i.addons ? i.addons.split(",").map(p => p.split(":")[0]) : []))
    .filter(Boolean);

  const [variantsResult, addonsResult, rulesResult] = await Promise.all([
    variantIds.length > 0
      ? supabase.from("service_variants").select("id, price").in("id", variantIds)
      : Promise.resolve({ data: [] }),
    allAddonIds.length > 0
      ? supabase.from("service_addons").select("id, title, price").in("id", allAddonIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("service_pricing_rules")
      .select("*")
      .or(`service_id.in.(${serviceIds.join(",")}),service_id.is.null`)
      .eq("is_active", true),
  ]);

  const variants = (variantsResult.data || []) as { id: string; price: number }[];
  const addonsDb = (addonsResult.data || []) as { id: string; title: string; price: number }[];
  const rawRules = (rulesResult.data || []) as Record<string, unknown>[];

  const prices: CartPricesResult["prices"] = {};
  let subtotal = 0;
  let totalGst = 0;

  for (const item of items) {
    const service = services.find(s => s.id === item.serviceId);
    if (!service) continue;

    const variantPrice = item.variantId
      ? (variants.find(v => v.id === item.variantId)?.price ?? null)
      : null;

    const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
    if (item.addons) {
      const pairs = item.addons.split(",");
      for (const pair of pairs) {
        const [id, qtyStr] = pair.split(":");
        const qty = parseInt(qtyStr, 10) || 0;
        const match = addonsDb.find(a => a.id === id);
        if (match && qty > 0) {
          parsedAddons.push({
            id: match.id,
            title: match.title,
            price: Number(match.price),
            quantity: qty,
          });
        }
      }
    }

    const serviceRules = rawRules.filter(
      (r: Record<string, unknown>) => !r.service_id || r.service_id === item.serviceId
    );
    const mappedRules = serviceRules.map(r => {
      const cond = (r.conditions || {}) as Record<string, unknown>;
      return {
        name: r.name as string,
        rule_type: r.rule_type as "surcharge" | "discount",
        amount_type: r.amount_type as "fixed" | "percentage",
        amount_value: Number(r.amount_value),
        is_active: r.is_active as boolean,
        conditions: {
          days_of_week: Array.isArray(cond.days_of_week) ? (cond.days_of_week as number[]) : undefined,
          hours_range: Array.isArray(cond.hours_range) && cond.hours_range.length === 2 ? (cond.hours_range as [string, string]) : undefined,
          dates: Array.isArray(cond.dates) ? (cond.dates as string[]) : undefined,
          pincodes: Array.isArray(cond.pincodes) ? (cond.pincodes as string[]) : undefined,
        },
      };
    });

    const breakdown = calculatePricingBreakdown({
      pricingModel: (service.pricing_model || "fixed") as PricingModel,
      basePrice: Number(service.base_price || 0),
      pricingConfig: (service.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
      variantPrice: variantPrice !== null ? Number(variantPrice) : null,
      durationMinutes: item.selectedDuration ?? undefined,
      areaSqft: item.areaSqft ?? undefined,
      quantity: item.quantity ?? undefined,
      distanceKm: item.distanceKm ?? undefined,
      addons: parsedAddons,
      surchargeRules: mappedRules,
      gstRate: platformSettings.taxRate,
      gstEnabled: platformSettings.gstEnabled,
      gstApplicable: item.gstApplicable ?? service.gst_applicable,
    });

    const priceWithoutGst = breakdown.total_price - breakdown.gst_amount;
    prices[item.serviceId] = {
      totalPrice: breakdown.total_price,
      gstAmount: breakdown.gst_amount,
      priceWithoutGst,
    };
    subtotal += priceWithoutGst;
    totalGst += breakdown.gst_amount;
  }

  return { prices, subtotal, totalGst };
}
