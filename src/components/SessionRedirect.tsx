"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SessionRedirect() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (active) setChecking(false);
          return;
        }

        // Fetch user profile role
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          if (active) setChecking(false);
          return;
        }

        if (profile.status === "suspended" || profile.status === "blocked") {
          await supabase.auth.signOut();
          if (active) setChecking(false);
          return;
        }

        // Route automatically to correct dashboard
        if (active) {
          if (profile.role === "admin") {
            router.replace("/admin/dashboard");
          } else if (profile.role === "partner") {
            router.replace("/partner/dashboard");
          } else {
            router.replace("/dashboard");
          }
        }
      } catch (err) {
        console.error("Session restoration error:", err);
        if (active) setChecking(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-primary">
        {/* Ambient atmospheric orbs */}
        <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,var(--color-secondary)_0%,transparent_70%)] blur-[50px] opacity-15"></div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center animate-bounce">
            <span className="material-symbols-outlined text-secondary text-4xl">home_repair_service</span>
          </div>
          <h2 className="text-xl font-bold text-white font-headline tracking-tight">PHS Cleaning Company</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
              Restoring Session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
