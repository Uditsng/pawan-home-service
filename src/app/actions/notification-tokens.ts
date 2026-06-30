/**
 * Notification Token Management — Server Actions
 *
 * Handles registration, refresh, and deletion of FCM device tokens.
 * Used by the client-side service worker or Capacitor plugin to
 * register push notification capabilities.
 */

"use server";

import { createClient } from "@/utils/supabase/server";

// ─── Register / Upsert Token ────────────────────────────────

/**
 * Register an FCM token for the current authenticated user.
 * Uses upsert with the unique(user_id, fcm_token) constraint
 * to prevent duplicate registrations.
 */
export async function registerTokenAction(
  fcmToken: string,
  platform: "web" | "android" | "ios" = "web"
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    return { success: false, error: "Invalid FCM token." };
  }

  // Enforce reasonable length to prevent abuse
  if (fcmToken.length > 512) {
    return { success: false, error: "Token exceeds maximum length." };
  }

  const allowedPlatforms = ["web", "android", "ios"] as const;
  if (!allowedPlatforms.includes(platform)) {
    return { success: false, error: "Invalid platform." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // ── Step 1: Evict this token from any OTHER user account ─────────────────
  // FCM tokens are device-scoped. If another account previously logged in on
  // this device, the same token may exist under a different user_id. Remove it
  // from the old owner first to prevent duplicate pushes across accounts.
  await supabase
    .from("notification_tokens")
    .delete()
    .eq("fcm_token", fcmToken.trim())
    .neq("user_id", user.id);

  await supabase
    .from("device_tokens")
    .delete()
    .eq("device_token", fcmToken.trim())
    .neq("user_id", user.id);

  // ── Step 2: Remove ALL stale tokens for this user on this platform ────────
  // A user may have accumulated multiple tokens on the same device (e.g. from
  // app reinstalls or account switches). Enforce exactly 1 active token per
  // user per platform to guarantee they never receive duplicate notifications.
  await supabase
    .from("notification_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform)
    .neq("fcm_token", fcmToken.trim());

  await supabase
    .from("device_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform)
    .neq("device_token", fcmToken.trim());

  console.log(`[notification-tokens] Token hygiene complete for user ${user.id}. Registering ${fcmToken.substring(0, 10)}...`);

  // ── Step 3: Upsert the current token ─────────────────────────────────────
  const { error } = await supabase.from("notification_tokens").upsert(
    {
      user_id: user.id,
      fcm_token: fcmToken.trim(),
      platform,
      last_seen: new Date().toISOString(),
    },
    {
      onConflict: "user_id,fcm_token",
    }
  );

  if (error) {
    console.error("[notification-tokens] Registration failed:", error.message);
    return { success: false, error: "Failed to register token." };
  }

  await supabase.from("device_tokens").upsert(
    {
      user_id: user.id,
      device_token: fcmToken.trim(),
      platform,
      last_seen_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,device_token",
    }
  );

  return { success: true };
}

// ─── Delete Token ───────────────────────────────────────────

/**
 * Remove an FCM token for a user on logout.
 *
 * IMPORTANT: Supabase fires SIGNED_OUT AFTER clearing the session, so
 * auth.getUser() returns null inside that handler. We require an explicit
 * userId to be passed in from the client (captured before sign-out) so the
 * delete always executes correctly.
 */
export async function deleteTokenAction(
  fcmToken: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    return { success: false, error: "Invalid FCM token." };
  }

  const supabase = await createClient();

  // Prefer the explicitly supplied userId (needed for post-signout calls)
  let userId = explicitUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) {
    console.warn("[notification-tokens] deleteTokenAction called with no userId and no active session — skipping.");
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("notification_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("fcm_token", fcmToken.trim());

  if (error) {
    console.error("[notification-tokens] Deletion failed:", error.message);
    return { success: false, error: "Failed to delete token." };
  }

  // Keep device_tokens in sync
  await supabase
    .from("device_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("device_token", fcmToken.trim());

  console.log(`[notification-tokens] Token deleted for user ${userId}`);

  return { success: true };
}
