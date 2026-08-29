"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { Coupon, CartItem } from "@/lib/types";
import { calculateFinalPayable } from "@/lib/pricing";
import { computeCartLineItems } from "@/lib/pricing/cartCatalog";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import type { PricingBreakdown } from "@/lib/pricing/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { combineDateTimeToISO } from "@/utils/schedule";
import { normalizeCouponCode, validateCoupon } from "@/lib/pricing/couponEngine";

export interface ServiceCheckoutInput {
  serviceId: string;
  variantId?: string | null;
  addons?: string | null;
  duration?: number | null;
  areaSqft?: number | null;
  quantity?: number | null;
  distanceKm?: number | null;
  selectedPackages?: string | null;
  meetingLocation?: string | null;
  destination?: string | null;
  expectedBags?: string | null;
  formAnswers?: string | null;
}

export interface RazorpayOrderResult {
  freeOrder: boolean;
  orderId?: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface VerificationResult {
  success: boolean;
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
 * Shared helper: computes pricing breakdowns for all given services.
 * Prices flow through the single `src/lib/pricing` engine (same math the
 * client uses), recomputed server-side from the DB as the payment authority.
 * Wallet is NOT applied here — it's handled at the order level.
 */
async function computeServiceBreakdowns(
  supabase: SupabaseClient,
  services: ServiceCheckoutInput[],
  options: {
    date: string;
    time: string;
    pincode: string;
    couponCode?: string | null;
    customerId?: string | null;
  }
): Promise<{
  breakdowns: Record<string, PricingBreakdown>;
  totalAmount: number;
  coupon: Coupon | null;
  titleMap: Record<string, string>;
  validatedCoupon: Coupon | null;
  pricingSummary: {
    originalSubtotal: number;
    discountAmount: number;
    taxAmount: number;
    finalPayable: number;
    couponValid: boolean;
  };
}> {
  const serviceIds = services.map((s) => s.serviceId);
  const scheduledDate = new Date(combineDateTimeToISO(options.date, options.time));

  // Build catalog once — single source of truth for pricing.
  const { catalog, services: serviceSources } = await buildCartCatalog(serviceIds);

  // Normalize checkout inputs to cart items.
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

  // Pass 1 — without coupon, to get the authoritative pre-coupon subtotal
  // used for validation (min booking amount, usage limits, etc.).
  const baseLineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: options.pincode,
  });
  let provisionalSubtotal = 0;
  for (const line of baseLineItems) {
    provisionalSubtotal += line.breakdown.total_price;
  }

  let validatedCoupon: Coupon | null = null;
  let pricingSummary = {
    originalSubtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    finalPayable: 0,
    couponValid: false,
  };

  if (options.couponCode) {
    const normalized = normalizeCouponCode(options.couponCode);
    const validationResult = await validateCoupon(
      supabase,
      normalized,
      provisionalSubtotal,
      options.customerId ?? undefined,
      serviceIds[0]
    );

    if (validationResult.eligible && validationResult.coupon) {
      const coupon = validationResult.coupon;
      // Service-restriction guard: if the coupon is limited to a specific
      // service, every service in the cart must be that service.
      if (
        coupon.applicable_to_service_id &&
        !serviceIds.every((id) => id === coupon.applicable_to_service_id)
      ) {
        validatedCoupon = null;
      } else {
        validatedCoupon = coupon;
      }
    }
  }

  // Pass 2 — with the validated coupon (null when absent/invalid). This is the
  // authoritative pricing: the canonical engine applies the coupon exactly as
  // the client did, so the charged amount matches the preview.
  const lineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: options.pincode,
    coupon: validatedCoupon,
  });

  const breakdowns: Record<string, PricingBreakdown> = {};
  const titleMap: Record<string, string> = {};
  let totalAmount = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const line of lineItems) {
    breakdowns[line.serviceId] = line.breakdown;
    totalAmount += line.breakdown.total_price;
    discountAmount += line.breakdown.coupon_discount;
    taxAmount += line.breakdown.gst_amount;
  }
  for (const [id, src] of Object.entries(serviceSources)) {
    titleMap[id] = src.title;
  }

  // originalSubtotal (pre-coupon) = final payable + coupon discount.
  const originalSubtotal = totalAmount + discountAmount;
  pricingSummary = {
    originalSubtotal,
    discountAmount,
    taxAmount,
    finalPayable: totalAmount,
    couponValid: !!validatedCoupon,
  };

  return {
    breakdowns,
    totalAmount,
    coupon: validatedCoupon,
    titleMap,
    validatedCoupon,
    pricingSummary,
  };
}


