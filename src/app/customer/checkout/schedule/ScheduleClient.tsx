"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import AddAddressModal from "@/components/AddAddressModal";
import { useCart } from "@/lib/cart/CartContext";

interface Address {
  id: string;
  label: string;
  formatted_address: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export default function ScheduleClient({
  service,
  initialAddresses,
  duration
}: {
  service: { id: string; duration_minutes: number; pricing_model?: 'fixed' | 'hourly' } | null;
  initialAddresses: Address[];
  duration?: number;
}) {
  const router = useRouter();
  const { items, itemCount } = useCart();

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    const def = initialAddresses.find(a => a.is_default);
    if (def) return def.id;
    return initialAddresses[0]?.id || "";
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddressSelectorExpanded, setIsAddressSelectorExpanded] = useState(false);

  const fetchFreshAddresses = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .order("is_default", { ascending: false });

    if (data) {
      const addressData = data as Address[];
      setAddresses(addressData);
      if (!selectedAddressId || !addressData.some((a) => a.id === selectedAddressId)) {
        const defaultOrFirst = addressData.find((a) => a.is_default) || addressData[0];
        if (defaultOrFirst) {
          setSelectedAddressId(defaultOrFirst.id);
        }
      }
    }
  };

  const selectedAddress = useMemo(() => {
    return addresses.find(a => a.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // Redirect if cart is empty and we are in cart mode
  useEffect(() => {
    if (!service && items.length === 0) {
      router.push("/customer/dashboard");
    }
  }, [items, service, router]);

  const [selectedFullDate, setSelectedFullDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");

  const monthShort = selectedFullDate.toLocaleString('default', { month: 'short' });
  const selectedDateNum = selectedFullDate.getDate();

  const next4Days = useMemo(() => {
    const baseDate = new Date();
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  // Pre-determined time slots (7:00 AM to 9:00 PM, 30-min intervals)
  const availableMorningSlots = [
    '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'
  ];
  const availableAfternoonSlots = [
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
  ];

  const today = new Date();
  const isToday = selectedFullDate.getFullYear() === today.getFullYear() &&
    selectedFullDate.getMonth() === today.getMonth() &&
    selectedFullDate.getDate() === today.getDate();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  // Helper to parse slot e.g. "7:30 AM" to minutes since midnight
  const getMinutesFromSlot = (slot: string) => {
    const [time, modifier] = slot.split(' ');
    const [h, m] = time.split(':');
    let hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);

    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  };

  // Filter slots based on date and time
  const filteredMorningSlots = useMemo(() => {
    if (!isToday) return availableMorningSlots;
    const nowMinutes = currentHour * 60 + currentMinute;
    return availableMorningSlots.filter(slot => {
      const slotMinutes = getMinutesFromSlot(slot);
      return slotMinutes >= nowMinutes;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, currentHour, currentMinute]);

  const filteredAfternoonSlots = useMemo(() => {
    if (!isToday) return availableAfternoonSlots;
    const nowMinutes = currentHour * 60 + currentMinute;
    return availableAfternoonSlots.filter(slot => {
      const slotMinutes = getMinutesFromSlot(slot);
      return slotMinutes >= nowMinutes;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, currentHour, currentMinute]);

  const allSlots = useMemo(() => {
    return [...filteredMorningSlots, ...filteredAfternoonSlots];
  }, [filteredMorningSlots, filteredAfternoonSlots]);

  // Derive the active selected time slot. If the stored selection is not in the list of
  // available slots, default to the first available slot (or empty if none).
  const effectiveSelectedTime = useMemo(() => {
    if (selectedTime && allSlots.includes(selectedTime)) {
      return selectedTime;
    }
    return allSlots[0] || "";
  }, [selectedTime, allSlots]);

  const handleContinue = () => {
    if (!effectiveSelectedTime || !selectedAddressId) return;

    const year = selectedFullDate.getFullYear();
    const formattedMonth = (selectedFullDate.getMonth() + 1).toString().padStart(2, '0');
    const formattedDate = selectedFullDate.getDate().toString().padStart(2, '0');

    if (service) {
      const paramsObj: Record<string, string> = {
        serviceId: service.id,
        date: `${year}-${formattedMonth}-${formattedDate}`,
        time: effectiveSelectedTime,
        addressId: selectedAddressId,
      };
      if (duration) {
        paramsObj.duration = duration.toString();
      }
      const payload = new URLSearchParams(paramsObj);
      router.push(`/customer/checkout/payment?${payload.toString()}`);
    } else {
      const payload = new URLSearchParams({
        date: `${year}-${formattedMonth}-${formattedDate}`,
        time: effectiveSelectedTime,
        addressId: selectedAddressId,
      });
      router.push(`/customer/checkout/cart/payment?${payload.toString()}`);
    }
  };

  if (!service && items.length === 0) {
    return null;
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      <main className="max-w-2xl mx-auto px-4 md:px-6 pb-28">
        {/* Headline Section */}
        <section className="mt-4 mb-3">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-tight mb-1">
            When should we come?
          </h1>
          {!service && (
            <p className="text-[11px] text-on-surface-variant font-medium">
              All {itemCount} services in your cart will be scheduled at this time.
            </p>
          )}
        </section>

        {/* Service Location Confirmation Card */}
        <section className="mb-4.5 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl font-bold">location_on</span>
              <h2 className="font-headline text-lg font-bold">Service Location</h2>
            </div>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddressSelectorExpanded(!isAddressSelectorExpanded)}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full border border-outline-variant/20 bg-surface-container-lowest"
              >
                {isAddressSelectorExpanded ? "Done" : "Change"}
              </button>
            )}
          </div>

          {selectedAddress ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-xs">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] text-xl">
                      {selectedAddress.label === "Home" ? "home" : selectedAddress.label === "Work" ? "work" : "location_on"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-on-surface">{selectedAddress.label} Address</span>
                      {selectedAddress.is_default && (
                        <span className="inline-flex items-center text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full border border-secondary/20">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant font-semibold leading-relaxed truncate">
                      {selectedAddress.address_line_1}
                      {selectedAddress.address_line_2 ? `, ${selectedAddress.address_line_2}` : ''}
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-1 opacity-70 mt-0.5">
                      {selectedAddress.formatted_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/10 text-[#059669] px-2.5 py-1 rounded-full shrink-0 border border-green-500/20">
                  <span className="material-symbols-outlined text-xs font-bold">check_circle</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Confirmed</span>
                </div>
              </div>

              {/* Address selector inline when expanded */}
              {isAddressSelectorExpanded && (
                <div className="pt-3 border-t border-outline-variant/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-250">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Select Address</p>
                  <div className="space-y-1.5">
                    {addresses.map((addr) => {
                      const isAddrSelected = addr.id === selectedAddressId;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setIsAddressSelectorExpanded(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 active:scale-[0.99]
                            ${isAddrSelected
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low"
                            }`}
                        >
                          <span className="material-symbols-outlined text-lg mt-0.5 shrink-0">
                            {isAddrSelected ? "radio_button_checked" : "radio_button_unchecked"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold mb-0.5">{addr.label} Address</p>
                            <p className="text-[11px] leading-normal opacity-80 truncate">{addr.formatted_address}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="w-full py-2 bg-surface border border-dashed border-outline-variant rounded-lg text-xs font-bold text-primary hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add Another Address
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <span className="material-symbols-outlined text-3xl opacity-30 mb-2 block">location_off</span>
              <p className="text-xs text-on-surface-variant font-medium mb-4">No saved addresses found. Please add your location to proceed.</p>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-105 transition-all"
              >
                Add Your Address
              </button>
            </div>
          )}
        </section>

        {/* Date Selection Section */}
        <section className="mb-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-primary text-lg font-bold">calendar_today</span>
            <h2 className="font-headline text-sm font-bold">Select Date</h2>
          </div>

          <div className="flex gap-2 pb-0.5 snap-x overflow-x-auto scrollbar-hide">
            {next4Days.map((dateObj) => {
              const isSelected = selectedFullDate.toDateString() === dateObj.toDateString();
              const dayName = dateObj.toLocaleString('default', { weekday: 'short' });
              const dayNum = dateObj.getDate();
              const isTodayItem = dateObj.toDateString() === today.toDateString();

              return (
                <button
                  key={dateObj.toISOString()}
                  onClick={() => setSelectedFullDate(dateObj)}
                  className={`snap-center shrink-0 flex-1 min-w-[65px] py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border-2 active:scale-95 duration-200
                    ${isSelected 
                      ? 'bg-primary border-primary text-white shadow-sm' 
                      : 'bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low hover:border-outline-variant/30'}`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {isTodayItem ? 'Today' : dayName}
                  </span>
                  <span className="text-lg font-black">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Time Slots Selection Section */}
        <section className="mb-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-primary text-lg font-bold">schedule</span>
            <h2 className="font-headline text-sm font-bold">Select Time Slot</h2>
          </div>

          {allSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
              {allSlots.map(time => {
                const isSelected = effectiveSelectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-1.5 px-0.5 rounded-lg transition-all border text-xs font-bold flex items-center justify-center active:scale-[0.97] duration-200
                      ${isSelected 
                        ? 'bg-primary border-primary text-white shadow-xs' 
                        : 'bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low hover:border-outline-variant/30'}`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center bg-surface rounded-xl border border-outline-variant/10 text-on-surface-variant text-xs font-medium">
              No available slots for this date. Please select another date.
            </div>
          )}
        </section>
      </main>

      {/* Sticky Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-none">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 pb-safe flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              {service ? (
                <>
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {service.pricing_model === "hourly" ? "Selected Duration" : "Estimated duration"}
                  </p>
                  <p className="font-bold text-on-surface text-xs md:text-sm">
                    {service.pricing_model === "hourly" && duration
                      ? (duration === 30 ? "30 Minutes" : `${duration / 60} Hour${duration / 60 === 1 ? "" : "s"}`)
                      : `${service.duration_minutes} Minutes`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Total Services</p>
                  <p className="font-bold text-on-surface text-xs md:text-sm">{itemCount} Items</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Selected Slot</p>
              <p className="font-bold text-primary text-xs md:text-sm">
                {monthShort} {selectedDateNum}{effectiveSelectedTime ? `, ${effectiveSelectedTime}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleContinue}
            disabled={!effectiveSelectedTime || !selectedAddressId}
            className={`mb-1 w-full py-3 rounded-xl font-headline font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all
              ${(!effectiveSelectedTime || !selectedAddressId) ? 'bg-surface-container text-on-surface/30 cursor-not-allowed' : 'bg-secondary text-white shadow-[0_10px_24px_rgba(253,118,26,0.2)] hover:opacity-90 active:scale-[0.98]'}`}
          >
            {service ? "Continue To Booking" : "Continue To Payment"}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </footer>

      {/* Add Address Modal */}
      <AddAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaved={fetchFreshAddresses}
      />
    </div>
  );
}
