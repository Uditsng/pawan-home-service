"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";
import { registerTokenAction, deleteTokenAction } from "@/app/actions/notification-tokens";
import { reportNotificationReceipt } from "@/app/actions/notification-receipts";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { channelForType, NOTIFICATION_CHANNELS } from "@/lib/notifications/types";
import type { NotificationType } from "@/lib/types";
import type { Importance, Visibility } from "@capacitor/push-notifications";

interface ReceiptSignature {
  type: NotificationType;
  metadata: Record<string, unknown>;
  bookingId: string | null;
  campaignId: string | null;
}

// Extract the receipt signature from a push/local notification data payload.
// The FCM data payload carries `type` + a JSON `metadata` string; booking refs
// may appear top-level (legacy) or inside metadata (current).
function receiptSignatureFromData(data: Record<string, unknown> | null | undefined): ReceiptSignature {
  let metadata: Record<string, unknown> = {};
  if (data && data.metadata) {
    if (typeof data.metadata === "string") {
      try {
        metadata = JSON.parse(data.metadata) as Record<string, unknown>;
      } catch {
        metadata = {};
      }
    } else {
      metadata = data.metadata as Record<string, unknown>;
    }
  }
  const bookingId = (metadata?.booking_id as string) || (data?.booking_id as string) || null;
  const campaignId = (metadata?.campaign_id as string) || null;
  const type = ((data?.type as string) || "general") as NotificationType;
  return { type, metadata, bookingId, campaignId };
}

