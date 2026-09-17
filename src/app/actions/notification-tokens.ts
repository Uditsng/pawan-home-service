/**
 * Notification Token Management — Server Actions
 *
 * Handles registration, refresh, and deletion of FCM device tokens.
 * Used by the client-side Capacitor plugin to register push tokens.
 *
 * Multi-device: a user may have multiple tokens (e.g. phone + tablet).
 * The one-token-per-platform eviction has been removed in M2.
 * Invalid/unregistered tokens are deactivated (is_active = false)
 * rather than deleted, preserving audit history.
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ─── Register / Upsert Token ────────────────────────────────

/**
 * Register an FCM token for the current authenticated user.
 *
 * Steps:
 *   1. Evict the token from any OTHER user (cross-user reassignment).
 *   2. Upsert the token with is_active = true (reactivates if previously
 *      deactivated by an FCM unregistered error).
 *
 * Multi-device: multiple tokens per user per platform are now allowed.
 * Old 1-per-platform eviction has been removed (M2).
 */
export async function registerTokenAction(
  fcmToken: string,
  platform: "web" | "android" | "ios" = "web",
  accessToken?: string,
  appVersion?: string
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    console.warn("[notification-tokens] Invalid FCM token detected in registerTokenAction.");
    return { success: false, error: "Invalid FCM token." };
  }

  // Enforce reasonable length to prevent abuse
  if (fcmToken.length > 512) {
    console.warn("[notification-tokens] FCM token exceeds maximum length.");
    return { success: false, error: "Token exceeds maximum length." };
  }

  const allowedPlatforms = ["web", "android", "ios"] as const;
  if (!allowedPlatforms.includes(platform)) {
    return { success: false, error: "Invalid platform." };
  }

  // ── Authenticate ────────────────────────────────────────────────────────
  let user: import("@supabase/supabase-js").User | null = null;
  const supabaseAdmin = createAdminClient();

  if (accessToken) {
    const { data: authData } = await supabaseAdmin.auth.getUser(accessToken);
    user = authData?.user || null;
  } else {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    user = authData?.user || null;
  }

  if (!user) {
    console.warn("[notification-tokens] registerTokenAction failed because auth.getUser returned no user.");
    return { success: false, error: "Not authenticated." };
  }

  // ── Step 1: Evict token from OTHER users ────────────────────────────────
  // FCM tokens are device-scoped. If another account previously logged in
  // on this device, the same token may exist under a different user_id.
  // Remove it from the old owner to prevent duplicate pushes across accounts.
  await supabaseAdmin
    .from("notification_tokens")
    .delete()
    .eq("fcm_token", fcmToken.trim())
    .neq("user_id", user.id);

  await supabaseAdmin
    .from("device_tokens")
    .delete()
    .eq("device_token", fcmToken.trim())
    .neq("user_id", user.id);

  // ── Step 2: Upsert token (reactivates if previously deactivated) ────────
  // Multi-device: we no longer evict other tokens on the same platform.
  // A user with a phone + tablet should keep both tokens active.
  const { error } = await supabaseAdmin.from("notification_tokens").upsert(
    {
      user_id: user.id,
      fcm_token: fcmToken.trim(),
      platform,
      is_active: true,
      app_version: appVersion || null,
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

  // Keep legacy device_tokens table in sync
  const { error: deviceError } = await supabaseAdmin.from("device_tokens").upsert(
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

  if (deviceError) {
    console.error("[notification-tokens] Device token upsert failed:", deviceError.message);
    return { success: false, error: "Failed to register device token." };
  }

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
  explicitUserId?: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    return { success: false, error: "Invalid FCM token." };
  }

  const supabaseAdmin = createAdminClient();

  // Prefer the explicitly supplied userId (needed for post-signout calls)
  let userId = explicitUserId;
  if (!userId) {
    if (accessToken) {
      const { data: authData } = await supabaseAdmin.auth.getUser(accessToken);
      userId = authData?.user?.id;
    } else {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id;
    }
  }

  if (!userId) {
    console.warn("[notification-tokens] deleteTokenAction called with no userId and no active session — skipping.");
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabaseAdmin
    .from("notification_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("fcm_token", fcmToken.trim());

  if (error) {
    console.error("[notification-tokens] Deletion failed:", error.message);
    return { success: false, error: "Failed to delete token." };
  }

  // Keep legacy device_tokens in sync
  await supabaseAdmin
    .from("device_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("device_token", fcmToken.trim());

  return { success: true };
}
