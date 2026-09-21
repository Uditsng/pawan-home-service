"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { KycDocumentsData } from "@/lib/types";

type ActionResult = { success: boolean; error?: string };

/**
 * Update UPI payment details (always editable, never locked).
 * Only writes the 3 UPI keys into kyc_documents JSONB.
 */
export async function updatePaymentMethodAction(payload: {
  upi_id?: string;
  upi_number?: string;
  upi_qr_url?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch current kyc_documents
  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_documents")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found." };

  const existing = (profile.kyc_documents as KycDocumentsData | null) || {};
  const updated: Record<string, unknown> = { ...existing };

  // Merge only UPI keys (overwrite always allowed)
  if (payload.upi_id !== undefined) updated.upi_id = payload.upi_id || null;
  if (payload.upi_number !== undefined) updated.upi_number = payload.upi_number || null;
  if (payload.upi_qr_url !== undefined) updated.upi_qr_url = payload.upi_qr_url || null;

  const { error } = await supabase
    .from("profiles")
    .update({ kyc_documents: updated })
    .eq("id", user.id);

  if (error) {
    console.error("Update payment method error:", error.message);
    return { success: false, error: "Failed to save. Please try again." };
  }

  revalidatePath("/partner/profile/bank");
  return { success: true };
}
