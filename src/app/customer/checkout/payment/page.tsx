import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CheckoutPaymentClient from "./CheckoutPaymentClient";
import { Coupon, CartItem, OfferType, OfferStatus, OfferValidityModel, OfferEligibility } from "@/lib/types";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { validateCouponAction } from "@/app/actions/coupon.actions";
import { isOfferCurrentlyActive } from "@/lib/offers/format";

export interface ServiceDisplayLine {
  serviceId: string;
  title: string;
  iconName: string;
  subcategoryName: string;
  categorySlug: string;
  pricingModel: string;
  config: {
    duration: number | null;
    areaSqft: number | null;
    quantity: number | null;
    distanceKm: number | null;
    variantId: string | null;
    addons: string | null;
    selectedPackages: string | null;
    formAnswers: string | null;
    meetingLocation: string | null;
    destination: string | null;
    expectedBags: string | null;
  };
}

export interface CheckoutOfferEntitlement {
  id: string;
  offer_id: string;
  offer_type: OfferType;
  remaining_value: number;
  remaining_uses: number;
  expires_at: string | null;
  offers: {
    code: string;
    title: string;
    artwork_url: string | null;
    offer_type: OfferType;
    benefit_value: number;
    max_discount: number | null;
    min_booking_amount: number;
  } | null;
}

interface OfferEntitlementRow {
  id: string;
  offer_id: string;
  offer_type: string;
  remaining_value: number | null;
  remaining_uses: number | null;
  expires_at: string | null;
  offers: {
    code: string;
    title: string;
    artwork_url: string | null;
    offer_type: string;
    benefit_value: number | null;
    max_discount: number | null;
    min_booking_amount: number | null;
    status: OfferStatus;
    validity_model: OfferValidityModel;
    valid_from: string | null;
    valid_until: string | null;
    eligibility: OfferEligibility;
  } | { code: string; title: string; artwork_url: string | null; offer_type: string;
    benefit_value: number | null; max_discount: number | null; min_booking_amount: number | null;
    status: OfferStatus; validity_model: OfferValidityModel; valid_from: string | null;
    valid_until: string | null; eligibility: OfferEligibility }[]
    | null;
}

function isTimestampPast(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() <= Date.now();
}

