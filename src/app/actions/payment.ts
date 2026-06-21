"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { notifyCustomer } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";

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
 * Creates a Razorpay Order server-side after calculating prices.
 */
export async function createRazorpayOrderAction(payload: {
  serviceId?: string;
  serviceIds?: string[];
  addressId: string;
  date: string;
  time: string;
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

  // Calculate Subtotal
  let subtotal = 0;
  if (payload.serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("base_price")
      .eq("id", payload.serviceId)
      .single();
    if (!service) throw new Error("Service not found");
    subtotal = Number(service.base_price);
  } else if (payload.serviceIds && payload.serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("base_price")
      .in("id", payload.serviceIds);
    if (!services || services.length === 0) throw new Error("Services not found");
    subtotal = services.reduce((sum, s) => sum + Number(s.base_price), 0);
  } else {
    throw new Error("No services specified");
  }

  // Fetch platform settings for taxes & referral rewards
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["tax_rate", "referral_reward_referred"]);
  
  const settingsMap = (settings || []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = typeof row.value === "string" ? row.value : String(row.value);
    return acc;
  }, {});

  let taxRatePercent = 18;
  const rawTax = settingsMap["tax_rate"]?.replace(/%/g, "").trim();
  const parsed = parseFloat(rawTax || "18");
  if (!isNaN(parsed)) taxRatePercent = parsed;

  let referralDiscount = 0;
  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();
  if (profile?.referred_by) {
    const { count: completedCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("customer_id", user.id)
      .eq("status", "completed");
    if ((completedCount ?? 0) === 0) {
      const rawDiscount = parseFloat(settingsMap["referral_reward_referred"] || "50");
      if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscount = rawDiscount;
    }
  }

  const gstTax = Math.round(subtotal * (taxRatePercent / 100));
  const totalPrice = Math.max(0, subtotal + gstTax - referralDiscount);

  if (totalPrice <= 0) {
    return { freeOrder: true, amount: 0, currency: "INR" };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    console.error("[Razorpay] Missing API credentials in environment.");
    throw new Error(`Razorpay API credentials are not configured on the server. (NEXT_PUBLIC_RAZORPAY_KEY_ID configured: ${!!keyId}, RAZORPAY_KEY_SECRET configured: ${!!keySecret})`);
  }

  // Create order via Razorpay API
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const razorpayResp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: totalPrice * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    }),
  });

  if (!razorpayResp.ok) {
    const errText = await razorpayResp.text();
    console.error("[Razorpay] Order creation failed:", errText);
    throw new Error(`Failed to initialize payment gateway order: ${errText}`);
  }

  const razorpayOrder = await razorpayResp.json();
  return {
    freeOrder: false,
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
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
  addressId: string;
  date: string;
  time: string;
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
        error: `Payment verification failed (signature mismatch). Please check that your API keys are correct.`,
      };
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

  // 3. Fetch settings for price checks
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["tax_rate", "referral_reward_referred"]);
  
  const settingsMap = (settings || []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = typeof row.value === "string" ? row.value : String(row.value);
    return acc;
  }, {});

  let taxRatePercent = 18;
  const rawTax = settingsMap["tax_rate"]?.replace(/%/g, "").trim();
  const parsed = parseFloat(rawTax || "18");
  if (!isNaN(parsed)) taxRatePercent = parsed;

  let referralDiscount = 0;
  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();
  if (profile?.referred_by) {
    const { count: completedCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("customer_id", user.id)
      .eq("status", "completed");
    if ((completedCount ?? 0) === 0) {
      const rawDiscount = parseFloat(settingsMap["referral_reward_referred"] || "50");
      if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscount = rawDiscount;
    }
  }

  // Parse time and date in IST (UTC+05:30) to prevent server/client timezone discrepancies
  const [timeStr, modifier] = payload.time.split(' ');
  let [hours, minutes] = timeStr.split(':').map(Number);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  const isoStr = `${payload.date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+05:30`;
  const timestamp = new Date(isoStr);

  // 4. Create Database Records
  if (payload.serviceId) {
    // Single service booking
    const { data: service } = await supabase
      .from("services")
      .select("id, title, base_price")
      .eq("id", payload.serviceId)
      .single();
    if (!service) return { success: false, error: "Service not found." };

    const basePrice = Number(service.base_price);
    const gstTax = Math.round(basePrice * (taxRatePercent / 100));
    const totalPrice = Math.max(0, basePrice + gstTax - referralDiscount);

    // Create booking (payment_status: paid, status: pending)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: service.id,
        customer_id: user.id,
        status: "pending",
        total_amount: totalPrice,
        city: addr.city,
        area: typedAddr.area ?? null,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        wallet_discount_applied: referralDiscount,
        payment_status: "paid",
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[payment] Booking creation failed:", bookingError);
      return { success: false, error: "Failed to save booking." };
    }

    // Record Payment
    await supabase.from("payments").insert({
      customer_id: user.id,
      booking_id: booking.id,
      amount: totalPrice,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id ?? null,
      razorpay_payment_id: payload.razorpay_payment_id ?? null,
      razorpay_signature: payload.razorpay_signature ?? null,
    });

    // Log event
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "BOOKING_CREATED",
      actor: "USER",
      metadata: {
        customer_id: user.id,
        service_id: service.id,
        amount: totalPrice,
        payment_verified: true,
      },
    });

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

    return { success: true, bookingId: booking.id };
  } else if (payload.serviceIds && payload.serviceIds.length > 0) {
    // Multi-service Cart Checkout
    const { data: dbServices } = await supabase
      .from("services")
      .select("id, title, base_price")
      .in("id", payload.serviceIds);

    if (!dbServices || dbServices.length === 0) {
      return { success: false, error: "Services not found." };
    }

    const subtotal = dbServices.reduce((sum, s) => sum + Number(s.base_price), 0);
    const totalTax = Math.round(subtotal * (taxRatePercent / 100));
    const totalOrderAmount = Math.max(0, subtotal + totalTax - referralDiscount);

    // Create Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        status: "pending",
        total_amount: totalOrderAmount,
        city: addr.city,
        area: typedAddr.area ?? null,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        item_count: dbServices.length,
        payment_status: "paid",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[payment] Order creation failed:", orderError);
      return { success: false, error: "Failed to create order." };
    }

    // Record Payment
    await supabase.from("payments").insert({
      customer_id: user.id,
      order_id: order.id,
      amount: totalOrderAmount,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id ?? null,
      razorpay_payment_id: payload.razorpay_payment_id ?? null,
      razorpay_signature: payload.razorpay_signature ?? null,
    });

    const discountPerItem = Math.round((referralDiscount / dbServices.length) * 100) / 100;

    for (const service of dbServices) {
      const basePrice = Number(service.base_price);
      const gstTax = Math.round(basePrice * (taxRatePercent / 100));
      const bookingPrice = Math.max(0, basePrice + gstTax - discountPerItem);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          service_id: service.id,
          customer_id: user.id,
          order_id: order.id,
          status: "pending",
          total_amount: bookingPrice,
          city: addr.city,
          area: typedAddr.area ?? null,
          address: addr.formatted_address,
          pincode: addr.pincode,
          scheduled_date: timestamp.toISOString(),
          wallet_discount_applied: discountPerItem,
          payment_status: "paid",
        })
        .select("id")
        .single();

      if (bookingError || !booking) continue;

      // Log event
      await supabase.from("booking_events").insert({
        booking_id: booking.id,
        event_type: "BOOKING_CREATED",
        actor: "USER",
        metadata: {
          customer_id: user.id,
          service_id: service.id,
          amount: bookingPrice,
          order_id: order.id,
          payment_verified: true,
        },
      });

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
    }

    return { success: true, orderId: order.id };
  }

  return { success: false, error: "Invalid payment payload." };
}
