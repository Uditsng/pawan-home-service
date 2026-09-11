"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

let loadPromise: Promise<boolean> | null = null;

function isKeyValid(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 10 && !trimmed.startsWith("YOUR_");
}

function startLoading(): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!isKeyValid(apiKey)) return Promise.resolve(false);

  if (!loadPromise) {
    loadPromise = new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if (window.google?.maps) {
        resolve(true);
        return;
      }

      // Catch Google's authentication failure callback (e.g. invalid key or unactivated API)
      window.gm_authFailure = () => {
        console.warn("[GoogleMaps] Key authentication failed. Falling back to Leaflet map.");
        resolve(false);
      };

      const scriptId = "google-maps-js-sdk";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey?.trim()}`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.onload = () => {
        if (window.google?.maps) resolve(true);
        else resolve(false);
      };

      script.onerror = () => {
        console.warn("[GoogleMaps] Script load error. Falling back to Leaflet map.");
        resolve(false);
      };
    });
  }

  return loadPromise;
}

export function useGoogleMaps(): { isLoaded: boolean; loadError: boolean } {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    startLoading().then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setIsLoaded(true);
        setLoadError(false);
      } else {
        setIsLoaded(false);
        setLoadError(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isLoaded, loadError };
}