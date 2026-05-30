"use client";

import { useState, useCallback } from "react";
import AddressAutocomplete, { extractAddressComponent } from "./AddressAutocomplete";
import { saveAddress } from "@/app/actions/address";
import type { PlaceDetails } from "@/lib/types/address";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type AddressLabel = "Home" | "Work" | "Other";

const LABEL_CONFIG: { label: AddressLabel; icon: string }[] = [
  { label: "Home", icon: "home" },
  { label: "Work", icon: "work" },
  { label: "Other", icon: "location_on" },
];

export default function AddAddressModal({ isOpen, onClose, onSaved }: AddAddressModalProps) {
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>("Home");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [addressLine2, setAddressLine2] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const handleAddressSelect = useCallback((details: PlaceDetails) => {
    setSelectedPlace(details);
    setError("");
  }, []);

  const handleSave = async () => {
    if (!selectedPlace) {
      setError("Please search and select a valid address");
      return;
    }

    setIsSaving(true);
    setError("");

    const components = selectedPlace.address_components;
    const city =
      extractAddressComponent(components, "locality") ||
      extractAddressComponent(components, "administrative_area_level_2");
    const state = extractAddressComponent(components, "administrative_area_level_1");
    const pincode = extractAddressComponent(components, "postal_code");

    // Build address_line_1 from street number + route
    const streetNumber = extractAddressComponent(components, "street_number");
    const route = extractAddressComponent(components, "route");
    const sublocality = extractAddressComponent(components, "sublocality_level_1") ||
      extractAddressComponent(components, "sublocality");
    const addressLine1 = [streetNumber, route, sublocality]
      .filter(Boolean)
      .join(", ") || selectedPlace.formatted_address.split(",")[0];

    const result = await saveAddress({
      label: selectedLabel,
      formatted_address: selectedPlace.formatted_address,
      address_line_1: addressLine1,
      address_line_2: addressLine2 || undefined,
      city,
      state,
      pincode,
      latitude: selectedPlace.geometry.location.lat,
      longitude: selectedPlace.geometry.location.lng,
      place_id: selectedPlace.place_id,
      is_default: makeDefault,
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Reset form
    setSelectedPlace(null);
    setAddressLine2("");
    setSelectedLabel("Home");
    setMakeDefault(false);
    onSaved?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 pb-24 sm:pb-8 shadow-2xl animate-[slideUp_0.25s_ease-out] max-h-[90vh] overflow-y-auto">
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 ">
          <h2 className="text-[18px] font-bold text-on-surface">Add New Address</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">close</span>
          </button>
        </div>

        {/* Label selector */}
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
            Save as
          </p>
          <div className="flex gap-2">
            {LABEL_CONFIG.map(({ label, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedLabel(label)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                  ${selectedLabel === label
                    ? "bg-primary text-on-primary shadow-md"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Autocomplete search */}
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
            Search address
          </p>
          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            placeholder="Type your street, area or landmark..."
          />
        </div>

        {/* Selected address preview */}
        {selectedPlace && (
          <div className="mb-4 p-4 bg-secondary/5 border border-secondary/20 rounded-xl animate-[slideDown_0.2s_ease-out]">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 shrink-0">
                check_circle
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-on-surface mb-0.5">
                  Verified Address
                </p>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {selectedPlace.formatted_address}
                </p>
                <p className="text-[10px] text-on-surface-variant/60 mt-1 font-mono">
                  {selectedPlace.geometry.location.lat.toFixed(6)}, {selectedPlace.geometry.location.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional address details */}
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
            Floor / Flat / Landmark <span className="text-on-surface-variant/40">(optional)</span>
          </p>
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="e.g. Flat 201, 2nd Floor, Near Park"
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
          />
        </div>

        {/* Default address toggle */}
        {/* <label className="flex items-center gap-3 mb-6 cursor-pointer group">
          <div
            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200
              ${makeDefault ? "bg-primary border-primary" : "border-outline-variant group-hover:border-primary/40"}`}
          >
            {makeDefault && (
              <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
            )}
          </div>
          <span className="text-[13px] font-medium text-on-surface-variant">
            Set as default address
          </span>
        </label> */}

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[18px]">error</span>
            <p className="text-[12px] text-error font-medium">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedPlace}
            className="flex-1 py-3 rounded-xl text-[14px] font-bold text-on-primary bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Address
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
