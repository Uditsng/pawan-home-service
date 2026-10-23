/**
 * Payable Engine — Single Source of Truth for cart aggregation and the final
 * payable amount. Reproduces the exact ordering used by the payment server:
 *   sum(per-service total_price, GST + coupon already applied)
 *   + sum(enabled order fees)
 *   → subtract wallet → final payable.
 * Referral rewards live in the customer's wallet (credited at registration),
 * so no checkout-time referral discount exists.
 */
import type {
  CartLineItem,
  CartPricingResult,
  FinalPayableInput,
  FinalPayableResult,
  OrderFeeItem,
} from "./types";

/**
 * Computes the final payable from an aggregate total before wallet,
 * injecting any configured fixed order fees.
 * `totalBeforeWallet` is the sum of per-service `breakdown.total_price`
 * (each already includes GST and any coupon discount).
 */
export function calculateFinalPayable(input: FinalPayableInput): FinalPayableResult {
  const totalBeforeWallet = Math.max(0, Number(input.totalBeforeWallet || 0));
  const walletAmountToUse = Math.max(0, Number(input.walletAmountToUse || 0));

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
  const finalPayable = Math.max(0, grossTotal - walletApplied);

  return { walletApplied, orderFeesTotal, finalPayable };
}

/**
 * Aggregates one or more per-service pricing breakdowns into cart-level totals
 * including enabled fixed order fees.
 */
export function calculateCart(input: {
  lineItems: CartLineItem[];
  orderFees?: OrderFeeItem[];
  walletBalanceToUse?: number;
}): CartPricingResult {
  let subtotal = 0;
  let gstTotal = 0;
  let couponDiscountTotal = 0;
  let offerDiscountTotal = 0;
  let totalBeforeWallet = 0;

  for (const item of input.lineItems) {
    const b = item.breakdown;
    // Pre-discount subtotal: re-add coupon/offer/wallet so the billing
    // "Subtotal" row reflects the true order value while coupon/offer/wallet
    // appear as their own line items (no double-counting of discounts).
    subtotal +=
      Number(b.total_price || 0) +
      Number(b.coupon_discount || 0) +
      Number(b.offer_discount || 0) +
      Number(b.wallet_discount || 0) -
      Number(b.gst_amount || 0);
    gstTotal += Number(b.gst_amount || 0);
    couponDiscountTotal += Number(b.coupon_discount || 0);
    offerDiscountTotal += Number(b.offer_discount || 0);
    totalBeforeWallet += Number(b.total_price || 0);
  }

  const activeFees = (input.orderFees || []).filter((f) => Number(f.amount) > 0);

  const payable = calculateFinalPayable({
    totalBeforeWallet,
    orderFees: activeFees,
    walletAmountToUse: input.walletBalanceToUse,
  });

  return {
    lineItems: input.lineItems,
    subtotal,
    gstTotal,
    orderFees: activeFees,
    orderFeesTotal: payable.orderFeesTotal,
    couponDiscountTotal,
    offerDiscountTotal,
    totalBeforeWallet,
    walletApplied: payable.walletApplied,
    finalPayable: payable.finalPayable,
  };
}

/**
 * Distributes an order-level wallet debit amount across cart lines
 * using the largest-remainder method (Hamilton-Hare method) in exact paise.
 * Lines with zero pre-wallet total receive zero.
 */
export function allocateWalletAcrossLines(
  weights: Record<string, number>,
  totalWalletApplied: number
): Record<string, number> {
  const result: Record<string, number> = {};
  const total = Math.max(0, totalWalletApplied || 0);
  if (total === 0) {
    for (const key of Object.keys(weights)) result[key] = 0;
    return result;
  }

  const entries = Object.entries(weights)
    .map(([key, w]) => ({ key, weight: Math.max(0, Math.round((Number(w) || 0) * 100)) }))
    .filter((e) => e.weight > 0);

  const weightSum = entries.reduce((sum, e) => sum + e.weight, 0);
  if (weightSum <= 0) {
    for (const key of Object.keys(weights)) result[key] = 0;
    return result;
  }

  const appliedPaise = Math.round(total * 100);

  // Floor shares in paise, then distribute the remainder by largest fraction.
  const shares = entries.map((e) => ({
    ...e,
    base: Math.floor((e.weight * appliedPaise) / weightSum),
    remainderKey: (e.weight * appliedPaise) % weightSum,
  }));
  const totalBase = shares.reduce((sum, s) => sum + s.base, 0);
  let leftover = appliedPaise - totalBase;

  shares.sort((a, b) => b.remainderKey - a.remainderKey);
  for (const s of shares) {
    if (leftover <= 0) break;
    s.base += 1;
    leftover -= 1;
  }

  for (const s of shares) {
    result[s.key] = s.base / 100;
  }
  for (const key of Object.keys(weights)) {
    if (result[key] === undefined) result[key] = 0;
  }
  return result;
}

