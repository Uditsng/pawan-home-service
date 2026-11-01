import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyCustomer } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { fulfillOrderBookings } from "@/lib/orders/orderFulfillment";

export const dynamic = 'force-dynamic';

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
  const orderEntity = (payload.order as { entity?: Record<string, unknown> })?.entity || {};

  const razorpayOrderId = (paymentEntity.order_id as string | undefined) || (orderEntity.id as string | undefined);
  const razorpayPaymentId = paymentEntity.id as string | undefined;
  const notes = ((paymentEntity.notes || orderEntity.notes || {}) as Record<string, string>);
  const internalOrderId = notes.internal_order_id;
  const capturedAmount = Number(paymentEntity.amount || orderEntity.amount_paid || 0) / 100;

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
          const captured = capturedAmount;
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
          const captured = capturedAmount;
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

      // ── Booking quote payment path ──────────────────────────────
      if (razorpayOrderId) {
        const { data: quote } = await supabaseAdmin
          .from("booking_quotes")
          .select("*, booking:booking_id(*)")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (quote) {
          const now = new Date().toISOString();
          const quoteAmt = Number(quote.total_amount || 0);

          if (quote.payment_status === "paid") {
            return NextResponse.json({ status: "already_processed", reason: "quote_already_paid" });
          }

          if (Math.abs(capturedAmount - quoteAmt) <= 0.01) {
            // Atomically claim the quote so a simultaneous client verification
            // or duplicate webhook cannot apply it twice.
            const { data: claimedQuote } = await supabaseAdmin
              .from("booking_quotes")
              .update({
                status: "approved",
                payment_method: "Online",
                payment_status: "paid",
                razorpay_payment_id: razorpayPaymentId,
                paid_at: now,
                updated_at: now,
              })
              .eq("id", quote.id)
              .neq("payment_status", "paid")
              .select("id")
              .maybeSingle();

            if (!claimedQuote) {
              return NextResponse.json({ status: "already_processed", reason: "quote_already_paid" });
            }

            // Update booking
            const booking = quote.booking as { id: string; payment_method: string; payment_status: string; total_amount: number; pricing_model?: string } | null;
            if (booking) {
              const isInitialInspection = booking.pricing_model === "inspection";
              // Cash approvals already applied the quote totals via
              // respondToQuoteAction. Online payments on a still-pending quote
              // must apply them exactly once here.
              const totalsAlreadyApplied = quote.status === "approved";
              const newBookingTotal = totalsAlreadyApplied
                ? Number(booking.total_amount)
                : isInitialInspection
                  ? quoteAmt
                  : Number(booking.total_amount) + quoteAmt;
              const isCashBase =
                booking.payment_method.trim().toLowerCase() === "cash" &&
                booking.payment_status !== "paid";
              const resolvedPaymentStatus = isCashBase ? "partially_paid" : "paid";

              const bookingUpdatePayload: Record<string, unknown> = {
                total_amount: newBookingTotal,
                final_price: newBookingTotal,
                unpaid_quote_amount: 0,
                payment_status: resolvedPaymentStatus,
              };
              if (isInitialInspection) bookingUpdatePayload.status = "in_progress";

              await supabaseAdmin.from("bookings").update(bookingUpdatePayload).eq("id", booking.id);

              if (!totalsAlreadyApplied) {
                // Update booking_pricing
                const { data: pricing } = await supabaseAdmin
                  .from("booking_pricing")
                  .select("*")
                  .eq("booking_id", booking.id)
                  .maybeSingle();

                const taxRateNum = Number(quote.tax_rate || 18);
                const quoteGst = Math.round((quoteAmt * taxRateNum) / (100 + taxRateNum));
                const quoteBase = quoteAmt - quoteGst;

                if (pricing) {
                  if (isInitialInspection) {
                    await supabaseAdmin.from("booking_pricing").update({
                      base_price: quoteBase,
                      gst_amount: quoteGst,
                      total_price: newBookingTotal,
                    }).eq("id", pricing.id);
                  } else {
                    const currentSurcharges = Array.isArray(pricing.surcharges) ? pricing.surcharges : [];
                    await supabaseAdmin.from("booking_pricing").update({
                      surcharges: [...currentSurcharges, { name: `Approved Extra Work: ${quote.notes || "Additional charges"}`, amount: quoteAmt }],
                      gst_amount: Number(pricing.gst_amount || 0) + quoteGst,
                      total_price: newBookingTotal,
                    }).eq("id", pricing.id);
                  }
                }
              }

              // Insert payment row
              await supabaseAdmin.from("payments").insert({
                customer_id: quote.customer_id,
                booking_id: booking.id,
                amount: quoteAmt,
                payment_status: "completed",
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: signature,
              });
            }

            if (eventRecordId) {
              await supabaseAdmin.from("payment_webhook_events").update({
                status: "processed",
                processed_at: new Date().toISOString(),
              }).eq("id", eventRecordId);
            }

            return NextResponse.json({ status: "reconciled", quote_id: quote.id });
          }
        }
      }

      // ── Booking extension payment path ──────────────────────────
      if (razorpayOrderId) {
        const { data: ext } = await supabaseAdmin
          .from("booking_extensions")
          .select("*, bookings(*)")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (ext) {
          const now = new Date().toISOString();
          const additionalAmount = Number(ext.additional_amount || 0);

          if (ext.status === "active") {
            return NextResponse.json({ status: "already_processed", reason: "extension_already_active" });
          }

          if (Math.abs(capturedAmount - additionalAmount) <= 0.01) {
            const { data: claimedExtension } = await supabaseAdmin
              .from("booking_extensions")
              .update({
                status: "active",
                approved_at: now,
                paid_at: now,
                razorpay_payment_id: razorpayPaymentId,
              })
              .eq("id", ext.id)
              .in("status", ["requested", "payment_pending"])
              .select("id")
              .maybeSingle();

            if (!claimedExtension) {
              return NextResponse.json({ status: "already_processed", reason: "extension_already_active" });
            }

            const booking = ext.bookings as { id: string; selected_duration_minutes?: number; total_amount: number; customer_id: string } | null;
            if (booking) {
              const currentDuration = Number(booking.selected_duration_minutes || 0);
              const newDuration = currentDuration + Number(ext.additional_minutes);
              const newPrice = Number(booking.total_amount || 0) + additionalAmount;

              await supabaseAdmin.from("bookings").update({
                selected_duration_minutes: newDuration,
                total_amount: newPrice,
                final_price: newPrice,
              }).eq("id", booking.id);

              const { data: pricing } = await supabaseAdmin
                .from("booking_pricing")
                .select("id, total_price")
                .eq("booking_id", booking.id)
                .maybeSingle();

              if (pricing) {
                await supabaseAdmin.from("booking_pricing").update({
                  total_price: Number(pricing.total_price || 0) + additionalAmount,
                }).eq("id", pricing.id);
              }

              await supabaseAdmin.from("payments").insert({
                customer_id: booking.customer_id,
                booking_id: booking.id,
                amount: additionalAmount,
                payment_status: "completed",
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: signature,
              });
            }

            if (eventRecordId) {
              await supabaseAdmin.from("payment_webhook_events").update({
                status: "processed",
                processed_at: new Date().toISOString(),
              }).eq("id", eventRecordId);
            }

            return NextResponse.json({ status: "reconciled", extension_id: ext.id });
          }
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

      // Check if order exists with matching razorpay_order_id on orders
      if (!targetOrderId && razorpayOrderId) {
        const { data: matchedOrder } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();

        if (matchedOrder) {
          targetOrderId = matchedOrder.id;
        }
      }

      // Check if order exists with matching internal_order_id in notes
      if (!targetOrderId && internalOrderId) {
        const { data: matchedOrder } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("id", internalOrderId)
          .limit(1)
          .maybeSingle();

        if (matchedOrder) {
          targetOrderId = matchedOrder.id;
        }
      }

      // If internal order is found, execute unified order fulfillment
      if (targetOrderId) {
        const fulfillResult = await fulfillOrderBookings({
          orderId: targetOrderId,
          razorpayOrderId: razorpayOrderId || null,
          razorpayPaymentId: razorpayPaymentId || null,
          razorpaySignature: signature,
          gatewayAmount: capturedAmount,
          source: "webhook",
        });

        if (!fulfillResult.success) {
          console.error("[Razorpay Webhook] Fulfill order error:", fulfillResult.error);
          if (eventRecordId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({ status: "failed" })
              .eq("id", eventRecordId);
          }
          return NextResponse.json({ error: fulfillResult.error || "Order fulfillment failed" }, { status: 500 });
        }

        if (eventRecordId) {
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("id", eventRecordId);
        }

        return NextResponse.json({
          status: "reconciled",
          order_id: targetOrderId,
          already_fulfilled: fulfillResult.alreadyFulfilled,
          recovered: fulfillResult.recovered,
          bookings: fulfillResult.createdBookingIds,
        });
      }

      // If legacy single booking matched by payment record
      if (targetBookingId) {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", targetBookingId);

        void triggerDispatchBatch(targetBookingId, 1);

        if (eventRecordId) {
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("id", eventRecordId);
        }

        return NextResponse.json({
          status: "reconciled",
          booking_id: targetBookingId,
        });
      }

      // If no internal order/payment matched, safely log unmatched status
      if (eventRecordId) {
        await supabaseAdmin
          .from("payment_webhook_events")
          .update({ status: "unmatched_order", processed_at: new Date().toISOString() })
          .eq("id", eventRecordId);
      }

      console.warn("[Razorpay Webhook] Received payment for unmatched order/booking:", {
        razorpayOrderId,
        razorpayPaymentId,
        internalOrderId,
      });

      return NextResponse.json({ status: "unmatched_order", razorpay_order_id: razorpayOrderId });
    }

    // Payment failed → mark any matching wallet recharge, offer purchase, or order as failed.
    if (eventType === "payment.failed" && (razorpayOrderId || internalOrderId)) {
      if (razorpayOrderId) {
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
      }

      // Check matching order
      let failedOrderId = internalOrderId;
      if (!failedOrderId && razorpayOrderId) {
        const { data: oRow } = await supabaseAdmin
          .from("orders")
          .select("id, customer_id, payment_status, offer_entitlement_id")
          .eq("razorpay_order_id", razorpayOrderId)
          .limit(1)
          .maybeSingle();
        if (oRow) {
          failedOrderId = oRow.id;
          if (oRow.payment_status === "pending") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", updated_at: new Date().toISOString() })
              .eq("id", oRow.id);

            if (oRow.offer_entitlement_id) {
              await supabaseAdmin.rpc("release_offer_reservation", {
                p_order_id: oRow.id,
                p_customer_id: oRow.customer_id,
              });
            }
          }
        }
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
