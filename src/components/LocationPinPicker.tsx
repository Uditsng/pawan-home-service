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

declare global {
  interface Window {
    L?: any;
  }
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

  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
      setIsLeafletReady(true);
      return;
    }

    // Load Leaflet JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setIsLeafletReady(true);
      document.head.appendChild(script);
    } else {
      const existingScript = document.getElementById("leaflet-js");
      if (window.L) {
        setIsLeafletReady(true);
      } else {
        existingScript?.addEventListener("load", () => setIsLeafletReady(true));
      }
    }
  }, [isGoogleLoaded, googleLoadError]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove?.();
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
    if (!isGoogleLoaded || googleLoadError || !containerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = new google.maps.Map(containerRef.current, {
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
    }
  }, [isGoogleLoaded, initialLat, initialLng, googleLoadError]);

  // Fallback: Render Leaflet map if Google Maps is unavailable
  useEffect(() => {
    if (isGoogleLoaded && !googleLoadError) return;
    if (!isLeafletReady || !containerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const L = window.L;

      // Ensure container element is clean before Leaflet map init
      containerRef.current.innerHTML = "";

      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

      map.on("click", (e: any) => {
        if (e.latlng) {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Force recalculation of container size after modal layout stabilization
      const t1 = setTimeout(() => map.invalidateSize(), 100);
      const t2 = setTimeout(() => map.invalidateSize(), 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isLeafletReady, isGoogleLoaded, googleLoadError, initialLat, initialLng]);

  return (
    <div className="flex flex-col h-[380px] w-full rounded-2xl overflow-hidden border border-outline-variant bg-surface-container-low shadow-inner relative animate-fade-in">
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
      <div className="flex-1 relative w-full h-full min-h-[280px]">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
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

