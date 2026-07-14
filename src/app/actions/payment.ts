"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { calculatePricingBreakdown, PricingInput } from "@/utils/pricingEngine";
import { PricingModel, ServicePricingRule, Coupon, MembershipPlan, UserMembership } from "@/lib/types";

export interface RazorpayOrderResult {
  freeOrder: boolean;
  orderId?: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface VerificationResult {
  success: boolean;
  bookingId?: string;
  orderId?: string;
  error?: string;
}

interface DBAddress {
  formatted_address: string;
  city: string;
  area: string | null;
  pincode: string;
}

/**
 * Creates a Razorpay Order server-side after calculating prices and validating wallet options.
 */
export async function createRazorpayOrderAction(payload: {
  serviceId?: string;
  serviceIds?: string[];
  cartItemPrices?: Record<string, number>;
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  duration?: number;
  areaSqft?: number;
  quantity?: number;
  distanceKm?: number;
  variantId?: string;
  addons?: string; // format "addon_id:qty,addon_id:qty"
  cartItems?: { serviceId: string; selectedDuration?: number }[];
  meetingLocation?: string;
  destination?: string;
  expectedBags?: string;
  selectedPackages?: string;
  couponCode?: string;
  referralDiscount?: number;
}): Promise<RazorpayOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch address to confirm eligibility
  const { data: addr } = await supabase
    .from("user_addresses")
    .select("city, pincode")
    .eq("id", payload.addressId)
    .eq("user_id", user.id)
    .single();
  if (!addr) throw new Error("Address not found");

  // 1. Calculate Prices using Centralized Pricing Engine
  let subtotal = 0;

  if (payload.serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("id, base_price, pricing_model, pricing_config, gst_applicable")
      .eq("id", payload.serviceId)
      .eq("status", "published")
      .single();
    if (!service) throw new Error("Service not found");

    // Fetch variant price if applicable
    let variantPrice: number | null = null;
    if (payload.variantId) {
      const { data: variant } = await supabase
        .from("service_variants")
        .select("price")
        .eq("id", payload.variantId)
        .single();
      if (variant) variantPrice = Number(variant.price);
    }

    // Fetch addons price if applicable
    const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
    if (payload.addons) {
      const pairs = payload.addons.split(",");
      const addonIds = pairs.map((p) => p.split(":")[0]);
      const { data: addonsData } = await supabase
        .from("service_addons")
        .select("id, title, price")
        .in("id", addonIds);

      if (addonsData) {
        for (const pair of pairs) {
          const [id, qtyStr] = pair.split(":");
          const qty = parseInt(qtyStr, 10) || 0;
          const match = addonsData.find((a) => a.id === id);
          if (match && qty > 0) {
            parsedAddons.push({
              id: match.id,
              title: match.title,
              price: Number(match.price),
              quantity: qty,
            });
          }
        }
      }
    }

    // Fetch surcharge rules
    const { data: rules } = await supabase
      .from("service_pricing_rules")
      .select("*")
      .or(`service_id.eq.${service.id},service_id.is.null`)
      .eq("is_active", true);

    // Fetch coupon details
    let couponObj: Coupon | null = null;
    if (payload.couponCode) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", payload.couponCode)
        .eq("is_active", true)
        .single();
      if (couponData) {
        const now = new Date();
        if (!couponData.expires_at || new Date(couponData.expires_at) > now) {
          couponObj = couponData;
        }
      }
    }

