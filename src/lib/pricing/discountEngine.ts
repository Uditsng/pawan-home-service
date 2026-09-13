/**
 * Discount Engine — Single Responsibility Engine for Coupons
 * Handles coupon code math only. Referral rewards are credited directly to
 * the customer's wallet at registration (see reward_customer_referral RPC) —
 * there is no checkout-time referral discount anymore.
 */
import type {
  CouponInput,
  ReferralConfig,
} from "./types";

/**
 * Calculates a coupon discount against a subtotal.
 * Mirrors the historical inline logic in the pricing engine (percentage/fixed,
 * minimum booking amount, and max discount cap).
 */
export function calculateCouponDiscount(
  subtotal: number,
  coupon?: CouponInput | null
): number {
  if (!coupon) return 0;

  const minAmt = Number(coupon.min_booking_amount || 0);
  if (subtotal < minAmt) return 0;

  let discount =
    coupon.discount_type === "percentage"
      ? Math.round(subtotal * (Number(coupon.discount_value) / 100))
      : Number(coupon.discount_value);

  if (coupon.max_discount !== undefined && coupon.max_discount !== null) {
    discount = Math.min(discount, Number(coupon.max_discount));
  }

  return Math.max(0, discount);
}

/**
 * Returns safe referral reward configuration with defaults.
 */
export function getReferralRewardConfig(config: Partial<ReferralConfig> = {}): ReferralConfig {
  return {
    referrerReward: config.referrerReward ?? 50,
    referredDiscount: config.referredDiscount ?? 50,
    isEnabled: config.isEnabled ?? true,
  };
}
