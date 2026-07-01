import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendNotification } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") || "partner") as "customer" | "partner" | "admin";
  const type = searchParams.get("type") || "new_job_offer";

  const supabase = createAdminClient();

  // Find the most recent token for this role
  const { data: tokenRows, error: tokenError } = await supabase
    .from("notification_tokens")
    .select("*, profiles!inner(role, full_name, email)")
    .eq("profiles.role", role)
    .order("last_seen", { ascending: false })
    .limit(1);

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  let selectedToken = tokenRows && tokenRows.length > 0 ? tokenRows[0] : null;

  if (!selectedToken) {
    // Fall back to any recent token regardless of role
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("notification_tokens")
      .select("*, profiles!inner(role, full_name, email)")
      .order("last_seen", { ascending: false })
      .limit(1);

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    if (!fallbackRows || fallbackRows.length === 0) {
      return NextResponse.json({
        error: "No registered push notification tokens found in the database. Please open the app and log in first to register a token."
      }, { status: 400 });
    }

    selectedToken = fallbackRows[0];
  }

  const targetUser = selectedToken.profiles as unknown as { role: string; full_name: string; email: string };
  const targetRole = targetUser.role as "customer" | "partner" | "admin";

  const title = `🔔 Test Notification (${targetRole})`;
  const body = `This is a test notification for ${targetUser.full_name} (${targetUser.email}). If you hear a custom sound, that means the system-alert audio configuration is working!`;

  try {
    await sendNotification({
      userIds: selectedToken.user_id,
      title,
      body,
      type: type as any,
      metadata: { booking_id: "test-booking-id" },
      recipientRole: targetRole,
    });

    return NextResponse.json({
      success: true,
      message: `Test notification sent to user ${targetUser.full_name} (${targetUser.email}) on platform ${selectedToken.platform}`,
      token: selectedToken.fcm_token.substring(0, 15) + "...",
      role: targetRole,
      type,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
