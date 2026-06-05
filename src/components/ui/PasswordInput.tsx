"use client";

import { useState } from "react";

interface PasswordInputProps {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  /** Controlled mode: current value */
  value?: string;
  /** Controlled mode: onChange handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Additional class names */
  className?: string;
}

export function PasswordInput({
  name = "password",
  placeholder = "••••••••",
  required = true,
  minLength = 6,
  value,
  onChange,
  className = "",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const baseClass =
    "w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline pr-12";

  // Support both controlled (value + onChange) and uncontrolled (name-based form submission)
  const inputProps =
    value !== undefined
      ? { value, onChange }
      : {};

  return (
    <div className="relative">
      <input
        className={`${baseClass} ${className}`.trim()}
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        {...inputProps}
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
