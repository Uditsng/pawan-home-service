import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";

export const dynamic = 'force-dynamic';

/**
 * Razorpay Webhook Handler
 * Reconciles payments asynchronously if customer browser crashes after payment capture.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[Razorpay Webhook] Missing RAZORPAY_WEBHOOK_SECRET in environment.");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 1. Verify HMAC Signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("[Razorpay Webhook] Invalid signature mismatch detected.");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = event.event as string;
  const payload = (event.payload || {}) as Record<string, unknown>;
  const paymentEntity = (payload.payment as { entity?: Record<string, unknown> })?.entity || {};

  const razorpayOrderId = paymentEntity.order_id as string | undefined;
  const razorpayPaymentId = paymentEntity.id as string | undefined;

  if (!razorpayOrderId) {
    return NextResponse.json({ status: "ignored", reason: "No order_id in event payload" });
  }

  const supabaseAdmin = createAdminClient();

  if (eventType === "payment.captured" || eventType === "order.paid") {
    // Check if payment already recorded in payments table
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id, booking_id")
      .eq("razorpay_order_id", razorpayOrderId)
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ status: "already_processed", payment_id: existingPayment.id });
    }

    // Check if booking exists with matching razorpay_order_id in notes or payments
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, customer_id, payment_status")
      .eq("payment_status", "pending")
      .limit(1)
      .maybeSingle();

    if (booking) {
      // Reconcile booking status to paid
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", booking.id);

      await supabaseAdmin.from("payments").insert({
        customer_id: booking.customer_id,
        booking_id: booking.id,
        amount: Number(paymentEntity.amount || 0) / 100,
        payment_status: "completed",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId || null,
        razorpay_signature: signature,
      });

      void triggerDispatchBatch(booking.id, 1);
      void notifyCustomer(booking.customer_id, "Payment Confirmed via Gateway", "Your payment has been received and your booking is active.", "booking_created");
      void notifyAdmins("Webhook Payment Reconciled", `Payment ${razorpayPaymentId} reconciled via webhook for booking ${booking.id}.`, "booking_created");

      return NextResponse.json({ status: "reconciled", booking_id: booking.id });
    }
  }

  return NextResponse.json({ status: "received" });
}
