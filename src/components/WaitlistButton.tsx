"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toggleServiceWaitlist } from "@/app/customer/waitlist.actions";

interface WaitlistButtonProps {
  serviceId: string;
  initialWaitlisted: boolean;
}

export function WaitlistButton({ serviceId, initialWaitlisted }: WaitlistButtonProps) {
  const [waitlisted, setWaitlisted] = useState(initialWaitlisted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const path =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        router.push(`/login?next=${encodeURIComponent(path)}`);
        return;
      }

      const result = await toggleServiceWaitlist(serviceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setWaitlisted(result.waitlisted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          waitlisted
            ? "bg-success/10 text-success border border-success/30 hover:bg-success/15"
            : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 active:scale-95"
        }`}
      >
        <span
          className="material-symbols-outlined text-base"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {waitlisted ? "notifications_active" : "notifications"}
        </span>
        {loading ? "Please wait..." : waitlisted ? "You're on the list" : "Notify Me"}
      </button>
      {error && (
        <p className="text-xs font-bold text-error flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span> {error}
        </p>
      )}
      {waitlisted && !error && (
        <p className="text-[10px] text-on-surface-variant font-medium">
          We&apos;ll notify you the moment this service goes live.
        </p>
      )}
    </div>
  );
}