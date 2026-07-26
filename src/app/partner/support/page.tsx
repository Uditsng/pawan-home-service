import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-12 flex flex-col font-body">

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="border-b border-outline-variant/15 pb-4">
          <h1 className="text-xl sm:text-2xl font-headline font-black tracking-tight text-on-surface">
            Help & Support Center
          </h1>
          <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-1">
            Need assistance with bookings, payouts, or account status? Our central support desk is here to help.
          </p>
        </div>

        <SupportClient />
      </main>
    </div>
  );
}
