"use server";

import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { calculateGstBreakdown } from "@/lib/pricing";

export interface QuoteItemInput {
  item_type: "material" | "labour";
  name: string;
  quantity: number;
  unit_price: number;
}

export interface RazorpayQuoteOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/**
 * Professional creates a detailed quotation for a booking.
 */
export async function createBookingQuoteAction(
  bookingId: string,
  items: QuoteItemInput[],
  taxRate: number = 18,
  discount: number = 0,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: Please sign in.");

  const adminSupabase = createAdminClient();

  // Verify booking exists, is assigned to this professional, and is in an active state
  const { data: booking, error: bookingErr } = await adminSupabase
    .from("bookings")
    .select("id, customer_id, partner_id, status")
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) throw new Error("Booking not found.");

  if (booking.partner_id !== user.id) {
    throw new Error("Unauthorized: You are not assigned to this booking.");
  }

  if (["cancelled", "completed"].includes(booking.status)) {
    throw new Error(`Cannot create a quotation for a closed booking in '${booking.status}' status.`);
  }

  // Calculate quote totals
  let subtotal = 0;
  const quoteItemRows = items.map((item) => {
    const total = Number(item.quantity) * Number(item.unit_price);
    subtotal += total;
    return {
      item_type: item.item_type,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: total,
    };
  });

  const gstBreakdown = calculateGstBreakdown({ subtotal, taxRatePercent: taxRate });
  const finalTotal = Math.max(0, gstBreakdown.totalWithGst - discount);

  // Insert quote record via privileged admin client
  const { data: quote, error: quoteErr } = await adminSupabase
    .from("booking_quotes")
    .insert({
      booking_id: bookingId,
      professional_id: user.id,
      customer_id: booking.customer_id,
      status: "pending_customer_approval",
      tax_rate: taxRate,
      discount: discount,
      total_amount: finalTotal,
      notes: notes || null,
      expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours expiry
    })
    .select("id")
    .single();

  if (quoteErr || !quote) {
    console.error("Quote creation error:", quoteErr);
    throw new Error(quoteErr?.message || "Failed to create quotation.");
  }

  // Insert quote items
  const itemsWithQuoteId = quoteItemRows.map((row) => ({
    ...row,
    quote_id: quote.id,
  }));
  const { error: itemsErr } = await adminSupabase
    .from("booking_quote_items")
    .insert(itemsWithQuoteId);

  if (itemsErr) {
    console.error("Quote items insertion error:", itemsErr);
    // clean up quote
    await adminSupabase.from("booking_quotes").delete().eq("id", quote.id);
    throw new Error("Failed to save quotation items.");
  }

  // Update booking status history & audit trail via privileged admin client
  await adminSupabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: booking.status,
    changed_by: user.id,
    remarks: `Quotation sent to customer: ₹${finalTotal}`,
  });

  await adminSupabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "QUOTE_CREATED",
    actor: "PARTNER",
    metadata: {
      quote_id: quote.id,
      total_amount: finalTotal,
      professional_id: user.id,
    },
  });

  revalidatePath(`/customer/bookings/${bookingId}/tracking`);
  revalidatePath(`/partner/jobs`);
  return { success: true, quoteId: quote.id };
}

/**
 * Customer responds (Approves / Declines) to a quote with Cash payment choice.
 */