export default async function UnifiedCheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const {
    serviceId, date, time, addressId, cartItems,
    duration, meetingLocation, destination, expectedBags,
    selectedPackages, areaSqft, quantity, distanceKm,
    variantId, addons, formAnswers, couponCode,
  } = resolvedParams;

  if (!date || !time || !addressId) {
    redirect("/customer/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [addressResult, platformSettings, profileResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, area, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    fetchPlatformSettings(supabase),
    supabase.from("profiles").select("wallet_balance").eq("id", user.id).single(),
  ]);

  const addressObj = addressResult.data;
  if (!addressObj) redirect("/customer/dashboard");

  const taxRatePercent = platformSettings.taxRate;
  const walletBalance = Number(profileResult.data?.wallet_balance || 0);

  let scheduleDateObj: Date = new Date();
  if (date && time) {
    const [timePart, modifier] = time.split(" ");
    const [rawH, min] = timePart.split(":").map(Number);
    let h = rawH;
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    scheduleDateObj = new Date(`${date}T${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00+05:30`);
  }

  let items: CartItem[] = [];
  let serviceIds: string[] = [];

  if (serviceId) {
    // ─── Single-service flow ─────────────────────────────────
    serviceIds = [serviceId];
    items = [
      {
        serviceId,
        title: "",
        iconName: "",
        subcategoryName: "",
        categorySlug: "",
        gstApplicable: undefined,
        variantId: variantId || null,
        selectedDuration: duration ? parseInt(duration, 10) : null,
        areaSqft: areaSqft ? parseInt(areaSqft, 10) : null,
        quantity: quantity ? parseInt(quantity, 10) : null,
        distanceKm: distanceKm ? parseInt(distanceKm, 10) : null,
        addons: addons || null,
        selectedPackages: selectedPackages || null,
        formAnswers: formAnswers || null,
        meetingLocation: meetingLocation || null,
        destination: destination || null,
        expectedBags: expectedBags || null,
      },
    ];
  } else if (cartItems) {
    // ─── Cart flow ────────────────────────────────────────
    try {
      const parsedItems = JSON.parse(cartItems) as CartItem[];
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        redirect("/customer/dashboard");
      }
      items = parsedItems;
      serviceIds = parsedItems.map((i) => i.serviceId);
    } catch {
      redirect("/customer/dashboard");
    }
  } else {
    redirect("/customer/dashboard");
  }

  if (serviceIds.length === 0) {
    redirect("/customer/dashboard");
  }

  const { catalog, services: serviceSources } = await buildCartCatalog(serviceIds);

  // Single-service flow: enrich the display item from the fetched service source
  if (serviceId) {
    const src = serviceSources[serviceId];
    if (!src) redirect("/customer/dashboard");
    items[0] = {
      ...items[0],
      title: src.title,
      iconName: src.icon_name || "home_repair_service",
      subcategoryName: src.subcategory_name || "",
      categorySlug: (src.category || "").toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and"),
      gstApplicable: catalog.services[serviceId]?.gst_applicable ?? true,
      pricingModel: (src.pricing_model || "fixed") as CartItem["pricingModel"],
    };
  }

  // Cart flow: drop any items whose service is no longer in the catalog so they
  // don't silently vanish from the total — the client reports how many were removed.
  const unavailableItems = items.filter((item) => !catalog.services[item.serviceId]);
  const availableItems = items.filter((item) => catalog.services[item.serviceId]);
  const droppedCount = unavailableItems.length;

  // Cart flow: enrich display items from fetched service sources
  const services: ServiceDisplayLine[] = availableItems.map((item) => {
    const src = serviceSources[item.serviceId];
    if (!src) return null;
    return {
      serviceId: item.serviceId,
      title: src.title,
      iconName: src.icon_name || "home_repair_service",
      subcategoryName: src.subcategory_name || "",
      categorySlug: (src.category || "").toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and"),
      pricingModel: src.pricing_model || "fixed",
      config: {
        duration: item.selectedDuration ?? null,
        areaSqft: item.areaSqft ?? null,
        quantity: item.quantity ?? null,
        distanceKm: item.distanceKm ?? null,
        variantId: item.variantId ?? null,
        addons: item.addons ?? null,
        selectedPackages: item.selectedPackages ?? null,
        formAnswers: item.formAnswers ?? null,
        meetingLocation: item.meetingLocation ?? null,
        destination: item.destination ?? null,
        expectedBags: item.expectedBags ?? null,
      },
    };
  }).filter((s): s is ServiceDisplayLine => s !== null);

  if (services.length === 0) {
    redirect("/customer/dashboard");
  }

  // Coupon validation — use authoritative server-side validation. Runs after
  // `availableItems` (the checkout inputs) are built so the engine prices
  // exactly what will be charged.
  let couponObj: Coupon | null = null;
  let pricingSummary: {
    originalSubtotal: number;
    discountAmount: number;
    taxAmount: number;
    finalPayable: number;
    couponValid: boolean;
  } = {
    originalSubtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    finalPayable: 0,
    couponValid: false,
  };
  let appliedCouponCode: string | null = null;

  if (couponCode) {
    const validationResult = await validateCouponAction(
      couponCode,
      availableItems,
      date,
      time,
      addressId
    );
    if (validationResult.success) {
      appliedCouponCode = validationResult.couponCode;
      pricingSummary = {
        originalSubtotal: validationResult.originalSubtotal,
        discountAmount: validationResult.discountAmount,
        taxAmount: validationResult.taxAmount,
        finalPayable: validationResult.finalPayable,
        couponValid: validationResult.couponValid,
      };
      // The validated coupon object powers the live order-level allocation
      // (applyOrderLevelCoupon) — no separate re-fetch of the record.
      couponObj = validationResult.coupon;
    } else {
      // Coupon invalid — clear it and reset summary
      appliedCouponCode = null;
      pricingSummary = {
        originalSubtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        finalPayable: 0,
        couponValid: false,
      };
    }
  }

  const orderFees = (platformSettings.orderFees || [])
    .filter((f) => f.enabled && f.amount > 0)
    .map((f) => ({ id: f.id, name: f.name, amount: f.amount }));

  // ─── Offer entitlements applicable to this cart ─────────────────────
  const cartServiceIds = availableItems.map((i) => i.serviceId);
  const applicableOffers: CheckoutOfferEntitlement[] = [];

  const { data: entitlementRows } = await supabase
    .from("offer_entitlements")
    .select(`
      id, offer_id, offer_type, remaining_value, remaining_uses, expires_at,
      offers ( id, code, title, artwork_url, offer_type, benefit_value, max_discount,
               min_booking_amount, status, validity_model, valid_from, valid_until, eligibility )
    `)
    .eq("customer_id", user.id)
    .eq("status", "active")
    .limit(30);

  const candidateRows = ((entitlementRows || []) as unknown as OfferEntitlementRow[])
    .filter((r) => {
      const offer = Array.isArray(r.offers) ? r.offers[0] : r.offers;
      if (!offer) return false;
      if (!isOfferCurrentlyActive(offer)) return false;
      if (isTimestampPast(r.expires_at)) return false;
      if (offer.offer_type === "SERVICE_CREDIT" && Number(r.remaining_value) <= 0) return false;
      if (offer.offer_type !== "SERVICE_CREDIT" && Number(r.remaining_uses) < 1) return false;
      return true;
    });

  if (candidateRows.length > 0) {
    const candidateOfferIds = Array.from(
      new Set(candidateRows.map((r) => r.offer_id))
    );

    const [{ data: eligibleRows }, { count: completedCount }] = await Promise.all([
      supabase
        .from("offer_eligible_services")
        .select("offer_id, service_id")
        .in("offer_id", candidateOfferIds),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .eq("status", "completed"),
    ]);

    const eligibleByOffer = new Map<string, Set<string>>();
    for (const row of eligibleRows || []) {
      const set = eligibleByOffer.get(row.offer_id) || new Set<string>();
      set.add(row.service_id);
      eligibleByOffer.set(row.offer_id, set);
    }
    const hasCompleted = (completedCount || 0) > 0;

    for (const r of candidateRows) {
      const offer = Array.isArray(r.offers) ? r.offers[0] : r.offers;
      if (!offer) continue;

      if (offer.eligibility === "new" && hasCompleted) continue;
      if (offer.eligibility === "existing" && !hasCompleted) continue;

      const eligibleIds = eligibleByOffer.get(r.offer_id) || new Set<string>();
      if (eligibleIds.size === 0) continue;
      if (!cartServiceIds.every((id) => eligibleIds.has(id))) continue;

      applicableOffers.push({
        id: r.id,
        offer_id: r.offer_id,
        offer_type: r.offer_type as OfferType,
        remaining_value: Number(r.remaining_value || 0),
        remaining_uses: Number(r.remaining_uses || 0),
        expires_at: r.expires_at,
        offers: {
          code: offer.code,
          title: offer.title,
          artwork_url: offer.artwork_url,
          offer_type: offer.offer_type as OfferType,
          benefit_value: Number(offer.benefit_value || 0),
          max_discount: offer.max_discount != null ? Number(offer.max_discount) : null,
          min_booking_amount: Number(offer.min_booking_amount || 0),
        },
      });
    }
  }

  return (
    <CheckoutPaymentClient
      services={services}
      catalog={catalog}
      items={availableItems}
      droppedCount={droppedCount}
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      scheduleDate={scheduleDateObj.toISOString()}
      pincode={addressObj.pincode}
      taxRatePercent={taxRatePercent}
      walletBalance={walletBalance}
      orderFees={orderFees}
      couponCode={couponCode || null}
      couponObj={couponObj}
      pricingSummary={pricingSummary}
      appliedCouponCode={appliedCouponCode}
      offerEntitlements={applicableOffers}
      cancellationWindowMinutes={platformSettings.freeCancellationWindowMinutes}
    />
  );
}
