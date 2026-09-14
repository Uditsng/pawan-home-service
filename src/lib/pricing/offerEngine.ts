/**
 * Offer Engine — Pure math for Offer Cards.
 * Mirrors the reserve_offer_benefit / apply_offer_redemption RPC math so the
 * client preview and the server always agree. No database access.
 */
import type { OfferBenefit } from "./types";

/**
 * Computes the order-level discount an offer provides against a cart total.
 * Used ONLY for client-side preview — the server-authoritative amount comes
 * from the `reserve_offer_benefit` RPC at order creation.
 *
 * @param cartTotal pre-wallet, post-coupon cart total (rupees)
 * @param benefit   offer configuration (entitlement-aware for SERVICE_CREDIT)
 */
export function calculateOfferDiscount(cartTotal: number, benefit: OfferBenefit | null | undefined): number {
  if (!benefit) return 0;

  const total = Math.max(0, Number(cartTotal) || 0);
  const minAmount = Number(benefit.minBookingAmount || 0);
  if (total < minAmount) return 0;

  let discount: number;

  switch (benefit.offerType) {
    case "SERVICE_CREDIT":
      discount = Math.min(Number(benefit.remainingValue ?? benefit.benefitValue) || 0, total);
      break;
    case "FIXED_DISCOUNT":
      discount = Math.min(Number(benefit.benefitValue) || 0, total);
      break;
    case "PERCENTAGE_DISCOUNT": {
      discount = Math.round(total * (Number(benefit.benefitValue) || 0)) / 100;
      if (benefit.maxDiscount != null && benefit.maxDiscount > 0) {
        discount = Math.min(discount, Number(benefit.maxDiscount));
      }
      break;
    }
    default:
      return 0;
  }

  // Per-use offer types require remaining uses (a SERVICE_CREDIT pool has
  // remaining value instead, already covered above).
  if (
    benefit.offerType !== "SERVICE_CREDIT" &&
    benefit.remainingUses != null &&
    benefit.remainingUses < 1
  ) {
    return 0;
  }

  return Math.max(0, Math.min(discount, total));
}

/**
 * Allocates an order-level offer discount across booking lines, weighted by
 * each line's pre-offer total. Exact to the paisa (largest-remainder method),
 * so Sum(per-line) === order-level amount exactly.
 *
 * @param weights       serviceId → pre-offer line total (via breakdown.total_price)
 * @param totalApplied  order-level offer amount to allocate
 */
export function allocateOfferAcrossLines(
  weights: Record<string, number>,
  totalApplied: number
): Record<string, number> {
  const result: Record<string, number> = {};
  const total = Math.max(0, totalApplied || 0);
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
  // Lines with zero pre-offer total get zero.
  for (const key of Object.keys(weights)) {
    if (result[key] === undefined) result[key] = 0;
  }
  return result;
}