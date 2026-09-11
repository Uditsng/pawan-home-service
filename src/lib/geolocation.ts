import { Capacitor } from "@capacitor/core";

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type AccuracyLevel = "good" | "acceptable" | "poor";

export function getAccuracyLevel(accuracy: number): {
  level: AccuracyLevel;
  label: string;
  badgeClass: string;
} {
  if (accuracy <= 30) {
    return {
      level: "good",
      label: `Good Accuracy (~${Math.round(accuracy)}m)`,
      badgeClass: "bg-success/15 text-success border-success/30",
    };
  } else if (accuracy <= 100) {
    return {
      level: "acceptable",
      label: `Acceptable (~${Math.round(accuracy)}m) - Please verify pin`,
      badgeClass: "bg-warning/15 text-warning border-warning/30",
    };
  } else {
    const formattedAcc = accuracy > 1000 ? "IP Coarse Location" : `~${Math.round(accuracy)}m`;
    return {
      level: "poor",
      label: `Low Accuracy (${formattedAcc}) - Drag pin to exact spot`,
      badgeClass: "bg-error/15 text-error border-error/30",
    };
  }
}

export async function getDeviceLocation(): Promise<LocationResult> {
  if (Capacitor.isNativePlatform()) {
    return getNativeDeviceLocation();
  }
  return getBrowserDeviceLocation();
}

async function getNativeDeviceLocation(): Promise<LocationResult> {
  const { Geolocation } = await import("@capacitor/geolocation");

  const permStatus = await Geolocation.checkPermissions();
  if (permStatus.location !== "granted") {
    const reqStatus = await Geolocation.requestPermissions();
    if (reqStatus.location !== "granted") {
      throw new Error("Location permission denied. Please enable location access in Settings and try again.");
    }
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

async function getBrowserDeviceLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = "Failed to obtain device location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location position unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}