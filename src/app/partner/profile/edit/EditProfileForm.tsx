"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { updatePartnerProfile } from "../../actions";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size (50KB limit as per AGENTS.md rule)
      if (file.size > 50 * 1024) {
        setAlertMsg({
          type: "error",
          text: "Image size must be less than 50KB. Please choose a smaller image.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setAlertMsg(null);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
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
          const fileExt = avatarFile.name.split(".").pop();
          const filePath = `partner-${userId}-${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("Avatar")
            .upload(filePath, avatarFile, { upsert: true });

          setIsUploading(false);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            setAlertMsg({ type: "error", text: `Error uploading image: ${uploadError.message}` });
            return;
          }

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from("Avatar")
              .getPublicUrl(filePath);
            finalAvatarUrl = publicUrl;
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
        const error = err as Error;
        console.error("Error updating profile:", error.message);
        setAlertMsg({ type: "error", text: error.message || "An unexpected error occurred." });
      }
    });
  };

  const isLoading = isPending || isUploading;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 bg-white p-4 justify-start border-b border-outline-variant/10">
        <Link href="/partner/profile" className="text-on-surface-variant hover:opacity-80 flex items-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </Link>
        <span className="text-[18px] font-extrabold text-[#1c2438]">Edit Profile</span>
      </div>

      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm w-full">
          {alertMsg && (
            <div
              className={`w-full p-4 mb-5 rounded-2xl text-sm font-semibold flex items-start gap-2.5 ${
                alertMsg.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-green-50 text-green-700 border border-green-100"
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {alertMsg.type === "error" ? "error" : "check_circle"}
              </span>
              <span>{alertMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            {/* Avatar Section */}
            <div className="relative mb-6 md:mb-8 mt-2">
              <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full flex items-center justify-center shrink-0 border-4 border-primary bg-surface overflow-hidden relative">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    width={120}
                    height={120}
                  />
                ) : (
                  <span className="material-symbols-outlined text-[60px] md:text-[80px] text-slate-400">person</span>
                )}
              </div>
              <button
                type="button"
                disabled={isLoading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center border-2 border-white shadow-sm cursor-pointer hover:opacity-95 transition-opacity disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[16px] text-primary font-bold">edit</span>
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
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-xs font-bold text-slate-500">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Your Full Name"
                  disabled={isLoading}
                  className={`w-full border rounded-xl p-4 text-sm font-semibold focus:ring-1 outline-none transition-all ${
                    errors.full_name
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-slate-300 focus:ring-primary focus:border-primary text-primary"
                  }`}
                />
                {errors.full_name && (
                  <p className="text-red-500 text-xs font-semibold mt-1 ml-1">{errors.full_name}</p>
                )}
              </div>

              {/* Mobile */}
              <div className="relative">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-xs font-bold text-slate-500">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full border border-slate-300 rounded-xl p-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-[#22c55e] text-white py-4 rounded-xl font-bold text-sm hover:bg-green-600 transition-colors disabled:opacity-75 flex justify-center items-center h-[56px] cursor-pointer"
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
