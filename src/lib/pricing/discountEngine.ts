/**
 * Discount Engine — Single Responsibility Engine for Coupons & Referral Rewards
 * Handles coupon code math and 50-50 referral checkout discounts.
 */
import type {
  CouponInput,
  ReferralConfig,
  ReferralDiscountResult,
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
 * Calculates referral discount to apply at checkout based on user status and admin settings.
 */
export function calculateReferralDiscount(
  isReferredUser: boolean,
  referralConfig: ReferralConfig
): ReferralDiscountResult {
  if (!referralConfig.isEnabled) {
    return {
      discountAmount: 0,
      isApplied: false,
      message: "Referral program is currently disabled.",
    };
  }

  if (!isReferredUser) {
    return {
      discountAmount: 0,
      isApplied: false,
    };
  }

  const discountAmount = Math.max(0, Number(referralConfig.referredDiscount || 50));
  return {
    discountAmount,
    isApplied: discountAmount > 0,
    message: `First booking referral discount (₹${discountAmount}) applied!`,
  };
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
