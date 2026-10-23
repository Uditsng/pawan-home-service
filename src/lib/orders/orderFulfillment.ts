import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { Coupon, CartItem, Order } from "@/lib/types";
import { calculateFinalPayable, allocateWalletAcrossLines } from "@/lib/pricing";
import { allocateOfferAcrossLines } from "@/lib/pricing/offerEngine";
import { computeCartLineItems } from "@/lib/pricing/cartCatalog";
import { buildCartCatalog } from "@/lib/catalog/buildCartCatalog";
import type { PricingBreakdown, OrderFeeItem } from "@/lib/pricing/types";
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

export interface CheckoutPayload {
  services: ServiceCheckoutInput[];
  addressId: string;
  date: string;
  time: string;
  walletAmountToUse?: number;
  couponCode?: string | null;
  offerEntitlementId?: string | null;
  businessName?: string | null;
  businessGstin?: string | null;
  paymentMethod?: string | null;
}

export interface FulfillOrderParams {
  orderId?: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  gatewayAmount?: number;
  isFree?: boolean;
  isCash?: boolean;
  source: "client" | "webhook";
  fallbackPayload?: Partial<CheckoutPayload>;
}

export interface FulfillOrderResult {
  success: boolean;
  orderId?: string;
  alreadyFulfilled?: boolean;
  recovered?: boolean;
  createdBookingIds?: string[];
  error?: string;
}

interface DBAddress {
  formatted_address: string;
  city: string;
  area?: string | null;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Authoritative pricing calculation engine for checkout and order fulfillment.
 */
export async function computeServiceBreakdowns(
  supabase: SupabaseClient,
  services: ServiceCheckoutInput[],
  options: {
    date: string;
    time: string;
    pincode: string;
    couponCode?: string | null;
    customerId?: string | null;
    frozenOrderFees?: OrderFeeItem[];
    offerAmountsByService?: Record<string, number>;
    walletAmountsByService?: Record<string, number>;
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
  walletDiscountTotal: number;
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

  // Pass 1 — without coupon, to get authoritative pre-coupon subtotal
  const baseLineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: options.pincode,
  });
  let provisionalSubtotal = 0;
  const discountableBases: Record<string, number> = {};
  for (const line of baseLineItems) {
    provisionalSubtotal += line.breakdown.total_price;
    discountableBases[line.serviceId] =
      line.breakdown.total_price - line.breakdown.gst_amount - line.breakdown.travel_fee;
  }

  let validatedCoupon: Coupon | null = null;

  if (options.couponCode) {
    const normalized = normalizeCouponCode(options.couponCode);
    const validationResult = await validateCoupon(
      supabase,
      normalized,
      provisionalSubtotal,
      options.customerId ?? undefined,
      serviceIds
    );

    if (validationResult.eligible && validationResult.coupon) {
      const coupon = validationResult.coupon;
      if (
        coupon.applicable_to_service_id &&
        !serviceIds.includes(coupon.applicable_to_service_id)
      ) {
        validatedCoupon = null;
      } else {
        validatedCoupon = coupon;
      }
    }
  }

  let couponAllocation: Record<string, number> | undefined;
  if (validatedCoupon && Object.keys(discountableBases).length > 0) {
    couponAllocation = applyOrderLevelCoupon(discountableBases, validatedCoupon).perServiceAllocation;
  }

  // Pass 2 — with the validated coupon's per-line allocation
  const lineItems = computeCartLineItems(items, catalog, {
    scheduledDate,
    pincode: options.pincode,
    couponAllocation,
    offerAmountsByService: options.offerAmountsByService,
    walletAmountsByService: options.walletAmountsByService,
  });

  const breakdowns: Record<string, PricingBreakdown> = {};
  const titleMap: Record<string, string> = {};
  let totalAmount = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  let offerDiscountTotal = 0;
  let walletDiscountTotal = 0;

