import { NextResponse } from "next/server";
import { drainNotificationDeliveries } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

/**
 * Drain worker (cron-triggered).
 *
 * Repeatedly claims queued/retryable notification_deliveries rows and
 * dispatches them via FCM. Each pass reclaims rows left `in_flight` by a
 * crashed worker, then claims a batch and multicasts. Must run every minute
 * to honour scheduled campaign delivery timing.
 *
 * Auth: Bearer <CRON_SECRET> or X-Cron-Secret <CRON_SECRET>
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Fail closed: an unauthenticated drain endpoint would let anyone flush the
    // FCM queue. Only tolerate a missing secret in local development.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
    }
  } else {
    const authHeader = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isHeaderValid = headerSecret === cronSecret;

    if (!isBearerValid && !isHeaderValid) {
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
  }

  try {
    // Run multiple passes so a single invocation can clear a large backlog
    // (the cron fires every minute; claim batches are capped at batchSize).
    const passes = 10;
    let passesDone = 0;
    const totals = {
      claimed: 0,
      firebaseAccepted: 0,
      retryable: 0,
      failed: 0,
      degraded: 0,
      reclaimed: 0,
    };

    for (let i = 0; i < passes; i++) {
      const result = await drainNotificationDeliveries({ batchSize: 450 });
      passesDone++;
      totals.claimed += result.claimed;
      totals.firebaseAccepted += result.firebaseAccepted;
      totals.retryable += result.retryable;
      totals.failed += result.failed;
      totals.degraded += result.degraded;
      totals.reclaimed += result.reclaimed;

      // No rows claimed → queue is empty; stop early.
      if (result.claimed === 0) break;
    }

    return NextResponse.json({
      ok: true,
      passesDone,
      totals,
    });
  } catch (err) {
    console.error("[Deliver] Crash:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}