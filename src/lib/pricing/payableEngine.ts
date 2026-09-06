/**
 * Payable Engine — Single Source of Truth for cart aggregation and the final
 * payable amount. Reproduces the exact ordering used by the payment server:
 *   sum(per-service total_price, GST + coupon already applied)
 *   + sum(enabled order fees)
 *   → subtract wallet → subtract referral discount → final payable.
 */
import type {
  CartLineItem,
  CartPricingResult,
  FinalPayableInput,
  FinalPayableResult,
  OrderFeeItem,
} from "./types";

/**
 * Computes the final payable from an aggregate total before wallet/referral,
 * injecting any configured fixed order fees.
 * `totalBeforeWallet` is the sum of per-service `breakdown.total_price`
 * (each already includes GST and any coupon discount).
 */
export function calculateFinalPayable(input: FinalPayableInput): FinalPayableResult {
  const totalBeforeWallet = Math.max(0, Number(input.totalBeforeWallet || 0));
  const walletAmountToUse = Math.max(0, Number(input.walletAmountToUse || 0));
  const referralDiscount = Math.max(0, Number(input.referralDiscount || 0));

  let orderFeesTotal = 0;
  if (input.orderFees && Array.isArray(input.orderFees)) {
    for (const fee of input.orderFees) {
      const amt = Number(fee.amount || 0);
      if (!isNaN(amt) && amt > 0) {
        orderFeesTotal += amt;
      }
    }
  }

  const grossTotal = totalBeforeWallet + orderFeesTotal;
  const walletApplied = Math.min(walletAmountToUse, grossTotal);
  const finalPayable = Math.max(0, grossTotal - walletApplied - referralDiscount);

  return { walletApplied, referralDiscount, orderFeesTotal, finalPayable };
}

/**
 * Aggregates one or more per-service pricing breakdowns into cart-level totals
 * including enabled fixed order fees.
 */
export function calculateCart(input: {
  lineItems: CartLineItem[];
  orderFees?: OrderFeeItem[];
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

  const activeFees = (input.orderFees || []).filter((f) => Number(f.amount) > 0);

  const payable = calculateFinalPayable({
    totalBeforeWallet,
    orderFees: activeFees,
    walletAmountToUse: input.walletBalanceToUse,
    referralDiscount: input.referralDiscount,
  });

  return {
    lineItems: input.lineItems,
    subtotal,
    gstTotal,
    orderFees: activeFees,
    orderFeesTotal: payable.orderFeesTotal,
    couponDiscountTotal,
    totalBeforeWallet,
    walletApplied: payable.walletApplied,
    referralDiscount: payable.referralDiscount,
    finalPayable: payable.finalPayable,
  };
}
