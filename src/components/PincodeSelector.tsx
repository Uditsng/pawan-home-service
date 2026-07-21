"use client";

import { useState, useEffect } from "react";

interface PostOffice {
  Name: string;
  Pincode: string;
  District: string;
  State: string;
}

export interface SelectedArea {
  pincode: string;
  locality: string;
  city: string;
}

export default function PincodeSelector({
  initialAreas = []
}: {
  initialAreas?: SelectedArea[];
}) {
  const [pincodeInput, setPincodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PostOffice[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>(initialAreas);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAreas = async () => {
      if (pincodeInput.length !== 6 || !/^\d+$/.test(pincodeInput)) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pincode/${pincodeInput}`);
        const data = await res.json();

        if (!res.ok) {
          setSuggestions([]);
          setError(data?.error || "Invalid pincode or no areas found.");
          return;
        }

        const offices: PostOffice[] = Array.isArray(data.offices) ? data.offices : [];
        if (offices.length > 0) {
          setSuggestions(offices);
        } else {
          setSuggestions([]);
          setError("Invalid pincode or no areas found.");
        }
      } catch {
        setSuggestions([]);
        setError("Failed to fetch areas. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchAreas, 500);
    return () => clearTimeout(debounceTimer);
  }, [pincodeInput]);

  const toggleArea = (office: PostOffice) => {
    const exists = selectedAreas.some(
      (a) => a.pincode === office.Pincode && a.locality === office.Name
    );

    if (exists) {
      setSelectedAreas(selectedAreas.filter(
        (a) => !(a.pincode === office.Pincode && a.locality === office.Name)
      ));
    } else {
      setSelectedAreas([
        ...selectedAreas,
        { pincode: office.Pincode, locality: office.Name, city: office.District }
      ]);
    }
  };

  const removeArea = (pincode: string, locality: string) => {
    setSelectedAreas(selectedAreas.filter(
      (a) => !(a.pincode === pincode && a.locality === locality)
    ));
  };

  return (
    <div className="space-y-4 w-full">
      <input 
        type="hidden" 
        name="service_areas" 
        value={JSON.stringify(selectedAreas)} 
      />

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-on-surface-variant/50 group-focus-within:text-secondary transition-colors">
            pin_drop
          </span>
        </div>
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit Pincode"
          value={pincodeInput}
          onChange={(e) => setPincodeInput(e.target.value)}
          className="w-full pl-11 pr-11 py-4 bg-surface-container-lowest rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border-2 border-outline-variant/30 focus:border-secondary/50 shadow-sm placeholder:text-[#94a3b8]"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 font-medium pl-1">{error}</p>}

      {suggestions.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Suggested Localities for {pincodeInput}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((office) => {
              const isSelected = selectedAreas.some(
                (a) => a.pincode === office.Pincode && a.locality === office.Name
              );
              return (
                <button
                  type="button"
                  key={`${office.Pincode}-${office.Name}`}
                  onClick={() => toggleArea(office)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                    isSelected 
                      ? "bg-secondary/10 border-secondary text-secondary shadow-[0_2px_8px_rgba(42,245,152,0.15)]" 
                      : "bg-surface border-outline-variant/50 text-on-surface-variant hover:border-secondary/50"
                  }`}
                >
                  {office.Name} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedAreas.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Selected Service Areas
          </p>
          <div className="flex flex-col gap-2">
            {selectedAreas.map((area) => (
              <div 
                key={`${area.pincode}-${area.locality}`}
                className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant/30"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined text-secondary text-[18px]">location_on</span>
                  {area.locality} <span className="text-on-surface-variant text-xs">({area.pincode})</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeArea(area.pincode, area.locality)}
                  className="text-on-surface-variant hover:text-red-500 transition-colors p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
