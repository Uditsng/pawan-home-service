"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  variant?: "list" | "button" | "icon";
  className?: string;
  showChevron?: boolean;
}

export default function LogoutButton({ 
  variant = "button", 
  className = "", 
  showChevron = true 
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any local state if necessary
      // Then redirect to home
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "list") {
    return (
      <button 
        onClick={handleLogout}
        disabled={isLoading}
        className={`flex items-center justify-between p-4 md:p-5 hover:bg-surface-container-low transition-colors w-full text-left group disabled:opacity-50 ${className}`}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] md:text-[20px]">
            {isLoading ? "sync" : "logout"}
          </span>
          <span className="font-semibold text-[13px] md:text-[15px] text-on-surface">
            {isLoading ? "Logging out..." : "Log out"}
          </span>
        </div>
        {showChevron && !isLoading && (
          <span className="material-symbols-outlined text-outline-variant text-[18px] md:text-[20px] group-hover:text-on-surface-variant transition-colors">
            chevron_right
          </span>
        )}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        title="Log out"
        className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-error/10 hover:text-error transition-all disabled:opacity-50 ${className}`}
      >
        <span className="material-symbols-outlined">
          {isLoading ? "sync" : "logout"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all text-sm disabled:opacity-50 ${className}`}
    >
      {isLoading ? "Logging out..." : "Log out"}
    </button>
  );
}
