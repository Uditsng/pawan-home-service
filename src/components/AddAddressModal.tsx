"use client";

import { useState, useEffect } from "react";
import { saveAddress } from "@/app/actions/address";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
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

export default function AddAddressModal({ isOpen, onClose, onSaved }: AddAddressModalProps) {
  const [selectedLabel, setSelectedLabel] = useState<AddressLabel>("Home");
  const [houseFlat, setHouseFlat] = useState("");
  const [buildingSociety, setBuildingSociety] = useState("");
  const [areaColony, setAreaColony] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [suggestions, setSuggestions] = useState<PostOffice[]>([]);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

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
        const res = await fetch(`https://api.postalpincode.in/pincode/${trimmedPin}`);
        const data = await res.json();
        
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice) {
          // Filter unique names to avoid duplicates
          const uniqueOffices = data[0].PostOffice.filter((v: PostOffice, i: number, a: PostOffice[]) => 
            a.findIndex(t => (t.Name === v.Name)) === i
          );
          setSuggestions(uniqueOffices);

          // Pre-populate City and State from first result immediately
          const firstOffice = data[0].PostOffice[0];
          setCity(firstOffice.District);
          setState(firstOffice.State);
        } else {
          setSuggestions([]);
          setPincodeError("Invalid pincode or no areas found.");
        }
      } catch {
        setPincodeError("Failed to fetch areas.");
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
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
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
    
    // India Pincode Validation (6 digits, doesn't start with 0)
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(pincode.trim())) {
      setError("Please enter a valid 6-digit Indian Pincode");
      return;
    }

    setIsSaving(true);
    setError("");

    const result = await saveAddress({
      label: selectedLabel,
      house_flat: houseFlat.trim(),
      building_society: buildingSociety.trim(),
      area_colony: areaColony.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      is_default: makeDefault,
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Reset form
    setHouseFlat("");
    setBuildingSociety("");
    setAreaColony("");
    setLandmark("");
    setCity("");
    setState("");
    setPincode("");
    setSuggestions([]);
    setPincodeError(null);
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-on-surface">Add New Address</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">close</span>
          </button>
        </div>

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
                  Save Address
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
