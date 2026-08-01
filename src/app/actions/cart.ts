"use server";

import type { CartItem } from "@/lib/types";
import type { CartCatalog } from "@/lib/pricing/cartCatalog";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";

/**
 * Fetches the raw catalog data needed to price a cart — WITHOUT computing any
 * prices. Pricing is computed client-side via `calculateCart`, so opening the
 * cart, changing quantities, addons, or variants costs zero server pricing calls.
 *
 * All catalog reads go through Next.js `unstable_cache` (30 min) and are
 * invalidated by the standard cache tags whenever the admin edits the catalog.
 */
export async function getCartCatalogAction(items: CartItem[]): Promise<CartCatalog> {
  const serviceIds = items.map((i) => i.serviceId);
  const { catalog } = await buildCartCatalog(serviceIds);
  return catalog;
}
