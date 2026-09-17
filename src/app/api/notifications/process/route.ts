import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendNotification,
  drainNotificationDeliveries,
  refreshCampaignStats,
  countPendingDeliveries,
} from "@/lib/notifications";

export const dynamic = 'force-dynamic';

/**
 * Scheduled-campaign dispatcher (cron-triggered).
 *
 * Finds campaigns whose scheduled_at has arrived, enqueues their delivery
 * ledger rows, then drains them inline. Large fan-outs that exceed this
 * invocation are left as `sending` (with a lease) and are finished by the
 * drain worker (#/api/notifications/deliver) on its next pass.
 *
 * Auth: Bearer <CRON_SECRET> or X-Cron-Secret <CRON_SECRET>
 */
export async function GET(request: Request) {
  // Authorization check for cron worker trigger
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Fail closed in production (see /api/notifications/deliver).
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

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  try {
    // 1. Find campaigns due for dispatch
    const { data: campaigns, error: fetchErr } = await supabaseAdmin
      .from("admin_notifications")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .is("deleted_at", null);

    if (fetchErr) {
      console.error("[Scheduler] Fetch error:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ processed: 0, message: "No scheduled notifications are due." });
    }

    const processedCampaigns = [];

    for (const campaign of campaigns) {
      // 1.5 Expiry check: "Expired scheduled notifications should never be sent"
      if (campaign.expires_at && new Date(campaign.expires_at) < new Date()) {
        await supabaseAdmin
          .from("admin_notifications")
          .update({
            status: "cancelled",
            updated_at: now,
          })
          .eq("id", campaign.id);

        processedCampaigns.push({
          id: campaign.id,
          title: campaign.title,
          status: "cancelled",
          reason: "Expired before dispatch time.",
        });
        continue;
      }

      // 2. Mark sending (lease enables drain-worker recovery)
      await supabaseAdmin
        .from("admin_notifications")
        .update({
          status: "sending",
          lease_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          updated_at: now,
        })
        .eq("id", campaign.id);

      try {
        // 3. Resolve target users
        let targetUserIds: string[] = [];
        const audienceType = campaign.audience_type;

        if (audienceType === "all") {
          const { data: users } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("status", "active");
          targetUserIds = users?.map(u => u.id) || [];
        } else if (audienceType === "customers") {
          const { data: users } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "customer")
            .eq("status", "active");
          targetUserIds = users?.map(u => u.id) || [];
        } else if (audienceType === "partners") {
          const { data: users } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "partner")
            .eq("status", "active");
          targetUserIds = users?.map(u => u.id) || [];
        } else if (audienceType === "admins") {
          const { data: users } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .eq("status", "active");
          targetUserIds = users?.map(u => u.id) || [];
        } else if (audienceType === "selected") {
          targetUserIds = campaign.audience_filters?.userIds || [];
        }

        if (targetUserIds.length === 0) {
          await supabaseAdmin
            .from("admin_notifications")
            .update({
              status: "failed",
              recipient_count: 0,
              success_count: 0,
              failure_count: 0,
              updated_at: now,
            })
            .eq("id", campaign.id);

          processedCampaigns.push({
            id: campaign.id,
            title: campaign.title,
            status: "failed",
            reason: "Recipient list resolved to zero active users.",
          });
          continue;
        }

        // 4. Enqueue recipient notifications (ledger-backed; FCM dispatch is
        //    handled by the inline drain below and the #/deliver worker).
        const chunkSize = 500;
        for (let i = 0; i < targetUserIds.length; i += chunkSize) {
          const chunk = targetUserIds.slice(i, i + chunkSize);

          await sendNotification({
            userIds: chunk,
            title: campaign.title,
            body: campaign.message,
            type: "general",
            metadata: {
              campaign_id: campaign.id,
              image_url: campaign.image_url || null,
              deep_link: campaign.deep_link || null,
            },
          });
        }

        // 5. Drain inline for this run; finish via the drain worker if huge.
        const maxDrainPasses = Math.ceil(targetUserIds.length / 200) * 2 + 5;
        let stillPending = 0;
        for (let pass = 0; pass < maxDrainPasses; pass++) {
          await drainNotificationDeliveries({ batchSize: 450 });
          stillPending = await countPendingDeliveries(supabaseAdmin, campaign.id);
          if (stillPending === 0) break;
        }

        await refreshCampaignStats(supabaseAdmin, campaign.id);

        if (stillPending > 0) {
          await supabaseAdmin
            .from("admin_notifications")
            .update({
              status: "sending",
              lease_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              updated_at: now,
            })
            .eq("id", campaign.id);
        }

        const { data: final } = await supabaseAdmin
          .from("admin_notifications")
          .select("status, recipient_count, success_count, failure_count")
          .eq("id", campaign.id)
          .single();

        processedCampaigns.push({
          id: campaign.id,
          title: campaign.title,
          status: (final && (final as { status: string }).status) || "sending",
          recipients: final ? (final as { recipient_count: number }).recipient_count : targetUserIds.length,
          success: final ? (final as { success_count: number }).success_count : 0,
          failed: final ? (final as { failure_count: number }).failure_count : 0,
          deferred: stillPending > 0,
        });
      } catch (sendErr) {
        console.error(`[Scheduler] Send error for campaign ${campaign.id}:`, sendErr);
        await supabaseAdmin
          .from("admin_notifications")
          .update({
            status: "failed",
            updated_at: now,
          })
          .eq("id", campaign.id);

        processedCampaigns.push({
          id: campaign.id,
          title: campaign.title,
          status: "failed",
          reason: (sendErr as Error).message,
        });
      }
    }

    return NextResponse.json({ processed: processedCampaigns.length, details: processedCampaigns });

  } catch (err) {
    console.error("[Scheduler] Crash:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}