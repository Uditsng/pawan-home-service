import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PendingClient from "./PendingClient";

export default async function PartnerPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch partner profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, kyc_status, kyc_rejection_reason")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "partner") {
    redirect("/login");
  }

  return (
    <PendingClient
      initialKycStatus={profile.kyc_status}
      rejectionReason={profile.kyc_rejection_reason}
      userId={user.id}
    />
  );
}
