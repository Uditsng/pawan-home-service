"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { Coupon, CartItem, Order } from "@/lib/types";
import { calculateFinalPayable } from "@/lib/pricing";
import { allocateOfferAcrossLines } from "@/lib/pricing/offerEngine";
import { computeCartLineItems } from "@/lib/pricing/cartCatalog";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import type { PricingBreakdown, OrderFeeItem } from "@/lib/pricing/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { combineDateTimeToISO } from "@/utils/schedule";
import { normalizeCouponCode, validateCoupon } from "@/lib/pricing/couponEngine";
import { applyOrderLevelCoupon } from "@/lib/pricing/discountEngine";
import { fetchPlatformSettings, getActiveOrderFees } from "@/lib/engines/platformSettingsEngine";

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
  /** Razorpay gateway order id (only present for non-free orders). */
  orderId?: string;
  /** Internal `orders.id` — present for free orders so verify can resolve the
   *  seeded order + offer reservation and enforce idempotency. */
  internalOrderId?: string;
  /** Cash (pay-on-completion) orders skip the gateway entirely — the client
   *  goes straight to verify, exactly like the free path. */
  cash?: boolean;
  amount: number;
  currency: string;
  keyId?: string;
}

export type CheckoutPaymentMethod = "online" | "cash";

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
  latitude: number | null;
  longitude: number | null;
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
    frozenOrderFees?: OrderFeeItem[];
    /** Server-allocated per-service offer discount (rupees). Applied in the
     *  final pass so breakdowns carry offer_discount for booking_pricing. */
    offerAmountsByService?: Record<string, number>;
  }
): Promise<{
  breakdowns: Record<string, PricingBreakdown>;
  totalAmount: number;
  coupon: Coupon | null;
  titleMap: Record<string, string>;
  validatedCoupon: Coupon | null;
  orderFees: OrderFeeItem[];
  orderFeesTotal: number;
  offerDiscountTotal: number;
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

  // Fetch active order fees (or use frozen snapshot from order creation if verifying payment)
  let orderFees: OrderFeeItem[];
  if (options.frozenOrderFees && Array.isArray(options.frozenOrderFees)) {
    orderFees = options.frozenOrderFees;
  } else {
    const platformSettings = await fetchPlatformSettings(supabase);
    orderFees = getActiveOrderFees(platformSettings).map((f) => ({
      id: f.id,
      name: f.name,
      amount: f.amount,
    }));
  }
  const orderFeesTotal = orderFees.reduce((sum, f) => sum + f.amount, 0);

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
  // Per-line coupon-applicable base: the pre-GST, pre-offer line subtotal
  // (total_price has no coupon/offer/wallet in this first pass).
  const discountableBases: Record<string, number> = {};
  for (const line of baseLineItems) {
    provisionalSubtotal += line.breakdown.total_price;
    discountableBases[line.serviceId] =
      line.breakdown.total_price - line.breakdown.gst_amount - line.breakdown.travel_fee;
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

  // Coupon is applied ONCE per order (not once per line). The order-level
  // discount is clamped to the order subtotal and distributed paisa-exactly
  // across the lines that earned it, so `discountAmount` can never overstate
  // the true saving on multi-service carts.
  let couponAllocation: Record<string, number> | undefined;
  if (validatedCoupon && Object.keys(discountableBases).length > 0) {
    couponAllocation = applyOrderLevelCoupon(discountableBases, validatedCoupon).perServiceAllocation;
  }

  // Pass 2 — with the validated coupon's per-line allocation (empty when
  // absent/invalid). This is the authoritative pricing: the canonical engine
  // applies the coupon exactly as the client did, so the charged amount
  // matches the preview.
  const lineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: options.pincode,
    couponAllocation,
    offerAmountsByService: options.offerAmountsByService,
  });

  const breakdowns: Record<string, PricingBreakdown> = {};
  const titleMap: Record<string, string> = {};
  let totalAmount = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  let offerDiscountTotal = 0;

  for (const line of lineItems) {
    breakdowns[line.serviceId] = line.breakdown;
    totalAmount += line.breakdown.total_price;
    discountAmount += line.breakdown.coupon_discount;
    offerDiscountTotal += line.breakdown.offer_discount || 0;
    taxAmount += line.breakdown.gst_amount;
  }
  for (const [id, src] of Object.entries(serviceSources)) {
    titleMap[id] = src.title;
  }

  // originalSubtotal (pre-coupon, pre-offer) = final payable + coupon + offer.
  const originalSubtotal = totalAmount + discountAmount + offerDiscountTotal;
  pricingSummary = {
    originalSubtotal,
    discountAmount,
    taxAmount,
    finalPayable: totalAmount + orderFeesTotal,
    couponValid: !!validatedCoupon,
  };

  return {
    breakdowns,
    totalAmount,
    coupon: validatedCoupon,
    titleMap,
    validatedCoupon,
    orderFees,
    orderFeesTotal,
    pricingSummary,
    offerDiscountTotal,
  };
}

