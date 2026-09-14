"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidOfferEntitlementAction } from "../actions";

interface EntitlementVoidButtonProps {
  entitlementId: string;
}

export function EntitlementVoidButton({ entitlementId }: EntitlementVoidButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onVoid = () => {
    const formData = new FormData();
    formData.set("entitlement_id", entitlementId);
    startTransition(async () => {
      const res = await voidOfferEntitlementAction(formData);
      if (res?.error) setError(res.error);
      else router.refresh();
      setConfirming(false);
    });
  };

  if (!confirming) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {error && <span className="text-[10px] text-error">{error}</span>}
        <button
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={isPending}
          className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
          title="Void entitlement"
        >
          <span className="material-symbols-outlined text-sm">block</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="px-2 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onVoid}
        disabled={isPending}
        className="px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-error hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {isPending && <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>}
        Void
      </button>
    </div>
  );
}