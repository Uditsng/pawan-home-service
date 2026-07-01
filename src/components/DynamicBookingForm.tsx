"use client";

import React, { useState, useEffect } from "react";
import { ImageUploadField } from "@/components/ui/ImageUploadField";

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "phone"
    | "email"
    | "dropdown"
    | "radio"
    | "checkbox"
    | "date"
    | "time"
    | "file"
    | "image"
    | "yes_no"
    | "rating"
    | "slider";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation_rules?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface DynamicBookingFormProps {
  fields: FormFieldConfig[];
  onChange: (values: Record<string, string>) => void;
  errors?: Record<string, string>;
}

export default function DynamicBookingForm({
  fields = [],
  onChange,
  errors = {},
}: DynamicBookingFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Notify parent on state change
  useEffect(() => {
    onChange(formValues);
  }, [formValues, onChange]);

  const handleInputChange = (name: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: string, option: string, checked: boolean) => {
    setFormValues((prev) => {
      const currentVal = prev[name] ? prev[name].split(",") : [];
      let newVal = [];
      if (checked) {
        newVal = [...currentVal, option];
      } else {
        newVal = currentVal.filter((v) => v !== option);
      }
      return {
        ...prev,
        [name]: newVal.join(","),
      };
    });
  };

  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-6 bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-base">edit_note</span>
        </div>
        <h3 className="text-lg font-bold font-headline text-primary">Service Specifications</h3>
      </div>
      <p className="text-xs text-on-surface-variant font-medium -mt-2">
        Please fill in the specifications below to help us serve you better.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {fields.map((field) => {
          const name = field.name;
          const label = field.label;
          const type = field.type;
          const required = field.required;
          const placeholder = field.placeholder || "";
          const errorMsg = errors[name];

          const value = formValues[name] || "";

          // Full width layout for some fields
          const isFullWidth =
            type === "textarea" ||
            type === "checkbox" ||
            type === "radio" ||
            type === "image" ||
            type === "file";

          return (
            <div
              key={name}
              className={`space-y-1.5 ${isFullWidth ? "md:col-span-2" : ""}`}
            >
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {label} {required && <span className="text-error font-black">*</span>}
              </label>

              {/* Text / Email / Phone / Number Inputs */}
              {(type === "text" ||
                type === "email" ||
                type === "phone" ||
                type === "number") && (
                <input
                  type={type}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  required={required}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                />
              )}

              {/* Textarea */}
              {type === "textarea" && (
                <textarea
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  required={required}
                  rows={3}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                />
              )}

              {/* Dropdown Select */}
              {type === "dropdown" && (
                <select
                  value={value}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  required={required}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                >
                  <option value="">{placeholder || "Select option"}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {/* Radio Group */}
              {type === "radio" && (
                <div className="flex flex-wrap gap-4 p-2 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                  {(field.options || []).map((opt) => {
                    const isSelected = value === opt;
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 text-sm font-bold cursor-pointer px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-surface border-outline-variant/10 hover:bg-surface-container-low"
                        }`}
                      >
                        <input
                          type="radio"
                          name={name}
                          value={opt}
                          checked={isSelected}
                          onChange={() => handleInputChange(name, opt)}
                          className="sr-only"
                        />
                        <span
                          className={`material-symbols-outlined text-lg ${
                            isSelected ? "text-primary" : "text-on-surface-variant/40"
                          }`}
                        >
                          {isSelected ? "radio_button_checked" : "radio_button_unchecked"}
                        </span>
                        {opt}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Checkbox Group */}
              {type === "checkbox" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                  {(field.options || []).map((opt) => {
                    const currentArray = value ? value.split(",") : [];
                    const isChecked = currentArray.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-primary/5 border-primary text-primary shadow-xs"
                            : "bg-surface border-outline-variant/10 hover:bg-surface-container-low"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleCheckboxChange(name, opt, e.target.checked)
                          }
                          className="sr-only"
                        />
                        <span
                          className={`material-symbols-outlined text-xl ${
                            isChecked ? "text-primary" : "text-on-surface-variant/40"
                          }`}
                        >
                          {isChecked ? "check_box" : "check_box_outline_blank"}
                        </span>
                        <span className="text-xs md:text-sm font-bold">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Date Input */}
              {type === "date" && (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  required={required}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                />
              )}

              {/* Time Input */}
              {type === "time" && (
                <input
                  type="time"
                  value={value}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  required={required}
                  className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                />
              )}

              {/* Yes / No */}
              {type === "yes_no" && (
                <div className="flex gap-4">
                  {["Yes", "No"].map((opt) => {
                    const isSelected = value === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleInputChange(name, opt)}
                        className={`px-6 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                            : "bg-surface border-outline-variant/20 hover:bg-surface-container-low text-on-surface-variant"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              {type === "rating" && (
                <div className="flex gap-1.5 p-2 bg-surface rounded-xl border border-outline-variant/15 w-fit">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const ratingVal = parseInt(value, 10) || 0;
                    const isFilled = ratingVal >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleInputChange(name, star.toString())}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${
                            isFilled ? "text-yellow-500" : "text-on-surface-variant/20"
                          }`}
                          style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Slider */}
              {type === "slider" && (
                <div className="space-y-2 p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                  <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                    <span>Min: {field.validation_rules?.min || 0}</span>
                    <span className="text-primary font-black bg-primary/10 px-2 py-0.5 rounded-md">
                      Current: {value || field.validation_rules?.min || 0}
                    </span>
                    <span>Max: {field.validation_rules?.max || 100}</span>
                  </div>
                  <input
                    type="range"
                    min={field.validation_rules?.min || 0}
                    max={field.validation_rules?.max || 100}
                    value={value || field.validation_rules?.min || 0}
                    onChange={(e) => handleInputChange(name, e.target.value)}
                    className="w-full accent-primary h-2 bg-outline-variant/20 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Image Upload */}
              {type === "image" && (
                <div className="bg-surface p-4 rounded-xl border border-outline-variant/15">
                  <ImageUploadField
                    name={name}
                    defaultValue={value || ""}
                    onValueChange={(url) => handleInputChange(name, url)}
                  />
                </div>
              )}

              {/* Generic File Upload (using simple link/text representation) */}
              {type === "file" && (
                <div className="bg-surface p-4 rounded-xl border border-outline-variant/15">
                  <input
                    type="text"
                    placeholder="Enter file attachment URL or text description"
                    value={value}
                    onChange={(e) => handleInputChange(name, e.target.value)}
                    className="w-full border border-outline-variant/20 rounded-lg p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-error text-xs font-semibold animate-in fade-in">
                  {errorMsg}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
