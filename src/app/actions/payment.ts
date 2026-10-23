"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import {
  computeServiceBreakdowns,
  fulfillOrderBookings,
  ServiceCheckoutInput,
  CheckoutPayload,
} from "@/lib/orders/orderFulfillment";
import { calculateFinalPayable } from "@/lib/pricing";
import { allocateOfferAcrossLines } from "@/lib/pricing/offerEngine";

export type { ServiceCheckoutInput, CheckoutPayload };

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


export async function createRazorpayOrderAction(payload: {
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

  const checkoutPayload: CheckoutPayload = {
    services: payload.services,
    addressId: payload.addressId,
    date: payload.date,
    time: payload.time,
    walletAmountToUse: payload.walletAmountToUse ?? 0,
    couponCode: payload.couponCode || null,
    offerEntitlementId: payload.offerEntitlementId || null,
    businessName: payload.businessName || null,
    businessGstin: payload.businessGstin || null,
    paymentMethod: payload.paymentMethod || "online",
  };

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
      wallet_discount: 0,
      checkout_payload: checkoutPayload,
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
  const payableCalc = calculateFinalPayable({
    totalBeforeWallet: totalAmount,
    orderFees: computeResult.orderFees,
    walletAmountToUse: payload.walletAmountToUse ?? 0,
  });
  const finalOrderAmount = payableCalc.finalPayable;
  const walletAppliedAmount = isCash ? 0 : payableCalc.walletApplied;

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
        wallet_discount: walletAppliedAmount,
        checkout_payload: checkoutPayload,
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
        wallet_discount: 0,
        checkout_payload: checkoutPayload,
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
        wallet_discount: 0,
        checkout_payload: checkoutPayload,
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
        internal_order_id: internalOrderId,
        customer_id: user.id,
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
      razorpay_order_id: orderData.id,
      original_subtotal: originalSubtotal,
      tax_amount: taxAmount,
      final_amount: finalOrderAmount,
      coupon_valid_at_creation: couponValid,
      coupon_code: payload.couponCode || null,
      order_fees: computeResult.orderFees,
      offer_entitlement_id: offerSnapshot.entitlementId,
      offer_discount: offerSnapshot.appliedAmount,
      wallet_discount: walletAppliedAmount,
      checkout_payload: checkoutPayload,
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
      razorpay_order_id: orderData.id,
      coupon_code: payload.couponCode || null,
      original_subtotal: originalSubtotal,
      tax_amount: taxAmount,
      final_amount: finalOrderAmount,
      coupon_valid_at_creation: couponValid,
      order_fees: computeResult.orderFees,
      offer_entitlement_id: null,
      offer_discount: 0,
      wallet_discount: walletAppliedAmount,
      checkout_payload: checkoutPayload,
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
  /** Internal `orders.id` (from createRazorpayOrderAction). */
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
  }

  // 2. Resolve Target Order (ownership-scoped)
  let targetOrderId = payload.orderId;
  if (targetOrderId) {
    // Authoritative ownership check: an explicitly supplied orderId must belong to the caller
    const { data: ownedOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("id", targetOrderId)
      .eq("customer_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!ownedOrder) {
      console.warn("[payment] Explicit orderId does not belong to caller — ignoring and resolving safely.");
      targetOrderId = undefined;
    }
  }
  if (!targetOrderId && payload.razorpay_order_id) {
    const { data: matchedOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_order_id", payload.razorpay_order_id)
      .eq("customer_id", user.id)
      .limit(1)
      .maybeSingle();
    if (matchedOrder) {
      targetOrderId = matchedOrder.id;
    }
  }

  if (!targetOrderId) {
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingOrder) {
      targetOrderId = pendingOrder.id;
    }
  }

  // 3. Delegate to Unified Order Fulfillment
  const fulfillmentResult = await fulfillOrderBookings({
    orderId: targetOrderId,
    razorpayOrderId: payload.razorpay_order_id,
    razorpayPaymentId: payload.razorpay_payment_id,
    razorpaySignature: payload.razorpay_signature,
    gatewayAmount: rzAmount,
    isFree: payload.isFree,
    isCash,
    source: "client",
    fallbackPayload: {
      services: payload.services,
      addressId: payload.addressId,
      date: payload.date,
      time: payload.time,
      walletAmountToUse: payload.walletAmountToUse,
      couponCode: payload.couponCode,
      offerEntitlementId: payload.offerEntitlementId,
      businessName: payload.businessName,
      businessGstin: payload.businessGstin,
      paymentMethod: payload.paymentMethod,
    },
  });

  if (!fulfillmentResult.success) {
    return { success: false, error: fulfillmentResult.error || "Payment verification failed." };
  }

  return { success: true, orderId: fulfillmentResult.orderId };
}