export async function createRazorpayOrderAction(payload: {
  services: ServiceCheckoutInput[];
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  couponCode?: string;
  offerEntitlementId?: string;
  paymentMethod?: CheckoutPaymentMethod;
}): Promise<RazorpayOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const isCash = payload.paymentMethod === "cash";

  if (!payload.services || payload.services.length === 0) {
    throw new Error("No services specified");
  }

  const { data: addr } = await supabase
    .from("user_addresses").select("formatted_address, city, pincode, latitude, longitude").eq("id", payload.addressId).eq("user_id", user.id).single();
  if (!addr) throw new Error("Address not found");

  // Pass 1 — without offer, to get pre-offer line totals used for allocation.
  let computeResult = await computeServiceBreakdowns(supabase, payload.services, {
    date: payload.date,
    time: payload.time,
    pincode: addr.pincode,
    couponCode: payload.couponCode,
  });

  let totalAmount = computeResult.totalAmount;
  let offerSnapshot: { entitlementId: string; applicationId: string; appliedAmount: number } | null = null;
  // Internal orders-table UUID. Distinct from the Razorpay gateway order id.
  const internalOrderId = crypto.randomUUID();

  if (payload.offerEntitlementId) {
    const serviceIds = payload.services.map((s) => s.serviceId);

    // Seed the pending order row first — offer_applications.order_id requires
    // the orders row to exist (FK). Its final amounts are set below / at verify.
    const { error: seedError } = await supabase.from("orders").insert({
      id: internalOrderId,
      customer_id: user.id,
      status: "pending",
      total_amount: 0,
      city: addr.city,
      address: addr.formatted_address,
      pincode: addr.pincode,
      latitude: addr.latitude && Number(addr.latitude) !== 0 ? addr.latitude : null,
      longitude: addr.longitude && Number(addr.longitude) !== 0 ? addr.longitude : null,
      scheduled_date: new Date().toISOString(),
      item_count: payload.services.length,
      payment_status: "pending",
      coupon_code: payload.couponCode || null,
      order_fees: computeResult.orderFees,
      offer_entitlement_id: payload.offerEntitlementId,
    });

    if (seedError) {
      console.error("[payment] Offer order seed failed:", seedError);
      throw new Error("Could not initialize your order.");
    }

    const { data: reserveRes, error: reserveError } = await supabase.rpc("reserve_offer_benefit", {
      p_entitlement_id: payload.offerEntitlementId,
      p_customer_id: user.id,
      p_order_id: internalOrderId,
      p_service_ids: serviceIds,
      p_cart_total: totalAmount,
    });

    const reserve = reserveRes as { success?: boolean; error?: string; application_id?: string; applied_amount?: number } | null;
    if (reserveError || !reserve || !reserve.success) {
      console.error("[payment] Offer reservation failed:", reserveError || reserve?.error);
      // Deleting the order row cascades the (partial) reservation.
      await supabase.from("orders").delete().eq("id", internalOrderId);
      throw new Error(reserve?.error || "This offer could not be applied to your order.");
    }

    const appliedAmount = Math.max(0, Number(reserve.applied_amount || 0));
    const preOfferLineTotals: Record<string, number> = {};
    for (const s of payload.services) {
      preOfferLineTotals[s.serviceId] = computeResult.breakdowns[s.serviceId]?.total_price || 0;
    }
    const allocated = allocateOfferAcrossLines(preOfferLineTotals, appliedAmount);

    // Pass 2 — authoritative breakdowns WITH the offer applied.
    computeResult = await computeServiceBreakdowns(supabase, payload.services, {
      date: payload.date,
      time: payload.time,
      pincode: addr.pincode,
      couponCode: payload.couponCode,
      offerAmountsByService: allocated,
    });
    totalAmount = computeResult.totalAmount;
    offerSnapshot = {
      entitlementId: payload.offerEntitlementId,
      applicationId: String(reserve.application_id || ""),
      appliedAmount,
    };
  }

  const { originalSubtotal, taxAmount, couponValid } =
    computeResult.pricingSummary;

  // Final amount the customer actually pays via Razorpay = post-coupon,
  // post-offer, post-order-fees, post-wallet. Must match verifyRazorpayPaymentAction
  // exactly so the gateway amount equals the captured amount.
  const finalOrderAmount = calculateFinalPayable({
    totalBeforeWallet: totalAmount,
    orderFees: computeResult.orderFees,
    walletAmountToUse: payload.walletAmountToUse ?? 0,
  }).finalPayable;

  if (finalOrderAmount <= 0) {
    // Free order. When an offer is reserved, keep the seeded order row and
    // reservation so verify can confirm and redeem it against the zero amount.
    if (offerSnapshot) {
      await supabase.from("orders").update({
        total_amount: 0,
        original_subtotal: originalSubtotal,
        tax_amount: taxAmount,
        final_amount: 0,
        coupon_valid_at_creation: couponValid,
        offer_discount: offerSnapshot.appliedAmount,
      }).eq("id", internalOrderId);
    }
    return { freeOrder: true, amount: 0, currency: "INR", internalOrderId };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing on server.");
  }

  if (isCash) {
    // Cash (pay-on-completion) orders never touch the gateway. Persist the
    // internal order row with payment_status 'pending' so verify can resolve
    // it (and any offer reservation) — mirroring the free-path machinery.
    if (offerSnapshot) {
      const { error: cashOfferError } = await supabase.from("orders").update({
        status: "pending",
        total_amount: finalOrderAmount,
        payment_status: "pending",
        original_subtotal: originalSubtotal,
        tax_amount: taxAmount,
        final_amount: finalOrderAmount,
        coupon_valid_at_creation: couponValid,
        coupon_code: payload.couponCode || null,
        order_fees: computeResult.orderFees,
        offer_entitlement_id: offerSnapshot.entitlementId,
        offer_discount: offerSnapshot.appliedAmount,
      }).eq("id", internalOrderId);

      if (cashOfferError) {
        console.error("[payment] Cash order snapshot failed:", cashOfferError);
        await supabase.rpc("release_offer_reservation", {
          p_order_id: internalOrderId,
          p_customer_id: user.id,
        });
        await supabase.from("orders").delete().eq("id", internalOrderId);
        throw new Error("Failed to persist your order.");
      }
    } else {
      const { error: cashOrderError } = await supabase.from("orders").insert({
        id: internalOrderId,
        customer_id: user.id,
        status: "pending",
        total_amount: finalOrderAmount,
        city: addr.city,
        address: addr.formatted_address,
        pincode: addr.pincode,
        latitude: addr.latitude && Number(addr.latitude) !== 0 ? addr.latitude : null,
        longitude: addr.longitude && Number(addr.longitude) !== 0 ? addr.longitude : null,
        scheduled_date: new Date().toISOString(), // will be overridden with real date later
        item_count: payload.services.length,
        payment_status: "pending",
        coupon_code: payload.couponCode || null,
        original_subtotal: originalSubtotal,
        tax_amount: taxAmount,
        final_amount: finalOrderAmount,
        coupon_valid_at_creation: couponValid,
        order_fees: computeResult.orderFees,
        offer_entitlement_id: null,
        offer_discount: 0,
      });
      if (cashOrderError) {
        console.error("[payment] Cash order creation failed:", cashOrderError);
        throw new Error("Failed to persist your order.");
      }
    }

    return {
      freeOrder: false,
      cash: true,
      internalOrderId,
      amount: finalOrderAmount,
      currency: "INR",
    };
  }

  const authHeader = "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({
      amount: Math.round(finalOrderAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        order_fees: JSON.stringify(computeResult.orderFees),
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[Razorpay] API Error:", errBody);
    // The offer reservation must be released before the order row is dropped.
    if (offerSnapshot) {
      await supabase.rpc("release_offer_reservation", {
        p_order_id: internalOrderId,
        p_customer_id: user.id,
      });
      await supabase.from("orders").delete().eq("id", internalOrderId);
    }
    throw new Error("Payment gateway order creation failed.");
  }

  const orderData = await response.json();

  // Persist authoritative pricing and order_fees snapshot (immutable for this
  // order's lifecycle). Offer orders update the seeded row with final amounts.
  if (offerSnapshot) {
    const { error: offerOrderError } = await supabase.from("orders").update({
      status: "pending",
      total_amount: finalOrderAmount,
      payment_status: "pending",
      original_subtotal: originalSubtotal,
      tax_amount: taxAmount,
      final_amount: finalOrderAmount,
      coupon_valid_at_creation: couponValid,
      coupon_code: payload.couponCode || null,
      order_fees: computeResult.orderFees,
      offer_entitlement_id: offerSnapshot.entitlementId,
      offer_discount: offerSnapshot.appliedAmount,
    }).eq("id", internalOrderId);

    if (offerOrderError) {
      console.error("[payment] Offer order snapshot failed:", offerOrderError);
      await supabase.rpc("release_offer_reservation", { p_order_id: internalOrderId, p_customer_id: user.id });
      await supabase.from("orders").delete().eq("id", internalOrderId);
      throw new Error("Failed to persist your order.");
    }
  } else {
    const { error: orderError } = await supabase.from("orders").insert({
      id: internalOrderId,
      customer_id: user.id,
      status: "pending",
      total_amount: finalOrderAmount,
      city: addr.city,
      address: addr.formatted_address,
      pincode: addr.pincode,
      latitude: addr.latitude && Number(addr.latitude) !== 0 ? addr.latitude : null,
      longitude: addr.longitude && Number(addr.longitude) !== 0 ? addr.longitude : null,
      scheduled_date: new Date().toISOString(), // will be overridden with real date later
      item_count: payload.services.length,
      payment_status: "pending",
      // Pricing snapshot fields — immutable for this order
      coupon_code: payload.couponCode || null,
      original_subtotal: originalSubtotal,
      tax_amount: taxAmount,
      final_amount: finalOrderAmount,
      coupon_valid_at_creation: couponValid,
      order_fees: computeResult.orderFees,
      offer_entitlement_id: null,
      offer_discount: 0,
    });
    if (orderError) {
      console.error("[payment] Order creation failed:", orderError);
      throw new Error("Failed to persist your order.");
    }
  }

  return {
    freeOrder: false,
    orderId: orderData.id,
    internalOrderId,
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
  /** Internal `orders.id` (from createRazorpayOrderAction). Carries the seeded
   *  order row + offer reservation through the free (wallet-only) path where no
   *  Razorpay gateway id exists. */
  orderId?: string;
  services: ServiceCheckoutInput[];
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  couponCode?: string;
  offerEntitlementId?: string;
  businessName?: string;
  businessGstin?: string;
  paymentMethod?: CheckoutPaymentMethod;
}): Promise<VerificationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const isCash = payload.paymentMethod === "cash";

  if (!payload.services || payload.services.length === 0) {
    return { success: false, error: "No services specified." };
  }

  let rzAmount = 0;
  let rzOrderNotes: Record<string, string> | undefined;

  // 1. Signature Verification & Gateway Order Retrieval
  if (!payload.isFree && !isCash) {
    if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
      return { success: false, error: "Missing payment credentials." };
    }
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) return { success: false, error: "Razorpay credentials missing on server." };

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== payload.razorpay_signature) {
      console.error("[Razorpay] Invalid signature detected. Possible tampering attempt.");
      return { success: false, error: "Payment verification failed (signature mismatch)." };
    }

    // 1a. Fetch authoritative order from Razorpay API to obtain the exact charged amount
    const authHeader = "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
    const rzResponse = await fetch(`https://api.razorpay.com/v1/orders/${payload.razorpay_order_id}`, {
      headers: { Authorization: authHeader },
    });

    if (!rzResponse.ok) {
      const errBody = await rzResponse.text();
      console.error("[Razorpay] Failed to fetch order from Razorpay API:", errBody);
      return { success: false, error: "Unable to verify order with payment gateway." };
    }

    const rzOrder = (await rzResponse.json()) as { amount: number; notes?: Record<string, string> };
    rzAmount = (rzOrder.amount || 0) / 100;
    rzOrderNotes = rzOrder.notes;
  }

  // 1b. Resolve the internal order + frozen fee snapshot + duplicate guards.
  // `payload.orderId` is the internal `orders.id` created by the create action.
  // Free (wallet-only) orders have NO Razorpay gateway id, so their seeded
  // order row + offer reservation must be resolved by this internal id — the
  // old razorpay-order-id-only lookup silently dropped the offer on
  // wallet-redeemed orders, over-charging the wallet or rejecting the booking.
  let frozenOrderFees: OrderFeeItem[] | undefined;
  let pendingOrderSnapshot: Order | null = null;

  const referenceOrderId = payload.orderId;
  if (referenceOrderId) {
    const { data: referenceOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", referenceOrderId)
      .eq("customer_id", user.id)
      .maybeSingle();
    if (referenceOrder) {
      pendingOrderSnapshot = referenceOrder as Order;
      if (
        Array.isArray(pendingOrderSnapshot.order_fees) &&
        pendingOrderSnapshot.order_fees.length > 0
      ) {
        frozenOrderFees = pendingOrderSnapshot.order_fees;
      }
    }
  }

  // Legacy fallback (clients without an internal order id): latest pending
  // order row for the user, exactly as before.
  if (!pendingOrderSnapshot && payload.razorpay_order_id) {
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOrder) {
      pendingOrderSnapshot = pendingOrder as Order;
      if (
        pendingOrderSnapshot.order_fees &&
        Array.isArray(pendingOrderSnapshot.order_fees) &&
        pendingOrderSnapshot.order_fees.length > 0
      ) {
        frozenOrderFees = pendingOrderSnapshot.order_fees;
      }
    }
  }

  // Fee fallback: Razorpay order notes when no orders row carried the snapshot.
  if (!frozenOrderFees && rzOrderNotes?.order_fees) {
    try {
      const parsed = JSON.parse(rzOrderNotes.order_fees);
      if (Array.isArray(parsed)) {
        frozenOrderFees = parsed;
      }
    } catch {
      // ignore parse error
    }
  }

  // Duplicate guards.
  if (payload.isFree || isCash) {
    // Free (wallet-only) orders have no gateway payment id to dedupe on. The
    // order row is the idempotency key: a repeated free verify would otherwise
    // re-debit the wallet and duplicate bookings under one order.
    if (pendingOrderSnapshot && pendingOrderSnapshot.payment_status === "paid") {
      console.warn("[payment] Free order already processed:", pendingOrderSnapshot.id);
      return { success: false, error: "This order has already been processed." };
    }
    // Cash orders keep payment_status 'pending' until service completion, so a
    // paid-check can never catch a duplicate verify — guard on bookings instead.
    if (isCash && pendingOrderSnapshot) {
      const { data: existingCashBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("order_id", pendingOrderSnapshot.id)
        .limit(1)
        .maybeSingle();
      if (existingCashBookings) {
        return { success: false, error: "This order has already been processed." };
      }
    }
  } else if (payload.razorpay_order_id) {
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

  // Coupon dedup keyed on the INTERNAL order id (the `(coupon_id, order_id)`
  // UNIQUE is the real guard — this is just an early exit). The old code
  // compared against the Razorpay gateway id, which never matched.
  if (payload.couponCode) {
    const internalOrderId = payload.orderId ?? pendingOrderSnapshot?.id;
    if (internalOrderId) {
      const { data: existingUsage } = await supabase
        .from("coupon_usages")
        .select("id")
        .eq("order_id", internalOrderId)
        .limit(1)
        .maybeSingle();
      if (existingUsage) {
        console.log("[payment] Coupon already redeemed for order", internalOrderId, "- skipping re-consumption.");
      }
    }
  }

  // 2. Fetch address
  const { data: addr } = await supabase
    .from("user_addresses").select("formatted_address, city, area, pincode, latitude, longitude").eq("id", payload.addressId).eq("user_id", user.id).single();
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

  // 4a. Offer context — the server-side reservation created at order creation.
  let offerContext: {
    entitlementId: string;
    offerId: string;
    applicationId: string;
    appliedAmount: number;
  } | null = null;
  if (payload.offerEntitlementId && pendingOrderSnapshot) {
    const { data: app } = await supabase
      .from("offer_applications")
      .select("id, amount, entitlement_id, offer_entitlements(offer_id)")
      .eq("order_id", pendingOrderSnapshot.id)
      .eq("status", "reserved")
      .maybeSingle();

    if (app) {
      const offerEntO = Array.isArray(app.offer_entitlements) ? app.offer_entitlements[0] : app.offer_entitlements;
      const rawOfferId = (offerEntO as { offer_id?: string } | null)?.offer_id;
      offerContext = {
        entitlementId: String(app.entitlement_id),
        offerId: String(rawOfferId ?? ""),
        applicationId: String(app.id),
        appliedAmount: Math.max(0, Number(app.amount || 0)),
      };
    }
  }

  // Authoritative server-side pricing recomputation using the frozen snapshot
  let computePass = await computeServiceBreakdowns(supabase, payload.services, {
    date: payload.date,
    time: payload.time,
    pincode: addr.pincode,
    couponCode: payload.couponCode,
    frozenOrderFees,
  });

  // When an offer was reserved, allocate its recorded amount across lines and
  // recompute authoritative breakdowns (so offer_discount lands on each line).
  if (offerContext) {
    const preOfferLineTotals: Record<string, number> = {};
    for (const s of payload.services) {
      preOfferLineTotals[s.serviceId] = computePass.breakdowns[s.serviceId]?.total_price || 0;
    }
    const allocated = allocateOfferAcrossLines(preOfferLineTotals, offerContext.appliedAmount);
    computePass = await computeServiceBreakdowns(supabase, payload.services, {
      date: payload.date,
      time: payload.time,
      pincode: addr.pincode,
      couponCode: payload.couponCode,
      frozenOrderFees,
      offerAmountsByService: allocated,
    });
  }

  const { breakdowns, totalAmount, titleMap, validatedCoupon, pricingSummary, orderFees } = computePass;

  const { originalSubtotal: snapshotOriginalSubtotal, discountAmount: snapshotDiscountAmount, taxAmount: snapshotTaxAmount, couponValid } = pricingSummary;
  const walletRequested = isCash ? 0 : Math.max(0, Number(payload.walletAmountToUse ?? 0));

  // CRITICAL: never debit more than the actual payable. `walletApplied` is
  // capped inside calculateFinalPayable — a wallet balance can never be the
  // server's only guard when the free path short-circuits the gateway.
  // NOTE: `walletApplied` (not `min(walletApplied, finalOrderAmount)`) is the
  // debit amount — on wallet-only free orders finalOrderAmount is 0 precisely
  // because the wallet covers the whole charge, so the wallet must still move.
  const { walletApplied, finalPayable } = calculateFinalPayable({
    totalBeforeWallet: totalAmount,
    orderFees,
    walletAmountToUse: walletRequested,
  });
  const finalOrderAmount = finalPayable;
  const walletDebit = Math.max(0, walletApplied);

  // 4b. Security Validation: Amount Mismatch Guard
  if (!payload.isFree && !isCash) {
    if (Math.abs(rzAmount - finalOrderAmount) > 1) {
      console.error(
        `[Razorpay] Payment amount mismatch: Gateway charged ₹${rzAmount}, but server computed ₹${finalOrderAmount}.`
      );
      return {
        success: false,
        error: "Payment amount mismatch detected. Please contact support.",
      };
    }
  } else if (payload.isFree) {
    if (finalOrderAmount > 0) {
      console.error(
        `[Razorpay] Free order rejected: server computed payable of ₹${finalOrderAmount} (must be <= 0).`
      );
      return {
        success: false,
        error: "Invalid free order request: non-zero payment amount required.",
      };
    }
  }

  // 5. Create or Update Order Record
  let order: { id: string };
  if (pendingOrderSnapshot?.id) {
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "pending",
        total_amount: finalOrderAmount,
        city: addr.city,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        item_count: payload.services.length,
        payment_status: isCash ? "pending" : "paid",
        coupon_code: payload.couponCode || null,
        original_subtotal: snapshotOriginalSubtotal,
        tax_amount: snapshotTaxAmount,
        final_amount: finalOrderAmount,
        coupon_valid_at_creation: couponValid,
        order_fees: orderFees,
        offer_entitlement_id: offerContext?.entitlementId ?? pendingOrderSnapshot.offer_entitlement_id ?? null,
        offer_discount: offerContext?.appliedAmount ?? pendingOrderSnapshot.offer_discount ?? 0,
      })
      .eq("id", pendingOrderSnapshot.id)
      .select("id")
      .single();

    if (updateError || !updatedOrder) {
      console.error("[payment] Order update failed:", JSON.stringify(updateError));
      if (offerContext) {
        await supabase.rpc("release_offer_reservation", { p_order_id: pendingOrderSnapshot.id, p_customer_id: user.id });
      }
      return { success: false, error: `Failed to update order. ${updateError?.message || ""}` };
    }
    order = updatedOrder;
  } else {
    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        // Deterministic id when the create action supplied one (free wallet-only
        // orders have no row until here): a duplicate verify resolves the SAME
        // row, sees payment_status = 'paid', and is blocked — wallet double-debit
        // and duplicate bookings are impossible.
        id: payload.orderId ?? undefined,
        customer_id: user.id,
        status: "pending",
        total_amount: finalOrderAmount,
        city: addr.city,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        item_count: payload.services.length,
        payment_status: isCash ? "pending" : "paid",
        coupon_code: payload.couponCode || null,
        original_subtotal: snapshotOriginalSubtotal,
        tax_amount: snapshotTaxAmount,
        final_amount: finalOrderAmount,
        coupon_valid_at_creation: couponValid,
        order_fees: orderFees,
        offer_entitlement_id: offerContext?.entitlementId ?? null,
        offer_discount: offerContext?.appliedAmount ?? 0,
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      console.error("[payment] Order creation failed:", JSON.stringify(orderError));
      return { success: false, error: `Failed to create order. ${orderError?.message || ""}` };
    }
    order = createdOrder;
  }

  // 6. Debit wallet if applicable — always the server-capped `walletDebit`,
  // never the raw client-supplied amount.
  if (walletDebit > 0 && !isCash) {
    const { data: walletRes, error: walletError } = await supabase.rpc("use_wallet_balance", {
      p_user_id: user.id,
      p_amount: walletDebit,
      p_booking_id: order.id,
    });
    if (walletError || !walletRes || !(walletRes as { success?: boolean }).success) {
      console.error("[payment] Wallet debit failed:", walletError || (walletRes as { error?: string })?.error);
      if (offerContext) {
        await supabase.rpc("release_offer_reservation", { p_order_id: order.id, p_customer_id: user.id });
      }
      await supabase.from("orders").delete().eq("id", order.id);
      return { success: false, error: (walletRes as { error?: string })?.error || "Failed to debit wallet balance." };
    }
  }

  // 6b. Consume the offer reservation — atomic, idempotent, server-side.
  // Runs AFTER the wallet debit so an earlier failure never consumes the offer.
  if (offerContext) {
    const { data: applyRes, error: applyError } = await supabase.rpc("apply_offer_redemption", {
      p_application_id: offerContext.applicationId,
      p_customer_id: user.id,
      p_booking_id: null,
    });
    const applyResult = applyRes as { success?: boolean; error?: string } | null;
    if (applyError || !applyRes || !applyResult?.success) {
      console.error("[payment] Offer redemption failed:", applyError || applyResult?.error);
      await supabase.rpc("release_offer_reservation", { p_order_id: order.id, p_customer_id: user.id });
      return {
        success: false,
        error: applyResult?.error || "Your offer could not be applied. Please contact support.",
      };
    }
  }

  // 7. Create payment record (cash bookings have no gateway receipt — the
  // partner collects cash after the service, {payment_status} flips at completion)
  if (!isCash) {
    await supabase.from("payments").insert({
      customer_id: user.id,
      order_id: order.id,
      amount: finalOrderAmount,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id ?? null,
      razorpay_payment_id: payload.razorpay_payment_id ?? null,
      razorpay_signature: payload.razorpay_signature ?? null,
    });
  }

  // 8. Create coupon usage record (if coupon was applied) — for BOTH paid and
  // free orders. The `(coupon_id, order_id)` UNIQUE prevents double-usage.
  if (payload.couponCode && validatedCoupon) {
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
      console.warn(
        "[payment] Coupon usage insert issue (ignored, order already committed):",
        usageError.message
      );
    }
  }

  // 9. Create child bookings
  let isFirstBooking = true;
  // Truthful payment-method label for this order (feeds invoices + admin).
  // Online bookings were silently defaulting to 'Cash' on the DB column — now
  // every path writes the true method.
  let bookingPaymentMethod = "Razorpay";
  if (isCash) bookingPaymentMethod = "Cash";
  else if (payload.isFree) bookingPaymentMethod = walletDebit > 0 ? "Wallet" : offerContext ? "Offer" : "Razorpay";
  else if (walletDebit > 0) bookingPaymentMethod = "Wallet + Razorpay";

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
        payment_status: isCash ? "pending" : "paid",
        payment_method: bookingPaymentMethod,
        selected_duration_minutes: item.duration ?? null,
        base_price: breakdown.base_price,
        final_price: breakdown.total_price,
        wallet_discount_applied: breakdown.wallet_discount,
        business_name: payload.businessName || null,
        business_gstin: payload.businessGstin || null,
        meeting_location: item.meetingLocation || null,
        destination: item.destination || null,
        expected_bags: item.expectedBags ? parseInt(item.expectedBags, 10) : 0,
        latitude: typedAddr.latitude && Number(typedAddr.latitude) !== 0 ? typedAddr.latitude : null,
        longitude: typedAddr.longitude && Number(typedAddr.longitude) !== 0 ? typedAddr.longitude : null,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[payment] Booking creation failed:", bookingError);
      continue;
    }

    // Link the offer redemption / application to the first created booking so
    // customers and admins can trace the offer to its fulfilled booking.
    if (offerContext && isFirstBooking) {
      await supabase
        .from("offer_redemptions")
        .update({ booking_id: booking.id })
        .eq("entitlement_id", offerContext.entitlementId)
        .eq("order_id", order.id);
      await supabase
        .from("offer_applications")
        .update({ booking_id: booking.id })
        .eq("id", offerContext.applicationId);
    }

    const bookingSurcharges = [
      ...(breakdown.surcharges || []),
      ...(isFirstBooking && orderFees.length > 0 ? orderFees : []),
    ];
    isFirstBooking = false;

    await supabase.from("booking_pricing").insert({
      booking_id: booking.id,
      base_price: breakdown.base_price,
      hourly_price: breakdown.hourly_price,
      area_price: breakdown.area_price,
      quantity_price: breakdown.quantity_price,
      distance_price: breakdown.distance_price,
      inspection_fee: breakdown.inspection_fee,
      travel_fee: breakdown.travel_fee,
      surcharges: bookingSurcharges,
      addons_total: breakdown.addons_total,
      addons_breakdown: breakdown.addons_breakdown,
      gst_amount: breakdown.gst_amount,
      discount_amount: breakdown.discount_amount,
      coupon_discount: breakdown.coupon_discount,
      wallet_discount: breakdown.wallet_discount,
      offer_id: offerContext?.offerId ?? null,
      offer_entitlement_id: offerContext?.entitlementId ?? null,
      offer_discount: breakdown.offer_discount || 0,
      total_price: breakdown.total_price,
    });

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
      }
    }

    await supabase.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "pending",
      changed_by: user.id,
      remarks: "Booking created",
    });

    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "BOOKING_CREATED",
      actor: "USER",
      metadata: {
        customer_id: user.id,
        service_id: item.serviceId,
        amount: breakdown.total_price,
        order_id: order.id,
        payment_verified: true,
      },
    });

    void triggerDispatchBatch(booking.id, 1);

    const title = titleMap[item.serviceId] || "Service";
    void notifyCustomer(
      user.id,
      isCash ? "Booking Confirmed!" : "Booking Confirmed & Paid!",
      isCash
        ? `Your booking for ${title} on ${payload.date} at ${payload.time} has been placed. Please keep ₹${breakdown.total_price.toLocaleString("en-IN")} ready in cash for your Professional.`
        : `Your booking for ${title} on ${payload.date} at ${payload.time} has been placed. We are matching a professional.`,
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
