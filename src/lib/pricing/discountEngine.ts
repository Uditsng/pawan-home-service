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
 * Order-level coupon allocation. Coupons are applied ONCE per order, not once
 * per cart line — a fixed coupon discounts the whole order subtotal once, is
 * clamped to that subtotal, and is then distributed paisa-exactly across the
 * lines that generated the discount. Percentage coupons are capped by the
 * coupon's `max_discount` and by the order subtotal itself.
 *
 * This is the SINGLE discount computation shared by:
 *   - the client checkout preview (instant totals)
 *   - the server payment authority (`computeServiceBreakdowns`)
 *   - the server coupon validation (`validateCouponAction`)
 * so all three always agree on the numbers that get charged.
 */
export interface OrderLevelCouponResult {
  orderDiscount: number;
  perServiceAllocation: Record<string, number>;
}

export function applyOrderLevelCoupon(
  discountableBases: Record<string, number>,
  coupon?: CouponInput | null
): OrderLevelCouponResult {
  const baseByService: Record<string, number> = {};
  let orderSubtotal = 0;
  for (const [serviceId, rawBase] of Object.entries(discountableBases)) {
    const base = Math.max(0, Number(rawBase || 0));
    baseByService[serviceId] = base;
    orderSubtotal += base;
  }

  if (!coupon || orderSubtotal <= 0) {
    return { orderDiscount: 0, perServiceAllocation: {} };
  }

  let discount =
    coupon.discount_type === "percentage"
      ? Math.round(orderSubtotal * (Number(coupon.discount_value) / 100))
      : Number(coupon.discount_value);

  if (coupon.max_discount !== undefined && coupon.max_discount !== null) {
    discount = Math.min(discount, Number(coupon.max_discount));
  }

  // Never discount more than the order subtotal — the payable stays >= 0 and
  // the recorded `coupon_discount` never overstates the real saving.
  discount = Math.max(0, Math.min(discount, orderSubtotal));

  if (discount === 0) {
    return { orderDiscount: 0, perServiceAllocation: {} };
  }

  // Distribute the order discount across lines via largest remainder so the
  // per-line `coupon_discount` values sum to exactly `dist`.
  const perServiceAllocation: Record<string, number> = {};
  let remaining = discount;
  for (const [serviceId, base] of Object.entries(baseByService)) {
    if (base <= 0) {
      perServiceAllocation[serviceId] = 0;
      continue;
    }
    const allocated = Math.min(
      remaining,
      Math.round((base / orderSubtotal) * discount)
    );
    perServiceAllocation[serviceId] = allocated;
    remaining -= allocated;
  }

  if (remaining > 0) {
    const largestFirst = Object.entries(baseByService)
      .filter(([, base]) => base > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [serviceId] of largestFirst) {
      if (remaining <= 0) break;
      perServiceAllocation[serviceId] = (perServiceAllocation[serviceId] || 0) + 1;
      remaining -= 1;
    }
  }

  return { orderDiscount: discount, perServiceAllocation };
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
