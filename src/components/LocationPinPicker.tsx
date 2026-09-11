"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { getAccuracyLevel } from "@/lib/geolocation";

interface LocationPinPickerProps {
  initialLat: number;
  initialLng: number;
  accuracy?: number;
  onConfirm: (coords: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

interface LeafletLatLng {
  lat: number;
  lng: number;
}

interface LeafletMouseEvent {
  latlng?: LeafletLatLng;
}

interface LeafletMarker {
  getLatLng: () => LeafletLatLng;
  setLatLng: (latlng: LeafletLatLng) => void;
  on: (event: string, fn: () => void) => void;
}

interface LeafletMap {
  remove?: () => void;
  invalidateSize: () => void;
  on: (event: string, fn: (e: LeafletMouseEvent) => void) => void;
}

interface LeafletDivIconOptions {
  className?: string;
  html?: string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
}

interface LeafletMarkerOptions {
  draggable?: boolean;
  icon?: unknown;
}

interface LeafletMapOptions {
  center: [number, number];
  zoom: number;
  zoomControl?: boolean;
}

interface LeafletTileLayerOptions {
  attribution?: string;
  subdomains?: string;
  maxZoom?: number;
}

interface LeafletTileLayer {
  addTo: (map: LeafletMap) => LeafletTileLayer;
}

interface LeafletLibrary {
  map: (element: HTMLElement, options: LeafletMapOptions) => LeafletMap;
  tileLayer: (urlTemplate: string, options?: LeafletTileLayerOptions) => LeafletTileLayer;
  divIcon: (options: LeafletDivIconOptions) => unknown;
  marker: (
    latlng: [number, number],
    options?: LeafletMarkerOptions
  ) => LeafletMarker & { addTo: (map: LeafletMap) => LeafletMarker };
}

declare global {
  interface Window {
    L?: LeafletLibrary;
  }
}

function whenElementSized(el: HTMLElement, cb: () => void) {
  let tries = 0;
  const tick = () => {
    if (el.clientHeight > 0 || el.clientWidth > 0 || tries >= 60) {
      cb();
    } else {
      tries += 1;
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function deferMapResize(instance: google.maps.Map | LeafletMap, lat: number, lng: number) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (window.google?.maps) {
        google.maps.event.trigger(instance as google.maps.Map, "resize");
        (instance as google.maps.Map).setCenter({ lat, lng });
      } else if ("invalidateSize" in instance) {
        instance.invalidateSize();
      }
    });
  });
}