  for (const line of lineItems) {
    breakdowns[line.serviceId] = line.breakdown;
    totalAmount += line.breakdown.total_price;
    discountAmount += line.breakdown.coupon_discount;
    offerDiscountTotal += line.breakdown.offer_discount || 0;
    walletDiscountTotal += line.breakdown.wallet_discount || 0;
    taxAmount += line.breakdown.gst_amount;
  }
  for (const [id, src] of Object.entries(serviceSources)) {
    titleMap[id] = src.title;
  }

  const originalSubtotal = totalAmount + discountAmount + offerDiscountTotal + walletDiscountTotal;
  const pricingSummary = {
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
    walletDiscountTotal,
  };
}

/**
 * Master Order Fulfillment & Webhook Recovery Routine.
 * Executes child booking creation, wallet debit, offer redemption, and partner dispatch idempotently.
 */
export async function fulfillOrderBookings(params: FulfillOrderParams): Promise<FulfillOrderResult> {
  const supabaseAdmin = createAdminClient();

  // 1. Resolve Target Order
  let targetOrder: Order | null = null;

  if (params.orderId) {
    const { data: oById } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", params.orderId)
      .limit(1)
      .maybeSingle();
    if (oById) targetOrder = oById as Order;
  }

  if (!targetOrder && params.razorpayOrderId) {
    const { data: oByRz } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", params.razorpayOrderId)
      .limit(1)
      .maybeSingle();
    if (oByRz) targetOrder = oByRz as Order;
  }

  if (!targetOrder && (params.razorpayOrderId || params.razorpayPaymentId)) {
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("order_id")
      .or(`razorpay_order_id.eq.${params.razorpayOrderId},razorpay_payment_id.eq.${params.razorpayPaymentId}`)
      .limit(1)
      .maybeSingle();
    if (existingPayment?.order_id) {
      const { data: oByPay } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", existingPayment.order_id)
        .limit(1)
        .maybeSingle();
      if (oByPay) targetOrder = oByPay as Order;
    }
  }

  if (!targetOrder) {
    console.error("[orderFulfillment] Could not find order for parameters:", {
      orderId: params.orderId,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      source: params.source,
    });
    return { success: false, error: "Order not found" };
  }

  // 2. Atomic Order Claim with Row Locking
  let claimAttempts = 0;
  let claimResult: {
    success: boolean;
    already_fulfilled?: boolean;
    reason?: string;
    booking_count?: number;
    order?: Order;
  } | null = null;

  while (claimAttempts < 3) {
    claimAttempts++;
    const { data: claimData, error: claimErr } = await supabaseAdmin.rpc("claim_order_for_fulfillment", {
      p_order_id: targetOrder.id,
      p_razorpay_order_id: params.razorpayOrderId || null,
    });

    if (claimErr) {
      console.error("[orderFulfillment] claim_order_for_fulfillment RPC error:", claimErr.message);
      break;
    }

    claimResult = claimData as {
      success: boolean;
      already_fulfilled?: boolean;
      reason?: string;
      booking_count?: number;
      order?: Order;
    };

    if (claimResult.success && claimResult.already_fulfilled) {
      break;
    }

    if (claimResult.reason === "actively_processing") {
      // Another worker (e.g. client verify or webhook) is currently writing bookings.
      // Wait 500ms and re-check if it completed.
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    break;
  }

  // Handle already fulfilled order
  if (claimResult?.already_fulfilled) {
    console.log(`[orderFulfillment] Order ${targetOrder.id} is already fulfilled. Ensuring consistency.`);

    // Ensure payment record exists for gateway orders
    if (!params.isCash && params.razorpayOrderId) {
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("order_id", targetOrder.id)
        .limit(1)
        .maybeSingle();

      if (!existingPayment) {
        await supabaseAdmin.from("payments").insert({
          customer_id: targetOrder.customer_id,
          order_id: targetOrder.id,
          amount: params.gatewayAmount ?? targetOrder.final_amount ?? 0,
          payment_status: "completed",
          razorpay_order_id: params.razorpayOrderId || targetOrder.razorpay_order_id || null,
          razorpay_payment_id: params.razorpayPaymentId || null,
          razorpay_signature: params.razorpaySignature || null,
        });
      }
    }

    // Ensure all existing child bookings are marked paid
    if (!params.isCash) {
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("order_id", targetOrder.id)
        .neq("payment_status", "paid");
    }

    // Trigger dispatch for any pending child bookings
    const { data: pendingBookings } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("order_id", targetOrder.id)
      .eq("status", "pending");

    for (const pb of pendingBookings || []) {
      void triggerDispatchBatch(pb.id, 1);
    }

    return {
      success: true,
      orderId: targetOrder.id,
      alreadyFulfilled: true,
    };
  }

  // 3. Gateway Amount Consistency — reject tampered or stale charges
  if (!params.isCash && !!params.razorpayOrderId && Number(targetOrder.final_amount) > 0) {
    const expectedAmount = Number(targetOrder.final_amount);
    const chargedAmount = Number(params.gatewayAmount || 0);
    if (Math.abs(chargedAmount - expectedAmount) > 1) {
      console.error(
        `[orderFulfillment] Payment amount mismatch: gateway charged ₹${chargedAmount} but order total is ₹${expectedAmount}. Aborting fulfillment.`
      );
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "pending", updated_at: new Date().toISOString() })
        .eq("id", targetOrder.id);
      return { success: false, error: "Payment amount does not match the order total. No bookings created." };
    }
  }

  // 3b. Fulfill Uncreated Child Bookings
  try {
    const rawPayload = (targetOrder.checkout_payload || params.fallbackPayload || {}) as Partial<CheckoutPayload>;
    const services = rawPayload.services || [];

    if (services.length === 0) {
      console.error("[orderFulfillment] Cannot fulfill order: no services found in payload.", targetOrder.id);
      await supabaseAdmin.from("orders").update({ payment_status: "pending" }).eq("id", targetOrder.id);
      return { success: false, error: "No services found in order payload" };
    }

    // Resolve address snapshot
    let addr: DBAddress;
    if (rawPayload.addressId) {
      const { data: addrRow } = await supabaseAdmin
        .from("user_addresses")
        .select("formatted_address, city, area, pincode, latitude, longitude")
        .eq("id", rawPayload.addressId)
        .maybeSingle();
      if (addrRow) {
        addr = addrRow as DBAddress;
      } else {
        addr = {
          formatted_address: targetOrder.address || "",
          city: targetOrder.city || "",
          pincode: targetOrder.pincode || "",
          latitude: targetOrder.latitude,
          longitude: targetOrder.longitude,
          area: null,
        };
      }
    } else {
      addr = {
        formatted_address: targetOrder.address || "",
        city: targetOrder.city || "",
        pincode: targetOrder.pincode || "",
        latitude: targetOrder.latitude,
        longitude: targetOrder.longitude,
        area: null,
      };
    }

    const dateStr = rawPayload.date || (targetOrder.scheduled_date ? targetOrder.scheduled_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    const timeStr = rawPayload.time || "10:00 AM";
    const timestamp = new Date(combineDateTimeToISO(dateStr, timeStr));

    // Offer context
    const offerEntitlementId = rawPayload.offerEntitlementId || targetOrder.offer_entitlement_id;
    let offerContext: {
      entitlementId: string;
      offerId: string;
      applicationId: string;
      appliedAmount: number;
    } | null = null;

    if (offerEntitlementId) {
      const { data: app } = await supabaseAdmin
        .from("offer_applications")
        .select("id, amount, entitlement_id, offer_entitlements(offer_id)")
        .eq("order_id", targetOrder.id)
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

    // Compute Authoritative Breakdowns
    const frozenOrderFees = targetOrder.order_fees;
    const couponCode = rawPayload.couponCode || targetOrder.coupon_code;

    let computePass = await computeServiceBreakdowns(supabaseAdmin, services, {
      date: dateStr,
      time: timeStr,
      pincode: addr.pincode,
      couponCode: couponCode || undefined,
      frozenOrderFees,
    });

    let allocatedOffer: Record<string, number> | undefined;
    if (offerContext) {
      const preOfferLineTotals: Record<string, number> = {};
      for (const s of services) {
        preOfferLineTotals[s.serviceId] = computePass.breakdowns[s.serviceId]?.total_price || 0;
      }
      allocatedOffer = allocateOfferAcrossLines(preOfferLineTotals, offerContext.appliedAmount);
      computePass = await computeServiceBreakdowns(supabaseAdmin, services, {
        date: dateStr,
        time: timeStr,
        pincode: addr.pincode,
        couponCode: couponCode || undefined,
        frozenOrderFees,
        offerAmountsByService: allocatedOffer,
      });
    }

    const { totalAmount, pricingSummary, orderFees } = computePass;
    const { originalSubtotal: snapshotOriginalSubtotal, discountAmount: snapshotDiscountAmount, taxAmount: snapshotTaxAmount, couponValid } = pricingSummary;

    const walletRequested = params.isCash ? 0 : Math.max(0, Number(rawPayload.walletAmountToUse ?? targetOrder.wallet_discount ?? 0));
    const { walletApplied, finalPayable } = calculateFinalPayable({
      totalBeforeWallet: totalAmount,
      orderFees,
      walletAmountToUse: walletRequested,
    });
    const finalOrderAmount = finalPayable;
    const walletDebit = Math.max(0, walletApplied);

    if (walletDebit > 0) {
      const preWalletLineTotals: Record<string, number> = {};
      for (const s of services) {
        preWalletLineTotals[s.serviceId] = computePass.breakdowns[s.serviceId]?.total_price || 0;
      }
      const totalWalletForLines = Math.min(walletDebit, totalAmount);
      const allocatedWallet = allocateWalletAcrossLines(preWalletLineTotals, totalWalletForLines);
      computePass = await computeServiceBreakdowns(supabaseAdmin, services, {
        date: dateStr,
        time: timeStr,
        pincode: addr.pincode,
        couponCode: couponCode || undefined,
        frozenOrderFees,
        offerAmountsByService: allocatedOffer,
        walletAmountsByService: allocatedWallet,
      });
    }

    const { breakdowns, titleMap, validatedCoupon } = computePass;

    // 4. Debit Wallet (if applicable) — FAIL CLOSED: never fulfill with an unpaid discount
    if (walletDebit > 0 && !params.isCash) {
      const { data: walletRes, error: walletError } = await supabaseAdmin.rpc("use_wallet_balance", {
        p_user_id: targetOrder.customer_id,
        p_amount: walletDebit,
        p_booking_id: targetOrder.id,
      });
      const isDuplicateDebit = !!walletError && walletError.message.includes("uq_wallet_tx_booking_discount");
      const debitOk = isDuplicateDebit || (!walletError && !!walletRes && (walletRes as { success?: boolean }).success === true);
      if (!debitOk) {
        const failReason = walletError?.message || (walletRes as { error?: string })?.error || "unknown wallet error";
        console.error("[orderFulfillment] Wallet debit failed — aborting fulfillment:", failReason);
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "pending", updated_at: new Date().toISOString() })
          .eq("id", targetOrder.id);
        return {
          success: false,
          error: "Wallet debit failed. No charge made to your wallet. Please retry or top up your wallet balance.",
        };
      }
      if (isDuplicateDebit) {
        console.log("[orderFulfillment] Wallet debit already recorded for this order (idempotent retry).");
      }
    }

    // 5. Redeem Offer Reservation (if applicable)
    if (offerContext) {
      const { data: applyRes, error: applyError } = await supabaseAdmin.rpc("apply_offer_redemption", {
        p_application_id: offerContext.applicationId,
        p_customer_id: targetOrder.customer_id,
        p_booking_id: null,
      });
      if (applyError || !(applyRes as { success?: boolean })?.success) {
        console.error("[orderFulfillment] Offer redemption error:", applyError);
      }
    }

    // 6. Create Gateway Payment Record
    if (!params.isCash) {
      await supabaseAdmin.from("payments").insert({
        customer_id: targetOrder.customer_id,
        order_id: targetOrder.id,
        amount: params.gatewayAmount ?? finalOrderAmount,
        payment_status: "completed",
        razorpay_order_id: params.razorpayOrderId ?? targetOrder.razorpay_order_id ?? null,
        razorpay_payment_id: params.razorpayPaymentId ?? null,
        razorpay_signature: params.razorpaySignature ?? null,
      });
    }

    // 7. Record Coupon Usage
    if (couponCode && validatedCoupon) {
      const couponCodeNormalized = normalizeCouponCode(couponCode);
      const { error: usageError } = await supabaseAdmin.from("coupon_usages").insert({
        coupon_id: validatedCoupon.id,
        customer_id: targetOrder.customer_id,
        order_id: targetOrder.id,
        discount_amount: snapshotDiscountAmount,
        coupon_code_snapshot: couponCodeNormalized,
        discount_type_snapshot: validatedCoupon.discount_type,
        used_at: new Date().toISOString(),
      });
      if (usageError) {
        console.warn("[orderFulfillment] Coupon usage record notice:", usageError.message);
      }
    }

    // 8. Determine Truthful Booking Payment Method
    let bookingPaymentMethod = "Razorpay";
    if (params.isCash) bookingPaymentMethod = "Cash";
    else if (params.isFree) bookingPaymentMethod = walletDebit > 0 ? "Wallet" : offerContext ? "Offer" : "Razorpay";
    else if (walletDebit > 0) bookingPaymentMethod = "Wallet + Razorpay";

    // 9. Pre-validate All Cart Services Before Inserting
    for (const item of services) {
      if (!breakdowns[item.serviceId]) {
        throw new Error(`Authoritative pricing breakdown missing for service ${item.serviceId}. Aborting fulfillment to prevent partial cart creation.`);
      }
    }

    // 10. Prepare Atomic Batch Payload
    let isFirstBooking = true;
    const preparedBookings = services.map((item) => {
      const breakdown = breakdowns[item.serviceId];
      const bookingSurcharges = [
        ...(breakdown.surcharges || []),
        ...(isFirstBooking && orderFees.length > 0 ? orderFees : []),
      ];

      let formAnswersList: Array<{ field_name: string; field_label: string; field_value: string }> = [];
      if (item.formAnswers) {
        try {
          const answers = typeof item.formAnswers === "string" ? JSON.parse(item.formAnswers) : item.formAnswers;
          if (answers && typeof answers === "object") {
            formAnswersList = Object.entries(answers as Record<string, unknown>).map(([name, value]) => ({
              field_name: name,
              field_label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              field_value: String(value),
            }));
          }
        } catch {
          // Ignore malformed answers
        }
      }

      const bookingRecord = {
        service_id: item.serviceId,
        status: "pending",
        total_amount: breakdown.total_price,
        city: addr.city,
        area: addr.area ?? null,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        payment_status: params.isCash ? "pending" : "paid",
        payment_method: bookingPaymentMethod,
        selected_duration_minutes: item.duration ?? null,
        base_price: breakdown.base_price,
        final_price: breakdown.total_price,
        wallet_discount_applied: breakdown.wallet_discount,
        business_name: rawPayload.businessName || null,
        business_gstin: rawPayload.businessGstin || null,
        meeting_location: item.meetingLocation || null,
        destination: item.destination || null,
        expected_bags: item.expectedBags ? parseInt(String(item.expectedBags), 10) : 0,
        latitude: addr.latitude && Number(addr.latitude) !== 0 ? addr.latitude : null,
        longitude: addr.longitude && Number(addr.longitude) !== 0 ? addr.longitude : null,
        status_remarks: params.source === "webhook" ? "Booking created via gateway webhook recovery" : "Booking created",
        event_actor: params.source === "webhook" ? "SYSTEM" : "USER",
        event_metadata: {
          customer_id: targetOrder.customer_id,
          service_id: item.serviceId,
          amount: breakdown.total_price,
          order_id: targetOrder.id,
          payment_verified: true,
          source: params.source,
        },
        pricing: {
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
        },
        form_answers: formAnswersList,
      };

      isFirstBooking = false;
      return bookingRecord;
    });

    const orderUpdates = {
      status: "confirmed",
      payment_status: params.isCash ? "pending" : "paid",
      final_amount: finalOrderAmount,
      wallet_discount: params.isCash ? 0 : walletDebit,
      offer_discount: offerContext?.appliedAmount ?? targetOrder.offer_discount ?? 0,
    };

    const offerContextParam = offerContext
      ? {
          entitlement_id: offerContext.entitlementId,
          application_id: offerContext.applicationId,
        }
      : null;

    // 11. Execute Atomic Transaction in PostgreSQL
    const { data: atomicData, error: atomicErr } = await supabaseAdmin.rpc("create_order_bookings_atomic", {
      p_order_id: targetOrder.id,
      p_bookings: preparedBookings,
      p_order_updates: orderUpdates,
      p_offer_context: offerContextParam,
    });

    if (atomicErr || !atomicData || !(atomicData as { success?: boolean }).success) {
      const errMsg = atomicErr?.message || (atomicData as { error?: string })?.error || "Atomic booking creation failed";
      throw new Error(errMsg);
    }

    const atomicResult = atomicData as {
      success: boolean;
      already_created?: boolean;
      booking_ids: string[];
      count: number;
    };

    // 12. Update Additional Order Metadata
    await supabaseAdmin
      .from("orders")
      .update({
        total_amount: finalOrderAmount,
        original_subtotal: snapshotOriginalSubtotal,
        tax_amount: snapshotTaxAmount,
        coupon_valid_at_creation: couponValid,
        order_fees: orderFees,
        offer_entitlement_id: offerContext?.entitlementId ?? targetOrder.offer_entitlement_id ?? null,
        razorpay_order_id: params.razorpayOrderId ?? targetOrder.razorpay_order_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetOrder.id);

    // 13. Trigger Dispatch & Customer/Admin Notifications for Created Bookings
    const createdBookingIds = atomicResult.booking_ids || [];
    for (let i = 0; i < services.length; i++) {
      const item = services[i];
      const bookingId = createdBookingIds[i];
      if (!bookingId) continue;

      const breakdown = breakdowns[item.serviceId];
      const title = titleMap[item.serviceId] || "Service";

      // Trigger partner auto-dispatch
      void triggerDispatchBatch(bookingId, 1);

      // Customer Notification
      void notifyCustomer(
        targetOrder.customer_id,
        params.isCash ? "Booking Confirmed!" : "Booking Confirmed & Paid!",
        params.isCash
          ? `Your booking for ${title} on ${dateStr} at ${timeStr} has been placed. Please keep ₹${breakdown.total_price.toLocaleString("en-IN")} ready in cash for your Professional.`
          : `Your booking for ${title} on ${dateStr} at ${timeStr} has been placed. We are matching a professional.`,
        "booking_created",
        { booking_id: bookingId, service_title: title }
      );

      // Admin Notification
      void notifyAdmins(
        "New Booking Placed",
        `A new booking for ${title} has been placed (${params.source === "webhook" ? "reconciled via Webhook recovery" : "direct checkout"}).`,
        "booking_created",
        { booking_id: bookingId }
      );
    }

    return {
      success: true,
      orderId: targetOrder.id,
      alreadyFulfilled: false,
      recovered: params.source === "webhook",
      createdBookingIds,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error("[orderFulfillment] Unhandled fulfillment error:", errorMsg);
    // Reset order payment_status to pending so retry or webhook can re-attempt
    await supabaseAdmin.from("orders").update({ payment_status: "pending" }).eq("id", targetOrder.id);
    void notifyAdmins(
      "CRITICAL: Order Fulfillment Failed",
      `Order ${targetOrder.id} failed atomic booking creation: ${errorMsg}`,
      "booking_cancelled",
      { order_id: targetOrder.id, error: errorMsg }
    );
    return { success: false, error: errorMsg };
  }
}
