"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { notifyCustomer, notifyPartner, notifyAdmins } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// ─── Interfaces ──────────────────────────────────────────────

export interface RazorpayExtensionOrderResult {
  orderId?: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface ExtensionVerificationResult {
  success: boolean;
  error?: string;
}

// ─── Helper: Get authenticated user or throw ──────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

// ─── Helper: Log a booking event ─────────────────────────────

async function logBookingEvent(
  supabase: any,
  bookingId: string,
  eventType: string,
  actor: "USER" | "PARTNER" | "SYSTEM",
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: eventType,
    actor,
    metadata,
  });
}

// ─── REQUEST MORE TIME (PARTNER) ──────────────────────────────

export async function requestExtensionAction(
  bookingId: string,
  durationMinutes: number
): Promise<{ success: boolean; error?: string; extensionId?: string }> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Verify booking details
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, partner_id, service_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.partner_id !== user.id) {
      return { success: false, error: "Unauthorized: This job is not assigned to you." };
    }

    if (booking.status !== "in_progress") {
      return { success: false, error: "Cannot request extension unless service is in progress." };
    }

    // Lookup service duration pricing
    const { data: pricing, error: pricingErr } = await supabase
      .from("service_duration_pricing")
      .select("price")
      .eq("service_id", booking.service_id)
      .eq("duration_minutes", durationMinutes)
      .single();

    if (pricingErr || !pricing) {
      return {
        success: false,
        error: `Duration options of ${durationMinutes} minutes is not configured for this service.`,
      };
    }

    const price = Number(pricing.price);

    // Cancel any existing pending extension requests
    await supabase
      .from("booking_extensions")
      .update({ status: "rejected" })
      .eq("booking_id", bookingId)
      .eq("status", "requested");

    // Insert new extension request
    const { data: extension, error: insertErr } = await supabase
      .from("booking_extensions")
      .insert({
        booking_id: bookingId,
        requested_by_partner_id: user.id,
        additional_minutes: durationMinutes,
        additional_amount: price,
        status: "requested",
      })
      .select("id")
      .single();

    if (insertErr || !extension) {
      console.error("[extensions] Insert failed:", insertErr);
      return { success: false, error: "Failed to submit extension request." };
    }

    // Log event & audit
    await logBookingEvent(supabase, bookingId, "EXTENSION_REQUESTED", "PARTNER", {
      extension_id: extension.id,
      additional_minutes: durationMinutes,
      additional_amount: price,
    });

    await supabase.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "EXTENSION_REQUESTED",
      actor: "PARTNER",
      metadata: {
        extension_id: extension.id,
        additional_minutes: durationMinutes,
        additional_amount: price,
      },
    });

    // Notifications
    const durationLabel = durationMinutes >= 60 ? `${durationMinutes / 60} Hour${durationMinutes === 60 ? "" : "s"}` : `${durationMinutes} Mins`;
    
    // Notify Customer
    const { data: bookingDetails } = await supabase
      .from("bookings")
      .select("customer_id")
      .eq("id", bookingId)
      .single();

    if (bookingDetails?.customer_id) {
      void notifyCustomer(
        bookingDetails.customer_id,
        "Time Extension Requested",
        `Your professional has requested a +${durationLabel} extension (Charge: ₹${price}). Please approve and pay inside the app.`,
        "extension_requested",
        { booking_id: bookingId, extension_id: extension.id }
      );
    }

    // Notify Admin
    void notifyAdmins(
      "Extension Requested",
      `Professional requested +${durationLabel} extension (₹${price}) for Booking #${bookingId.substring(0, 8).toUpperCase()}`,
      "extension_requested",
      { booking_id: bookingId, extension_id: extension.id }
    );

    revalidatePath("/partner", "layout");
    revalidatePath("/customer/bookings/[id]/tracking", "page");
    return { success: true, extensionId: extension.id };
  } catch (err: any) {
    console.error("[extensions] request extension error:", err.message);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

// ─── REJECT EXTENSION (CUSTOMER / ADMIN) ──────────────────────

export async function rejectExtensionAction(
  extensionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Fetch extension & booking info
    const { data: ext, error: extErr } = await supabase
      .from("booking_extensions")
      .select("*, bookings(customer_id, partner_id)")
      .eq("id", extensionId)
      .single();

    if (extErr || !ext) {
      return { success: false, error: "Extension request not found." };
    }

    // Verify role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isCustomer = ext.bookings?.customer_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isCustomer && !isAdmin) {
      return { success: false, error: "Unauthorized." };
    }

    // Update status to rejected
    const { error: updateErr } = await supabase
      .from("booking_extensions")
      .update({ status: "rejected" })
      .eq("id", extensionId);

    if (updateErr) {
      return { success: false, error: "Failed to reject extension." };
    }

    // Log events
    await logBookingEvent(supabase, ext.booking_id, "EXTENSION_REJECTED", isCustomer ? "USER" : "SYSTEM", {
      extension_id: extensionId,
      rejected_by: user.id,
    });

    await supabase.from("booking_audit_trail").insert({
      booking_id: ext.booking_id,
      action: "EXTENSION_REJECTED",
      actor: isCustomer ? "USER" : "SYSTEM",
      metadata: { extension_id: extensionId, rejected_by: user.id },
    });

    // Notify Partner
    if (ext.bookings?.partner_id) {
      void notifyPartner(
        ext.bookings.partner_id,
        "Extension Request Rejected",
        "The customer rejected your request for additional time. Booked duration completed. Please conclude the service.",
        "extension_rejected",
        { booking_id: ext.booking_id }
      );
    }

    revalidatePath("/partner", "layout");
    revalidatePath("/customer/bookings/[id]/tracking", "page");
    return { success: true };
  } catch (err: any) {
    console.error("[extensions] reject extension error:", err.message);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

// ─── CREATE RAZORPAY ORDER FOR EXTENSION (CUSTOMER) ───────────

export async function createRazorpayOrderForExtensionAction(
  extensionId: string
): Promise<RazorpayExtensionOrderResult> {
  const { supabase, user } = await getAuthenticatedUser();

  // Fetch extension info
  const { data: ext, error: extErr } = await supabase
    .from("booking_extensions")
    .select("*, bookings(customer_id)")
    .eq("id", extensionId)
    .single();

  if (extErr || !ext) throw new Error("Extension request not found.");

  if (ext.bookings?.customer_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (ext.status !== "requested" && ext.status !== "payment_pending") {
    throw new Error("Invalid extension request status.");
  }

  // Update extension to payment_pending
  await supabase
    .from("booking_extensions")
    .update({ status: "payment_pending" })
    .eq("id", extensionId);

  // Notify Admins about payment pending
  void notifyAdmins(
    "Extension Payment Pending",
    `Extension payment pending (₹${ext.additional_amount}) for Booking #${ext.booking_id.substring(0, 8).toUpperCase()}`,
    "extension_payment_pending",
    { booking_id: ext.booking_id, extension_id: extensionId }
  );

  const amount = Number(ext.additional_amount);
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const razorpayResp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `rcpt_ext_${Date.now()}`,
    }),
  });

  if (!razorpayResp.ok) {
    const errText = await razorpayResp.text();
    console.error("[extensions] Razorpay order creation failed:", errText);
    throw new Error(`Failed to initialize payment gateway order: ${errText}`);
  }

  const razorpayOrder = await razorpayResp.json();
  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: keyId,
  };
}

