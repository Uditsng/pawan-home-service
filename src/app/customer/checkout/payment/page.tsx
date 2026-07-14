import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaymentFormClient from "./PaymentFormClient";
import { calculatePricingBreakdown, PricingInput } from "@/utils/pricingEngine";
import { PricingModel, Service, ServiceVariant, ServiceAddon, ServicePricingRule, Coupon, UserMembership, MembershipPlan } from "@/lib/types";



export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    serviceId?: string;
    date?: string;
    time?: string;
    addressId?: string;
    duration?: string;
    meetingLocation?: string;
    destination?: string;
    expectedBags?: string;
    selectedPackages?: string;
    areaSqft?: string;
    quantity?: string;
    distanceKm?: string;
    variantId?: string;
    addons?: string;
    formAnswers?: string;
    couponCode?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const {
    serviceId,
    date,
    time,
    addressId,
    duration,
    meetingLocation,
    destination,
    expectedBags,
    selectedPackages,
    areaSqft,
    quantity,
    distanceKm,
    variantId,
    addons,
    formAnswers,
    couponCode,
  } = resolvedParams;

  if (!serviceId || !date || !time || !addressId) {
    redirect("/customer/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [addressResult, serviceResult, settingsResult, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    supabase.from("services").select("id, title, base_price, category, pricing_model, page_content, pricing_config, gst_applicable").eq("id", serviceId).eq("status", "published").single(),
    supabase.from("platform_settings").select("key, value").in("key", ["tax_rate", "referral_reward_referred"]),
    supabase.from("profiles").select("referred_by, wallet_balance").eq("id", user.id).single(),
    supabase.from("bookings").select("id", { count: "exact" }).eq("customer_id", user.id).eq("status", "completed"),
  ]);

  const addressObj = addressResult.data;
  const service = serviceResult.data;

  if (!addressObj || !service) {
    redirect("/customer/dashboard");
  }

  // Parse platform settings
  const settingsMap = (settingsResult.data || []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = typeof row.value === "string" ? row.value : String(row.value);
    return acc;
  }, {});

  let taxRatePercent = 18;
  try {
    const rawTax = settingsMap["tax_rate"]?.replace(/%/g, "").trim();
    const parsed = parseFloat(rawTax || "18");
    if (!isNaN(parsed)) taxRatePercent = parsed;
  } catch {
    /* use default */
  }

  const isReferred = !!profileResult.data?.referred_by;
  const hasCompletedBookings = (completedBookingsResult.count ?? 0) > 0;
  let referralDiscount = 0;
  if (isReferred && !hasCompletedBookings) {
    const rawDiscount = parseFloat(settingsMap["referral_reward_referred"] || "50");
    if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscount = rawDiscount;
  }

  const walletBalance = Number(profileResult.data?.wallet_balance || 0);

  // Fetch variants, addons, and surcharge rules in parallel
  const [variantsRes, addonsRes, rulesRes] = await Promise.all([
    supabase.from("service_variants").select("*").eq("service_id", service.id).eq("is_active", true),
    supabase.from("service_addons").select("*").eq("service_id", service.id).eq("is_active", true),
    supabase.from("service_pricing_rules").select("*").or(`service_id.eq.${service.id},service_id.is.null`).eq("is_active", true)
  ]);

  const variants = (variantsRes.data || []) as ServiceVariant[];
  const addonsList = (addonsRes.data || []) as ServiceAddon[];
  const rules = (rulesRes.data || []) as ServicePricingRule[];

  // Parse variant price
  let variantPrice: number | null = null;
  let selectedVariant = null;
  if (variantId) {
    selectedVariant = variants.find(v => v.id === variantId);
    if (selectedVariant) variantPrice = Number(selectedVariant.price);
  }

  // Parse selected addons
  const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
  if (addons) {
    const pairs = addons.split(",");
    for (const pair of pairs) {
      const [id, qtyStr] = pair.split(":");
      const qty = parseInt(qtyStr, 10) || 0;
      const match = addonsList.find(a => a.id === id);
      if (match && qty > 0) {
        parsedAddons.push({
          id: match.id,
          title: match.title,
          price: Number(match.price),
          quantity: qty
        });
      }
    }
  }

  // Fetch active coupon code
  let couponObj: Coupon | null = null;
  if (couponCode) {
    const { data: couponData } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode)
      .eq("is_active", true)
      .single();
    if (couponData) {
      const now = new Date();
      if (!couponData.expires_at || new Date(couponData.expires_at) > now) {
        couponObj = couponData as unknown as Coupon;
      }
    }
  }

  // Fetch active membership benefits
  let isMember = false;
  let memberBenefit: MembershipPlan['benefits'] | null = null;
  const { data: membershipData } = await supabase
    .from("user_memberships")
    .select("*, membership_plans(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  interface UserMembershipWithPlan extends UserMembership {
    membership_plans: MembershipPlan | null;
  }

  const membership = membershipData as unknown as UserMembershipWithPlan | null;

  if (membership && membership.membership_plans) {
    isMember = true;
    memberBenefit = membership.membership_plans.benefits || {};
  }

  // Calculate pricing breakdown
  const durationVal = duration ? parseInt(duration, 10) : undefined;
  const parsedAreaSqft = areaSqft ? parseInt(areaSqft, 10) : undefined;
  const parsedQuantity = quantity ? parseInt(quantity, 10) : undefined;
  const parsedDistanceKm = distanceKm ? parseInt(distanceKm, 10) : undefined;

  let scheduledDateObj: Date = new Date();
  if (date && time) {
    const [timePart, modifier] = time.split(" ");
    const [rawH, min] = timePart.split(":").map(Number);
    let h = rawH;
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    scheduledDateObj = new Date(`${date}T${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00+05:30`);
  }

  const breakdown = calculatePricingBreakdown({
    pricingModel: (service.pricing_model || "fixed") as PricingModel,
    basePrice: Number(service.base_price || 0),
    pricingConfig: (service.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
    variantPrice,
    durationMinutes: durationVal,
    areaSqft: parsedAreaSqft,
    quantity: parsedQuantity,
    distanceKm: parsedDistanceKm,
    addons: parsedAddons,
    scheduledDate: scheduledDateObj,
    pincode: addressObj.pincode,
    surchargeRules: rules,
    coupon: couponObj,
    isMember,
    memberBenefit,
    walletBalanceToUse: 0, // calculated dynamically in form client
    gstApplicable: service.gst_applicable,
  });

  return (
    <PaymentFormClient
      service={service as unknown as Service}
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
      walletBalance={walletBalance}
      duration={durationVal}
      areaSqft={parsedAreaSqft}
      quantity={parsedQuantity}
      distanceKm={parsedDistanceKm}
      variantId={variantId}
      addons={addons}
      formAnswers={formAnswers}
      couponCode={couponCode}
      initialBreakdown={breakdown}
      meetingLocation={meetingLocation}
      destination={destination}
      expectedBags={expectedBags}
      selectedPackages={selectedPackages}
    />
  );
}