export default function MobileSetup() {
  const pathname = usePathname();
  const router = useRouter();
  // Stable ref so the push notification effect (dep=[]) always has a current router
  const routerRef = useRef(router);
  const currentSignedInUserIdRef = useRef<string | null>(null);
  useEffect(() => { routerRef.current = router; }, [router]);

  const invalidateCacheKeys = useCallback(async (bookingId?: string | null) => {
    try {
      const { storageService } = await import("@/lib/storage/StorageService");
      const userId = currentSignedInUserIdRef.current;
      const keys = ["notifications", "booking_active", "current_job", "wallet", "bookings"];
      if (userId) {
        keys.push(`partner_jobs_${userId}`);
      }
      if (bookingId) {
        keys.push(`booking_detail_${bookingId}`);
      }
      for (const key of keys) {
        await storageService.remove(`phs_cache_${key}`);
      }
      window.dispatchEvent(new CustomEvent("phs-cache-invalidated"));
    } catch (err) {
      console.error("[Push] Cache invalidation failed:", err);
    }
  }, []);

  // ─── 0. Keep native splash visible while React hydrates ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    const keepNativeSplash = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.show();
      } catch {
        // Not on native or plugin unavailable — ignore
      }
    };
    keepNativeSplash();
  }, []);

  // ─── 1. Handle Back Button Listener (Depends on path changes) ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    let backButtonListener: PluginListenerHandle | null = null;

    const initBackButton = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");

        if (backButtonListener) {
          backButtonListener.remove();
        }

        backButtonListener = await App.addListener("backButton", (data) => {
          if (pathname === "/login" || pathname === "/register") {
            routerRef.current.push("/");
          } else {
            const exitPaths = ["/customer/dashboard", "/partner/dashboard", "/admin/dashboard", "/"];
            
            if (exitPaths.includes(pathname) || !data.canGoBack) {
              App.exitApp();
            } else {
              window.history.back();
            }
          }
        });
      } catch (err) {
        console.error("Failed to initialize Capacitor backButton listener:", err);
      }
    };

    initBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [pathname]);

  // ─── 2. Handle Push Notifications & Local Notifications (Run once on mount) ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    let registrationListener: PluginListenerHandle | null = null;
    let errorListener: PluginListenerHandle | null = null;
    let receiveListener: PluginListenerHandle | null = null;
    let actionListener: PluginListenerHandle | null = null;
    let localActionListener: PluginListenerHandle | null = null;

    const initPushNotifications = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        // 2a. Request permissions
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        let localPermStatus = await LocalNotifications.checkPermissions();
        if (localPermStatus.display === "prompt") {
          localPermStatus = await LocalNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("[Push] Push notification permissions denied by user.", permStatus);
          return;
        }

        // 2b. Create the custom notification channels for Android FIRST.
        // Channels must exist before register() is called so any notification
        // delivered immediately after registration uses the correct channel + sound.
        // The map lives in @/lib/notifications/types.ts (single source of truth) —
        // Android locks channels after creation, so only fresh installs see changes.
        if (Capacitor.getPlatform() === "android") {
          for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
            try {
              await PushNotifications.createChannel({
                id: channel.id,
                name: channel.name,
                description: channel.description,
                importance: channel.importance as Importance, // 5 = MAX, 4 = HIGH, 3 = DEFAULT
                visibility: channel.visibility as Visibility, // Visibility.PUBLIC (1)
                // Pass a custom sound only when one exists; omitting falls back
                // to the OS default for the channel.
                ...(channel.sound && channel.sound !== "default" ? { sound: channel.sound } : {}),
                vibration: channel.vibration,
              });
            } catch (channelErr) {
              console.error(`[Push] Failed to create notification channel "${channel.id}":`, channelErr);
            }
          }
        }

        // 2b2. Attach registration listeners first so we never miss the registration event.
        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() as "android" | "ios";
          try {
            let appVersion: string | undefined;
            try {
              const { App } = await import("@capacitor/app");
              const info = await App.getInfo();
              appVersion = info.version || undefined;
            } catch {
              // App plugin unavailable — app_version stays null
            }

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token || undefined;
            const res = await registerTokenAction(token.value, platform, accessToken, appVersion);
            if (res.success) {
              localStorage.setItem("fcm_token", token.value);
            } else {
              console.error("[Push] Server failed to register token:", res.error);
            }
          } catch (serverErr) {
            console.error("[Push] registerTokenAction action failed:", serverErr);
          }
        });

        // 2e. On registration error
        errorListener = await PushNotifications.addListener("registrationError", () => {});

        // 2e2. Register on mount if user is already logged in (race-free check)
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await PushNotifications.register();
        }

        // 2f. Handle foreground notifications (app is active)
        receiveListener = await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          const signature = receiptSignatureFromData(notification.data);
          const channel = channelForType(signature.type);

          // Log structured pipeline stage 6 (OS / foreground client receipt)
          // Invalidate cache immediately on receiving a notification in the foreground
          // to fix caching/outdated UI issue
          await invalidateCacheKeys(signature.bookingId);

          // Soft receipt: the message reached the active app → ledger "delivered".
          void reportNotificationReceipt({
            event: "delivered",
            type: signature.type,
            metadata: signature.metadata,
          });

          // Schedule local notification to display manually in foreground
          try {
            const isAndroid = Capacitor.getPlatform() === "android";
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || "PHS Notification",
                  body: notification.body || "",
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 50) },
                  extra: notification.data,
                  // On Android the channel (created from the canonical
                  // NOTIFICATION_CHANNELS map) governs sound + importance, so we
                  // pass only the channelId. On iOS the sound file is explicit.
                  ...(isAndroid
                    ? { channelId: channel.id }
                    : { sound: channel.sound === "service_alert" ? "service_alert.wav" : "default" }),
                }
              ]
            });
          } catch (localErr) {
            console.error("[Push] Failed to schedule local notification:", localErr);
          }
        });

        // 2g. Routing Helper for click actions with normal authorization checks
        const handleNotificationClick = async (data: Record<string, unknown> | null | undefined) => {
          if (!data) return;

          let bookingId: unknown = data.booking_id;
          
          if (!bookingId && data.metadata) {
            if (typeof data.metadata === "string") {
              try {
                bookingId = (JSON.parse(data.metadata) as Record<string, unknown>)?.booking_id;
              } catch {
                // ignore
              }
            } else {
              bookingId = (data.metadata as Record<string, unknown>)?.booking_id;
            }
          }

          // Invalidate cache on click/action to make sure the target screens show fresh data
          await invalidateCacheKeys(bookingId ? String(bookingId) : undefined);

          if (bookingId) {
            const bookingIdStr = String(bookingId);
            const currentPath = window.location.pathname;

            // Route to correct dashboard. Next.js middleware and target pages
            // will enforce strict authentication and ownership checks.
            if (currentPath.startsWith("/partner")) {
              routerRef.current.push("/partner/jobs");
            } else if (currentPath.startsWith("/admin")) {
              routerRef.current.push("/admin/bookings");
            } else {
              routerRef.current.push(`/customer/bookings/${bookingIdStr}/tracking`);
            }
          }
        };

        // 2h. Handle click actions (app is backgrounded or killed, user taps push notification)
        actionListener = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const signature = receiptSignatureFromData(action.notification.data);
          void reportNotificationReceipt({
            event: "opened",
            type: signature.type,
            metadata: signature.metadata,
          });
          handleNotificationClick(action.notification.data);
        });

        // 2i. Handle local notification click actions (foreground notification tap)
        localActionListener = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          const signature = receiptSignatureFromData(action.notification.extra);
          void reportNotificationReceipt({
            event: "opened",
            type: signature.type,
            metadata: signature.metadata,
          });
          handleNotificationClick(action.notification.extra);
        });

      } catch (err) {
        console.error("Failed to initialize Capacitor Push/Local Notifications:", err);
      }
    };

    initPushNotifications();

    return () => {
      registrationListener?.remove();
      errorListener?.remove();
      receiveListener?.remove();
      actionListener?.remove();
      localActionListener?.remove();
    };
  }, [invalidateCacheKeys]); // Run once on mount only — router is captured in stable closure via handleNotificationClick


  // ─── 3. Auth Listener for Dynamic Token Setup & Cleanup ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();

    const handleAuthChange = async (event: string, session: Session | null) => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      if (session?.user) {
        currentSignedInUserIdRef.current = session.user.id;
      }

      if (event === "SIGNED_IN") {
        if (session?.user) {
          try {
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === "prompt") {
              permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive === "granted") {
              await PushNotifications.register();
            }
          } catch (err) {
            console.error("Failed to register push token on sign in:", err);
          }
        }
      } else if (event === "SIGNED_OUT") {
        try {
          const token = localStorage.getItem("fcm_token");
          const userId = session?.user?.id ?? currentSignedInUserIdRef.current ?? undefined;
          if (token && userId) {
            await deleteTokenAction(token, userId);
            localStorage.removeItem("fcm_token");
            currentSignedInUserIdRef.current = null;
          } else {
            console.warn("[Push] SIGNED_OUT cleanup skipped because no cached fcm_token or no userId is available.");
          }
        } catch (err) {
          console.error("Failed to clean up push token on sign out:", err);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

