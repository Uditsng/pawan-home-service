"use client";

import { useState, useTransition } from "react";
import ServiceSelectionDrawer from "@/components/ServiceSelectionDrawer";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import { savePartnerServices } from "../../actions";

interface Service {
  id: string;
  title: string;
  subcategoryName: string;
  categoryName: string;
  iconName: string;
  imageUrl?: string | null;
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
    <div className="bg-surface-container-lowest rounded-3xl shadow-xs border border-outline-variant/15 overflow-hidden mb-6">
      {/* Toast Messages */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-success text-on-success px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {success}
        </div>
      )}

      <div className="p-4 sm:p-5 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-low/50">
        <h3 className="font-headline font-bold text-on-surface text-base">Services Offered</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs hover:bg-primary/95 active:scale-95 transition-all cursor-pointer border-none"
          >
            Edit Services
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="divide-y divide-outline-variant/15">
          {activeServices.length > 0 ? (
            activeServices.map((service) => (
              <div key={service.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3">
                  <ServiceCardThumbnail
                    imageUrl={service.imageUrl}
                    iconName={service.iconName}
                    containerClassName="w-10 h-10 rounded-2xl"
                    iconClassName="w-5 h-5 text-[#059669] drop-shadow-sm"
                  />
                  <div>
                    <span className="font-bold text-sm text-on-surface block">
                      {service.title}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      {service.categoryName} • {service.subcategoryName}
                    </span>
                  </div>
                </div>
                <span className="bg-success/10 text-success text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                  Active ✓
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-on-surface-variant font-medium text-sm">
              No services selected yet.
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Choose your service expertise
            </h4>
            <ServiceSelectionDrawer services={allServices} initialSelectedServices={initialSelectedServices} />
          </div>

          {error && (
            <div className="p-4 bg-error/10 text-error text-sm font-bold rounded-2xl border border-error/20">
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
              className="flex-1 py-3 rounded-2xl border border-outline-variant/20 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-2xl bg-secondary text-primary font-bold text-sm shadow-xs hover:bg-secondary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
