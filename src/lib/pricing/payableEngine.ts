/**
 * Payable Engine — Single Source of Truth for cart aggregation and the final
 * payable amount. Reproduces the exact ordering used by the payment server:
 *   sum(per-service total_price, GST + coupon already applied)
 *   → subtract wallet → subtract referral discount → final payable.
 */
import type {
  CartLineItem,
  CartPricingResult,
  FinalPayableInput,
  FinalPayableResult,
} from "./types";

/**
 * Computes the final payable from an aggregate total before wallet/referral.
 * `totalBeforeWallet` is the sum of per-service `breakdown.total_price`
 * (each already includes GST and any coupon discount).
 */
export function calculateFinalPayable(input: FinalPayableInput): FinalPayableResult {
  const totalBeforeWallet = Math.max(0, Number(input.totalBeforeWallet || 0));
  const walletAmountToUse = Math.max(0, Number(input.walletAmountToUse || 0));
  const referralDiscount = Math.max(0, Number(input.referralDiscount || 0));

  const walletApplied = Math.min(walletAmountToUse, totalBeforeWallet);
  const finalPayable = Math.max(0, totalBeforeWallet - walletApplied - referralDiscount);

  return { walletApplied, referralDiscount, finalPayable };
}

/**
 * Aggregates one or more per-service pricing breakdowns into cart-level totals.
 */
export function calculateCart(input: {
  lineItems: CartLineItem[];
  walletBalanceToUse?: number;
  referralDiscount?: number;
}): CartPricingResult {
  let subtotal = 0;
  let gstTotal = 0;
  let couponDiscountTotal = 0;
  let totalBeforeWallet = 0;

  for (const item of input.lineItems) {
    const b = item.breakdown;
    subtotal += Number(b.total_price || 0) - Number(b.gst_amount || 0);
    gstTotal += Number(b.gst_amount || 0);
    couponDiscountTotal += Number(b.coupon_discount || 0);
    totalBeforeWallet += Number(b.total_price || 0);
  }

  const payable = calculateFinalPayable({
    totalBeforeWallet,
    walletAmountToUse: input.walletBalanceToUse,
    referralDiscount: input.referralDiscount,
  });

  return {
    lineItems: input.lineItems,
    subtotal,
    gstTotal,
    couponDiscountTotal,
    totalBeforeWallet,
    walletApplied: payable.walletApplied,
    referralDiscount: payable.referralDiscount,
    finalPayable: payable.finalPayable,
  };
}
