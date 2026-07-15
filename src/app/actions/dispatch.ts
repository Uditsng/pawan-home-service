"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";

interface DispatchPartner {
  partner_id: string;
}

interface BookingForDispatch {
  services: { title: string } | null;
  city: string | null;
  area: string | null;
  scheduled_date: string | null;
  total_amount: number;
}

/**
 * Triggers a dispatch batch for a booking.
 *
 * 1. Calls get_dispatch_batch RPC to find the next top-10 eligible partners.
 * 2. Inserts booking_job_offers rows for each matched partner.
 * 3. Updates booking broadcast metadata.
 * 4. Fires FCM + in-app notifications to all matched partners.
 *
 * This function uses the SERVICE_ROLE client for inserts because
 * booking_job_offers has no authenticated INSERT policy (system-only).
 */
export async function triggerDispatchBatch(
  bookingId: string,
  tier: number = 1
): Promise<{ dispatched: number; error?: string }> {
  // Use service-role client for system-level inserts
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Find eligible partners for this tier
    const { data: partners, error: rpcError } = await serviceClient.rpc(
      "get_dispatch_batch",
      { p_booking_id: bookingId, p_tier: tier }
    );

    if (rpcError) {
      console.error("[dispatch] RPC error:", rpcError);
      return { dispatched: 0, error: "Failed to dispatch booking. Please try again." };
    }

    if (!partners || partners.length === 0) {
      console.warn("[dispatch] Zero eligible partners for booking", bookingId, "tier", tier);
      const { data: b } = await serviceClient
        .from("bookings")
        .select("service_id, pincode, area")
        .eq("id", bookingId)
        .single();
      if (b) console.warn("[dispatch] Booking details:", b);
      return { dispatched: 0 };
    }

    const partnerIds = (partners as DispatchPartner[]).map((p) => p.partner_id);

    // 2. Insert offer records (ignore duplicate violations from UNIQUE constraint)
    const offerRows = partnerIds.map((pid) => ({
      booking_id:     bookingId,
      partner_id:     pid,
      broadcast_tier: tier,
      status:         "offered",
    }));

    const { error: offerError } = await serviceClient
      .from("booking_job_offers")
      .upsert(offerRows, { onConflict: "booking_id,partner_id", ignoreDuplicates: true });

    if (offerError) {
      console.error("[dispatch] offer insert error:", offerError.message);
    }

    // 3. Update booking broadcast metadata
    await serviceClient
      .from("bookings")
      .update({
        broadcast_tier:     tier,
        last_broadcast_at:  new Date().toISOString(),
      })
      .eq("id", bookingId);

    // Log the broadcast event in audit trail and booking events
    await serviceClient.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "OFFER_BROADCASTED",
      actor: "SYSTEM",
      metadata: {
        broadcast_tier: tier,
        partner_count: partnerIds.length,
        dispatched_partner_ids: partnerIds,
      },
    });

    await serviceClient.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "OFFER_BROADCASTED",
      actor: "SYSTEM",
      metadata: {
        broadcast_tier: tier,
        partner_count: partnerIds.length,
      },
    });

    // 4. Fetch booking details for the push notification body
    const { data: booking } = await serviceClient
      .from("bookings")
      .select("services:service_id(title), city, area, scheduled_date, total_amount")
      .eq("id", bookingId)
      .single<BookingForDispatch>();

    if (booking) {
      const serviceTitle =
        (booking.services as { title: string } | null)?.title ?? "Service";
      const locationLabel = booking.area || booking.city || "Kanpur Nagar";
      const payout       = Math.round(Number(booking.total_amount) * 0.8);

      // Fire-and-forget batch notification to all matched partners
      void sendNotification({
        userIds:  partnerIds,
        title:    "🔔 New Job Available!",
        body:     `${serviceTitle} in ${locationLabel} — Payout: ₹${payout}`,
        type:     "new_job_offer",
        metadata: { booking_id: bookingId, tier },
        recipientRole: "partner",
      });
    }

    return { dispatched: partnerIds.length };
  } catch (err) {
    console.error("[dispatch] Unexpected error:", (err as Error).message);
    return { dispatched: 0, error: (err as Error).message };
  }
}

/**
 * Triggers the next dispatch tier for a booking.
 * Called by a cron job or admin "Re-broadcast" button.
 */
export async function retriggerDispatch(bookingId: string): Promise<{ dispatched: number }> {
  const supabase = await createClient();

  // Get current tier
  const { data: booking } = await supabase
    .from("bookings")
    .select("broadcast_tier, status, partner_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "pending" || booking.partner_id) {
    return { dispatched: 0 }; // Already claimed or not dispatchable
  }

  const nextTier = (booking.broadcast_tier || 0) + 1;
  return triggerDispatchBatch(bookingId, nextTier);
}
