"use client";

import { useState } from "react";

export function PasswordInput({
  name = "password",
  placeholder = "••••••••",
  required = true,
  minLength = 6,
}: {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-[#94a3b8] pr-12"
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 px-4 flex items-center text-outline-variant hover:text-primary transition-colors focus:outline-none"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <span className="material-symbols-outlined text-[20px]">
          {showPassword ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}
