import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/client";
import { TAG_SERVICES, TAG_REVIEWS, TAG_VARIANTS, TAG_ADDONS, TAG_PRICING_RULES } from "./cacheTags";
import { ServiceVariant, ServiceAddon, ServicePricingRule, ServicePageContent } from "@/lib/types";

export interface ServiceWithSubcategory {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  is_active: boolean;
  subcategory_id: string;
  category?: string;
  pricing_model?: "fixed" | "hourly" | "area" | "quantity" | "inspection" | "distance" | "hybrid" | null;
  image_url?: string;
  page_content?: ServicePageContent | null;
  price_breakdown?: string | null;
  duration_minutes?: number | null;
  estimated_duration?: number | null;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  quality_rating: number | null;
  behaviour_rating: number | null;
  timeliness_rating: number | null;
  value_rating: number | null;
  review_tags: string[];
  review_images: string[];
  customer: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Fetches active/published services by subcategory ID, cached for 30 minutes.
 * Invalidated by TAG_SERVICES or specific subcategory tag.
 */
export const getCachedServicesBySubcategory = (subcategoryId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        subcategories (
          subcategory_name,
          icon_name,
          categories (
            category_name
          )
        )
      `)
      .eq("subcategory_id", subcategoryId)
      .eq("is_active", true)
      .eq("status", "published")
      .order("title", { ascending: true });

    if (error) {
      console.error(`[cachedServices] Database fetch failed for subcategory ${subcategoryId}:`, error.message);
      throw error;
    }

    return (data || []) as unknown as ServiceWithSubcategory[];
  },
  [`services-by-subcategory-${subcategoryId}`],
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: [TAG_SERVICES, `services-sub-${subcategoryId}`],
  }
)();

/**
 * Fetches single service details by ID, cached for 30 minutes.
 * Invalidated by TAG_SERVICES or specific service tag.
 */
export const getCachedServiceDetails = (serviceId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        subcategories (
          subcategory_name,
          icon_name,
          categories (
            category_name
          )
        )
      `)
      .eq("id", serviceId)
      .eq("status", "published")
      .single();

    if (error) {
      console.error(`[cachedServiceDetails] Database fetch failed for service ${serviceId}:`, error.message);
      throw error;
    }

    return data as unknown as ServiceWithSubcategory;
  },
  [`service-details-${serviceId}`],
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: [TAG_SERVICES, `service-${serviceId}`],
  }
)();

/**
 * Fetches approved service reviews by service ID, cached for 5 minutes.
 * Invalidated by TAG_REVIEWS or specific reviews tag.
 */
export const getCachedServiceReviews = (serviceId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    
    // First try the extended query (with ratings breakdowns)
    const { data: extendedData, error: extendedErr } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        quality_rating,
        behaviour_rating,
        timeliness_rating,
        value_rating,
        review_tags,
        review_images,
        customer:customer_id (
          full_name,
          avatar_url
        )
      `)
      .eq("service_id", serviceId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (!extendedErr && extendedData) {
      return (extendedData || []) as unknown as PublicReview[];
    }

    console.warn(`[cachedReviews] Extended query failed, falling back to basic query for service ${serviceId}:`, extendedErr?.message);

    // Fallback to basic query
    const { data: basicData, error: basicErr } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        customer:customer_id (
          full_name,
          avatar_url
        )
      `)
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false });

    if (basicErr) {
      console.error(`[cachedReviews] Basic fallback review fetch failed for service ${serviceId}:`, basicErr.message);
      throw basicErr;
    }

    // Format basic reviews to match PublicReview shape
    const formatted = (basicData || []).map((r: {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      customer: {
        full_name: string;
        avatar_url: string | null;
      } | null;
    }) => ({
      ...r,
      quality_rating: null,
      behaviour_rating: null,
      timeliness_rating: null,
      value_rating: null,
      review_tags: [] as string[],
      review_images: [] as string[]
    }));

    return formatted as unknown as PublicReview[];
  },
  [`service-reviews-${serviceId}`],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: [TAG_REVIEWS, `reviews-${serviceId}`],
  }
)();

/**
 * Fetches active variants for a service, cached for 30 minutes.
 * Invalidated by TAG_VARIANTS or specific service tag.
 */
export const getCachedServiceVariants = (serviceId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_variants")
      .select("*")
      .eq("service_id", serviceId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error(`[cachedVariants] Database fetch failed for service ${serviceId}:`, error.message);
      throw error;
    }

    return (data || []) as ServiceVariant[];
  },
  [`service-variants-${serviceId}`],
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: [TAG_VARIANTS, `variants-${serviceId}`],
  }
)();

/**
 * Fetches active addons for a service, cached for 30 minutes.
 * Invalidated by TAG_ADDONS or specific service tag.
 */
export const getCachedServiceAddons = (serviceId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_addons")
      .select("*")
      .eq("service_id", serviceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[cachedAddons] Database fetch failed for service ${serviceId}:`, error.message);
      throw error;
    }

    return (data || []) as ServiceAddon[];
  },
  [`service-addons-${serviceId}`],
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: [TAG_ADDONS, `addons-${serviceId}`],
  }
)();

/**
 * Fetches active pricing rules for a service, cached for 30 minutes.
 * Invalidated by TAG_PRICING_RULES or specific service tag.
 */
export const getCachedPricingRules = (serviceId: string) => unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_pricing_rules")
      .select("*")
      .or(`service_id.eq.${serviceId},service_id.is.null`)
      .eq("is_active", true);

    if (error) {
      console.error(`[cachedPricingRules] Database fetch failed for service ${serviceId}:`, error.message);
      throw error;
    }

    return (data || []) as ServicePricingRule[];
  },
  [`service-pricing-rules-${serviceId}`],
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: [TAG_PRICING_RULES, `pricing-rules-${serviceId}`],
  }
)();
