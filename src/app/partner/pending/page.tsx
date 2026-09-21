import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PendingClient from "./PendingClient";
import type { PartnerDocument } from "@/lib/types";

export default async function PartnerPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, kyc_status, kyc_rejection_reason, kyc_documents")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "partner") {
    redirect("/login");
  }

  const { data: documents } = await supabase
    .from("partner_documents")
    .select("*")
    .eq("partner_id", user.id);

  return (
    <PendingClient
      initialKycStatus={profile.kyc_status}
      rejectionReason={profile.kyc_rejection_reason}
      initialKycDocuments={profile.kyc_documents}
      initialDocuments={(documents as PartnerDocument[]) || []}
      userId={user.id}
    />
  );
}
