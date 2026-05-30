"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PlacePrediction, PlaceDetails, AddressComponent } from "@/lib/types/address";

interface AddressAutocompleteProps {
  onAddressSelect: (details: PlaceDetails) => void;
  placeholder?: string;
  defaultValue?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Search for your address...",
  defaultValue = "",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();

      if (data.predictions) {
        setPredictions(data.predictions);
        setIsOpen(data.predictions.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setIsOpen(false);
    setPredictions([]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      const details: PlaceDetails = await res.json();

      if (details.place_id) {
        onAddressSelect(details);
      }
    } catch {
      // Failed to fetch details
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPredictions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50 max-h-[280px] overflow-y-auto animate-[slideDown_0.15s_ease-out]">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-outline-variant/30 last:border-0
                ${activeIndex === index ? "bg-secondary/10" : "hover:bg-surface-container-low"}`}
            >
              <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 shrink-0">
                location_on
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-on-surface truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 bg-surface-container-low/50 flex items-center justify-end gap-1">
            <span className="text-[9px] text-on-surface-variant/60 uppercase tracking-widest">Powered by</span>
            <span className="text-[9px] font-bold text-on-surface-variant/80 uppercase tracking-widest">Google</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Helper: Extract specific address component from Google Place details */
export function extractAddressComponent(
  components: AddressComponent[],
  type: string
): string {
  const component = components.find((c) => c.types.includes(type));
  return component?.long_name || "";
}
