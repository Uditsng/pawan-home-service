/**
 * Coupon Engine — Server-Side Coupon Validation & Calculation
 * Single source of truth for coupon eligibility and discount computation.
 * Pure functions only: no React, no side effects. All async functions query Supabase.
 *
 * Integration contract:
 * - Validation runs AFTER the authoritative PHS subtotal is determined
 * - Calculation reuses existing discountEngine math, but only against validated coupon data
 * - All returns are safe, user-friendly errors (never throw inside the engine)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Coupon } from "@/lib/types";

/**
 * Normalize a coupon code: trim whitespace, convert to uppercase.
 * The canonical normalized form is used for database lookup and uniqueness.
 */
export function normalizeCouponCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

/**
 * Interface for validation result — separates "eligible" from "discount amount".
 */
export interface ValidateCouponResult {
  eligible: boolean;
  coupon: Coupon | null;
  error?: string;
  // Cached computed values (for when calculation runs after validation)
  eligibleSubtotal: number;
  applicableServiceId: string | null;
}

/**
 * Validate a coupon code against the authoritative PHS pricing context.
 *
 * Checks (in order):
 * 1. Code normalization and existence
 * 2. Active status
 * 3. Expiry
 * 4. Minimum booking amount
 * 5. Service applicability (if applicable_to_service_id is set)
 * 6. Usage limits (total + per-user) — reads current state
 *
 * Important: This function performs READ-ONLY checks.
 * It does NOT increment usage counters or create redemption records.
 * That is a separate step performed later in the payment finalization flow.
 *
 * The `eligibleSubtotal` is the authoritative booking subtotal
 * (computed by the PHS pricing engine, NOT client-provided).
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  couponCode: string,
  eligibleSubtotal: number,
  customerId?: string,
  serviceId?: string
): Promise<ValidateCouponResult> {
  const normalized = normalizeCouponCode(couponCode);
  if (!normalized) {
    return {
      eligible: false,
      coupon: null,
      error: "Invalid coupon code.",
      eligibleSubtotal,
      applicableServiceId: null,
    };
  }

  // 1. Fetch coupon from DB using normalized code
  const { data: couponData, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .single();

  if (error || !couponData) {
    return {
      eligible: false,
      coupon: null,
      error: "Coupon code not found or no longer valid.",
      eligibleSubtotal,
      applicableServiceId: null,
    };
  }

  const coupon = couponData as Coupon;

  // 2. Active status
  if (!coupon.is_active) {
    return {
      eligible: false,
      coupon,
      error: "Coupon is currently inactive.",
      eligibleSubtotal,
      applicableServiceId: coupon.applicable_to_service_id,
    };
  }

  // 3. Expiry check
  if (coupon.expires_at) {
    const expires = new Date(coupon.expires_at);
    const now = new Date();
    if (now >= expires) {
      return {
        eligible: false,
        coupon,
        error: "Coupon has expired.",
        eligibleSubtotal,
        applicableServiceId: coupon.applicable_to_service_id,
      };
    }
  }

  // 4. Minimum booking amount check
  if (coupon.min_booking_amount > 0 && eligibleSubtotal < coupon.min_booking_amount) {
    return {
      eligible: false,
      coupon,
      error: `Minimum booking amount of ₹${coupon.min_booking_amount} not met. Current subtotal: ₹${eligibleSubtotal}.`,
      eligibleSubtotal,
      applicableServiceId: coupon.applicable_to_service_id,
    };
  }

  // 5. Service applicability check
  if (coupon.applicable_to_service_id) {
    // Coupon is restricted to a specific service
    if (!serviceId) {
      return {
        eligible: false,
        coupon,
        error: "This coupon is restricted to a specific service.",
        eligibleSubtotal,
        applicableServiceId: coupon.applicable_to_service_id,
      };
    }
    if (coupon.applicable_to_service_id !== serviceId) {
      return {
        eligible: false,
        coupon,
        error: "This coupon is not applicable to the selected service.",
        eligibleSubtotal,
        applicableServiceId: coupon.applicable_to_service_id,
      };
    }
    // If serviceId matches, coupon is applicable
  }
  // If applicable_to_service_id is NULL, coupon applies to all services — proceed

  // 6. Usage limits check (read-only — does not increment counters)
  //    Enforced here for immediate user feedback. A hard DB UNIQUE
  //    (coupon_id, order_id) guards against double-redemption of the same
  //    order; configurable per-user / total limits are checked here.
  if (coupon.limit_per_user || coupon.total_limit) {
    const limits = await checkUsageLimits(supabase, coupon.id, customerId);
    if (limits.perUserLimitReached) {
      return {
        eligible: false,
        coupon,
        error: "You have already used this coupon.",
        eligibleSubtotal,
        applicableServiceId: coupon.applicable_to_service_id,
      };
    }
    if (limits.totalLimitReached) {
      return {
        eligible: false,
        coupon,
        error: "This coupon has reached its usage limit.",
        eligibleSubtotal,
        applicableServiceId: coupon.applicable_to_service_id,
      };
    }
  }

  return {
    eligible: true,
    coupon,
    error: undefined,
    eligibleSubtotal,
    applicableServiceId: coupon.applicable_to_service_id,
  };
}

/**
 * Calculate the discount amount for a validated coupon.
 * This is a pure function — no DB queries, no side effects.
 * It reuses the existing legacy `calculateCouponDiscount` math,
 * but only runs against coupon data that has already passed `validateCoupon`.
 *
 * The clamping rule (approved decision #4): discount must never exceed
 * the eligible authoritative subtotal.
 *
 * @param subtotal — authoritative booking subtotal (from PHS pricing engine)
 * @param coupon — already-validated Coupon object from `validateCoupon`
 * @returns discount amount (always >= 0 and <= subtotal)
 */