// ─── VERIFY EXTENSION PAYMENT (CUSTOMER) ──────────────────────

export async function verifyExtensionPaymentAction(payload: {
  extensionId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<ExtensionVerificationResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // 1. Fetch extension
    const { data: ext, error: extErr } = await supabase
      .from("booking_extensions")
      .select("*, bookings(*)")
      .eq("id", payload.extensionId)
      .single();

    if (extErr || !ext) {
      return { success: false, error: "Extension not found." };
    }

    if (ext.bookings?.customer_id !== user.id) {
      return { success: false, error: "Unauthorized." };
    }

    // 2. Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) return { success: false, error: "Razorpay credentials missing on server." };

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== payload.razorpay_signature) {
      console.error("[extensions] Invalid signature detected.");
      return { success: false, error: "Payment verification failed (signature mismatch)." };
    }

    const now = new Date().toISOString();

    // 3. Update database records inside a transaction-like sequence
    // A. Update extension record
    const { error: extUpdateErr } = await supabase
      .from("booking_extensions")
      .update({
        status: "active",
        approved_at: now,
        paid_at: now,
      })
      .eq("id", payload.extensionId);

    if (extUpdateErr) {
      console.error("[extensions] Extension status update failed:", extUpdateErr);
      return { success: false, error: "Failed to activate extension status." };
    }

    // B. Update booking duration & pricing
    const currentDuration = Number(ext.bookings.selected_duration_minutes || 0);
    const newDuration = currentDuration + Number(ext.additional_minutes);
    const originalPrice = Number(ext.bookings.total_amount || 0);
    const additionalAmount = Number(ext.additional_amount);
    const newPrice = originalPrice + additionalAmount;

    // Reset notified flags so that they trigger again for the newly extended time limit
    const { error: bookingUpdateErr } = await supabase
      .from("bookings")
      .update({
        selected_duration_minutes: newDuration,
        total_amount: newPrice,
        final_price: newPrice,
        notified_30m_remaining: false,
        notified_time_completed: false,
      })
      .eq("id", ext.booking_id);

    if (bookingUpdateErr) {
      console.error("[extensions] Booking update failed:", bookingUpdateErr);
      return { success: false, error: "Failed to apply extension to booking." };
    }

    // C. Record Payment
    await supabase.from("payments").insert({
      customer_id: user.id,
      booking_id: ext.booking_id,
      amount: additionalAmount,
      payment_status: "completed",
      razorpay_order_id: payload.razorpay_order_id,
      razorpay_payment_id: payload.razorpay_payment_id,
      razorpay_signature: payload.razorpay_signature,
    });

    // D. Log events
    await logBookingEvent(supabase, ext.booking_id, "EXTENSION_PAID", "USER", {
      extension_id: payload.extensionId,
      amount: additionalAmount,
    });

    await logBookingEvent(supabase, ext.booking_id, "EXTENSION_ACTIVATED", "SYSTEM", {
      extension_id: payload.extensionId,
      new_duration: newDuration,
    });

    await supabase.from("booking_audit_trail").insert({
      booking_id: ext.booking_id,
      action: "EXTENSION_ACTIVATED",
      actor: "SYSTEM",
      metadata: {
        extension_id: payload.extensionId,
        new_duration: newDuration,
        amount: additionalAmount,
      },
    });

    // 4. Send notifications
    const durationLabel = ext.additional_minutes >= 60 
      ? `${ext.additional_minutes / 60} Hour${ext.additional_minutes === 60 ? "" : "s"}` 
      : `${ext.additional_minutes} Mins`;

    // Customer
    void notifyCustomer(
      user.id,
      "Extension Activated",
      `Your service has been extended by +${durationLabel}. Thank you for the payment!`,
      "extension_activated",
      { booking_id: ext.booking_id, extension_id: payload.extensionId }
    );

    // Partner
    if (ext.bookings.partner_id) {
      void notifyPartner(
        ext.bookings.partner_id,
        "Extension Approved & Paid",
        `Customer paid for the +${durationLabel} extension. Your timer has been extended!`,
        "extension_approved",
        { booking_id: ext.booking_id, extension_id: payload.extensionId }
      );
    }

    // Admin
    void notifyAdmins(
      "Extension Completed",
      `Extension payment verified and activated for Booking #${ext.booking_id.substring(0, 8).toUpperCase()}`,
      "general",
      { booking_id: ext.booking_id, extension_id: payload.extensionId }
    );

    revalidatePath("/partner", "layout");
    revalidatePath("/customer/bookings/[id]/tracking", "page");
    return { success: true };
  } catch (err: any) {
    console.error("[extensions] verify extension payment error:", err.message);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

// ─── NOTIFY TIME STATUS (TIMER CHECKS) ────────────────────────

export async function notifyTimeStatusAction(
  bookingId: string,
  type: "30m" | "expired"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, services(title)")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: "Booking not found." };
    }

    const svcTitle = booking.services?.title ?? "your hourly service";

    if (type === "30m") {
      if (booking.notified_30m_remaining) return { success: true };

      // Update flag
      await supabase
        .from("bookings")
        .update({ notified_30m_remaining: true })
        .eq("id", bookingId);

      // Notify customer
      void notifyCustomer(
        booking.customer_id,
        "30 Minutes Remaining",
        `Only 30 minutes are remaining in your ${svcTitle} booking. Please check with your professional if they need an extension.`,
        "time_remaining_30m",
        { booking_id: bookingId }
      );
    } else if (type === "expired") {
      if (booking.notified_time_completed) return { success: true };

      // Update flag
      await supabase
        .from("bookings")
        .update({ notified_time_completed: true })
        .eq("id", bookingId);

      // Notify customer
      void notifyCustomer(
        booking.customer_id,
        "Booked Time Completed",
        `The booked time for your ${svcTitle} has completed.`,
        "time_completed",
        { booking_id: bookingId }
      );

      // Notify partner
      if (booking.partner_id) {
        void notifyPartner(
          booking.partner_id,
          "Booked Time Completed",
          "Your booked time has completed. Work may continue only after extension approval.",
          "time_completed",
          { booking_id: bookingId }
        );
      }
    }

    revalidatePath("/customer/bookings/[id]/tracking", "page");
    revalidatePath("/partner", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
