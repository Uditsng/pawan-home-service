import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyCustomer, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";

export const dynamic = 'force-dynamic';

interface BookingChildRow {
  id: string;
  customer_id: string;
  payment_status: string;
  status: string;
}

/**
 * Razorpay Webhook Handler
 * Reconciles payments asynchronously if customer browser crashes after payment capture.
 * Protected by HMAC SHA256 signature verification and atomic database event claiming.
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
  } catch {
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

  const eventType = (event.event as string) || "unknown";
  const payload = (event.payload || {}) as Record<string, unknown>;
  const paymentEntity = (payload.payment as { entity?: Record<string, unknown> })?.entity || {};

  const razorpayOrderId = paymentEntity.order_id as string | undefined;
  const razorpayPaymentId = paymentEntity.id as string | undefined;
  const eventId = (event.account_id ? `${event.account_id}_${razorpayPaymentId || razorpayOrderId}_${eventType}` : null)
    || (razorpayPaymentId ? `${razorpayPaymentId}_${eventType}` : null)
    || `${razorpayOrderId}_${eventType}_${Date.now()}`;

  if (!razorpayOrderId && !razorpayPaymentId) {
    return NextResponse.json({ status: "ignored", reason: "No order_id or payment_id in payload" });
  }

  const supabaseAdmin = createAdminClient();

  // 2. Atomic Event Claim
  const { data: claimResult, error: claimError } = await supabaseAdmin.rpc("claim_payment_webhook_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_razorpay_order_id: razorpayOrderId || null,
    p_razorpay_payment_id: razorpayPaymentId || null,
    p_payload: event,
    p_stale_timeout_sec: 300,
  });

  if (claimError) {
    console.error("[Razorpay Webhook] Event claim error:", claimError.message);
    return NextResponse.json({ error: "Event claim failed" }, { status: 500 });
  }

  const claim = claimResult as { claimed: boolean; event_record_id?: string; reason?: string };

  if (!claim || !claim.claimed) {
    // Another concurrent request or previous worker already claimed/processed this event
    return NextResponse.json({ status: "already_claimed", reason: claim?.reason || "duplicate_event" });
  }

  const eventRecordId = claim.event_record_id;

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      // ── Wallet recharge path ──────────────────────────────────────
      // If this Razorpay order belongs to a wallet top-up, credit the
      // customer's CASH balance via the atomic service-role RPC. Booking
      // reconciliation below is deliberately untouched.
      if (razorpayOrderId) {
        const { data: recharge } = await supabaseAdmin
          .from("wallet_recharges")
          .select("id, user_id, amount, status")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (recharge) {
          const captured = Number(paymentEntity.amount || 0) / 100;
          const { data: rzResult } = await supabaseAdmin.rpc(
            "complete_wallet_recharge",
            {
              p_recharge_id: recharge.id,
              p_razorpay_order_id: razorpayOrderId,
              p_payment_id: razorpayPaymentId,
              p_signature: signature,
              p_gateway_verified_amount: captured,
              p_method: (paymentEntity.method as string | undefined) ?? null,
            }
          );

          const rz = (rzResult ?? {}) as {
            success?: boolean;
            already_credited?: boolean;
            error?: string;
            credited?: number;
          };

          if (rz.success && !rz.already_credited) {
            void notifyCustomer(
              recharge.user_id,
              "Wallet Recharged",
              `₹${Number(rz.credited ?? recharge.amount).toLocaleString("en-IN")} has been added to your wallet.`,
              "wallet_recharge",
              { recharge_id: recharge.id }
            );
          }

          if (eventRecordId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({
                status: rz.success ? "processed" : "failed",
                processed_at: rz.success ? new Date().toISOString() : null,
              })
              .eq("id", eventRecordId);
          }

          return NextResponse.json({
            status: rz.success ? "reconciled" : "processing_failed",
            reason: rz.error || (rz.already_credited ? "already_credited" : undefined),
            recharge_id: recharge.id,
          });
        }
      }

      // ── Offer purchase path ──────────────────────────────────────
      // Standalone offer purchases (a customer buying an Offer Card) carry a
      // distinct Razorpay receipt; reconcile them into entitlements atomically.
      if (razorpayOrderId) {
        const { data: offerPurchase } = await supabaseAdmin
          .from("offer_purchases")
          .select("id, offer_id, customer_id, amount, status")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (offerPurchase) {
          const captured = Number(paymentEntity.amount || 0) / 100;
          const { data: ofrResult } = await supabaseAdmin.rpc(
            "complete_offer_purchase",
            {
              p_purchase_id: offerPurchase.id,
              p_razorpay_order_id: razorpayOrderId,
              p_payment_id: razorpayPaymentId,
              p_signature: signature,
              p_gateway_verified_amount: captured,
              p_method: (paymentEntity.method as string | undefined) ?? null,
            }
          );

          const ofr = (ofrResult ?? {}) as {
            success?: boolean;
            already_completed?: boolean;
            error?: string;
            entitlement_id?: string;
          };

          if (ofr.success && !ofr.already_completed) {
            const { data: offerRow } = await supabaseAdmin
              .from("offers")
              .select("title")
              .eq("id", offerPurchase.offer_id)
              .maybeSingle();
            const offerTitle = (offerRow as { title?: string } | null)?.title || "offer";
            void notifyCustomer(
              offerPurchase.customer_id,
              "Offer Activated",
              `Your ${offerTitle} offer is now active. Apply it at checkout.`,
              "offer_purchase",
              { entitlement_id: ofr.entitlement_id, offer_id: offerPurchase.offer_id }
            );
          }

          if (eventRecordId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({
                status: ofr.success ? "processed" : "failed",
                processed_at: ofr.success ? new Date().toISOString() : null,
              })
              .eq("id", eventRecordId);
          }

          return NextResponse.json({
            status: ofr.success ? "reconciled" : "processing_failed",
            reason: ofr.error || (ofr.already_completed ? "already_activated" : undefined),
            offer_purchase_id: offerPurchase.id,
          });
        }
      }

      // Find internal payment record by razorpay_order_id or razorpay_payment_id
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id, booking_id, order_id, payment_status")
        .or(`razorpay_order_id.eq.${razorpayOrderId},razorpay_payment_id.eq.${razorpayPaymentId}`)
        .limit(1)
        .maybeSingle();

      let targetOrderId = existingPayment?.order_id || null;
      const targetBookingId = existingPayment?.booking_id || null;

      // If not in payments, check if order exists with matching razorpay_order_id in notes or id
      if (!targetOrderId && razorpayOrderId) {
        const { data: matchedOrder } = await supabaseAdmin
          .from("orders")
          .select("id, customer_id, payment_status")
          .eq("id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (matchedOrder) {
          targetOrderId = matchedOrder.id;
        }
      }

      // If no internal order/payment matched, safely log unmatched status without mutating arbitrary records
      if (!targetOrderId && !targetBookingId) {
        if (eventRecordId) {
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ status: "unmatched_order", processed_at: new Date().toISOString() })
            .eq("id", eventRecordId);
        }

        console.warn("[Razorpay Webhook] Received payment for unmatched order/booking:", {
          razorpayOrderId,
          razorpayPaymentId,
        });

        return NextResponse.json({ status: "unmatched_order", razorpay_order_id: razorpayOrderId });
      }

      // Reconcile matching child bookings
      let childBookings: BookingChildRow[] = [];
      if (targetOrderId) {
        const { data: bList } = await supabaseAdmin
          .from("bookings")
          .select("id, customer_id, payment_status, status")
          .eq("order_id", targetOrderId);
        childBookings = (bList || []) as BookingChildRow[];
      } else if (targetBookingId) {
        const { data: singleB } = await supabaseAdmin
          .from("bookings")
          .select("id, customer_id, payment_status, status")
          .eq("id", targetBookingId)
          .limit(1)
          .maybeSingle();
        if (singleB) childBookings = [singleB as BookingChildRow];
      }

      // Reconcile order & bookings payment status
      if (targetOrderId) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", updated_at: new Date().toISOString() })
          .eq("id", targetOrderId);
      }

      for (const booking of childBookings) {
        if (booking.payment_status !== "paid") {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", booking.id);

          // Insert or update payment record
          await supabaseAdmin.from("payments").upsert(
            {
              customer_id: booking.customer_id,
              order_id: targetOrderId,
              booking_id: booking.id,
              amount: Number(paymentEntity.amount || 0) / 100,
              payment_status: "completed",
              razorpay_order_id: razorpayOrderId || null,
              razorpay_payment_id: razorpayPaymentId || null,
              razorpay_signature: signature,
            },
            { onConflict: "booking_id" }
          );

          // Trigger dispatch if booking is still pending without assigned partner
          if (booking.status === "pending") {
            void triggerDispatchBatch(booking.id, 1);
          }

          void notifyCustomer(
            booking.customer_id,
            "Payment Confirmed via Gateway",
            "Your payment has been verified and your booking is active.",
            "booking_created",
            { booking_id: booking.id }
          );
        }
      }

      if (eventRecordId) {
        await supabaseAdmin
          .from("payment_webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", eventRecordId);
      }

      void notifyAdmins(
        "Webhook Payment Reconciled",
        `Payment ${razorpayPaymentId || razorpayOrderId} reconciled for ${childBookings.length} booking(s).`,
        "booking_created"
      );

      return NextResponse.json({
        status: "reconciled",
        order_id: targetOrderId,
        reconciled_bookings: childBookings.map((b) => b.id),
      });
    }

    // Payment failed → mark any matching wallet recharge or offer purchase as failed.
    if (eventType === "payment.failed" && razorpayOrderId) {
      const { data: failedRecharge } = await supabaseAdmin
        .from("wallet_recharges")
        .select("id, status")
        .eq("razorpay_order_id", razorpayOrderId)
        .limit(1)
        .maybeSingle();

      if (failedRecharge && !["success", "refunded"].includes(failedRecharge.status)) {
        await supabaseAdmin.rpc("update_wallet_recharge_status", {
          p_recharge_id: failedRecharge.id,
          p_status: "failed",
        });
      }

      const { data: failedOfferPurchase } = await supabaseAdmin
        .from("offer_purchases")
        .select("id, status")
        .eq("razorpay_order_id", razorpayOrderId)
        .limit(1)
        .maybeSingle();

      if (failedOfferPurchase && !["success", "refunded"].includes(failedOfferPurchase.status)) {
        await supabaseAdmin.rpc("update_offer_purchase_status", {
          p_purchase_id: failedOfferPurchase.id,
          p_status: "failed",
        });
      }

      if (eventRecordId) {
        await supabaseAdmin
          .from("payment_webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", eventRecordId);
      }

      return NextResponse.json({ status: "processed" });
    }

    // For other webhook event types (refunds, etc.)
    if (eventRecordId) {
      await supabaseAdmin
        .from("payment_webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", eventRecordId);
    }

    return NextResponse.json({ status: "processed" });
  } catch (err) {
    console.error("[Razorpay Webhook] Processing error:", err);
    if (eventRecordId) {
      await supabaseAdmin
        .from("payment_webhook_events")
        .update({ status: "failed" })
        .eq("id", eventRecordId);
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
