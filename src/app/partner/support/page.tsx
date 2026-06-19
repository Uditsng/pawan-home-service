import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PartnerHeader from "@/components/PartnerHeader";
import PartnerBottomNav from "@/components/PartnerBottomNav";
import SupportClient from "./SupportClient";
import type { PartnerProfile } from "@/lib/types";

export const metadata = {
  title: "Help & Support | PHS Cleaning Company",
  description: "Contact the PHS central support desk.",
};

export default async function PartnerSupportPage() {
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

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      <PartnerHeader initialStatus={profile.status ?? "offline"} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5">
        <div className="border-b border-outline-variant/15 pb-4">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#1c2438]">
            Help & Support
          </h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            Need assistance with bookings or payouts? Our partner helpline is available.
          </p>
        </div>

        <SupportClient />
      </main>

      <PartnerBottomNav />
    </div>
  );
}
