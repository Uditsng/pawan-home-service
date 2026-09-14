import type { Offer, OfferEntitlement, OfferType } from "@/lib/types";

export function offerTypeLabel(t: OfferType): string {
  switch (t) {
    case "FIXED_DISCOUNT":
      return "Fixed Discount";
    case "PERCENTAGE_DISCOUNT":
      return "Percentage Discount";
    case "SERVICE_CREDIT":
      return "Service Credit";
    default:
      return t;
  }
}

export function formatOfferBenefit(offer: Pick<Offer, "offer_type" | "benefit_value" | "max_discount">): string {
  if (offer.offer_type === "PERCENTAGE_DISCOUNT") {
    const base = `${offer.benefit_value}% Off`;
    return offer.max_discount ? `${base} (up to ₹${offer.max_discount})` : base;
  }
  return offer.offer_type === "SERVICE_CREDIT"
    ? `₹${offer.benefit_value} Service Credit`
    : `₹${offer.benefit_value} Off`;
}

export function formatEntitlementValue(e: Pick<OfferEntitlement, "offer_type" | "remaining_value" | "remaining_uses">): string {
  if (e.offer_type === "SERVICE_CREDIT") {
    return `₹${e.remaining_value} credit left`;
  }
  return `${e.remaining_uses} use${e.remaining_uses === 1 ? "" : "s"} left`;
}

export function isOfferCurrentlyActive(offer: Pick<Offer, "status" | "valid_from" | "valid_until">): boolean {
  if (offer.status !== "active") return false;
  const now = Date.now();
  if (offer.valid_from && new Date(offer.valid_from).getTime() > now) return false;
  if (offer.valid_until && new Date(offer.valid_until).getTime() < now) return false;
  return true;
}

export function offerEligibilityLabel(eligibility: Offer["eligibility"]): string {
  switch (eligibility) {
    case "new":
      return "New customers only";
    case "existing":
      return "Existing customers only";
    default:
      return "All customers";
  }
}