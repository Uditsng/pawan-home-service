"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import type { PartnerDocumentType, PartnerDocument } from "@/lib/types";
import { KYC_ALL_TYPES, DOC_TYPE_CONFIG } from "@/lib/documents/partnerDocConfig";
import { logAdminAuditAction } from "@/utils/auditLogger";

type ActionResult = { success: boolean; error?: string };

/**
 * Upload or re-upload a single partner document.
 * Allowed when doc is missing/deferred/rejected/resubmit_required.
 * Sets status to 'pending' for admin re-review.
 */
export async function uploadPartnerDocumentAction(
  docType: PartnerDocumentType,
  fileUrl: string,
  storagePath?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const cfg = DOC_TYPE_CONFIG[docType];
  if (!cfg) return { success: false, error: "Invalid document type." };

  // Fetch current doc status
  const { data: existing } = await supabase
    .from("partner_documents")
    .select("id, status")
    .eq("partner_id", user.id)
    .eq("doc_type", docType)
    .single();

  const allowedStatuses = ["missing", "deferred", "rejected", "resubmit_required"];
  if (existing && !allowedStatuses.includes(existing.status)) {
    return {
      success: false,
      error: "This document is already verified and cannot be changed. Contact support if you need to update it.",
    };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.from("partner_documents").upsert(
    {
      partner_id: user.id,
      doc_type: docType,
      file_url: fileUrl,
      storage_path: storagePath || null,
      status: "pending",
      uploaded_at: new Date().toISOString(),
      rejection_reason: null,
    },
    { onConflict: "partner_id,doc_type" }
  );

  if (error) {
    console.error("Upload doc error:", error.message);
    return { success: false, error: "Failed to save document." };
  }

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "partners",
    recordId: user.id,
    recordTitle: `Document ${docType} re-uploaded`,
    newData: { doc_type: docType, status: "pending" },
  });

  revalidatePath("/partner/profile/kyc");
  return { success: true };
}

/**
 * Generate a short-lived signed URL for viewing a partner document.
 * Owner or admin only.
 */
export async function getPartnerDocumentSignedUrl(
  docId: string
): Promise<ActionResult & { signedUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: doc, error: fetchError } = await supabase
    .from("partner_documents")
    .select("id, partner_id, storage_path, file_url")
    .eq("id", docId)
    .single();

  if (fetchError || !doc) {
    return { success: false, error: "Document not found." };
  }

  // Ownership check (partner or admin)
  const isAdmin = user.user_metadata?.role === "admin";
  if (doc.partner_id !== user.id && !isAdmin) {
    return { success: false, error: "Not authorized." };
  }

  // Try signed URL from private bucket first
  if (doc.storage_path) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from("partner-docs")
      .createSignedUrl(doc.storage_path, 3600);

    if (!error && data?.signedUrl) {
      return { success: true, signedUrl: data.signedUrl };
    }
  }

  // Fallback to stored file_url (legacy public URL)
  if (doc.file_url) {
    return { success: true, signedUrl: doc.file_url };
  }

  return { success: false, error: "Document file not available." };
}
