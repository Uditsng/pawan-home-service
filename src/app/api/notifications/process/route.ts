import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendNotification } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

      // 2. Mark sending
      await supabaseAdmin
        .from("admin_notifications")
        .update({ status: "sending", updated_at: now })
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

        // 4. Fetch tokens for recipient logs mapping
        const { data: tokenRows } = await supabaseAdmin
          .from("notification_tokens")
          .select("user_id, fcm_token, platform")
          .in("user_id", targetUserIds);

        // 5. Send notifications in chunks of 500
        const chunkSize = 500;
        let totalSuccess = 0;
        let totalFailure = 0;
        const logRows: unknown[] = [];

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

          // Log construction
          chunk.forEach(uid => {
            const userTokens = tokenRows?.filter(t => t.user_id === uid) || [];
            if (userTokens.length === 0) {
              logRows.push({
                notification_id: campaign.id,
                user_id: uid,
                device_token: null,
                platform: null,
                status: "failed",
                failure_reason: "No registered device token found.",
              });
              totalFailure++;
            } else {
              userTokens.forEach(tok => {
                logRows.push({
                  notification_id: campaign.id,
                  user_id: uid,
                  device_token: tok.fcm_token,
                  platform: tok.platform,
                  status: "sent",
                  sent_at: now,
                });
                totalSuccess++;
              });
            }
          });
        }

        // 6. Write logs
        if (logRows.length > 0) {
          await supabaseAdmin.from("notification_logs").insert(logRows);
        }

        // 7. Mark campaign complete
        await supabaseAdmin
          .from("admin_notifications")
          .update({
            status: "completed",
            recipient_count: targetUserIds.length,
            success_count: totalSuccess,
            failure_count: totalFailure,
            updated_at: now,
          })
          .eq("id", campaign.id);

        processedCampaigns.push({
          id: campaign.id,
          title: campaign.title,
          status: "completed",
          recipients: targetUserIds.length,
          success: totalSuccess,
          failed: totalFailure,
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
