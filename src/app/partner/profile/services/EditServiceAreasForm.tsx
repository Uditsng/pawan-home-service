"use client";

import { useState, useTransition } from "react";
import PincodeSelector, { SelectedArea } from "@/components/PincodeSelector";
import { saveServiceAreas } from "../../actions";

interface EditServiceAreasFormProps {
  initialAreas: SelectedArea[];
}

export default function EditServiceAreasForm({ initialAreas }: EditServiceAreasFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const serviceAreasStr = formData.get("service_areas") as string;

    if (!serviceAreasStr) {
      setError("Please select at least one service area.");
      return;
    }

    startTransition(async () => {
      const res = await saveServiceAreas(serviceAreasStr);
      if (res.success) {
        setSuccess("Service areas updated successfully!");
        setIsEditing(false);
        // Clear success toast after 3s
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || "Failed to update service areas.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Toast Messages */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {success}
        </div>
      )}

      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-extrabold text-[#1c2438] text-[15px]">Service Areas</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            Edit Areas
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="divide-y divide-slate-100">
          {initialAreas.length > 0 ? (
            initialAreas.map((area) => (
              <div
                key={`${area.pincode}-${area.locality}`}
                className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[20px]">📍</span>
                  <span className="font-semibold text-[14px] text-[#1c2438]">
                    {area.locality || "Unknown Area"}{" "}
                    <span className="text-slate-400 text-xs font-medium ml-1">
                      ({area.pincode})
                    </span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 font-medium text-sm">
              No service areas added yet.
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 space-y-6">
          <PincodeSelector initialAreas={initialAreas} />

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
              className="flex-1 py-3 rounded-xl border border-outline-variant/30 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none"
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
