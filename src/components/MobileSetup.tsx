"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";

export default function MobileSetup() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let backButtonListener: PluginListenerHandle | null = null;

    const initCapacitor = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        
        // Remove existing listener if any to avoid duplicates on route change
        if (backButtonListener) {
          backButtonListener.remove();
        }

        backButtonListener = await App.addListener("backButton", (data) => {
          // Paths where the back button should exit the app instead of navigating back
          const exitPaths = ["/dashboard", "/partner/dashboard", "/admin/dashboard", "/login", "/"];
          
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

    initCapacitor();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [pathname]);

  return null;
}