export async function respondToQuoteAction(
  quoteId: string,
  approve: boolean,
  paymentMethod: "Cash" | "Online" = "Cash"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: Please sign in.");

  const adminSupabase = createAdminClient();

  // Fetch quote with joined booking
  const { data: quote, error: quoteFetchErr } = await adminSupabase
    .from("booking_quotes")
    .select("*, booking:booking_id(*)")
    .eq("id", quoteId)
    .single();

  if (quoteFetchErr || !quote || !quote.booking) {
    throw new Error("Quotation not found.");
  }

  const booking = quote.booking as {
    id: string;
    customer_id: string;
    partner_id: string;
    status: string;
    pricing_model?: string;
    total_amount: number;
    payment_status: string;
    payment_method: string;
  };

  // Ownership verification: user must be the customer of this booking
  if (quote.customer_id !== user.id && booking.customer_id !== user.id) {
    throw new Error("Forbidden: You are not authorized to respond to this quotation.");
  }

  // State verification: quotation must be pending approval
  if (quote.status !== "pending" && quote.status !== "pending_customer_approval") {
    throw new Error(`Quotation has already been ${quote.status}.`);
  }

  // Booking state verification: cannot approve quotes on terminal bookings
  if (["cancelled", "completed"].includes(booking.status)) {
    throw new Error(`Cannot respond to a quotation for a booking that is ${booking.status}.`);
  }

  const bookingId = quote.booking_id;
  const statusStr = approve ? "approved" : "declined";

  const quoteUpdatePayload: Record<string, unknown> = {
    status: statusStr,
    updated_at: new Date().toISOString(),
  };

  if (approve) {
    quoteUpdatePayload.payment_method = paymentMethod;
    quoteUpdatePayload.payment_status = "pending";
  }

  // Atomically update quote status to prevent double-processing race conditions
  const { data: updatedQuote, error: quoteUpdateErr } = await adminSupabase
    .from("booking_quotes")
    .update(quoteUpdatePayload)
    .eq("id", quoteId)
    .in("status", ["pending", "pending_customer_approval"])
    .select("id")
    .single();

  if (quoteUpdateErr || !updatedQuote) {
    throw new Error("Failed to update quotation response or quotation was already processed.");
  }

  // Auto-decline sibling quotations: only one quote may be approved per booking
  if (approve) {
    const { error: siblingDeclineErr } = await adminSupabase
      .from("booking_quotes")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .in("status", ["pending", "pending_customer_approval"])
      .neq("id", quoteId);
    if (siblingDeclineErr) {
      console.error("[respondToQuoteAction] Sibling quote decline failed:", siblingDeclineErr.message);
    }
  }

  // Log status history via privileged admin client
  await adminSupabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: booking.status,
    changed_by: user.id,
    remarks: `Customer ${statusStr} quotation of ₹${quote.total_amount} (${approve ? `Pay via ${paymentMethod}` : "Declined"})`,
  });

  // Log audit trail via privileged admin client
  await adminSupabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: approve ? "QUOTE_APPROVED" : "QUOTE_DECLINED",
    actor: "USER",
    metadata: {
      quote_id: quoteId,
      amount: quote.total_amount,
      customer_id: user.id,
      payment_method: paymentMethod,
    },
  });

  if (approve) {
    const isInitialInspection = booking.pricing_model === "inspection";
    const quoteAmt = Number(quote.total_amount);
    if (isNaN(quoteAmt) || quoteAmt < 0) {
      throw new Error("Invalid quotation amount.");
    }

    let newBookingTotal = quoteAmt;
    if (!isInitialInspection) {
      // Extra work: add to existing total
      newBookingTotal = Number(booking.total_amount) + quoteAmt;
    }

    const bookingUpdatePayload: Record<string, unknown> = {
      total_amount: newBookingTotal,
      final_price: newBookingTotal,
      unpaid_quote_amount: quoteAmt,
    };

    // If initial inspection, move status from arrived/otp_pending to in_progress
    if (isInitialInspection) {
      bookingUpdatePayload.status = "in_progress";
    }

    // If extra work approved on an already-paid booking, set payment_status to partially_paid
    if (!isInitialInspection && booking.payment_status === "paid") {
      bookingUpdatePayload.payment_status = "partially_paid";
    }

    const { error: bookingUpdateErr } = await adminSupabase
      .from("bookings")
      .update(bookingUpdatePayload)
      .eq("id", bookingId);

    if (bookingUpdateErr) {
      console.error("[respondToQuoteAction] Failed to update booking totals:", bookingUpdateErr);
      throw new Error("Failed to update booking totals.");
    }

    // Update authoritative booking_pricing breakdown
    const { data: pricing } = await adminSupabase
      .from("booking_pricing")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (pricing) {
      if (isInitialInspection) {
        await adminSupabase
          .from("booking_pricing")
          .update({
            base_price: quoteAmt,
            gst_amount: Math.round(quoteAmt * (Number(quote.tax_rate || 18) / 100)),
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      } else {
        const currentSurcharges = Array.isArray(pricing.surcharges) ? pricing.surcharges : [];
        const updatedSurcharges = [
          ...currentSurcharges,
          {
            name: `Approved Extra Work: ${quote.notes || "Additional charges"}`,
            amount: quoteAmt,
          },
        ];

        await adminSupabase
          .from("booking_pricing")
          .update({
            surcharges: updatedSurcharges,
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      }
    }
  }

  revalidatePath(`/customer/bookings/${bookingId}/tracking`);
  revalidatePath(`/partner/jobs`);
  return { success: true };
}

/**
 * Creates a Razorpay Order for online payment of an approved or pending quotation.
 */
export async function createRazorpayOrderForQuoteAction(
  quoteId: string
): Promise<RazorpayQuoteOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: Please sign in.");

  const adminSupabase = createAdminClient();

  const { data: quote, error: quoteErr } = await adminSupabase
    .from("booking_quotes")
    .select("*, booking:booking_id(*)")
    .eq("id", quoteId)
    .single();

  if (quoteErr || !quote || !quote.booking) {
    throw new Error("Quotation not found.");
  }

  const booking = quote.booking as {
    id: string;
    customer_id: string;
    status: string;
  };

  if (quote.customer_id !== user.id && booking.customer_id !== user.id) {
    throw new Error("Unauthorized: You do not own this booking.");
  }

  if (quote.status !== "pending" && quote.status !== "pending_customer_approval") {
    throw new Error(`Quotation has already been ${quote.status}.`);
  }

  if (["cancelled", "completed"].includes(booking.status)) {
    throw new Error(`Cannot pay for quotation on a ${booking.status} booking.`);
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  const amountPaise = Math.round(Number(quote.total_amount) * 100);
  if (amountPaise <= 0) {
    throw new Error("Invalid quotation amount.");
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const razorpayResp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: `rcpt_quote_${quote.id.slice(0, 8)}_${Date.now()}`,
    }),
  });

  if (!razorpayResp.ok) {
    const errText = await razorpayResp.text();
    console.error("[quotes] Razorpay order creation failed:", errText);
    throw new Error(`Failed to initialize payment gateway order: ${errText}`);
  }

  const razorpayOrder = await razorpayResp.json();

  // Save the order ID on the quote
  await adminSupabase
    .from("booking_quotes")
    .update({ razorpay_order_id: razorpayOrder.id })
    .eq("id", quote.id);

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: keyId,
  };
}

