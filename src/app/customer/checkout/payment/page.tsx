import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CheckoutPaymentClient from "./CheckoutPaymentClient";
import { calculatePricingBreakdown, PricingInput } from "@/utils/pricingEngine";
import { PricingModel, ServiceVariant, ServiceAddon, ServicePricingRule, Coupon, CartItem } from "@/lib/types";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculateReferralDiscount } from "@/lib/engines/referralEngine";

interface ServiceBreakdownData {
  serviceId: string;
  title: string;
  iconName: string;
  subcategoryName: string;
  categorySlug: string;
  pricingModel: string;
  breakdown: ReturnType<typeof calculatePricingBreakdown>;
  config: {
    duration?: number | null;
    areaSqft?: number | null;
    quantity?: number | null;
    distanceKm?: number | null;
    variantId?: string | null;
    addons?: string | null;
    selectedPackages?: string | null;
    formAnswers?: string | null;
    meetingLocation?: string | null;
    destination?: string | null;
    expectedBags?: string | null;
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

  // Fetch active coupon code (for single-service flow, couponCode comes from query param)
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

  let scheduleDateObj: Date = new Date();
  if (date && time) {
    const [timePart, modifier] = time.split(" ");
    const [rawH, min] = timePart.split(":").map(Number);
    let h = rawH;
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    scheduleDateObj = new Date(`${date}T${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00+05:30`);
  }

  let servicesBreakdowns: ServiceBreakdownData[] = [];

  if (serviceId) {
    // ─── Single-service flow ─────────────────────────────────
    const { data: service } = await supabase
      .from("services")
      .select("id, title, category, base_price, pricing_model, pricing_config, page_content, gst_applicable, subcategories(subcategory_name, icon_name)")
      .eq("id", serviceId)
      .eq("status", "published")
      .single();

    if (!service) redirect("/customer/dashboard");

    const [variantsRes, addonsRes, rulesRes] = await Promise.all([
      supabase.from("service_variants").select("*").eq("service_id", service.id).eq("is_active", true),
      supabase.from("service_addons").select("*").eq("service_id", service.id).eq("is_active", true),
      supabase.from("service_pricing_rules").select("*").or(`service_id.eq.${service.id},service_id.is.null`).eq("is_active", true),
    ]);

    const variants = (variantsRes.data || []) as ServiceVariant[];
    const addonsList = (addonsRes.data || []) as ServiceAddon[];
    const rules = (rulesRes.data || []) as ServicePricingRule[];

    let variantPrice: number | null = null;
    if (variantId) {
      const found = variants.find(v => v.id === variantId);
      if (found) variantPrice = Number(found.price);
    }

    const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
    if (addons) {
      const pairs = addons.split(",");
      for (const pair of pairs) {
        const [id, qtyStr] = pair.split(":");
        const qty = parseInt(qtyStr, 10) || 0;
        const match = addonsList.find(a => a.id === id);
        if (match && qty > 0) {
          parsedAddons.push({ id: match.id, title: match.title, price: Number(match.price), quantity: qty });
        }
      }
    }

    const mappedRules = (rules || []).map((r) => {
      const cond = (r.conditions || {}) as Record<string, unknown>;
      return {
        name: r.name, rule_type: r.rule_type as "surcharge" | "discount",
        amount_type: r.amount_type as "fixed" | "percentage", amount_value: Number(r.amount_value),
        is_active: r.is_active,
        conditions: {
          days_of_week: Array.isArray(cond.days_of_week) ? (cond.days_of_week as number[]) : undefined,
          hours_range: Array.isArray(cond.hours_range) && cond.hours_range.length === 2 ? (cond.hours_range as [string, string]) : undefined,
          dates: Array.isArray(cond.dates) ? (cond.dates as string[]) : undefined,
          pincodes: Array.isArray(cond.pincodes) ? (cond.pincodes as string[]) : undefined,
        },
      };
    });

    const breakdown = calculatePricingBreakdown({
      pricingModel: (service.pricing_model || "fixed") as PricingModel,
      basePrice: Number(service.base_price || 0),
      pricingConfig: (service.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
      variantPrice,
      durationMinutes: duration ? parseInt(duration, 10) : undefined,
      areaSqft: areaSqft ? parseInt(areaSqft, 10) : undefined,
      quantity: quantity ? parseInt(quantity, 10) : undefined,
      distanceKm: distanceKm ? parseInt(distanceKm, 10) : undefined,
      addons: parsedAddons,
      scheduledDate: scheduleDateObj,
      pincode: addressObj.pincode,
      surchargeRules: mappedRules,
      coupon: couponObj,
      walletBalanceToUse: 0,
      gstRate: taxRatePercent,
      gstEnabled: platformSettings.gstEnabled,
      gstApplicable: service.gst_applicable,
    });

    const subcat = service.subcategories as { subcategory_name?: string; icon_name?: string } | null;
    servicesBreakdowns.push({
      serviceId: service.id,
      title: service.title,
      iconName: subcat?.icon_name || "home_repair_service",
      subcategoryName: subcat?.subcategory_name || "",
      categorySlug: (service.category || "").toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and"),
      pricingModel: service.pricing_model || "fixed",
      breakdown,
      config: {
        duration: duration ? parseInt(duration, 10) : null,
        areaSqft: areaSqft ? parseInt(areaSqft, 10) : null,
        quantity: quantity ? parseInt(quantity, 10) : null,
        distanceKm: distanceKm ? parseInt(distanceKm, 10) : null,
        variantId: variantId || null,
        addons: addons || null,
        selectedPackages: selectedPackages || null,
        formAnswers: formAnswers || null,
        meetingLocation: meetingLocation || null,
        destination: destination || null,
        expectedBags: expectedBags || null,
      },
    });
  } else if (cartItems) {
    // ─── Cart flow ────────────────────────────────────────
    let parsedItems: CartItem[];
    try {
      parsedItems = JSON.parse(cartItems) as CartItem[];
    } catch {
      redirect("/customer/dashboard");
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      redirect("/customer/dashboard");
    }

    const serviceIds = parsedItems.map(i => i.serviceId);

    const [servicesRes, variantsRes, addonsRes, rulesRes] = await Promise.all([
      supabase.from("services").select("id, title, base_price, pricing_model, pricing_config, gst_applicable, category, subcategories(subcategory_name, icon_name)").in("id", serviceIds).eq("status", "published"),
      supabase.from("service_variants").select("id, price, service_id").in("service_id", serviceIds).eq("is_active", true),
      supabase.from("service_addons").select("id, title, price, service_id").in("service_id", serviceIds).eq("is_active", true),
      supabase.from("service_pricing_rules").select("*").or(`service_id.in.(${serviceIds.join(",")}),service_id.is.null`).eq("is_active", true),
    ]);

    const dbServices = servicesRes.data || [];
    const allVariants = (variantsRes.data || []) as ServiceVariant[];
    const allAddons = (addonsRes.data || []) as ServiceAddon[];
    const allRules = (rulesRes.data || []) as ServicePricingRule[];

    for (const item of parsedItems) {
      const svc = dbServices.find(s => s.id === item.serviceId);
      if (!svc) continue;

      const variantPrice = item.variantId
        ? (allVariants.find(v => v.id === item.variantId)?.price ?? null)
        : null;

      const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
      if (item.addons) {
        const pairs = item.addons.split(",");
        for (const pair of pairs) {
          const [id, qtyStr] = pair.split(":");
          const qty = parseInt(qtyStr, 10) || 0;
          const match = allAddons.find(a => a.id === id);
          if (match && qty > 0) {
            parsedAddons.push({ id: match.id, title: match.title, price: Number(match.price), quantity: qty });
          }
        }
      }

      const svcRules = allRules.filter(
        (r: ServicePricingRule) => !r.service_id || r.service_id === item.serviceId
      );
      const mappedRules = svcRules.map((r) => {
        const cond = (r.conditions || {}) as Record<string, unknown>;
        return {
          name: r.name, rule_type: r.rule_type as "surcharge" | "discount",
          amount_type: r.amount_type as "fixed" | "percentage", amount_value: Number(r.amount_value),
          is_active: r.is_active,
          conditions: {
            days_of_week: Array.isArray(cond.days_of_week) ? (cond.days_of_week as number[]) : undefined,
            hours_range: Array.isArray(cond.hours_range) && cond.hours_range.length === 2 ? (cond.hours_range as [string, string]) : undefined,
            dates: Array.isArray(cond.dates) ? (cond.dates as string[]) : undefined,
            pincodes: Array.isArray(cond.pincodes) ? (cond.pincodes as string[]) : undefined,
          },
        };
      });

      const breakdown = calculatePricingBreakdown({
        pricingModel: (svc.pricing_model || "fixed") as PricingModel,
        basePrice: Number(svc.base_price || 0),
        pricingConfig: (svc.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
        variantPrice: variantPrice !== null ? Number(variantPrice) : null,
        durationMinutes: item.selectedDuration ?? undefined,
        areaSqft: item.areaSqft ?? undefined,
        quantity: item.quantity ?? undefined,
        distanceKm: item.distanceKm ?? undefined,
        addons: parsedAddons,
        scheduledDate: scheduleDateObj,
        pincode: addressObj.pincode,
        surchargeRules: mappedRules,
        coupon: couponObj,
        walletBalanceToUse: 0,
        gstRate: taxRatePercent,
        gstEnabled: platformSettings.gstEnabled,
        gstApplicable: item.gstApplicable ?? svc.gst_applicable,
      });

      const subcat = svc.subcategories as { subcategory_name?: string; icon_name?: string } | null;
      servicesBreakdowns.push({
        serviceId: svc.id,
        title: svc.title,
        iconName: subcat?.icon_name || "home_repair_service",
        subcategoryName: subcat?.subcategory_name || "",
        categorySlug: (svc.category || "").toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and"),
        pricingModel: svc.pricing_model || "fixed",
        breakdown,
        config: {
          duration: item.selectedDuration ?? null,
          areaSqft: item.areaSqft ?? null,
          quantity: item.quantity ?? null,
          distanceKm: item.distanceKm ?? null,
          variantId: item.variantId ?? null,
          addons: item.addons ?? null,
          selectedPackages: item.selectedPackages ?? null,
        },
      });
    }
  } else {
    redirect("/customer/dashboard");
  }

  if (servicesBreakdowns.length === 0) {
    redirect("/customer/dashboard");
  }

  return (
    <CheckoutPaymentClient
      services={servicesBreakdowns}
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
      walletBalance={walletBalance}
      couponCode={couponCode || null}
      couponObj={couponObj}
    />
  );
}