export async function createRazorpayOrderAction(payload: {
  services: ServiceCheckoutInput[];
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  couponCode?: string;
  referralDiscount?: number;
}): Promise<RazorpayOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!payload.services || payload.services.length === 0) {
    throw new Error("No services specified");
  }

  const { data: addr } = await supabase
    .from("user_addresses").select("formatted_address, city, pincode").eq("id", payload.addressId).eq("user_id", user.id).single();
  if (!addr) throw new Error("Address not found");

  const computeResult = await computeServiceBreakdowns(supabase, payload.services, {
    date: payload.date,
    time: payload.time,
    pincode: addr.pincode,
    couponCode: payload.couponCode,
  });

  const totalAmount = computeResult.totalAmount;
  const { originalSubtotal, taxAmount, couponValid } =
    computeResult.pricingSummary;

  // Final amount the customer actually pays via Razorpay = post-coupon,
  // post-wallet, post-referral. This must match verifyRazorpayPaymentAction
  // exactly so the gateway amount equals the captured amount.
  const finalOrderAmount = calculateFinalPayable({
    totalBeforeWallet: totalAmount,
    walletAmountToUse: payload.walletAmountToUse ?? 0,
    referralDiscount: payload.referralDiscount ?? 0,
  }).finalPayable;

  if (finalOrderAmount <= 0) {
    return { freeOrder: true, amount: 0, currency: "INR" };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing on server.");
  }

  const authHeader = "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({
      amount: Math.round(finalOrderAmount * 100),
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
  const orderId = orderData.id;

  // Persist authoritative pricing snapshot to orders table (immutable for this order's lifecycle)
  await supabase.from("orders").insert({
    customer_id: user.id,
    status: "pending",
    total_amount: finalOrderAmount,
    city: addr.city,
    address: addr.formatted_address,
    pincode: addr.pincode,
    scheduled_date: new Date().toISOString(), // will be overridden with real date later
    item_count: payload.services.length,
    payment_status: "pending",
    // Coupon snapshot fields — immutable for this order
    coupon_code: payload.couponCode || null,
    original_subtotal: originalSubtotal,
    tax_amount: taxAmount,
    final_amount: finalOrderAmount,
    coupon_valid_at_creation: couponValid,
  });

  // Coupon usage will be created AFTER payment verification (see verifyRazorpayPaymentAction)
  // This ensures: if payment fails, coupon is not consumed
  // If payment succeeds, coupon usage is created in the verification step

  return {
    freeOrder: false,
    orderId,
    amount: orderData.amount / 100,
    currency: orderData.currency,
    keyId,
  };
}

// ─── VERIFY PAYMENT & CREATE DB RECORDS ───────────────────────

export async function verifyRazorpayPaymentAction(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  isFree?: boolean;
  services: ServiceCheckoutInput[];
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  couponCode?: string;
  referralDiscount?: number;
  businessName?: string;
  businessGstin?: string;
}): Promise<VerificationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!payload.services || payload.services.length === 0) {
    return { success: false, error: "No services specified." };
  }

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
      return { success: false, error: "Payment verification failed (signature mismatch)." };
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

  // 1c. Coupon usage idempotency check
  // If this Razorpay order already created a coupon usage, don't re-consume.
  if (!payload.isFree && payload.razorpay_order_id && payload.couponCode) {
    const { data: existingUsage } = await supabase
      .from("coupon_usages")
      .select("id")
      .eq("order_id", payload.razorpay_order_id)
      .limit(1)
      .maybeSingle();
    if (existingUsage) {
      // Coupon already redeemed for this order — finalize successfully without re-consuming
      // We still need to proceed with the rest of the flow to maintain idempotency
      console.log("[payment] Coupon already redeemed for order", payload.razorpay_order_id, "- skipping re-consumption.");
    }
  }

  // 2. Fetch address
  const { data: addr } = await supabase
    .from("user_addresses").select("formatted_address, city, area, pincode").eq("id", payload.addressId).eq("user_id", user.id).single();
  if (!addr) return { success: false, error: "Address not found." };
  const typedAddr = addr as unknown as DBAddress;

  // 3. Parse date/time
  const [timeStr, modifier] = payload.time.split(" ");
  const [rawHours, minutes] = timeStr.split(":").map(Number);
  let hours = rawHours;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  const isoStr = `${payload.date}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00+05:30`;
  const timestamp = new Date(isoStr);

  // 4. Compute all pricing breakdowns (shared engine, server-side authority)
  // This now includes authoritative coupon validation and pricing snapshot.
  const { breakdowns, totalAmount, titleMap, validatedCoupon, pricingSummary } =
    await computeServiceBreakdowns(supabase, payload.services, {
      date: payload.date,
      time: payload.time,
      pincode: addr.pincode,
      couponCode: payload.couponCode,
    });

  // Wallet is capped at the payable and re-derived here (never trust the client).
  const payable = calculateFinalPayable({
    totalBeforeWallet: totalAmount,
    walletAmountToUse: payload.walletAmountToUse,
    referralDiscount: payload.referralDiscount,
  });
  const walletAmountToUse = payable.walletApplied;
  const referralDiscount = payable.referralDiscount;
  const finalOrderAmount = payable.finalPayable;

  // Extract coupon snapshot values from the authoritative pricing summary
  const { discountAmount: snapshotDiscountAmount, originalSubtotal: snapshotOriginalSubtotal, taxAmount: snapshotTaxAmount, couponValid } =
    pricingSummary;

  // Security check: Validate free order bypass
  if (payload.isFree && finalOrderAmount > 0) {
    console.error(`[payment] Free order bypass blocked. User ${user.id} tried to claim ₹${finalOrderAmount} for free.`);
    return { success: false, error: "Invalid free order request. Payable amount is greater than zero." };
  }

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