/**
 * Verifies Razorpay signature and finalizes online quote approval.
 */
export async function verifyQuotePaymentAction(payload: {
  quoteId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized: Please sign in." };

    const adminSupabase = createAdminClient();

    // 1. Fetch quote with booking
    const { data: quote, error: quoteErr } = await adminSupabase
      .from("booking_quotes")
      .select("*, booking:booking_id(*)")
      .eq("id", payload.quoteId)
      .single();

    if (quoteErr || !quote || !quote.booking) {
      return { success: false, error: "Quotation not found." };
    }

    const booking = quote.booking as {
      id: string;
      customer_id: string;
      partner_id: string;
      status: string;
      pricing_model?: string;
      total_amount: number;
      payment_status: string;
      payment_method: string;
    };

    if (quote.customer_id !== user.id && booking.customer_id !== user.id) {
      return { success: false, error: "Forbidden: You are not authorized." };
    }

    if (quote.status !== "pending" && quote.status !== "pending_customer_approval") {
      return { success: false, error: `Quotation has already been ${quote.status}.` };
    }

    // 2. Verify signature
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) return { success: false, error: "Razorpay credentials missing on server." };

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== payload.razorpay_signature) {
      console.error("[quotes] Invalid signature detected.");
      return { success: false, error: "Payment verification failed (signature mismatch)." };
    }

    const now = new Date().toISOString();
    const bookingId = quote.booking_id;
    const isInitialInspection = booking.pricing_model === "inspection";
    const quoteAmt = Number(quote.total_amount);

    // 2a. Order-bound check: the payment must have been created for THIS quotation
    if (quote.razorpay_order_id && payload.razorpay_order_id !== quote.razorpay_order_id) {
      console.error("[quotes] Payment order id mismatch — possible replay attempt.", {
        expected: quote.razorpay_order_id,
        received: payload.razorpay_order_id,
      });
      return { success: false, error: "Payment does not belong to this quotation." };
    }

    // 2b. Amount-bound check: fetch the authoritative gateway order and compare
    const rzAuthHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzOrderResponse = await fetch(`https://api.razorpay.com/v1/orders/${payload.razorpay_order_id}`, {
      headers: { Authorization: rzAuthHeader },
    });
    if (!rzOrderResponse.ok) {
      const errBody = await rzOrderResponse.text();
      console.error("[quotes] Failed to fetch Razorpay order:", errBody);
      return { success: false, error: "Unable to verify payment amount with gateway." };
    }
    const rzOrderData = (await rzOrderResponse.json()) as { amount?: number };
    const rzQuotedAmount = (rzOrderData.amount || 0) / 100;
    if (isNaN(quoteAmt) || Math.abs(rzQuotedAmount - quoteAmt) > 1) {
      console.error("[quotes] Quote payment amount mismatch:", { rzQuotedAmount, quoteAmt });
      return { success: false, error: "Paid amount does not match this quotation." };
    }

    let newBookingTotal = quoteAmt;
    if (!isInitialInspection) {
      newBookingTotal = Number(booking.total_amount) + quoteAmt;
    }

    // 3. Update quote record to approved & paid
    const { error: quoteUpdateErr } = await adminSupabase
      .from("booking_quotes")
      .update({
        status: "approved",
        payment_method: "Online",
        payment_status: "paid",
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        paid_at: now,
        updated_at: now,
      })
      .eq("id", payload.quoteId);

    if (quoteUpdateErr) {
      console.error("[verifyQuotePaymentAction] Failed to update quote:", quoteUpdateErr);
      return { success: false, error: "Failed to update quotation status." };
    }

    // Auto-decline sibling quotations: only one quote may be approved per booking
    await adminSupabase
      .from("booking_quotes")
      .update({ status: "declined", updated_at: now })
      .eq("booking_id", bookingId)
      .in("status", ["pending", "pending_customer_approval"])
      .neq("id", payload.quoteId);

    // 4. Update booking
    const bookingUpdatePayload: Record<string, unknown> = {
      total_amount: newBookingTotal,
      final_price: newBookingTotal,
      unpaid_quote_amount: 0,
      payment_status: "paid",
    };

    if (isInitialInspection) {
      bookingUpdatePayload.status = "in_progress";
    }

    await adminSupabase
      .from("bookings")
      .update(bookingUpdatePayload)
      .eq("id", bookingId);

    // 5. Update booking_pricing
    const { data: pricing } = await adminSupabase
      .from("booking_pricing")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (pricing) {
      if (isInitialInspection) {
        await adminSupabase
          .from("booking_pricing")
          .update({
            base_price: quoteAmt,
            gst_amount: Math.round(quoteAmt * (Number(quote.tax_rate || 18) / 100)),
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      } else {
        const currentSurcharges = Array.isArray(pricing.surcharges) ? pricing.surcharges : [];
        const updatedSurcharges = [
          ...currentSurcharges,
          {
            name: `Approved Extra Work: ${quote.notes || "Additional charges"}`,
            amount: quoteAmt,
          },
        ];
        await adminSupabase
          .from("booking_pricing")
          .update({
            surcharges: updatedSurcharges,
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      }
    }

    // 6. Log history & audit trail
    await adminSupabase.from("booking_status_history").insert({
      booking_id: bookingId,
      status: isInitialInspection ? "in_progress" : booking.status,
      changed_by: user.id,
      remarks: `Customer paid and approved quotation of ₹${quoteAmt} online (Payment Ref: ${payload.razorpay_payment_id})`,
    });

    await adminSupabase.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "QUOTE_PAID_ONLINE",
      actor: "USER",
      metadata: {
        quote_id: payload.quoteId,
        amount: quoteAmt,
        payment_id: payload.razorpay_payment_id,
        order_id: payload.razorpay_order_id,
      },
    });

    revalidatePath(`/customer/bookings/${bookingId}/tracking`);
    revalidatePath(`/partner/jobs`);
    return { success: true };
  } catch (err) {
    console.error("[verifyQuotePaymentAction] Unexpected error:", err);
    return { success: false, error: (err as Error).message || "Payment verification failed." };
  }
}
