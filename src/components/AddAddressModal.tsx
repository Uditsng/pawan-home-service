"use client";

import { useState, useEffect } from "react";
import { saveAddress } from "@/app/actions/address";
import LocationPinPicker from "@/components/LocationPinPicker";
import { getDeviceLocation, getAccuracyLevel } from "@/lib/geolocation";
import type { UserAddress } from "@/lib/types/address";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  addressToEdit?: UserAddress | null;
}

type AddressLabel = "Home" | "Work" | "Other";

interface PostOffice {
  Name: string;
  Pincode: string;
  District: string;
  State: string;
}

const LABEL_CONFIG: { label: AddressLabel; icon: string }[] = [
  { label: "Home", icon: "home" },
  { label: "Work", icon: "work" },
  { label: "Other", icon: "location_on" },
];

export default function AddAddressModal({
  isOpen,
  onClose,
  onSaved,
  addressToEdit,
}: AddAddressModalProps) {
  if (!isOpen) return null;

  return (
    <AddAddressFormInner
      addressToEdit={addressToEdit}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function AddAddressFormInner({
  addressToEdit,
  onClose,
  onSaved,
}: {
  addressToEdit?: UserAddress | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const initialLabel = (addressToEdit?.label as AddressLabel) || "Home";
  const initialFlat = addressToEdit?.address_line_1 || "";
  const initialBuilding = addressToEdit?.address_line_2 || "";
  const initialArea = addressToEdit?.area || "";
  const initialLandmark = addressToEdit?.landmark || "";
  const initialCity = addressToEdit?.city || "";
  const initialState = addressToEdit?.state || "";
  const initialPincode = addressToEdit?.pincode || "";
  const initialDefault = addressToEdit?.is_default || false;

  const hasCoords = addressToEdit?.latitude && addressToEdit?.longitude && Number(addressToEdit.latitude) !== 0;
  const initialLat = hasCoords ? Number(addressToEdit!.latitude) : null;
  const initialLng = hasCoords ? Number(addressToEdit!.longitude) : null;

  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>(initialLabel);
  const [houseFlat, setHouseFlat] = useState(initialFlat);
  const [buildingSociety, setBuildingSociety] = useState(initialBuilding);
  const [areaColony, setAreaColony] = useState(initialArea);
  const [landmark, setLandmark] = useState(initialLandmark);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [pincode, setPincode] = useState(initialPincode);

  // GPS Location states
  const [latitude, setLatitude] = useState<number | null>(initialLat);
  const [longitude, setLongitude] = useState<number | null>(initialLng);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(
    hasCoords ? `Exact location pinned (${Number(addressToEdit!.latitude).toFixed(4)}, ${Number(addressToEdit!.longitude).toFixed(4)})` : null
  );
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [suggestions, setSuggestions] = useState<PostOffice[]>([]);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [makeDefault, setMakeDefault] = useState(initialDefault);

  useEffect(() => {
    const fetchAreas = async () => {
      const trimmedPin = pincode.trim();
      if (trimmedPin.length !== 6 || !/^\d+$/.test(trimmedPin)) {
        setSuggestions([]);
        setPincodeError(null);
        return;
      }

      setIsPincodeLoading(true);
      setPincodeError(null);
      try {
        const res = await fetch(`/api/pincode/${trimmedPin}`);
        const data = await res.json();

        if (!res.ok) {
          setSuggestions([]);
          setPincodeError(data?.error || "Invalid pincode or no areas found.");
          return;
        }

        const offices: PostOffice[] = Array.isArray(data.offices) ? data.offices : [];
        if (offices.length > 0) {
          const uniqueOffices = offices.filter((v: PostOffice, i: number, a: PostOffice[]) =>
            a.findIndex(t => (t.Name === v.Name)) === i
          );
          setSuggestions(uniqueOffices);

          const firstOffice = uniqueOffices[0];
          setCity((prev) => prev || firstOffice.District);
          setState((prev) => prev || firstOffice.State);
        } else {
          setSuggestions([]);
          setPincodeError("Invalid pincode or no areas found.");
        }
      } catch {
        setPincodeError("Failed to fetch areas. Please try again.");
        setSuggestions([]);
      } finally {
        setIsPincodeLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchAreas, 400);
    return () => clearTimeout(debounceTimer);
  }, [pincode]);

  const handleSelectArea = (office: PostOffice) => {
    setAreaColony(office.Name);
    setCity(office.District);
    setState(office.State);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationNotice(null);

    try {
      const loc = await getDeviceLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setAccuracy(loc.accuracy);
      setShowMapPicker(true);

      const accInfo = getAccuracyLevel(loc.accuracy);
      const fallbackNote = loc.attempt === 2 ? " Network/cached fix used - verify accuracy." : "";
      if (accInfo.level === "poor") {
        setLocationNotice(`Low accuracy (~${Math.round(loc.accuracy)}m) - please adjust the pin on map.${fallbackNote}`);
      } else if (accInfo.level === "acceptable") {
        setLocationNotice(`Approximate location (~${Math.round(loc.accuracy)}m) - please verify the pin.${fallbackNote}`);
      } else {
        setLocationNotice(`Good accuracy (~${Math.round(loc.accuracy)}m) - confirm the pin.${fallbackNote}`);
      }
    } catch (err) {
      console.warn("[AddAddressModal] Location error:", err);
      const reason = err instanceof Error && err.message ? err.message : "";
      setLocationNotice(
        reason
          ? `Location unavailable - ${reason} You can continue with manual address entry.`
          : "Location access unavailable. You can continue with manual address entry."
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirmPin = (coords: { lat: number; lng: number }) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    setShowMapPicker(false);

    const accInfo = getAccuracyLevel(accuracy ?? Infinity);
    const levelMessage =
      accInfo.level === "good"
        ? "Pin confirmed - good accuracy"
        : accInfo.level === "acceptable"
          ? "Pin confirmed - approximate location, please verify"
          : "Pin confirmed - low accuracy, please adjust if needed";

    setLocationNotice(`✓ ${levelMessage} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!houseFlat.trim()) {
      setError("House / Flat Number is required");
      return;
    }
    if (!buildingSociety.trim()) {
      setError("Building / Society Name is required");
      return;
    }
    if (!areaColony.trim()) {
      setError("Area / Colony is required");
      return;
    }
    if (!city.trim()) {
      setError("City is required");
      return;
    }
    if (!state.trim()) {
      setError("State is required");
      return;
    }
    if (!pincode.trim()) {
      setError("Pincode is required");
      return;
    }

    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(pincode.trim())) {
      setError("Please enter a valid 6-digit Indian Pincode");
      return;
    }

    setIsSaving(true);
    setError("");

    const result = await saveAddress({
      id: addressToEdit?.id,
      label: selectedLabel,
      house_flat: houseFlat.trim(),
      building_society: buildingSociety.trim(),
      area_colony: areaColony.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      latitude: latitude !== null && latitude !== 0 ? latitude : undefined,
      longitude: longitude !== null && longitude !== 0 ? longitude : undefined,
      is_default: makeDefault,
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved?.();
    onClose();
  };

  const isMapMode = showMapPicker && latitude !== null && longitude !== null;

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={
          isMapMode
            ? "relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pt-5 shadow-2xl animate-[slideUp_0.25s_ease-out] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden"
            : "relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 pb-24 sm:pb-8 shadow-2xl animate-[slideUp_0.25s_ease-out] max-h-[90vh] overflow-y-auto"
        }
      >
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-on-surface">
            {addressToEdit ? "Edit Address" : "Add New Address"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">close</span>
          </button>
        </div>

        {/* Use Current Location CTA */}
        {!showMapPicker && (
          <div className="mb-4 space-y-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-on-surface font-bold text-[13px] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Obtaining location from device...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-secondary text-[20px] animate-bounce">
                    my_location
                  </span>
                  <span>Use Current Location</span>
                </>
              )}
            </button>

            {locationNotice && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 animate-fade-in">
                <p className="text-[12px] font-medium text-on-surface flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">info</span>
                  <span className="truncate">{locationNotice}</span>
                </p>
                {latitude !== null && longitude !== null && (
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Adjust Pin
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show Map Pin Picker View */}
        {showMapPicker && latitude !== null && longitude !== null ? (
          <div className={isMapMode ? "grow flex flex-col min-h-0" : "mb-4"}>
            <LocationPinPicker
              initialLat={latitude}
              initialLng={longitude}
              accuracy={accuracy ?? undefined}
              onConfirm={handleConfirmPin}
              onCancel={() => setShowMapPicker(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Label selector */}
            <div>
              <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                Save address as
              </p>
              <div className="flex gap-2">
                {LABEL_CONFIG.map(({ label, icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedLabel(label)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer
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

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pincode Field */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
                  Pincode *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit pincode"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/45 focus:border-secondary transition-all font-mono"
                  />
                  {isPincodeLoading && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {pincodeError && (
                  <p className="text-[12px] text-error font-medium mt-1 pl-1">
                    {pincodeError}
                  </p>
                )}
              </div>

              {/* Suggestions list */}
              {suggestions.length > 0 && (
                <div className="sm:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 shadow-md -mt-1 animate-[slideDown_0.2s_ease-out] z-10 max-h-48 overflow-y-auto">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Suggested Areas for {pincode}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((office) => (
                      <button
                        type="button"
                        key={`${office.Pincode}-${office.Name}`}
                        onClick={() => handleSelectArea(office)}
                        className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border bg-surface border-outline-variant/50 text-on-surface-variant hover:border-secondary/50 hover:bg-secondary/5 cursor-pointer animate-fade-in"
                      >
                        {office.Name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Area / Colony */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
                  Area / Colony *
                </label>
                <input
                  type="text"
                  required
                  value={areaColony}
                  onChange={(e) => setAreaColony(e.target.value)}
                  placeholder="e.g. Gomti Nagar"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/45 focus:border-secondary transition-all"
                />
              </div>

              {/* Landmark (Optional) */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
                  Landmark <span className="text-on-surface-variant/50 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near City Mall"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/45 focus:border-secondary transition-all"
                />
              </div>

              {/* Building / Society Name */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
                  Building / Society Name *
                </label>
                <input
                  type="text"
                  required
                  value={buildingSociety}
                  onChange={(e) => setBuildingSociety(e.target.value)}
                  placeholder="e.g. Sunshine Apartments"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/45 focus:border-secondary transition-all"
                />
              </div>

              {/* House / Flat Number */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
                  House / Flat Number *
                </label>
                <input
                  type="text"
                  required
                  value={houseFlat}
                  onChange={(e) => setHouseFlat(e.target.value)}
                  placeholder="e.g. Flat 302, 3rd Floor"
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/45 focus:border-secondary transition-all"
                />
              </div>
            </div>

            {/* Default Toggle */}
            <label className="flex items-center gap-3 py-2 cursor-pointer group select-none">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-outline-variant group-hover:border-primary peer-checked:border-secondary peer-checked:bg-secondary flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-white text-sm font-bold scale-0 peer-checked:scale-100 transition-transform">
                    check
                  </span>
                </div>
              </div>
              <span className="text-[13px] font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                Set as default address
              </span>
            </label>

            {/* Error display */}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 animate-[slideDown_0.2s_ease-out]">
                <span className="material-symbols-outlined text-error text-[18px]">error</span>
                <p className="text-[12px] text-error font-medium">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl text-[14px] font-bold text-on-primary bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {addressToEdit ? "Update Address" : "Save Address"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
