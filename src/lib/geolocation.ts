import { Capacitor } from "@capacitor/core";
import type { GeolocationPlugin, GeolocationPosition } from "@capacitor/geolocation";

export type LocationSource = "high_accuracy" | "fused";
export type LocationAttempt = 1 | 2;

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: LocationSource;
  attempt: LocationAttempt;
  responseTimeMs?: number;
}

interface LocationError extends Error {
  code?: number;
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
    const formattedAcc = accuracy > 1000 ? "Network Estimate" : `~${Math.round(accuracy)}m`;
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
  const { location } = await Geolocation.checkPermissions();
  if (location !== "granted") {
    const reqStatus = await Geolocation.requestPermissions();
    if (reqStatus.location !== "granted") {
      throw new Error("Location permission denied. Please enable location access in Settings and try again.");
    }
  }

  const start = Date.now();
  try {
    return await requestNativePosition(Geolocation, true, 20000, 0, start, "high_accuracy", 1);
  } catch {
    return requestNativePosition(Geolocation, false, 15000, 300000, start, "fused", 2);
  }
}

async function requestNativePosition(
  Geolocation: GeolocationPlugin,
  enableHighAccuracy: boolean,
  timeout: number,
  maximumAge: number,
  startTime: number,
  source: LocationSource,
  attempt: LocationAttempt
): Promise<LocationResult> {
  const position: GeolocationPosition = await Geolocation.getCurrentPosition({
    enableHighAccuracy,
    timeout,
    maximumAge,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
    source,
    attempt,
    responseTimeMs: Date.now() - startTime,
  };
}

async function getBrowserDeviceLocation(): Promise<LocationResult> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser.");
  }

  const start = Date.now();

  try {
    return await requestBrowserPosition(true, 20000, 0, start, "high_accuracy", 1);
  } catch (firstError) {
    if (!shouldRetry(firstError)) {
      throw firstError;
    }
    return requestBrowserPosition(false, 15000, 300000, start, "fused", 2);
  }
}

function requestBrowserPosition(
  enableHighAccuracy: boolean,
  timeout: number,
  maximumAge: number,
  startTime: number,
  source: LocationSource,
  attempt: LocationAttempt
): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          source,
          attempt,
          responseTimeMs: Date.now() - startTime,
        });
      },
      (err) => {
        reject(buildPositionError(err));
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

function buildPositionError(err: GeolocationPositionError): Error {
  let msg = "Failed to obtain device location.";
  if (err.code === err.PERMISSION_DENIED) {
    msg = "Location permission denied.";
  } else if (err.code === err.POSITION_UNAVAILABLE) {
    msg = "Location position unavailable.";
  } else if (err.code === err.TIMEOUT) {
    msg = "Location request timed out.";
  }
  const error = new Error(msg) as LocationError;
  error.code = err.code;
  return error;
}

function shouldRetry(err: unknown): boolean {
  const code = err instanceof Error ? (err as LocationError).code : undefined;
  return code === 2 || code === 3;
}