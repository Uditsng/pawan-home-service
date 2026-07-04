"use client";

import { useEffect, useRef } from "react";
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
  useEffect(() => { routerRef.current = router; }, [router]);

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
        if (!Capacitor.isNativePlatform()) return;

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
          console.warn("[Push] Push notification permissions denied by user.");
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
            console.log("[Push] Custom notification channels 'service_assignment' & 'phs_bookings' created/verified.");
          } catch (channelErr) {
            console.error("[Push] Failed to create custom notification channels:", channelErr);
          }
        }

        // 2b2. Register with FCM/APNs (after channels are created)
        await PushNotifications.register();

        // 2d. On successful registration, save token in Supabase
        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() as "android" | "ios";
          
          console.log(`[Push] Device registered. Token: ${token.value.substring(0, 10)}... Platform: ${platform}`);
          try {
            const res = await registerTokenAction(token.value, platform);
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
        errorListener = await PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Registration error:", err.error);
        });

        // 2f. Handle foreground notifications (app is active)
        receiveListener = await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          console.log("[Push] Notification received in foreground:", notification);
          
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
          console.log(`[Notification Pipeline] [6. OS_DELIVERY] State: Foreground, Title: "${notification.title}", Type: ${type}`);

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
        const handleNotificationClick = (data: Record<string, unknown> | null | undefined) => {
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

          // Log structured pipeline stage 7 (User opened notification / tap)
          console.log(`[Notification Pipeline] [7. TAP_ACTION] Source: Push, BookingId: ${bookingId}, Type: ${type}`);

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
          console.log("[Push] Action performed on push notification:", action);
          handleNotificationClick(action.notification.data);
        });

        // 2i. Handle local notification click actions (foreground notification tap)
        localActionListener = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          console.log("[Push] Action performed on local notification:", action);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only — router is captured in stable closure via handleNotificationClick


  // ─── 3. Auth Listener for Dynamic Token Setup & Cleanup ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();

    const handleAuthChange = async (event: string, session: Session | null) => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (session?.user) {
          try {
            console.log(`[Notification Pipeline] [AUTH_CHANGE] SIGNED_IN. Registering push notifications.`);
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
          console.log(`[Notification Pipeline] [AUTH_CHANGE] SIGNED_OUT. Cleaning up push token.`);
          const token = localStorage.getItem("fcm_token");
          // Capture userId from the session that just ended — Supabase fires SIGNED_OUT
          // after clearing auth state, so auth.getUser() returns null on the server.
          // We pass it explicitly so the server action can still delete the DB row.
          const userId = session?.user?.id ?? undefined;
          if (token) {
            await deleteTokenAction(token, userId);
            localStorage.removeItem("fcm_token");
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

