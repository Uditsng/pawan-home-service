"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitKycDocumentsAction(kycData: {
  aadhaar_url: string;
  pan_url: string;
  dl_url: string;
  experience_years: number;
  police_verification_url: string;
  police_station_details: string;
  selfie_url: string;
  address_proof_url: string;
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_documents: kycData,
      kyc_rejection_reason: null // Clear any previous rejection reason
    })
    .eq("id", user.id);

  if (error) {
    console.error("KYC submission error:", error.message);
    return { success: false, error: "Failed to submit documents." };
  }

  revalidatePath("/partner/pending");
  return { success: true };
}
