"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import AddAddressModal from "@/components/AddAddressModal";
import { useCart } from "@/lib/cart/CartContext";
import Link from "next/link";

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

// Pre-determined time slots
const AVAILABLE_MORNING_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM'];
const AVAILABLE_AFTERNOON_SLOTS = ['1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'];

export default function ScheduleCartClient({
  initialAddresses
}: {
  initialAddresses: Address[];
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

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/dashboard");
    }
  }, [items, router]);

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

  const [selectedFullDate, setSelectedFullDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const monthShort = selectedFullDate.toLocaleString('default', { month: 'short' });
  const selectedDateNum = selectedFullDate.getDate();

  const next7Days = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const today = new Date();

  // Stable string representation of selected date to use as useMemo dependency
  const selectedDateString = selectedFullDate.toDateString();

  // Filter slots based on date and time
  const filteredMorningSlots = useMemo(() => {
    const now = new Date();
    const isSelectedToday = selectedDateString === now.toDateString();

    if (!isSelectedToday) return AVAILABLE_MORNING_SLOTS;

    const currentHour = now.getHours();
    return AVAILABLE_MORNING_SLOTS.filter(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return slotHour > currentHour + 1; // At least 1 hour notice
    });
  }, [selectedDateString]);

  const filteredAfternoonSlots = useMemo(() => {
    const now = new Date();
    const isSelectedToday = selectedDateString === now.toDateString();

    if (!isSelectedToday) return AVAILABLE_AFTERNOON_SLOTS;

    const currentHour = now.getHours();
    return AVAILABLE_AFTERNOON_SLOTS.filter(slot => {
      let slotHour = parseInt(slot.split(':')[0]);
      if (slotHour !== 12) slotHour += 12; // converting PM to 24h
      return slotHour > currentHour + 1; // At least 1 hour notice
    });
  }, [selectedDateString]);

  // Set default selected time if empty
  useEffect(() => {
    if (isCustomMode) return;
    const allAvailable = [...filteredMorningSlots, ...filteredAfternoonSlots];
    if (allAvailable.length > 0 && (!selectedTime || !allAvailable.includes(selectedTime))) {
      setTimeout(() => setSelectedTime(allAvailable[0]), 0);
    } else if (allAvailable.length === 0 && selectedTime !== "") {
      setTimeout(() => setSelectedTime(""), 0);
    }
  }, [filteredMorningSlots, filteredAfternoonSlots, selectedTime, isCustomMode, selectedFullDate]);

  const handleContinue = () => {
    if (!selectedTime || !selectedAddressId) return;

    const year = selectedFullDate.getFullYear();
    const formattedMonth = (selectedFullDate.getMonth() + 1).toString().padStart(2, '0');
    const formattedDate = selectedFullDate.getDate().toString().padStart(2, '0');

    const payload = new URLSearchParams({
      date: `${year}-${formattedMonth}-${formattedDate}`,
      time: selectedTime,
      addressId: selectedAddressId,
    });
    router.push(`/checkout/cart/payment?${payload.toString()}`);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      {/* Top Header Bar */}
      {/* <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-outline-variant/10 py-4 px-4 md:px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-on-surface hover:opacity-80 transition-all">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-primary font-black text-lg font-headline tracking-tight">Checkout Schedule</h1>
        </div>
      </header> */}

      <main className="max-w-2xl mx-auto px-4 md:px-6 pb-40">
        {/* Headline Section */}
        <section className="mt-6 mb-6">
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface leading-tight mb-2">
            When should <br />we come?
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">
            All {itemCount} services in your cart will be scheduled at this time.
          </p>
        </section>

        {/* Selected Services Summary Panel */}
        {/* <section className="mb-6 bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Services in Cart</p>
          <div className="flex flex-wrap gap-2">
            {items.map(item => (
              <div key={item.serviceId} className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/10 px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-sm text-[#059669]">{item.iconName}</span>
                {item.title}
              </div>
            ))}
          </div>
        </section> */}

        {/* Service Location Confirmation Card */}
        <section className="mb-8 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 relative overflow-hidden shadow-xs">
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
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors p-2 rounded-full border border-outline-variant/20 bg-surface-container-lowest"
              >
                {isAddressSelectorExpanded ? "Done" : "Confirm / Change"}
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
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed truncate">
                      {selectedAddress.address_line_1}
                      {selectedAddress.address_line_2 ? `, ${selectedAddress.address_line_2}` : ''}
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-1 opacity-70">
                      {selectedAddress.formatted_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-green-500/10 text-[#059669] px-2.5 py-1 rounded-full shrink-0 border border-green-500/20">
                  <span className="material-symbols-outlined text-xs font-bold">check_circle</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Confirmed</span>
                </div>
              </div>

              {/* Address selector inline when expanded */}
              {isAddressSelectorExpanded && (
                <div className="pt-4 border-t border-outline-variant/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Select Address</p>
                  <div className="space-y-2">
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
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 active:scale-[0.99]
                            ${isAddrSelected
                              ? "bg-primary/5 border-primary text-primary shadow-xs"
                              : "bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low"
                            }`}
                        >
                          <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0">
                            {isAddrSelected ? "radio_button_checked" : "radio_button_unchecked"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold mb-0.5">{addr.label} Address</p>
                            <p className="text-xs leading-normal opacity-80 truncate">{addr.formatted_address}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="w-full py-3 bg-surface border border-dashed border-outline-variant rounded-xl text-xs font-bold text-primary hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
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

        {/* 7-Days & Custom Toggle Section */}
        {!isCustomMode ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg font-bold">Select Date</h2>
              <button
                onClick={() => setIsCustomMode(true)}
                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors p-2 rounded-full border border-primary"
              >
                Custom Date
              </button>
            </div>

            <div className="flex overflow-x-auto gap-2 md:gap-3 pb-4 snap-x scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {next7Days.map((dateObj) => {
                const isSelected = selectedFullDate.toDateString() === dateObj.toDateString();
                const dayName = dateObj.toLocaleString('default', { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const isTodayItem = dateObj.toDateString() === today.toDateString();

                return (
                  <button
                    key={dateObj.toISOString()}
                    onClick={() => setSelectedFullDate(dateObj)}
                    className={`snap-center shrink-0 w-16 md:w-20 py-3 md:py-4 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 transition-all relative border-2 ${isSelected ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-surface-container-lowest border-transparent text-on-surface hover:bg-surface-container-low'}`}
                  >
                    <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {isTodayItem ? 'Today' : dayName}
                    </span>
                    <span className="text-xl md:text-2xl font-extrabold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bg-surface-container-lowest rounded-3xl p-6 mb-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline text-lg font-bold">Custom Schedule</h2>
              <button
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedFullDate(today);
                  setSelectedTime("");
                }}
                className="text-sm font-bold p-2 rounded-full border border-primary text-primary hover:text-primary/80 transition-colors"
              >
                Use Quick Pick
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Select Date</label>
              <input
                type="date"
                min={today.toISOString().split('T')[0]} // Prevents past dates
                value={
                  new Date(selectedFullDate.getTime() - (selectedFullDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const newD = new Date(e.target.value + 'T12:00:00');
                    if (!isNaN(newD.getTime())) setSelectedFullDate(newD);
                  }
                }}
                className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant/20 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">Select Time</label>
              <input
                type="time"
                value={(() => {
                  if (!selectedTime) return "10:00";
                  if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
                    const [time, modifier] = selectedTime.split(' ');
                    const [h, minutes] = time.split(':');
                    let hours = h;
                    if (hours === '12') hours = '00';
                    if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
                    return `${hours.padStart(2, '0')}:${minutes}`;
                  }
                  return selectedTime;
                })()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const [h, m] = val.split(':');
                    let numH = parseInt(h, 10);
                    const ampm = numH >= 12 ? 'PM' : 'AM';
                    numH = numH % 12 || 12;
                    setSelectedTime(`${numH}:${m} ${ampm}`);
                  } else {
                    setSelectedTime("");
                  }
                }}
                className="w-full p-4 rounded-xl bg-surface-container border border-outline-variant/20 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </section>
        )}

        {/* Standard Time Slots if NOT custom */}
        {!isCustomMode && (
          <section className="space-y-8">
            {filteredMorningSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-lg">wb_sunny</span>
                  <h3 className="font-headline font-bold text-sm tracking-wide uppercase opacity-70">Morning</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {filteredMorningSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border-2 flex items-center justify-center font-bold text-base md:text-lg active:scale-95 ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-lowest border-transparent text-on-surface shadow-sm hover:bg-surface-container-low'}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredAfternoonSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary text-lg">light_mode</span>
                  <h3 className="font-headline font-bold text-sm tracking-wide uppercase opacity-70">Afternoon</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredAfternoonSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-4 rounded-2xl transition-all border-2 flex items-center justify-center font-bold text-lg active:scale-95 ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-lowest border-transparent text-on-surface shadow-sm hover:bg-surface-container-low'}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredMorningSlots.length === 0 && filteredAfternoonSlots.length === 0 && (
              <div className="p-6 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/10 text-on-surface-variant">
                No available slots for this date. Please select another date.
              </div>
            )}
          </section>
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-none">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-safe flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between px-1 md:px-2">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Services</p>
              <p className="font-bold text-on-surface text-sm md:text-base">{itemCount} Items</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Selected Slot</p>
              <p className="font-bold text-primary text-sm md:text-base">
                {monthShort} {selectedDateNum}{selectedTime ? `, ${selectedTime}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleContinue}
            disabled={!selectedTime || !selectedAddressId}
            className={`mb-2 w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all
              ${(!selectedTime || !selectedAddressId) ? 'bg-surface-container text-on-surface/30 cursor-not-allowed' : 'bg-secondary text-white shadow-[0_12px_32px_rgba(253,118,26,0.25)] hover:opacity-90 active:scale-[0.98]'}`}
          >
            Continue To Payment
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">arrow_forward</span>
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
