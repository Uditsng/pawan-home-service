"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size (50KB limit)
      if (file.size > 50 * 1024) {
        setAlertMsg({ type: 'error', text: 'Image size must be less than 50KB. Please choose a smaller image.' });
        // Clear the input
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

      // 1. Upload Avatar if new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${userId}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Avatar")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setAlertMsg({ type: 'error', text: `Error uploading image: ${uploadError.message}` });
          setLoading(false);
          return;
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from("Avatar")
            .getPublicUrl(filePath);
          finalAvatarUrl = publicUrl;
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
          setAlertMsg({ type: 'error', text: `Failed to update email: ${authError.message}` });
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
          router.push("/profile");
          router.refresh();
        }, 4000);
      } else {
        router.push("/profile");
        router.refresh();
      }

    } catch (err) {
      const error = err as Error;
      console.error("Error updating profile:", error?.message || err);
      setAlertMsg({ type: 'error', text: error?.message || "An unexpected error occurred while updating profile" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen relative">
      <div className="flex items-center gap-3 md:gap-4 bg-white p-3 md:p-4 justify-start">
        <Link href="/profile" className="text-on-background hover:opacity-80">
          <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
        </Link>
        <span className="text-[16px] md:text-[18px] font-bold text-[#1c2438]">Profile details</span>
      </div>

      <div className="p-3 md:p-4 flex-1">
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm w-full mx-auto max-w-lg mb-24">

          {/* Custom Alert Banner */}
          {alertMsg && (
            <div className={`w-full p-3 md:p-4 mb-4 md:mb-6 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-semibold flex items-start gap-2 ${alertMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
              }`}>
              <span className="material-symbols-outlined text-[16px] md:text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {alertMsg.type === 'error' ? 'error' : 'check_circle'}
              </span>
              <span>{alertMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center">

            {/* Avatar Section */}
            <div className="relative mb-6 md:mb-8 mt-2">
              <div
                className={`w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full flex items-center justify-center shrink-0 border-4 border-slate-900 bg-slate-100 overflow-hidden ${!avatarPreview && 'p-2'}`}
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
                  <span className="material-symbols-outlined text-[60px] md:text-[80px] text-slate-800" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>person</span>
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#dcfce7] flex items-center justify-center border-2 border-white shadow-sm cursor-pointer hover:bg-green-200 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[14px] md:text-[16px] text-green-700">edit</span>
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
            <div className="w-full space-y-3 md:space-y-4">

              {/* Full Name */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 md:left-4 bg-white px-1 text-xs md:text-sm font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Your Full Name"
                  className={`w-full border rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 outline-none transition-all ${errors.full_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-primary focus:border-primary'
                    }`}
                />
                {errors.full_name && <p className="text-red-500 text-xs md:text-sm mt-1 ml-1">{errors.full_name}</p>}
              </div>

              {/* Mobile */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 md:left-4 bg-white px-1 text-xs md:text-sm font-semibold text-slate-600">Mobile</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative mt-2">
                <label className={`absolute -top-2.5 left-3 md:left-4 bg-white px-1 text-xs md:text-sm font-semibold ${errors.email ? 'text-red-500' : 'text-slate-600'}`}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className={`w-full border rounded-xl p-3.5 md:p-4 text-sm md:text-base focus:ring-1 outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500 text-slate-400' : 'border-slate-300 focus:ring-primary focus:border-primary'
                    }`}
                />
                {errors.email && <p className="text-red-500 text-xs md:text-sm mt-1 ml-1 font-medium">{errors.email}</p>}
              </div>

            </div>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4 bg-white border-t border-slate-100 flex justify-center pb-safe">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full max-w-lg bg-[#22c55e] text-white py-3.5 md:py-4 rounded-xl font-bold text-[14px] md:text-[16px] hover:bg-green-600 transition-colors disabled:opacity-70 flex justify-center items-center h-[50px] md:h-[56px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Update profile"
          )}
        </button>
      </div>

    </div>
  );
}