export default function LocationPinPicker({
  initialLat,
  initialLng,
  accuracy = 10,
  onConfirm,
  onCancel,
}: LocationPinPickerProps) {
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  const [isLeafletReady, setIsLeafletReady] = useState<boolean>(
    () => typeof window !== "undefined" && !!window.L
  );
  const [engine, setEngine] = useState<"loading" | "google" | "leaflet" | "unavailable">("loading");
  const mapInstanceRef = useRef<google.maps.Map | LeafletMap | null>(null);
  const markerRef = useRef<google.maps.Marker | LeafletMarker | null>(null);

  const accuracyInfo = getAccuracyLevel(accuracy);

  // Load Leaflet dynamically as fallback if Google Maps API key is missing or invalid
  useEffect(() => {
    if (isGoogleLoaded && !googleLoadError) return;

    // Ensure Leaflet CSS is injected
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (typeof window !== "undefined" && window.L) {
      if (!isLeafletReady) {
        queueMicrotask(() => setIsLeafletReady(true));
      }
      return;
    }

    // Load Leaflet JS
    let cleanup: (() => void) | undefined;
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setIsLeafletReady(true);
      document.head.appendChild(script);
    } else {
      const existingScript = document.getElementById("leaflet-js");
      if (window.L) {
        if (!isLeafletReady) {
          queueMicrotask(() => setIsLeafletReady(true));
        }
      } else {
        const handleLoad = () => setIsLeafletReady(true);
        existingScript?.addEventListener("load", handleLoad);
        cleanup = () => existingScript?.removeEventListener("load", handleLoad);
      }
    }

    return cleanup;
  }, [isGoogleLoaded, googleLoadError, isLeafletReady]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          if ("remove" in mapInstanceRef.current && typeof mapInstanceRef.current.remove === "function") {
            mapInstanceRef.current.remove();
          }
        } catch {
          // ignore cleanup errors
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Primary: Render Google Maps if loaded
  useEffect(() => {
    if (!isGoogleLoaded || googleLoadError) return;
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    whenElementSized(el, () => {
      if (cancelled || mapInstanceRef.current) return;

      const map = new google.maps.Map(el, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      const marker = new google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: "Drag pin to adjust service location",
      });

      const handlePosChange = () => {
        const pos = marker.getPosition();
        if (pos) {
          setCoords({ lat: pos.lat(), lng: pos.lng() });
        }
      };

      marker.addListener("dragend", handlePosChange);

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          setCoords({ lat, lng });
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setEngine("google");
      deferMapResize(map, initialLat, initialLng);
    });

    return () => {
      cancelled = true;
    };
  }, [isGoogleLoaded, initialLat, initialLng, googleLoadError]);

  // Fallback: Render Leaflet map if Google Maps is unavailable
  useEffect(() => {
    if (isGoogleLoaded && !googleLoadError) return;
    if (!isLeafletReady || !window.L) return;
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    whenElementSized(el, () => {
      if (cancelled || mapInstanceRef.current) return;
      if (!window.L) return;
      const L = window.L!;

      // Ensure container element is clean before Leaflet map init
      el.innerHTML = "";

      const map = L.map(el, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Custom DOM Pin to eliminate 404 image errors for default leaflet icons
      const customPin = L.divIcon({
        className: "custom-phs-pin",
        html: `
          <div style="
            width: 40px; 
            height: 40px; 
            background: #002261; 
            border: 3px solid #a6ce37; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 6px 16px rgba(0,0,0,0.35);
            cursor: grab;
          ">
            <span class="material-symbols-outlined" style="
              transform: rotate(45deg); 
              color: #a6ce37; 
              font-size: 22px; 
              font-weight: bold;
            ">location_on</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customPin,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e: LeafletMouseEvent) => {
        if (e.latlng) {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setEngine("leaflet");

      // Force recalculation of container size after modal layout stabilization
      timers.push(setTimeout(() => map.invalidateSize(), 100));
      timers.push(setTimeout(() => map.invalidateSize(), 400));
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isLeafletReady, isGoogleLoaded, googleLoadError, initialLat, initialLng]);

  // If no map engine becomes ready in time, fall back to a static pin preview
  useEffect(() => {
    if (engine !== "loading") return;
    const t = setTimeout(() => setEngine("unavailable"), 5000);
    return () => clearTimeout(t);
  }, [engine]);

  return (
    <div className="flex flex-col h-full min-h-56 w-full rounded-2xl overflow-hidden border border-outline-variant bg-surface-container-low shadow-inner relative animate-fade-in">
      {/* Header instructions & Accuracy badge */}
      <div className="bg-primary/95 text-on-primary px-4 py-2.5 flex items-center justify-between z-10 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary animate-pulse">
            pin_drop
          </span>
          <span className="text-[13px] font-semibold">
            Drag pin to confirm doorstep location
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${accuracyInfo.badgeClass}`}
        >
          {accuracyInfo.label}
        </span>
      </div>

      {/* Map DOM Container */}
      <div className="flex-1 relative w-full h-full min-h-0">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {engine === "loading" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-container-low/95">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-[12px] font-semibold text-on-surface-variant">Loading map...</p>
          </div>
        )}

        {engine === "unavailable" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-low/95 text-center">
            <div
              className="w-10 h-10 shrink-0"
              style={{
                width: 40,
                height: 40,
                background: "#002261",
                border: "3px solid #a6ce37",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ transform: "rotate(45deg)", color: "#a6ce37", fontSize: 22, fontWeight: 700 }}
              >
                location_on
              </span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-on-surface">Live map unavailable</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Pin is at {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — you can confirm it below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/30 flex gap-2 shrink-0 z-10">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
        >
          Back to Form
        </button>
        <button
          type="button"
          onClick={() => onConfirm(coords)}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-on-primary bg-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Confirm Pin Location
        </button>
      </div>
    </div>
  );
}
