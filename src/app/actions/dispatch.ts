"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

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
 * Unified Dispatch Batch Runner
 *
 * Implements a crash-resilient, two-phase dispatch state machine:
 * 1. Atomically claims the target tier via claim_dispatch_tier RPC (locking the booking).
 * 2. Fetches up to 10 highest-ranked remaining unoffered partners via get_dispatch_batch.
 * 3. Idempotently inserts booking_job_offers rows.
 * 4. Confirms broadcast via confirm_dispatch_batch RPC (broadcasting or exhausted).
 * 5. Fires FCM + in-app notifications only to newly offered partners.
 * 6. On failure, releases lock safely via fail_dispatch_batch RPC.
 */
export async function triggerDispatchBatch(
  bookingId: string,
  tier: number = 1
): Promise<{ dispatched: number; error?: string; reason?: string }> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Phase 1: Atomically claim the right to dispatch this tier
    const { data: claimResult, error: claimError } = await serviceClient.rpc(
      "claim_dispatch_tier",
      {
        p_booking_id: bookingId,
        p_target_tier: tier,
        p_response_window_sec: 45,
        p_lock_timeout_sec: 60,
      }
    );

    if (claimError) {
      console.error("[dispatch] Tier claim RPC error:", claimError.message);
      return { dispatched: 0, error: claimError.message };
    }

    const claim = claimResult as { claimed: boolean; reason?: string; target_tier?: number };
    if (!claim || !claim.claimed) {
      return { dispatched: 0, reason: claim?.reason || "not_claimable" };
    }

    // Phase 2: Find eligible remaining unoffered partners for this booking
    const { data: partners, error: rpcError } = await serviceClient.rpc(
      "get_dispatch_batch",
      { p_booking_id: bookingId, p_limit: 10 }
    );

    if (rpcError) {
      console.error("[dispatch] get_dispatch_batch RPC error:", rpcError.message);
      await serviceClient.rpc("fail_dispatch_batch", {
        p_booking_id: bookingId,
        p_error_msg: rpcError.message,
      });
      return { dispatched: 0, error: "Failed to query eligible partners." };
    }

    const partnerList = (partners as DispatchPartner[] || []);

    if (partnerList.length === 0) {
      // Zero unoffered partners remaining -> confirm exhaustion
      await serviceClient.rpc("confirm_dispatch_batch", {
        p_booking_id: bookingId,
        p_tier: tier,
        p_dispatched_count: 0,
      });

      await serviceClient.from("booking_events").insert({
        booking_id: bookingId,
        event_type: "DISPATCH_EXHAUSTED",
        actor: "SYSTEM",
        metadata: {
          attempted_tier: tier,
          partner_count: 0,
          reason: "no_further_eligible_partners",
        },
      });

      // Fetch booking details for admin notification
      const { data: bookingDetails } = await serviceClient
        .from("bookings")
        .select("services:service_id(title), pincode")
        .eq("id", bookingId)
        .single();

      const svcTitle = (bookingDetails?.services as unknown as { title: string } | null)?.title ?? "Service";
      void notifyAdmins(
        "Dispatch Exhausted · Action Required",
        `Booking #${bookingId.substring(0, 8)} (${svcTitle} in ${bookingDetails?.pincode || "area"}) has no available professionals. Manual assignment required.`,
        "partner_reassigned",
        { booking_id: bookingId }
      );

      return { dispatched: 0, reason: "exhausted" };
    }

    const partnerIds = partnerList.map((p) => p.partner_id);

    // Phase 3: Idempotently insert offer records
    const offerRows = partnerIds.map((pid) => ({
      booking_id:     bookingId,
      partner_id:     pid,
      broadcast_tier: tier,
      status:         "offered",
    }));

    const { data: insertedOffers, error: offerError } = await serviceClient
      .from("booking_job_offers")
      .upsert(offerRows, { onConflict: "booking_id,partner_id", ignoreDuplicates: true })
      .select("partner_id");

    if (offerError) {
      console.error("[dispatch] offer upsert error:", offerError.message);
      await serviceClient.rpc("fail_dispatch_batch", {
        p_booking_id: bookingId,
        p_error_msg: offerError.message,
      });
      return { dispatched: 0, error: offerError.message };
    }

    const newlyOfferedIds = (insertedOffers && insertedOffers.length > 0)
      ? insertedOffers.map((r: { partner_id: string }) => r.partner_id)
      : partnerIds;

    // Phase 4: Confirm broadcast in database
    await serviceClient.rpc("confirm_dispatch_batch", {
      p_booking_id: bookingId,
      p_tier: tier,
      p_dispatched_count: newlyOfferedIds.length,
    });

    // Increment jobs_offered_count strictly for newly offered partners
    if (newlyOfferedIds.length > 0) {
      for (const pid of newlyOfferedIds) {
        const { data: prof } = await serviceClient
          .from("profiles")
          .select("jobs_offered_count")
          .eq("id", pid)
          .single();
        if (prof) {
          await serviceClient
            .from("profiles")
            .update({ jobs_offered_count: (prof.jobs_offered_count || 0) + 1 })
            .eq("id", pid);
        }
      }
    }

    // Log the broadcast event
    await serviceClient.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "OFFER_BROADCASTED",
      actor: "SYSTEM",
      metadata: {
        broadcast_tier: tier,
        partner_count: newlyOfferedIds.length,
        dispatched_partner_ids: newlyOfferedIds,
      },
    });

    await serviceClient.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "OFFER_BROADCASTED",
      actor: "SYSTEM",
      metadata: {
        broadcast_tier: tier,
        partner_count: newlyOfferedIds.length,
      },
    });

    // Phase 5: Fetch booking details & send notifications to newly offered partners
    const { data: booking } = await serviceClient
      .from("bookings")
      .select("services:service_id(title), city, area, scheduled_date, total_amount")
      .eq("id", bookingId)
      .single<BookingForDispatch>();

    if (booking && newlyOfferedIds.length > 0) {
      const serviceTitle =
        (booking.services as { title: string } | null)?.title ?? "Service";
      const locationLabel = booking.area || booking.city || "Kanpur Nagar";
      const servicePrice = Number(booking.total_amount || 0);

      void sendNotification({
        userIds:  newlyOfferedIds,
        title:    "🔔 New Job Available!",
        body:     `${serviceTitle} in ${locationLabel} — Price: ₹${servicePrice}`,
        type:     "new_job_offer",
        metadata: { booking_id: bookingId, tier },
        recipientRole: "partner",
      });
    }

    return { dispatched: newlyOfferedIds.length };
  } catch (err) {
    console.error("[dispatch] Unexpected error:", (err as Error).message);
    await serviceClient.rpc("fail_dispatch_batch", {
      p_booking_id: bookingId,
      p_error_msg: (err as Error).message,
    });
    return { dispatched: 0, error: (err as Error).message };
  }
}
