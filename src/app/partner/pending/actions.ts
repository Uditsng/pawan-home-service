"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveKycDraftAction(kycData: {
  aadhaar_url?: string;
  pan_url?: string;
  dl_url?: string;
  experience_years?: number | null;
  police_verification_url?: string;
  police_station_details?: string;
  selfie_url?: string;
  address_proof_url?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      kyc_status: "draft",
      kyc_documents: kycData,
      kyc_rejection_reason: null
    })
    .eq("id", user.id);

  if (error) {
    console.error("KYC draft error:", error.message);
    return { success: false, error: "Failed to save draft." };
  }

  revalidatePath("/partner/pending");
  return { success: true };
}

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

  // Trigger Admin Notification
  try {
    const { notifyAdmins } = await import("@/lib/notifications");
    await notifyAdmins(
      "New KYC Submission",
      `Technician ${user.user_metadata?.full_name || user.email} has submitted documents for verification.`,
      "general",
      { partner_id: user.id }
    );
  } catch (notifyErr) {
    console.error("Failed to notify admins of KYC submission:", notifyErr);
  }

  revalidatePath("/partner/pending");
  return { success: true };
}
