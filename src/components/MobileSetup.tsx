"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";
import { registerTokenAction } from "@/app/actions/notification-tokens";

export default function MobileSetup() {
  const pathname = usePathname();
  const router = useRouter();

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

        // 2b. Register with FCM/APNs
        await PushNotifications.register();

        // 2c. Create the custom notification channel for Android
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
            console.log("[Push] Custom notification channel 'service_assignment' created/verified.");
          } catch (channelErr) {
            console.error("[Push] Failed to create custom notification channel:", channelErr);
          }
        }

        // 2d. On successful registration, save token in Supabase
        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() as "android" | "ios";
          console.log(`[Push] Device registered. Token: ${token.value.substring(0, 10)}... Platform: ${platform}`);
          
          try {
            const res = await registerTokenAction(token.value, platform);
            if (!res.success) {
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
          const isPartnerJobAlert = type === "new_job_offer" || (type === "partner_assigned" && isPartnerRoute);

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
                  sound: isPartnerJobAlert ? "service_alert.wav" : undefined,
                  channelId: isPartnerJobAlert ? "service_assignment" : "phs_bookings",
                }
              ]
            });
            console.log("[Push] Scheduled local notification for foreground display. Custom sound: " + isPartnerJobAlert);
          } catch (localErr) {
            console.error("[Push] Failed to schedule local notification:", localErr);
          }
        });

        // 2g. Routing Helper for click actions
        const handleNotificationClick = (data: Record<string, unknown> | null | undefined) => {
          console.log("[Push/Local] Routing click action with data:", data);
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

          if (bookingId) {
            const bookingIdStr = String(bookingId);
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/partner")) {
              router.push("/partner/jobs");
            } else if (currentPath.startsWith("/admin")) {
              router.push("/admin/bookings");
            } else {
              router.push(`/customer/bookings/${bookingIdStr}/tracking`);
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
  }, [router]);

  return null;
}
