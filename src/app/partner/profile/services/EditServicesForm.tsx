"use client";

import { useState, useTransition } from "react";
import ServiceSelectionDrawer from "@/components/ServiceSelectionDrawer";
import { savePartnerServices } from "../../actions";

interface Service {
  id: string;
  title: string;
  subcategoryName: string;
  categoryName: string;
  iconName: string;
}

interface EditServicesFormProps {
  allServices: Service[];
  initialSelectedServices: string[];
}

export default function EditServicesForm({ allServices, initialSelectedServices }: EditServicesFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeServices = allServices.filter(s => initialSelectedServices.includes(s.id));

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const serviceIds = formData.getAll("services") as string[];

    if (serviceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    startTransition(async () => {
      const res = await savePartnerServices(serviceIds);
      if (res.success) {
        setSuccess("Services updated successfully!");
        setIsEditing(false);
        // Clear success toast after 3s
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || "Failed to update services.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      {/* Toast Messages */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {success}
        </div>
      )}

      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-extrabold text-[#1c2438] text-[15px]">Services Offered</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
          >
            Edit Services
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="divide-y divide-slate-100">
          {activeServices.length > 0 ? (
            activeServices.map((service) => (
              <div key={service.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-[20px]">
                      {service.iconName}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[14px] text-[#1c2438] block">
                      {service.title}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {service.categoryName} • {service.subcategoryName}
                    </span>
                  </div>
                </div>
                <span className="bg-success/10 text-success text-[10px] font-extrabold px-2 py-1 rounded-[6px] uppercase tracking-wide flex items-center gap-1">
                  Active ✓
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 font-medium text-sm">
              No services selected.
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Choose your service expertise
            </h4>
            <ServiceSelectionDrawer services={allServices} initialSelectedServices={initialSelectedServices} />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-outline-variant/30 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                  <span className="material-symbols-outlined text-sm">check</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
