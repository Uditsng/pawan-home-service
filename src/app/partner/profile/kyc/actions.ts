"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { KycDocumentsData } from "@/lib/types";

type ActionResult = { success: boolean; error?: string };

export async function uploadRemainingKycAction(
  incomingData: Partial<KycDocumentsData>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Fetch current profile to check KYC status and existing documents
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("kyc_status, kyc_documents")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) {
    return { success: false, error: "Could not load your profile." };
  }

  if (profile.kyc_status !== "approved") {
    return {
      success: false,
      error: "You can only upload remaining details after your KYC is approved.",
    };
  }

  const existingDocs = (profile.kyc_documents as KycDocumentsData | null) || {};

  // Server-side immutability: merge only fields that are currently empty/null/undefined
  const mergedDocs: KycDocumentsData = { ...existingDocs };

  const allKeys: (keyof KycDocumentsData)[] = [
    "aadhaar_url",
    "pan_url",
    "dl_url",
    "experience_years",
    "police_verification_url",
    "police_station_details",
    "selfie_url",
    "address_proof_url",
    "bank_name",
    "bank_account_no",
    "bank_ifsc",
  ];

  for (const key of allKeys) {
    const existingValue = existingDocs[key];
    const hasExistingValue =
      existingValue !== undefined && existingValue !== null && existingValue !== "";

    if (!hasExistingValue) {
      const newValue = incomingData[key];
      if (newValue !== undefined && newValue !== null && newValue !== "") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mergedDocs as any)[key] = newValue;
      }
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ kyc_documents: mergedDocs })
    .eq("id", user.id);

  if (updateError) {
    console.error("KYC remaining upload error:", updateError.message);
    return { success: false, error: "Failed to save details. Please try again." };
  }

  // Notify admins about the upload
  try {
    const { notifyAdmins } = await import("@/lib/notifications");
    await notifyAdmins(
      "KYC Documents Updated",
      `${user.user_metadata?.full_name || user.email} has uploaded remaining verification documents. Please review.`,
      "general",
      { partner_id: user.id }
    );
  } catch (notifyErr) {
    console.error("Failed to notify admins of KYC update:", notifyErr);
  }

  revalidatePath("/partner/profile");
  revalidatePath("/partner/profile/kyc");
  return { success: true };
}
