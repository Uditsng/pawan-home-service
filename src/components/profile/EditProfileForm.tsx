"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { compressAvatarImage } from "@/utils/imageCompressor";

type ProfileData = {
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
};

export default function EditProfileForm({
  initialData,
  userId,
}: {
  initialData: ProfileData;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [alertMsg, setAlertMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
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
        setAlertMsg({ type: 'error', text: 'Please select an image file (JPG, PNG, or WebP).' });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Check file size (10MB ceiling)
      if (file.size > 10 * 1024 * 1024) {
        setAlertMsg({ type: 'error', text: 'Image is too large. Please choose a photo smaller than 10MB.' });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      try {
        setAlertMsg(null);
        const { file: compressedFile, previewUrl } = await compressAvatarImage(file);
        setAvatarFile(compressedFile);
        setAvatarPreview(previewUrl);
      } catch (err) {
        console.error("Compression error:", err);
        setAlertMsg({ type: 'error', text: 'Unable to process the selected photo. Please try a different image.' });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const newErrors: Partial<ProfileData> = {};
    const sanitizedEmail = formData.email.trim().toLowerCase();

    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!sanitizedEmail) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) newErrors.email = "Please enter a valid email address";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      let finalAvatarUrl = formData.avatar_url;

      // 1. Upload Avatar if new compressed file is selected
      if (avatarFile) {
        const filePath = `${userId}-${Date.now()}.webp`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Avatar")
          .upload(filePath, avatarFile, { upsert: true, contentType: "image/webp" });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          setAlertMsg({
            type: 'error',
            text: 'Unable to upload profile photo right now. Please check your connection or try again later.',
          });
          setLoading(false);
          return;
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from("Avatar")
            .getPublicUrl(filePath);
          finalAvatarUrl = `${publicUrl}?v=${Date.now()}`;
        }
      }

      let emailUpdateMessage = "";
      // 2. Update Auth Email if changed
      if (sanitizedEmail !== initialData.email.toLowerCase()) {
        const { error: authError } = await supabase.auth.updateUser({
          email: sanitizedEmail,
        });
        if (authError) {
          console.error("Auth update error:", authError);
          const userFriendlyEmailError = authError.message.toLowerCase().includes("rate limit")
            ? "Too many email update attempts. Please wait a few minutes and try again."
            : authError.message.toLowerCase().includes("already")
            ? "This email address is already in use by another account."
            : "Unable to update email address. Please verify the email and try again.";
          setAlertMsg({ type: 'error', text: userFriendlyEmailError });
          setLoading(false);
          return;
        } else {
          emailUpdateMessage = " A verification link was sent to your new email. Please check your inbox!";
        }
      }

      // 3. Update Profiles Table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: finalAvatarUrl,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      if (emailUpdateMessage) {
        setAlertMsg({ type: 'success', text: `Profile updated!${emailUpdateMessage}` });
        // Don't redirect immediately so they can read the toast!
        setTimeout(() => {
          router.push("/customer/profile");
          router.refresh();
        }, 4000);
      } else {
        router.push("/customer/profile");
        router.refresh();
      }

    } catch (err) {
      console.error("Error updating profile:", err);
      setAlertMsg({
        type: 'error',
        text: "Unable to update profile. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-dim min-h-screen relative w-full max-w-full overflow-x-hidden min-w-0 font-body">
      <div className="flex items-center gap-3 md:gap-4 bg-surface-container-lowest p-3 md:p-4 justify-start border-b border-outline-variant/10 w-full min-w-0">
        <Link href="/customer/profile" className="text-on-surface hover:opacity-80 transition-opacity p-1 rounded-xl">
          <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
        </Link>
        <span className="text-[16px] md:text-[18px] font-extrabold text-on-surface tracking-tight">Profile details</span>
      </div>

      <div className="p-3 md:p-4 flex-1 w-full max-w-full min-w-0">
        <div className="bg-surface-container-lowest rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm w-full mx-auto max-w-lg mb-24 min-w-0 border border-outline-variant/10">

          {/* Custom Alert Banner */}
          {alertMsg && (
            <div className={`w-full p-3 md:p-4 mb-4 md:mb-6 rounded-xl text-[13px] md:text-[14px] font-semibold flex items-start gap-2 ${
              alertMsg.type === 'error'
                ? 'bg-error/10 text-error border border-error/20'
                : 'bg-secondary/15 text-primary border border-secondary/25'
            }`}>
              <span className="material-symbols-outlined text-[16px] md:text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {alertMsg.type === 'error' ? 'error' : 'check_circle'}
              </span>
              <span>{alertMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center w-full min-w-0">

            {/* Avatar Section */}
            <div className="relative mb-6 md:mb-8 mt-2">
              <div
                className={`w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full flex items-center justify-center shrink-0 border-4 border-primary bg-surface-container overflow-hidden ${!avatarPreview && 'p-2'}`}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    width={120}
                    height={120}
                  />
                ) : (
                  <span className="material-symbols-outlined text-[60px] md:text-[80px] text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>person</span>
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center border-2 border-surface-container-lowest shadow-sm cursor-pointer hover:bg-secondary/90 transition-all active:scale-95"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile picture"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Input Fields */}
            <div className="w-full space-y-3 md:space-y-4 min-w-0">

              {/* Full Name */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 md:left-4 bg-surface-container-lowest px-1 text-xs md:text-sm font-semibold text-on-surface-variant">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Your Full Name"
                  className={`w-full border rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 outline-none transition-all text-on-surface bg-surface-container-lowest ${
                    errors.full_name
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-outline-variant focus:ring-primary focus:border-primary'
                  }`}
                />
                {errors.full_name && <p className="text-error text-xs md:text-sm mt-1 ml-1 font-medium">{errors.full_name}</p>}
              </div>

              {/* Mobile */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 md:left-4 bg-surface-container-lowest px-1 text-xs md:text-sm font-semibold text-on-surface-variant">Mobile</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-outline-variant rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface bg-surface-container-lowest"
                />
              </div>
              {/* Email */}
              <div className="relative mt-2">
                <label className={`absolute -top-2.5 left-3 md:left-4 bg-surface-container-lowest px-1 text-xs md:text-sm font-semibold ${errors.email ? 'text-error' : 'text-on-surface-variant'}`}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className={`w-full border rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 outline-none transition-all text-on-surface bg-surface-container-lowest ${
                    errors.email
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-outline-variant focus:ring-primary focus:border-primary'
                  }`}
                />
                {errors.email && <p className="text-error text-xs md:text-sm mt-1 ml-1 font-medium">{errors.email}</p>}
              </div>

            </div>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-center pb-safe z-30">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full max-w-lg bg-primary text-on-primary py-3.5 md:py-4 rounded-xl font-bold text-[14px] md:text-[16px] hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-70 flex justify-center items-center h-[50px] md:h-[56px] shadow-sm"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
          ) : (
            "Update profile"
          )}
        </button>
      </div>

    </div>
  );
}