    // Fetch user membership details
    let isMember = false;
    let memberBenefit: MembershipPlan["benefits"] | null = null;
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("*, membership_plans(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    const typedMembership = membership as unknown as (UserMembership & { membership_plans: MembershipPlan | null }) | null;

    if (typedMembership && typedMembership.membership_plans) {
      isMember = true;
      memberBenefit = typedMembership.membership_plans.benefits || {};
    }

    // Map rules to align with PricingInput['surchargeRules'] shape
    const mappedRules = (rules || []).map((r) => {
      const cond = (r.conditions || {}) as Record<string, unknown>;
      return {
        name: r.name,
        rule_type: r.rule_type as "surcharge" | "discount",
        amount_type: r.amount_type as "fixed" | "percentage",
        amount_value: Number(r.amount_value),
        is_active: r.is_active,
        conditions: {
          days_of_week: Array.isArray(cond.days_of_week) ? (cond.days_of_week as number[]) : undefined,
          hours_range: Array.isArray(cond.hours_range) && cond.hours_range.length === 2 ? (cond.hours_range as [string, string]) : undefined,
          dates: Array.isArray(cond.dates) ? (cond.dates as string[]) : undefined,
          pincodes: Array.isArray(cond.pincodes) ? (cond.pincodes as string[]) : undefined,
        },
      };
    });

    // Run pricing engine
    const breakdown = calculatePricingBreakdown({
      pricingModel: (service.pricing_model || "fixed") as PricingModel,
      basePrice: Number(service.base_price || 0),
      pricingConfig: (service.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
      variantPrice,
      durationMinutes: payload.duration,
      areaSqft: payload.areaSqft,
      quantity: payload.quantity,
      distanceKm: payload.distanceKm,
      addons: parsedAddons,
      scheduledDate: (() => {
        if (!payload.date) return new Date();
        const [tPart, mod] = payload.time.split(" ");
        const [rH, mM] = tPart.split(":").map(Number);
        let hr = rH;
        if (mod === "PM" && hr !== 12) hr += 12;
        if (mod === "AM" && hr === 12) hr = 0;
        return new Date(`${payload.date}T${hr.toString().padStart(2, "0")}:${mM.toString().padStart(2, "0")}:00+05:30`);
      })(),
      pincode: addr.pincode,
      surchargeRules: mappedRules,
      coupon: couponObj,
      isMember,
      memberBenefit,
      walletBalanceToUse: payload.walletAmountToUse,
      gstApplicable: service.gst_applicable,
    });

    subtotal = breakdown.total_price;
  } else if (payload.serviceIds && payload.serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, base_price, pricing_model, pricing_config, gst_applicable")
      .in("id", payload.serviceIds)
      .eq("status", "published");

    if (!services || services.length === 0) throw new Error("Services not found");

    if (payload.cartItemPrices && Object.keys(payload.cartItemPrices).length > 0) {
      const { data: settingsRows } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "tax_rate")
        .limit(1)
        .maybeSingle();
      let taxRatePercent = 18;
      try {
        const rawTax = (settingsRows?.value as string)?.replace(/%/g, "").trim();
        const parsed = parseFloat(rawTax || "18");
        if (!isNaN(parsed)) taxRatePercent = parsed;
      } catch { /* use default */ }

      let preGstSubtotal = 0;
      for (const s of services) {
        const clientPrice = Number(payload.cartItemPrices[s.id] || 0);
        preGstSubtotal += clientPrice;
      }

      const gstTax = Math.round(preGstSubtotal * (taxRatePercent / 100));
      let totalWithTax = preGstSubtotal + gstTax;
      const referralDiscount = Number(payload.referralDiscount || 0);
      totalWithTax = Math.max(0, totalWithTax - referralDiscount);

      let finalPayable = totalWithTax;
      if (payload.walletAmountToUse && payload.walletAmountToUse > 0) {
        finalPayable = Math.max(0, totalWithTax - payload.walletAmountToUse);
      }

      subtotal = finalPayable;
    } else {
      let totalPayable = 0;

      for (const s of services) {
        const itemDuration = payload.cartItems?.find((ci) => ci.serviceId === s.id)?.selectedDuration;

        const { data: svcRules } = await supabase
          .from("service_pricing_rules")
          .select("*")
          .or(`service_id.eq.${s.id},service_id.is.null`)
          .eq("is_active", true);

        const mappedSvcRules = (svcRules || []).map((r) => {
          const cond = (r.conditions || {}) as Record<string, unknown>;
          return {
            name: r.name,
            rule_type: r.rule_type as "surcharge" | "discount",
            amount_type: r.amount_type as "fixed" | "percentage",
            amount_value: Number(r.amount_value),
            is_active: r.is_active,
            conditions: {
              days_of_week: Array.isArray(cond.days_of_week) ? (cond.days_of_week as number[]) : undefined,
              hours_range: Array.isArray(cond.hours_range) && cond.hours_range.length === 2 ? (cond.hours_range as [string, string]) : undefined,
              dates: Array.isArray(cond.dates) ? (cond.dates as string[]) : undefined,
              pincodes: Array.isArray(cond.pincodes) ? (cond.pincodes as string[]) : undefined,
            },
          };
        });

        const [timePart, modifier] = payload.time.split(" ");
        const [rawH, min] = timePart.split(":").map(Number);
        let h = rawH;
        if (modifier === "PM" && h !== 12) h += 12;
        if (modifier === "AM" && h === 12) h = 0;
        const scheduledDate = new Date(`${payload.date}T${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00+05:30`);

        const breakdown = calculatePricingBreakdown({
          pricingModel: (s.pricing_model || "fixed") as PricingModel,
          basePrice: Number(s.base_price || 0),
          pricingConfig: (s.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
          durationMinutes: itemDuration,
          scheduledDate,
          pincode: addr.pincode,
          surchargeRules: mappedSvcRules,
          walletBalanceToUse: 0,
          gstApplicable: s.gst_applicable,
        });
        totalPayable += breakdown.total_price;
      }

      let finalPayable = totalPayable;
      if (payload.walletAmountToUse && payload.walletAmountToUse > 0) {
        finalPayable = Math.max(0, totalPayable - payload.walletAmountToUse);
      }

      const referralDiscount = Number(payload.referralDiscount || 0);
      if (referralDiscount > 0) {
        finalPayable = Math.max(0, finalPayable - referralDiscount);
      }

      subtotal = finalPayable;
    }
  } else {
    throw new Error("No services specified");
  }

  if (subtotal <= 0) {
    return { freeOrder: true, amount: 0, currency: "INR" };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing on server.");
  }

  // Create Razorpay Order via HTTP Post to Razorpay API
  const authHeader = "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: Math.round(subtotal * 100), // in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[Razorpay] API Error:", errBody);
    throw new Error("Payment gateway order creation failed.");
  }

  const orderData = await response.json();
  return {
    freeOrder: false,
    orderId: orderData.id,
    amount: orderData.amount / 100,
    currency: orderData.currency,
    keyId: keyId,
  };
}

