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

  return { success: true };
}

// ─── Delete Token ───────────────────────────────────────────

/**
 * Remove an FCM token for the current user (e.g., on logout
 * or when the token is rotated by FCM).
 */
export async function deleteTokenAction(
  fcmToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    return { success: false, error: "Invalid FCM token." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("notification_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("fcm_token", fcmToken.trim());

  if (error) {
    console.error("[notification-tokens] Deletion failed:", error.message);
    return { success: false, error: "Failed to delete token." };
  }

  return { success: true };
}
