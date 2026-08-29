"use server";

import { createClient } from "@/utils/supabase/server";
import { normalizeCouponCode, validateCoupon } from "@/lib/pricing/couponEngine";
import { CartItem, Coupon } from "@/lib/types";
import { computeCartLineItems } from "@/lib/pricing/cartCatalog";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import { combineDateTimeToISO } from "@/utils/schedule";
import type { ServiceCheckoutInput } from "@/app/actions/payment";

/**
 * Validates a coupon code and returns an authoritative pricing summary.
 *
 * This is the server-side "Apply" step. It validates the coupon against
 * the authoritative booking subtotal and returns the discount, tax,
 * and final payable amount that should be displayed to the user.
 *
 * The returned values are immutable snapshots for the life of the
 * associated Razorpay order (per approved decision #11).
 *
 * @param couponCode - the coupon code entered by the user
 * @param services - the service checkout inputs (service IDs, variants, addons, etc.)
 * @param date - booking date
 * @param time - booking time
 * @param addressId - user's address ID (for pincode lookup)
 * @returns pricing summary with discount, tax, final amount, and validity status
 */
export type ValidateCouponActionResult =
  | {
      success: true;
      couponCode: string;
      originalSubtotal: number;
      discountAmount: number;
      taxAmount: number;
      finalPayable: number;
      couponValid: boolean;
      applicableServiceId: string | null;
      error: undefined;
    }
  | { success: false; error: string };

export async function validateCouponAction(
  couponCode: string,
  services: ServiceCheckoutInput[],
  date: string,
  time: string,
  addressId: string
): Promise<ValidateCouponActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const normalized = normalizeCouponCode(couponCode);
  if (!normalized) {
    return { success: false, error: "Invalid coupon code format." };
  }

  // Get the user's address for pincode lookup
  const { data: addr } = await supabase
    .from("user_addresses")
    .select("pincode")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .single();
  if (!addr) throw new Error("Address not found");

  // 1. Build the catalog and normalize inputs to cart items.
  const serviceIds = services.map((s) => s.serviceId);
  const { catalog, services: serviceSources } = await buildCartCatalog(serviceIds);

  const items: CartItem[] = services.map((item) => ({
    serviceId: item.serviceId,
    title: serviceSources[item.serviceId]?.title || "",
    iconName: "",
    subcategoryName: "",
    categorySlug: "",
    gstApplicable: catalog.services[item.serviceId]?.gst_applicable ?? true,
    variantId: item.variantId ?? null,
    selectedDuration: item.duration ?? null,
    areaSqft: item.areaSqft ?? null,
    quantity: item.quantity ?? null,
    distanceKm: item.distanceKm ?? null,
    addons: item.addons ?? null,
    selectedPackages: item.selectedPackages ?? null,
    formAnswers: item.formAnswers ?? null,
    meetingLocation: item.meetingLocation ?? null,
    destination: item.destination ?? null,
    expectedBags: item.expectedBags ?? null,
  }));

  const scheduledDate = new Date(combineDateTimeToISO(date, time));

  // Pass 1 — without coupon, to get the authoritative pre-coupon subtotal
  // used for validation (min booking amount, usage limits, etc.).
  const baseLineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: addr.pincode,
  });
  let authoritativeSubtotal = 0;
  for (const line of baseLineItems) {
    authoritativeSubtotal += line.breakdown.total_price;
  }

  // 2. Validate the coupon using the authoritative engine
  const validationResult = await validateCoupon(
    supabase,
    normalized,
    authoritativeSubtotal,
    user.id,
    services[0]?.serviceId ?? undefined
  );

  if (!validationResult.eligible) {
    return { success: false, error: validationResult.error || "Coupon is not valid." };
  }

  const coupon = validationResult.coupon!;

  // Service-restriction guard (must match computeServiceBreakdowns in payment.ts):
  // if the coupon is limited to a specific service, every cart service must match.
  if (
    coupon.applicable_to_service_id &&
    !serviceIds.every((id) => id === coupon.applicable_to_service_id)
  ) {
    return {
      success: false,
      error: "This coupon is not applicable to the selected services.",
    };
  }

  // Pass 2 — with the validated coupon, to derive the authoritative
  // discount/tax/final. Uses the canonical engine so it matches exactly what
  // will be charged at checkout (no parallel pricing system).
  const pricedLineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: addr.pincode,
    coupon,
  });
  let totalAmount = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  for (const line of pricedLineItems) {
    totalAmount += line.breakdown.total_price;
    discountAmount += line.breakdown.coupon_discount;
    taxAmount += line.breakdown.gst_amount;
  }

  // originalSubtotal (pre-coupon) = final payable + coupon discount.
  const originalSubtotal = totalAmount + discountAmount;
  const finalPayable = totalAmount;

  // 4. Return the authoritative pricing summary
  return {
    success: true,
    couponCode: normalized,
    originalSubtotal,
    discountAmount,
    taxAmount,
    finalPayable,
    couponValid: validationResult.eligible,
    applicableServiceId: coupon.applicable_to_service_id,
    error: undefined,
  };
}

/**
 * Returns the active, non-expired coupons that are applicable to the given
 * cart's services, for the "Browse coupons" picker in checkout. This is a
 * marketing/discovery surface only — the authoritative validation still runs
 * via `validateCouponAction` when a coupon is actually applied.
 *
 * Service restrictment mirrors `validateCouponAction`: a coupon limited to a
 * specific service is only shown when that service is in the cart. `null`
 * applicability means it applies to all services.
 */
export type AvailableCoupon = Coupon & {
  applicableServiceTitle: string | null;
};

export async function listAvailableCoupons(
  serviceIds: string[]
): Promise<AvailableCoupon[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("coupons")
    .select("*, services ( title )")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const now = Date.now();

  return (data as unknown as Array<Coupon & { services: { title: string } | null }>)
    .filter((c) => {
      // Drop expired coupons.
      if (c.expires_at && new Date(c.expires_at).getTime() <= now) return false;
      // Drop coupons limited to a service not in this cart.
      if (c.applicable_to_service_id && !serviceIds.includes(c.applicable_to_service_id)) {
        return false;
      }
      return true;
    })
    .map((c) => ({
      ...(c as Coupon),
      applicableServiceTitle: c.services?.title ?? null,
    }));
}