// 5. Create Order
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
      item_count: payload.services.length,
      payment_status: "paid",
      // Authoritative pricing snapshot — immutable for this order's lifecycle
      coupon_code: payload.couponCode || null,
      original_subtotal: snapshotOriginalSubtotal,
      tax_amount: snapshotTaxAmount,
      final_amount: finalOrderAmount,
      coupon_valid_at_creation: couponValid,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[payment] Order creation failed:", JSON.stringify(orderError));
    return { success: false, error: `Failed to create order. ${orderError?.message || ""}` };
  }

  // 6. Debit wallet if applicable
  if (walletAmountToUse > 0) {
    const { data: walletRes, error: walletError } = await supabase.rpc("use_wallet_balance", {
      p_user_id: user.id,
      p_amount: walletAmountToUse,
      p_booking_id: order.id,
    });
    if (walletError || !walletRes || !(walletRes as { success?: boolean }).success) {
      console.error("[payment] Wallet debit failed:", walletError || (walletRes as { error?: string })?.error);
      await supabase.from("orders").delete().eq("id", order.id);
      return { success: false, error: (walletRes as { error?: string })?.error || "Failed to debit wallet balance." };
    }
  }

  // 7. Create payment record
  await supabase.from("payments").insert({
    customer_id: user.id,
    order_id: order.id,
    amount: finalOrderAmount,
    payment_status: "completed",
    razorpay_order_id: payload.razorpay_order_id ?? null,
    razorpay_payment_id: payload.razorpay_payment_id ?? null,
    razorpay_signature: payload.razorpay_signature ?? null,
  });

  // 8. Create coupon usage record (if coupon was applied)
  //    This is done AFTER payment verification to ensure idempotency:
  //    - If payment fails, coupon is NOT consumed (usage not created)
  //    - If payment succeeds, coupon usage is created once
  //    - The UNIQUE (coupon_id, order_id) constraint prevents double redemption
  //    Wrapped so a concurrent retry (already-redeemed) does not fail an
  //    otherwise-successful payment — the order is already committed.
  if (!payload.isFree && payload.couponCode && validatedCoupon) {
    const couponCodeNormalized = normalizeCouponCode(payload.couponCode);

    const { error: usageError } = await supabase.from("coupon_usages").insert({
      coupon_id: validatedCoupon.id,
      customer_id: user.id,
      order_id: order.id,
      discount_amount: snapshotDiscountAmount,
      coupon_code_snapshot: couponCodeNormalized,
      discount_type_snapshot: validatedCoupon.discount_type,
      used_at: new Date().toISOString(),
    });

    if (usageError) {
      // A unique-violation here means the coupon was already redeemed for this
      // order (e.g. a retried webhook). Treat as idempotent, not a failure.
      console.warn(
        "[payment] Coupon usage insert issue (ignored, order already committed):",
        usageError.message
      );
    }
  }

  // 8. Create child bookings
  for (const item of payload.services) {
    const breakdown = breakdowns[item.serviceId];
    if (!breakdown) continue;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: item.serviceId,
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
        selected_duration_minutes: item.duration ?? null,
        base_price: breakdown.base_price,
        final_price: breakdown.total_price,
        wallet_discount_applied: breakdown.wallet_discount,
        business_name: payload.businessName || null,
        business_gstin: payload.businessGstin || null,
        meeting_location: item.meetingLocation || null,
        destination: item.destination || null,
        expected_bags: item.expectedBags ? parseInt(item.expectedBags, 10) : 0,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[payment] Booking creation failed:", bookingError);
      continue;
    }

    // Save pricing breakdown
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

    // Save dynamic form answers
    if (item.formAnswers) {
      try {
        const answers = JSON.parse(item.formAnswers) as Record<string, string>;
        const answerRows = Object.entries(answers).map(([name, value]) => ({
          booking_id: booking.id,
          field_name: name,
          field_label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          field_value: value,
        }));
        if (answerRows.length > 0) {
          await supabase.from("booking_form_answers").insert(answerRows);
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Booking status history
    await supabase.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "pending",
      changed_by: user.id,
      remarks: "Booking created",
    });

    // Booking event
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "BOOKING_CREATED",
      actor: "USER",
      metadata: {
        customer_id: user.id,
        service_id: item.serviceId,
        amount: breakdown.total_price,
        order_id: order.id,
        referral_discount: referralDiscount,
        payment_verified: true,
      },
    });

    // Trigger dispatch
    void triggerDispatchBatch(booking.id, 1);

    // Notifications
    const title = titleMap[item.serviceId] || "Service";
    void notifyCustomer(
      user.id,
      "Booking Confirmed & Paid!",
      `Your booking for ${title} on ${payload.date} at ${payload.time} has been placed. We are matching a professional.`,
      "booking_created",
      { booking_id: booking.id, service_title: title }
    );
    void notifyAdmins(
      "New Booking Placed",
      `A new booking for ${title} has been placed by ${user.email}.`,
      "booking_created",
      { booking_id: booking.id }
    );
  }

  return { success: true, orderId: order.id };
}
