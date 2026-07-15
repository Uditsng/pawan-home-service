"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";
import { registerTokenAction, deleteTokenAction } from "@/app/actions/notification-tokens";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";

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
          const exitPaths = ["/customer/dashboard", "/partner/dashboard", "/admin/dashboard", "/login", "/"];
          
          if (exitPaths.includes(pathname) || !data.canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
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

        const platform = Capacitor.getPlatform();

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

        // 2b. Create the custom notification channels for Android FIRST
        // Channels must exist before register() is called so any notification
        // delivered immediately after registration uses the correct channel + sound.
        if (Capacitor.getPlatform() === "android") {
          try {
            await PushNotifications.createChannel({
              id: "service_assignment",
              name: "New Service Requests",
              description: "High importance alerts for new jobs assigned to partners",
              importance: 5, // Importance.HIGH/MAX (5)
              visibility: 1, // Visibility.PUBLIC (1)
              sound: "service_alert", // Maps to android/app/src/main/res/raw/service_alert.wav
              vibration: true,
            });
            await PushNotifications.createChannel({
              id: "phs_bookings",
              name: "Bookings and General",
              description: "General notifications for bookings and account updates",
              importance: 4, // Importance.HIGH (4)
              visibility: 1, // Visibility.PUBLIC (1)
              vibration: true,
            });

          } catch (channelErr) {
            console.error("[Push] Failed to create custom notification channels:", channelErr);
          }
        }

        // 2b2. Attach registration listeners first so we never miss the registration event.
        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() as "android" | "ios";
          try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token || undefined;
            const res = await registerTokenAction(token.value, platform, accessToken);
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
          
          const type = notification.data?.type;
          const currentPath = window.location.pathname;
          const isPartnerRoute = currentPath.startsWith("/partner");
          // A partner receives new_job_offer and partner_assigned regardless of
          // what screen they are on. extension_requested is also a high-alert type.
          const isPartnerJobAlert =
            type === "new_job_offer" ||
            type === "partner_assigned" ||
            (type === "extension_requested" && isPartnerRoute);

          // Log structured pipeline stage 6 (OS / foreground client receipt)
          // Invalidate cache immediately on receiving a notification in the foreground
          // to fix caching/outdated UI issue
          const bookingId = notification.data?.booking_id as string | undefined;
          await invalidateCacheKeys(bookingId);

          // Schedule local notification to display manually in foreground
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || "PHS Notification",
                  body: notification.body || "",
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 50) },
                  extra: notification.data,
                  // Play custom sound and vibrate only for partner job alerts in the partner portal
                  sound: isPartnerJobAlert ? (Capacitor.getPlatform() === "android" ? "service_alert" : "service_alert.wav") : undefined,
                  channelId: isPartnerJobAlert ? "service_assignment" : "phs_bookings",
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

          const type = data.type as string | undefined;

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
          handleNotificationClick(action.notification.data);
        });

        // 2i. Handle local notification click actions (foreground notification tap)
        localActionListener = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
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
  }, []); // Run once on mount only — router is captured in stable closure via handleNotificationClick


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

