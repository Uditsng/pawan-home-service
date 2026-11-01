"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { updatePartnerProfile } from "../../actions";
import { compressAvatarImage } from "@/utils/imageCompressor";

interface ProfileData {
  full_name: string;
  phone: string;
  avatar_url: string;
}

interface EditProfileFormProps {
  initialData: ProfileData;
  userId: string;
}

export default function EditProfileForm({ initialData, userId }: EditProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [alertMsg, setAlertMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(initialData.avatar_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProfileData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate format
      if (!file.type.startsWith("image/")) {
        setAlertMsg({ type: "error", text: "Please select an image file (JPG, PNG, or WebP)." });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Check file size (10MB ceiling)
      if (file.size > 10 * 1024 * 1024) {
        setAlertMsg({
          type: "error",
          text: "Image is too large. Please choose a photo smaller than 10MB.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      try {
        setAlertMsg(null);
        const { file: compressedFile, previewUrl } = await compressAvatarImage(file);
        setAvatarFile(compressedFile);
        setAvatarPreview(previewUrl);
      } catch (err) {
        console.error("Compression error:", err);
        setAlertMsg({ type: "error", text: "Unable to process the selected photo. Please try a different image." });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<ProfileData> = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setAlertMsg(null);

    startTransition(async () => {
      try {
        let finalAvatarUrl = formData.avatar_url;

        // 1. Upload Avatar if a new file was chosen
        if (avatarFile) {
          setIsUploading(true);
          const filePath = `partner-${userId}-${Date.now()}.webp`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("Avatar")
            .upload(filePath, avatarFile, { upsert: true, contentType: "image/webp" });

          setIsUploading(false);

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            setAlertMsg({ type: "error", text: "Unable to upload profile photo right now. Please check your connection or try again later." });
            return;
          }

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from("Avatar")
              .getPublicUrl(filePath);
            finalAvatarUrl = `${publicUrl}?v=${Date.now()}`;
          }
        }

        // 2. Call server action with FormData
        const actionFormData = new FormData();
        actionFormData.append("full_name", formData.full_name);
        actionFormData.append("phone", formData.phone);
        actionFormData.append("avatar_url", finalAvatarUrl);

        const response = await updatePartnerProfile(actionFormData);

        if (!response.success) {
          setAlertMsg({ type: "error", text: response.error || "Failed to update profile." });
          return;
        }

        setAlertMsg({ type: "success", text: "Profile updated successfully!" });
        router.push("/partner/profile");
        router.refresh();
      } catch (err) {
        console.error("Error updating profile:", err);
        setAlertMsg({ type: "error", text: "Unable to update profile. Please check your connection and try again." });
      }
    });
  };

  const isLoading = isPending || isUploading;

  return (
    <div className="w-full min-h-screen bg-surface font-body text-on-surface pb-24 lg:pb-12">
      <div className="flex items-center gap-3 bg-surface-container-lowest p-4 px-4 sm:px-6 lg:px-8 border-b border-outline-variant/15 shadow-xs">
        <Link href="/partner/profile" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </Link>
        <h1 className="text-lg sm:text-xl font-headline font-black text-on-surface">Edit Profile</h1>
      </div>

      <div className="p-4 sm:p-6 max-w-xl mx-auto mt-4">
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-5 sm:p-8 shadow-xs w-full">
          {alertMsg && (
            <div
              className={`w-full p-4 mb-5 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-2.5 ${
                alertMsg.type === "error"
                  ? "bg-error/10 text-error border border-error/20"
                  : "bg-success/10 text-success border border-success/20"
              }`}
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {alertMsg.type === "error" ? "error" : "check_circle"}
              </span>
              <span>{alertMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            {/* Avatar Section */}
            <div className="relative mb-6 sm:mb-8 mt-2">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shrink-0 border-4 border-primary bg-surface-container-low overflow-hidden relative">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    width={112}
                    height={112}
                  />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">person</span>
                )}
              </div>
              <button
                type="button"
                disabled={isLoading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center border-2 border-white shadow-xs cursor-pointer hover:scale-105 transition-transform disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-sm text-primary font-bold">edit</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isLoading}
              />
            </div>

            {/* Fields */}
            <div className="w-full space-y-5">
              {/* Full Name */}
              <div className="relative">
                <label className="absolute -top-2.5 left-4 bg-surface-container-lowest px-1 text-xs font-bold text-on-surface-variant">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Your Full Name"
                  disabled={isLoading}
                  className={`w-full border rounded-2xl p-4 text-sm font-semibold focus:ring-2 outline-none transition-all bg-surface-container-lowest ${
                    errors.full_name
                      ? "border-error focus:ring-error"
                      : "border-outline-variant/20 focus:ring-primary focus:border-primary text-on-surface"
                  }`}
                />
                {errors.full_name && (
                  <p className="text-error text-xs font-semibold mt-1 ml-1">{errors.full_name}</p>
                )}
              </div>

              {/* Mobile */}
              <div className="relative">
                <label className="absolute -top-2.5 left-4 bg-surface-container-lowest px-1 text-xs font-bold text-on-surface-variant">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full border border-outline-variant/20 bg-surface-container-lowest rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-primary hover:bg-primary/95 text-on-primary py-4 rounded-2xl font-bold font-headline text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-75 flex justify-center items-center h-14 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Update Profile"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
