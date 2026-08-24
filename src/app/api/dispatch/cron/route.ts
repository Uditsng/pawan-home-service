import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { notifyAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Dispatch Escalation Cron Worker
 *
 * Scans pending bookings that are currently broadcasting and have waited
 * beyond the response window without partner acceptance. Escalates them
 * to the next batch of eligible professionals.
 *
 * Protected via CRON_SECRET header or Authorization Bearer token.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isHeaderValid = headerSecret === cronSecret;

    if (!isBearerValid && !isHeaderValid) {
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
  }

  const supabaseAdmin = createAdminClient();
  const RESPONSE_WINDOW_SECONDS = 45;
  const MAX_TIERS = 10; // Up to 100 partners total

  try {
    const windowThreshold = new Date(Date.now() - RESPONSE_WINDOW_SECONDS * 1000).toISOString();

    // Query pending paid bookings needing next tier
    const { data: bookings, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, broadcast_tier, dispatch_status, last_broadcast_at, services:service_id(title), city, pincode")
      .eq("status", "pending")
      .is("partner_id", null)
      .eq("payment_status", "paid")
      .in("dispatch_status", ["broadcasting", "failed"])
      .lte("last_broadcast_at", windowThreshold)
      .lt("broadcast_tier", MAX_TIERS);

    if (fetchErr) {
      console.error("[dispatch-cron] Fetch error:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending bookings due for escalation." });
    }

    const results = [];

    for (const b of bookings) {
      const nextTier = (b.broadcast_tier || 0) + 1;
      const res = await triggerDispatchBatch(b.id, nextTier);

      if (res.reason === "exhausted") {
        const svcTitle = (b.services as unknown as { title: string } | null)?.title ?? "Service";
        void notifyAdmins(
          "Dispatch Exhausted · Action Required",
          `Booking #${b.id.substring(0, 8)} (${svcTitle} in ${b.pincode}) has exhausted all eligible professionals. Manual assignment required.`,
          "partner_reassigned",
          { booking_id: b.id }
        );
      }

      results.push({
        booking_id: b.id,
        tier: nextTier,
        dispatched: res.dispatched,
        reason: res.reason,
        error: res.error,
      });
    }

    return NextResponse.json({
      processed: bookings.length,
      details: results,
    });
  } catch (err) {
    console.error("[dispatch-cron] Crash:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
