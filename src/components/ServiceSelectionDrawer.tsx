"use client";

import { useState } from "react";

interface Service {
  id: string;
  title: string;
  subcategoryName: string;
  categoryName: string;
  iconName: string;
}

interface Props {
  services: Service[];
  initialSelectedServices?: string[];
}

export default function ServiceSelectionDrawer({ services, initialSelectedServices }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(initialSelectedServices || []);
  const [selectedSubcat, setSelectedSubcat] = useState("All");

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((sId) => sId !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  // Extract unique subcategories dynamically from DB services
  const subcategories = ["All", ...Array.from(new Set(services.map((s) => s.subcategoryName)))];

  const filteredServices = selectedSubcat === "All"
    ? services
    : services.filter((s) => s.subcategoryName === selectedSubcat);

  return (
    <div className="w-full">
      {/* Hidden inputs to send data in form submission */}
      {selectedServices.map((id) => (
        <input key={id} type="hidden" name="services" value={id} />
      ))}

      {/* Button to open drawer */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 hover:border-secondary/50 rounded-xl p-4 flex items-center justify-between transition-colors shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary/70 group-hover:text-secondary transition-colors">
            add_circle
          </span>
          <span className="font-semibold text-primary">
            {selectedServices.length > 0
              ? `${selectedServices.length} Service(s) Selected`
              : "Select Services to Offer"}
          </span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">
          chevron_right
        </span>
      </button>

      {/* Selected Services Preview */}
      {selectedServices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedServices.map((id) => {
            const service = services.find((s) => s.id === id);
            if (!service) return null;
            return (
              <div key={id} className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 text-primary px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                {service.title}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleService(id);
                  }}
                  className="text-on-surface-variant hover:text-red-500 transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-[16px] block">close</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Slider Drawer (Bottom Sheet) */}
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center pointer-events-none transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Sheet Content */}
        <div
          className={`relative w-full max-w-lg bg-surface rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col max-h-[85vh] ${isOpen ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
            }`}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-pointer" onClick={() => setIsOpen(false)}>
            <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
          </div>

          <div className="px-6 pb-4 shrink-0 flex items-center justify-between border-b border-outline-variant/20">
            <h3 className="text-xl font-headline font-black text-primary">Select Services</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Subcategory scrollable tab bar */}
          {services.length > 0 && (
            <div className="px-6 pt-4 pb-2 shrink-0 overflow-x-auto flex gap-2 scrollbar-none">
              {subcategories.map((subcat) => {
                const isActive = selectedSubcat === subcat;
                return (
                  <button
                    key={subcat}
                    type="button"
                    onClick={() => setSelectedSubcat(subcat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-wider cursor-pointer border ${isActive
                        ? "bg-secondary text-primary border-secondary shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/35 hover:bg-surface-container"
                      }`}
                  >
                    {subcat}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-6 overflow-y-auto flex-1">
            {filteredServices.length === 0 ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">work_off</span>
                <p className="text-on-surface-variant font-medium">No services match selection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-2.5 border rounded-2xl flex items-center gap-2.5 text-left transition-all duration-300 ${isSelected
                          ? "border-secondary bg-secondary/10 shadow-[0_4px_12px_rgba(166,206,55,0.15)]"
                          : "border-outline-variant/30 bg-surface-container-lowest hover:border-secondary/50 hover:bg-surface-container-low"
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform ${isSelected ? "scale-105 bg-white shadow-sm" : "bg-green-500/10"
                        }`}>
                        <span className="material-symbols-outlined text-[18px] text-[#059669] drop-shadow-sm">
                          {service.iconName}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-primary leading-tight line-clamp-2">
                        {service.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 pt-4 border-t border-outline-variant/20 shrink-0 bg-surface">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-4 bg-primary text-white font-extrabold text-[15px] rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-300"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