/**
 * Verifies Razorpay Payment and executes DB inserts.
 */
export async function verifyRazorpayPaymentAction(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  isFree?: boolean;
  serviceId?: string;
  serviceIds?: string[];
  cartItemPrices?: Record<string, number>;
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  duration?: number;
  areaSqft?: number;
  quantity?: number;
  distanceKm?: number;
  variantId?: string;
  addons?: string;
  cartItems?: { serviceId: string; selectedDuration?: number }[];
  meetingLocation?: string;
  destination?: string;
  expectedBags?: string;
  selectedPackages?: string;
  couponCode?: string;
  formAnswers?: string;
  businessName?: string;
  businessGstin?: string;
  referralDiscount?: number;
}): Promise<VerificationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Signature Verification
  if (!payload.isFree) {
    if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
      return { success: false, error: "Missing payment credentials." };
    }
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) return { success: false, error: "Razorpay credentials missing on server." };

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== payload.razorpay_signature) {
      console.error("[Razorpay] Invalid signature detected. Possible tampering attempt.");
      return {
        success: false,
        error: `Payment verification failed (signature mismatch).`,
      };
    }
  }

  // 1b. Duplicate payment guard
  if (!payload.isFree && payload.razorpay_order_id) {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("razorpay_order_id", payload.razorpay_order_id)
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      return { success: false, error: "This payment has already been processed." };
    }
  }

  // 2. Fetch address details
  const { data: addr } = await supabase
    .from("user_addresses")
    .select("formatted_address, city, area, pincode")
    .eq("id", payload.addressId)
    .eq("user_id", user.id)
    .single();
  if (!addr) return { success: false, error: "Address not found." };
  const typedAddr = addr as unknown as DBAddress;

  // 3. Parse date and time in IST
  const [timeStr, modifier] = payload.time.split(" ");
  const [rawHours, minutes] = timeStr.split(":").map(Number);
  let hours = rawHours;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const isoStr = `${payload.date}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00+05:30`;
  const timestamp = new Date(isoStr);

  // 4. Create Database Records
  if (payload.serviceId) {
    // Single service booking
    const { data: service } = await supabase
      .from("services")
      .select("id, title, base_price, pricing_model, pricing_config, gst_applicable")
      .eq("id", payload.serviceId)
      .eq("status", "published")
      .single();
    if (!service) return { success: false, error: "Service not found." };

    // Fetch variant price
    let variantPrice: number | null = null;
    if (payload.variantId) {
      const { data: variant } = await supabase
        .from("service_variants")
        .select("price")
        .eq("id", payload.variantId)
        .single();
      if (variant) variantPrice = Number(variant.price);
    }

    // Fetch addons price
    const parsedAddons: { id: string; title: string; price: number; quantity: number }[] = [];
    if (payload.addons) {
      const pairs = payload.addons.split(",");
      const addonIds = pairs.map((p) => p.split(":")[0]);
      const { data: addonsData } = await supabase
        .from("service_addons")
        .select("id, title, price")
        .in("id", addonIds);

      if (addonsData) {
        for (const pair of pairs) {
          const [id, qtyStr] = pair.split(":");
          const qty = parseInt(qtyStr, 10) || 0;
          const match = addonsData.find((a) => a.id === id);
          if (match && qty > 0) {
            parsedAddons.push({
              id: match.id,
              title: match.title,
              price: Number(match.price),
              quantity: qty,
            });
          }
        }
      }
    }

    // Fetch surcharge rules
    const { data: rules } = await supabase
      .from("service_pricing_rules")
      .select("*")
      .or(`service_id.eq.${service.id},service_id.is.null`)
      .eq("is_active", true);

    // Fetch coupon details
    let couponObj: Coupon | null = null;
    if (payload.couponCode) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", payload.couponCode)
        .eq("is_active", true)
        .single();
      if (couponData) {
        const now = new Date();
        if (!couponData.expires_at || new Date(couponData.expires_at) > now) {
          couponObj = couponData;
        }
      }
    }

    // Fetch user membership details
    let isMember = false;
    let memberBenefit: MembershipPlan["benefits"] | null = null;
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("*, membership_plans(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    const typedMembership = membership as unknown as (UserMembership & { membership_plans: MembershipPlan | null }) | null;

    if (typedMembership && typedMembership.membership_plans) {
      isMember = true;
      memberBenefit = typedMembership.membership_plans.benefits || {};
    }

    // Calculate final pricing breakdown
    const breakdown = calculatePricingBreakdown({
      pricingModel: (service.pricing_model || "fixed") as PricingModel,
      basePrice: Number(service.base_price || 0),
      pricingConfig: (service.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
      variantPrice,
      durationMinutes: payload.duration,
      areaSqft: payload.areaSqft,
      quantity: payload.quantity,
      distanceKm: payload.distanceKm,
      addons: parsedAddons,
      scheduledDate: timestamp,
      pincode: addr.pincode,
      surchargeRules: (rules as unknown as ServicePricingRule[]) || [],
      coupon: couponObj,
      isMember,
      memberBenefit,
      walletBalanceToUse: payload.walletAmountToUse,
      gstApplicable: service.gst_applicable,
    });

    const isInspection = service.pricing_model === "inspection";
    const bookingStatus = isInspection ? "pending" : "pending";

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: service.id,
        customer_id: user.id,
        status: bookingStatus,
        total_amount: breakdown.total_price,
        city: addr.city,
        area: typedAddr.area ?? null,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        wallet_discount_applied: breakdown.wallet_discount,
        payment_status: "paid",
        pricing_model: service.pricing_model,
        selected_duration_minutes: payload.duration || null,
        base_price: breakdown.base_price,
        final_price: breakdown.total_price,
        meeting_location: payload.meetingLocation || null,
        destination: payload.destination || null,
        expected_bags: payload.expectedBags ? parseInt(payload.expectedBags, 10) : 0,
        business_name: payload.businessName || null,
        business_gstin: payload.businessGstin || null,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[payment] Booking creation failed:", bookingError);
      return { success: false, error: "Failed to save booking." };
    }

    // Save Pricing Breakdown in public.booking_pricing
    await supabase.from("booking_pricing").insert({
      booking_id: booking.id,
      base_price: breakdown.base_price,
      hourly_price: breakdown.hourly_price,
      area_price: breakdown.area_price,
      quantity_price: breakdown.quantity_price,
      distance_price: breakdown.distance_price,
      inspection_fee: breakdown.inspection_fee,
      travel_fee: breakdown.travel_fee,
      surcharges: breakdown.surcharges,
      addons_total: breakdown.addons_total,
      addons_breakdown: breakdown.addons_breakdown,
      gst_amount: breakdown.gst_amount,
      discount_amount: breakdown.discount_amount,
      coupon_discount: breakdown.coupon_discount,
      wallet_discount: breakdown.wallet_discount,
      total_price: breakdown.total_price,
    });

    // Save Dynamic Form Answers in public.booking_form_answers
    if (payload.formAnswers) {
      try {
        const answers = JSON.parse(payload.formAnswers) as Record<string, string>;
        const answerRows = Object.entries(answers).map(([name, value]) => ({
          booking_id: booking.id,
          field_name: name,
          field_label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), // fallback label
          field_value: value,
        }));
        if (answerRows.length > 0) {
          await supabase.from("booking_form_answers").insert(answerRows);
        }
      } catch (err) {
        console.error("Failed to save dynamic form answers:", err);
      }
    }

    // Save initial Booking Status History
    await supabase.from("booking_status_history").insert({
      booking_id: booking.id,
      status: bookingStatus,
      changed_by: user.id,
      remarks: "Booking created and paid via Razorpay",
    });

    // Deduct from wallet if used
    const walletAmountToUse = Number(payload.walletAmountToUse || 0);
    if (walletAmountToUse > 0) {
      const { data: walletRes, error: walletError } = await supabase.rpc("use_wallet_balance", {
        p_user_id: user.id,
        p_amount: walletAmountToUse,
        p_booking_id: booking.id,
      });

      if (walletError || !walletRes || !walletRes.success) {
        console.error("[payment] Wallet debit failed:", walletError || walletRes?.error);
        await supabase.from("bookings").delete().eq("id", booking.id);
        return { success: false, error: walletRes?.error || "Failed to debit wallet balance." };
      }
    }

    // Record Payment
    const { error: paymentError } = await supabase.from("payments").insert({
      customer_id: user.id,
      booking_id: booking.id,
      amount: breakdown.total_price,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id ?? null,
      razorpay_payment_id: payload.razorpay_payment_id ?? null,
      razorpay_signature: payload.razorpay_signature ?? null,
    });

    if (paymentError) {
      console.error("[payment] Payment record insert failed:", paymentError);
    }

    // Log event
    const { error: eventError } = await supabase.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "BOOKING_CREATED",
      actor: "USER",
      metadata: {
        customer_id: user.id,
        service_id: service.id,
        amount: breakdown.total_price,
        wallet_amount_used: walletAmountToUse,
        payment_verified: true,
      },
    });

    if (eventError) {
      console.error("[payment] Booking event insert failed:", eventError);
    }

    // Trigger Partner Auto-Assignment Dispatch
    void triggerDispatchBatch(booking.id, 1);

    // Notify Customer
    void notifyCustomer(
      user.id,
      "Booking Confirmed & Paid!",
      `Your booking for ${service.title} on ${payload.date} at ${payload.time} has been placed. We are matching a professional.`,
      "booking_created",
      { booking_id: booking.id, service_title: service.title }
    );

    // Notify Admins
    void notifyAdmins(
      "New Booking Placed",
      `A new booking for ${service.title} has been placed by ${user.email}.`,
      "booking_created",
      { booking_id: booking.id }
    );

    return { success: true, bookingId: booking.id };
  } else if (payload.serviceIds && payload.serviceIds.length > 0) {
    const { data: dbServices } = await supabase
      .from("services")
      .select("id, title, base_price, pricing_model, pricing_config, gst_applicable")
      .in("id", payload.serviceIds)
      .eq("status", "published");

    if (!dbServices || dbServices.length === 0) {
      return { success: false, error: "Services not found." };
    }

    let totalOrderAmount = 0;
    const serviceBreakdowns: Record<string, ReturnType<typeof calculatePricingBreakdown>> = {};

    if (payload.cartItemPrices && Object.keys(payload.cartItemPrices).length > 0) {
      const { data: settingsRows } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "tax_rate")
        .limit(1)
        .maybeSingle();
      let taxRatePercent = 18;
      try {
        const rawTax = (settingsRows?.value as string)?.replace(/%/g, "").trim();
        const parsed = parseFloat(rawTax || "18");
        if (!isNaN(parsed)) taxRatePercent = parsed;
      } catch { /* use default */ }

      let preGstSubtotal = 0;
      for (const s of dbServices) {
        preGstSubtotal += Number(payload.cartItemPrices[s.id] || 0);
      }

      const gstTax = Math.round(preGstSubtotal * (taxRatePercent / 100));
      let totalWithTax = preGstSubtotal + gstTax;
      const referralDiscount = Number(payload.referralDiscount || 0);
      totalWithTax = Math.max(0, totalWithTax - referralDiscount);

      const walletAmountToUse = Number(payload.walletAmountToUse || 0);
      totalOrderAmount = Math.max(0, totalWithTax - walletAmountToUse);

      for (const s of dbServices) {
        const itemBase = Number(payload.cartItemPrices[s.id] || 0);
        const itemGst = Math.round(itemBase * (taxRatePercent / 100));
        serviceBreakdowns[s.id] = {
          base_price: itemBase,
          hourly_price: 0,
          area_price: 0,
          quantity_price: 0,
          distance_price: 0,
          inspection_fee: 0,
          travel_fee: 0,
          surcharges: [],
          addons_total: 0,
          addons_breakdown: [],
          gst_amount: itemGst,
          discount_amount: referralDiscount,
          coupon_discount: 0,
          wallet_discount: 0,
          total_price: itemBase + itemGst,
        };
      }
    } else {
      for (const s of dbServices) {
        const itemDuration = payload.cartItems?.find((ci) => ci.serviceId === s.id)?.selectedDuration;

        const { data: svcRules } = await supabase
          .from("service_pricing_rules")
          .select("*")
          .or(`service_id.eq.${s.id},service_id.is.null`)
          .eq("is_active", true);

        const mappedSvcRules = (svcRules || []).map((r) => {
          const cond = (r.conditions || {}) as Record<string, unknown>;
          return {
            name: r.name,
            rule_type: r.rule_type as "surcharge" | "discount",
            amount_type: r.amount_type as "fixed" | "percentage",
            amount_value: Number(r.amount_value),
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
          pricingModel: (s.pricing_model || "fixed") as PricingModel,
          basePrice: Number(s.base_price || 0),
          pricingConfig: (s.pricing_config as unknown as PricingInput["pricingConfig"]) || {},
          durationMinutes: itemDuration,
          scheduledDate: timestamp,
          pincode: addr.pincode,
          surchargeRules: mappedSvcRules,
          walletBalanceToUse: 0,
          gstApplicable: s.gst_applicable,
        });

        totalOrderAmount += breakdown.total_price;
        serviceBreakdowns[s.id] = breakdown;
      }

      const walletAmountToUse = Number(payload.walletAmountToUse || 0);
      const referralDiscount = Number(payload.referralDiscount || 0);
      totalOrderAmount = Math.max(0, totalOrderAmount - walletAmountToUse);
      if (referralDiscount > 0) {
        totalOrderAmount = Math.max(0, totalOrderAmount - referralDiscount);
      }
    }

    const walletAmountToUse = Number(payload.walletAmountToUse || 0);
    const referralDiscount = Number(payload.referralDiscount || 0);
    const finalOrderAmount = totalOrderAmount;

    // Validate against Razorpay order amount
    if (!payload.isFree && payload.razorpay_order_id) {
      const rzKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
      if (rzKeySecret) {
        const authHeader = "Basic " + Buffer.from(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() + ":" + rzKeySecret).toString("base64");
        const rzRes = await fetch(`https://api.razorpay.com/v1/orders/${payload.razorpay_order_id}`, {
          headers: { Authorization: authHeader },
        });
        if (rzRes.ok) {
          const rzOrder = await rzRes.json();
          const rzAmount = Number(rzOrder.amount) / 100;
          if (Math.abs(rzAmount - finalOrderAmount) > 1) {
            console.error(`[payment] Amount mismatch: Razorpay order ₹${rzAmount} vs computed ₹${finalOrderAmount}`);
            return { success: false, error: "Payment amount mismatch detected. Please contact support." };
          }
        }
      }
    }

    // Create Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        status: "pending",
        total_amount: finalOrderAmount,
        city: addr.city,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        item_count: dbServices.length,
        payment_status: "paid",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[payment] Order creation failed:", JSON.stringify(orderError));
      return { success: false, error: `Failed to create order. ${orderError?.message || ""}` };
    }

    if (walletAmountToUse > 0) {
      const { data: walletRes, error: walletError } = await supabase.rpc("use_wallet_balance", {
        p_user_id: user.id,
        p_amount: walletAmountToUse,
        p_booking_id: order.id,
      });

      if (walletError || !walletRes || !walletRes.success) {
        console.error("[payment] Wallet debit failed for order:", walletError || walletRes?.error);
        await supabase.from("orders").delete().eq("id", order.id);
        return { success: false, error: walletRes?.error || "Failed to debit wallet balance." };
      }
    }

    const { error: orderPaymentError } = await supabase.from("payments").insert({
      customer_id: user.id,
      order_id: order.id,
      amount: finalOrderAmount,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id ?? null,
      razorpay_payment_id: payload.razorpay_payment_id ?? null,
      razorpay_signature: payload.razorpay_signature ?? null,
    });

    if (orderPaymentError) {
      console.error("[payment] Order payment record insert failed:", orderPaymentError);
    }

    for (const service of dbServices) {
      const breakdown = serviceBreakdowns[service.id];
      const itemDuration = payload.cartItems?.find((ci) => ci.serviceId === service.id)?.selectedDuration || null;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          service_id: service.id,
          customer_id: user.id,
          order_id: order.id,
          status: "pending",
          total_amount: breakdown.total_price,
          city: addr.city,
          area: typedAddr.area ?? null,
          address: addr.formatted_address,
          pincode: addr.pincode,
          scheduled_date: timestamp.toISOString(),
          payment_status: "paid",
          pricing_model: service.pricing_model,
          selected_duration_minutes: itemDuration,
          base_price: breakdown.base_price,
          final_price: breakdown.total_price,
          wallet_discount_applied: breakdown.wallet_discount,
          business_name: payload.businessName || null,
          business_gstin: payload.businessGstin || null,
        })
        .select("id")
        .single();

      if (bookingError || !booking) {
        console.error("[payment] Cart booking creation failed:", bookingError);
        continue;
      }

      await supabase.from("booking_pricing").insert({
        booking_id: booking.id,
        base_price: breakdown.base_price,
        hourly_price: breakdown.hourly_price,
        area_price: breakdown.area_price,
        quantity_price: breakdown.quantity_price,
        distance_price: breakdown.distance_price,
        inspection_fee: breakdown.inspection_fee,
        travel_fee: breakdown.travel_fee,
        surcharges: breakdown.surcharges,
        addons_total: breakdown.addons_total,
        addons_breakdown: breakdown.addons_breakdown,
        gst_amount: breakdown.gst_amount,
        discount_amount: breakdown.discount_amount,
        coupon_discount: breakdown.coupon_discount,
        wallet_discount: breakdown.wallet_discount,
        total_price: breakdown.total_price,
      });

      await supabase.from("booking_status_history").insert({
        booking_id: booking.id,
        status: "pending",
        changed_by: user.id,
        remarks: "Booking created in cart checkout",
      });

      const { error: cartEventError } = await supabase.from("booking_events").insert({
        booking_id: booking.id,
        event_type: "BOOKING_CREATED",
        actor: "USER",
        metadata: {
          customer_id: user.id,
          service_id: service.id,
          amount: breakdown.total_price,
          order_id: order.id,
          referral_discount: referralDiscount,
          payment_verified: true,
        },
      });

      if (cartEventError) {
        console.error("[payment] Cart booking event insert failed:", cartEventError);
      }

      void triggerDispatchBatch(booking.id, 1);

      void notifyCustomer(
        user.id,
        "Booking Confirmed & Paid!",
        `Your booking for ${service.title} on ${payload.date} at ${payload.time} has been placed. We are matching a professional.`,
        "booking_created",
        { booking_id: booking.id, service_title: service.title }
      );

      void notifyAdmins(
        "New Booking Placed",
        `A new booking for ${service.title} has been placed by ${user.email}.`,
        "booking_created",
        { booking_id: booking.id }
      );
    }

    return { success: true, orderId: order.id };
  }

  return { success: false, error: "Invalid payment payload." };
}
