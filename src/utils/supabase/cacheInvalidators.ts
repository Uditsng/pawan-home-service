import { revalidateTag } from "next/cache";
import {
  TAG_CATEGORIES,
  TAG_SUBCATEGORIES,
  TAG_SERVICES,
  TAG_REVIEWS,
  TAG_VARIANTS,
  TAG_ADDONS,
  TAG_PRICING_RULES,
} from "./cacheTags";

/**
 * Revalidates the categories cache tag.
 * Called when categories are updated in the admin panel.
 */
export function revalidateCategories(): void {
  revalidateTag(TAG_CATEGORIES, "default");
}

/**
 * Revalidates the subcategories cache tag.
 * Called when subcategories are updated in the admin panel.
 */
export function revalidateSubcategories(): void {
  revalidateTag(TAG_SUBCATEGORIES, "default");
}

/**
 * Revalidates services listing caches.
 * Can invalidate all services, services within a subcategory, or a specific service.
 */
export function revalidateServices(subcategoryId?: string, serviceId?: string): void {
  // Clear all general service lists
  revalidateTag(TAG_SERVICES, "default");

  // Clear specific subcategory cache
  if (subcategoryId) {
    revalidateTag(`services-sub-${subcategoryId}`, "default");
  }

  // Clear specific service detail cache
  if (serviceId) {
    revalidateTag(`service-${serviceId}`, "default");
  }
}

/**
 * Revalidates reviews caches.
 * Can invalidate reviews generally or for a specific service.
 */
export function revalidateReviews(serviceId?: string): void {
  revalidateTag(TAG_REVIEWS, "default");
  if (serviceId) {
    revalidateTag(`reviews-${serviceId}`, "default");
  }
}

/**
 * Revalidates service variants cache.
 */
export function revalidateVariants(serviceId: string): void {
  revalidateTag(TAG_VARIANTS, "default");
  revalidateTag(`variants-${serviceId}`, "default");
}

/**
 * Revalidates service addons cache.
 */
export function revalidateAddons(serviceId: string): void {
  revalidateTag(TAG_ADDONS, "default");
  revalidateTag(`addons-${serviceId}`, "default");
}

/**
 * Revalidates service pricing rules cache.
 */
export function revalidatePricingRules(serviceId?: string): void {
  revalidateTag(TAG_PRICING_RULES, "default");
  if (serviceId) {
    revalidateTag(`pricing-rules-${serviceId}`, "default");
  }
}
