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

  // ─── 2. Handle Push Notifications (Run once on mount) ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    let registrationListener: PluginListenerHandle | null = null;
    let errorListener: PluginListenerHandle | null = null;
    let receiveListener: PluginListenerHandle | null = null;
    let actionListener: PluginListenerHandle | null = null;

    const initPushNotifications = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import("@capacitor/push-notifications");

        // 2a. Request permission
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("[Push] Push notification permissions denied by user.");
          return;
        }

        // 2b. Register with FCM/APNs
        await PushNotifications.register();

        // 2c. On successful registration, save token in Supabase
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

        // 2d. On registration error
        errorListener = await PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Registration error:", err.error);
        });

        // 2e. Handle foreground notifications (app is active)
        receiveListener = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[Push] Notification received in foreground:", notification);
          // Foreground notifications are presented via in-app banner or system notification tray depending on presentationOptions
        });

        // 2f. Handle click actions (app is backgrounded or killed, user taps notification)
        actionListener = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[Push] Action performed on notification:", action);
          
          const data = action.notification.data;
          const bookingId = data?.booking_id || (typeof data?.metadata === "string" ? JSON.parse(data.metadata)?.booking_id : data?.metadata?.booking_id);

          if (bookingId) {
            const currentPath = window.location.pathname;
            
            if (currentPath.startsWith("/partner")) {
              router.push("/partner/jobs");
            } else if (currentPath.startsWith("/admin")) {
              router.push("/admin/bookings");
            } else {
              router.push(`/customer/bookings/${bookingId}/tracking`);
            }
          }
        });

      } catch (err) {
        console.error("Failed to initialize Capacitor Push Notifications:", err);
      }
    };

    initPushNotifications();

    return () => {
      registrationListener?.remove();
      errorListener?.remove();
      receiveListener?.remove();
      actionListener?.remove();
    };
  }, [router]);

  return null;
}
