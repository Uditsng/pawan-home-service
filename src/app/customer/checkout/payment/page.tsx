import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CheckoutPaymentClient from "./CheckoutPaymentClient";
import { Coupon, CartItem } from "@/lib/types";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculateReferralDiscount } from "@/lib/pricing";
import { validateCouponAction } from "@/app/actions/coupon.actions";

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

  const [addressResult, platformSettings, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, area, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    fetchPlatformSettings(supabase),
    supabase.from("profiles").select("referred_by, wallet_balance").eq("id", user.id).single(),
    supabase.from("bookings").select("id", { count: "exact" }).eq("customer_id", user.id).eq("status", "completed"),
  ]);

  const addressObj = addressResult.data;
  if (!addressObj) redirect("/customer/dashboard");

  const taxRatePercent = platformSettings.taxRate;
  const isReferred = !!profileResult.data?.referred_by;
  const hasCompletedBookings = (completedBookingsResult.count ?? 0) > 0;

  const referralCalc = calculateReferralDiscount(isReferred && !hasCompletedBookings, {
    referrerReward: platformSettings.referralRewardReferrer,
    referredDiscount: platformSettings.referralRewardReferred,
    isEnabled: platformSettings.referralEnabled,
  });
  const referralDiscount = referralCalc.discountAmount;
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
      // Fetch the full coupon record for display purposes
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", validationResult.couponCode)
        .single();
      if (couponData) {
        couponObj = couponData as unknown as Coupon;
      }
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
      referralDiscount={referralDiscount}
      walletBalance={walletBalance}
      couponCode={couponCode || null}
      couponObj={couponObj}
      pricingSummary={pricingSummary}
      appliedCouponCode={appliedCouponCode}
    />
  );
}
