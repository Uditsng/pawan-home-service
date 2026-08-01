/**
 * Checkout Catalog — server-side builder of the denormalized catalog snapshot
 * used to price a cart/checkout. All reads are `unstable_cache`-backed (30 min)
 * and invalidated by the standard cache tags. No pricing math happens here.
 */
import {
  getCachedServiceDetails,
  getCachedServiceVariants,
  getCachedServiceAddons,
  getCachedPricingRules,
} from "@/utils/supabase/cachedServiceQueries";
import { getCachedPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import type { ServicePricingRule } from "@/lib/types";
import type { CartCatalog } from "@/lib/pricing/cartCatalog";

export interface CheckoutServiceSource {
  id: string;
  title: string;
  category: string | null;
  subcategory_name: string | null;
  icon_name: string | null;
  pricing_model: string;
}

export interface CartCatalogBundle {
  catalog: CartCatalog;
  services: Record<string, CheckoutServiceSource>;
}

export async function buildCartCatalog(serviceIds: string[]): Promise<CartCatalogBundle> {
  const ids = [...new Set(serviceIds)];

  const [serviceResults, variantsResults, addonsResults, rulesResults] = await Promise.all([
    Promise.all(ids.map((id) => getCachedServiceDetails(id).catch(() => null))),
    Promise.all(ids.map((id) => getCachedServiceVariants(id).catch(() => []))),
    Promise.all(ids.map((id) => getCachedServiceAddons(id).catch(() => []))),
    Promise.all(ids.map((id) => getCachedPricingRules(id).catch(() => []))),
  ]);

  const settings = await getCachedPlatformSettings();

  const catalog: CartCatalog = { services: {}, variants: {}, addons: {}, rules: {}, taxRate: settings.taxRate, gstEnabled: settings.gstEnabled };
  const services: Record<string, CheckoutServiceSource> = {};

  ids.forEach((id, idx) => {
    const svc = serviceResults[idx];
    if (!svc) return;

    catalog.services[id] = {
      base_price: Number(svc.base_price || 0),
      pricing_model: svc.pricing_model || null,
      pricing_config: svc.pricing_config ?? {},
      gst_applicable: svc.gst_applicable ?? true,
    };

    services[id] = {
      id: svc.id,
      title: svc.title,
      category: svc.category || null,
      subcategory_name: svc.subcategories?.subcategory_name || null,
      icon_name: svc.subcategories?.icon_name || null,
      pricing_model: svc.pricing_model || "fixed",
    };

    for (const v of variantsResults[idx] || []) {
      catalog.variants[v.id] = Number(v.price || 0);
    }
    for (const a of addonsResults[idx] || []) {
      catalog.addons[a.id] = { title: a.title, price: Number(a.price || 0) };
    }
    catalog.rules[id] = (rulesResults[idx] || []) as ServicePricingRule[];
  });

  return { catalog, services };
}