export function calculateCouponDiscount(subtotal: number, coupon: Coupon): number {
  if (!coupon) return 0;

  let discount: number;

  if (coupon.discount_type === "percentage") {
    discount = Math.round(subtotal * (Number(coupon.discount_value) / 100));
  } else if (coupon.discount_type === "fixed") {
    discount = Number(coupon.discount_value);
  } else {
    // Unknown discount type — fallback to 0
    return 0;
  }

  // Approved rule #4: Clamp discount to subtotal — never produce negative payable
  discount = Math.min(discount, subtotal);

  // Ensure non-negative
  return Math.max(0, discount);
}

/**
 * Check usage limits for a coupon against a customer.
 * This is a preliminary check; final enforcement uses database-level
 * transaction locking (see `coupon_usages` table UNIQUE constraint).
 *
 * @returns { totalLimitReached, perUserLimitReached, details }
 */
export interface UsageLimitsResult {
  totalLimitReached: boolean;
  perUserLimitReached: boolean;
  totalLimit: number | null;
  perUserLimit: number | null;
  currentTotalUsage: number;
  currentUserUsage: number;
}

/**
 * Preliminary usage limit check (read-only).
 * Returns current usage counts without incrementing.
 */
export async function checkUsageLimits(
  supabase: SupabaseClient,
  couponId: string,
  customerId?: string
): Promise<UsageLimitsResult> {
  // Count total + per-user usages via a SECURITY DEFINER RPC. This bypasses
  // RLS so the global total_limit can be evaluated without exposing individual
  // redemptions (which are row-scoped to the owner in coupon_usages RLS).
  const { data: usageData, error: usageError } = await supabase.rpc(
    "get_coupon_usage_counts",
    { p_coupon_id: couponId, p_user_id: customerId ?? null }
  );

  if (usageError) {
    console.error("[couponEngine] Error checking usage counts:", usageError);
    return {
      totalLimitReached: false,
      perUserLimitReached: false,
      totalLimit: null,
      perUserLimit: null,
      currentTotalUsage: 0,
      currentUserUsage: 0,
    };
  }

  const usageRow = Array.isArray(usageData) ? usageData[0] : usageData;
  const totalUsage = Number(usageRow?.total_count ?? 0);
  const currentUserUsage = Number(usageRow?.user_count ?? 0);

  // Get coupon limits
  const { data: couponData, error: couponError } = await supabase
    .from("coupons")
    .select("total_limit, limit_per_user")
    .eq("id", couponId)
    .single();

  if (couponError) {
    console.error("[couponEngine] Error fetching coupon limits:", couponError);
    return {
      totalLimitReached: false,
      perUserLimitReached: false,
      totalLimit: null,
      perUserLimit: null,
      currentTotalUsage: totalUsage || 0,
      currentUserUsage: currentUserUsage,
    };
  }

  const totalLimit = couponData.total_limit;
  const perUserLimit = couponData.limit_per_user;

  const totalLimitReached = totalLimit !== null && (totalUsage || 0) >= totalLimit;
  const perUserLimitReached = perUserLimit !== null && currentUserUsage >= perUserLimit;

  return {
    totalLimitReached,
    perUserLimitReached,
    totalLimit,
    perUserLimit,
    currentTotalUsage: totalUsage || 0,
    currentUserUsage,
  };
}