import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PartnerHeader from "@/components/PartnerHeader";
import PartnerBottomNav from "@/components/PartnerBottomNav";
import EditProfileForm from "./EditProfileForm";
import type { PartnerProfile } from "@/lib/types";

export default async function PartnerEditProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch partner profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as PartnerProfile | null;
  if (!profile || profile.role !== "partner") {
    redirect("/login");
  }

  const initialData = {
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    avatar_url: profile.avatar_url || "",
  };

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      <PartnerHeader initialStatus={profile.status ?? "offline"} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5">
        <EditProfileForm initialData={initialData} userId={user.id} />
      </main>

      <PartnerBottomNav />
    </div>
  );
}
