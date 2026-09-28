"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import type { KycDocumentsData, PartnerDocumentType } from "@/lib/types";
import { KYC_MANDATORY_TYPES } from "@/lib/documents/partnerDocConfig";
import { validateKycScalars } from "@/lib/documents/validateDocument";
import { logAdminAuditAction } from "@/utils/auditLogger";

type ActionResult = { success: boolean; error?: string };

interface UpsertResult {
  error: { message: string; code?: string } | null;
  data: unknown;
}

interface DraftResult {
  ok: boolean;
  error?: string;
}

/** Required document types at initial submit (excludes police_verification) */
const REQUIRED_AT_SUBMIT: PartnerDocumentType[] = KYC_MANDATORY_TYPES.filter(
  (t) => t !== "police_verification"
);

/**
 * Save KYC draft — upserts document URLs and scalar fields.
 * Does NOT create deferred police row yet (that happens on submit).
 */
export async function saveKycDraftAction(payload: {
  docUrls: Record<string, string>;
  scalars: Omit<Partial<KycDocumentsData>, "experience_years"> & {
    experience_years?: number | null;
  };
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();

  // Upsert document rows (only those with a URL)
  const docUpserts: Promise<UpsertResult>[] = [];
  for (const [docType, url] of Object.entries(payload.docUrls)) {
    if (!url) continue;
    const marker = "/partner-docs/";
    const idx = url.indexOf(marker);
    const storagePath = idx !== -1 ? url.slice(idx + marker.length).split("?")[0] : null;

    docUpserts.push(
      adminClient.from("partner_documents").upsert(
        {
          partner_id: user.id,
          doc_type: docType,
          file_url: url,
          storage_path: storagePath,
          status: "pending",
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "partner_id,doc_type" }
      ).select().single() as unknown as Promise<UpsertResult>
    );
  }

  const results = await Promise.all(docUpserts);
  for (const r of results) {
    if (r.error) {
      console.warn("KYC draft doc upsert warning:", r.error.message);
      if (r.error.code !== "42P01" && !r.error.message?.includes("does not exist")) {
        return { success: false, error: "Failed to save documents." };
      }
    }
  }

  // Update scalar fields in kyc_documents
  const scalarsToSave: Record<string, unknown> = {};
  if (payload.scalars.experience_years !== undefined && payload.scalars.experience_years !== null) {
    scalarsToSave.experience_years = payload.scalars.experience_years;
  }
  if (payload.scalars.police_station_details) {
    scalarsToSave.police_station_details = payload.scalars.police_station_details;
  }
  if (payload.scalars.bank_name) scalarsToSave.bank_name = payload.scalars.bank_name;
  if (payload.scalars.bank_account_no) scalarsToSave.bank_account_no = payload.scalars.bank_account_no;
  if (payload.scalars.bank_ifsc) scalarsToSave.bank_ifsc = payload.scalars.bank_ifsc.trim().toUpperCase();
  if (payload.scalars.upi_id) scalarsToSave.upi_id = payload.scalars.upi_id;
  if (payload.scalars.upi_number) scalarsToSave.upi_number = payload.scalars.upi_number;
  if (payload.scalars.upi_qr_url) scalarsToSave.upi_qr_url = payload.scalars.upi_qr_url;

  // Dual-write doc URLs into kyc_documents JSONB for backward compatibility
  const legacyDocKeyMap: Record<string, string> = {
    aadhaar_front: "aadhaar_url",
    aadhaar_back: "aadhaar_back_url",
    pan: "pan_url",
    dl: "dl_url",
    selfie: "selfie_url",
    address_proof: "address_proof_url",
    police_verification: "police_verification_url",
  };
  for (const [docType, legKey] of Object.entries(legacyDocKeyMap)) {
    if (payload.docUrls[docType]) {
      scalarsToSave[legKey] = payload.docUrls[docType];
    }
  }

  const { data: currProfile } = await adminClient
    .from("profiles")
    .select("kyc_documents")
    .eq("id", user.id)
    .single();

  let existingKyc: Record<string, unknown> = {};
  if (currProfile?.kyc_documents) {
    if (typeof currProfile.kyc_documents === "string") {
      try {
        existingKyc = JSON.parse(currProfile.kyc_documents);
      } catch {
        existingKyc = {};
      }
    } else if (typeof currProfile.kyc_documents === "object" && currProfile.kyc_documents !== null) {
      existingKyc = currProfile.kyc_documents as Record<string, unknown>;
    }
  }
  const kycToSave = { ...existingKyc, ...scalarsToSave };

  const { error } = await adminClient
    .from("profiles")
    .update({
      kyc_status: "draft",
      kyc_documents: kycToSave,
      kyc_rejection_reason: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("KYC draft profile error:", error.message);
    return { success: false, error: "Failed to save draft." };
  }

  revalidatePath("/partner/pending");
  return { success: true };
}

/**
 * Submit KYC documents for review.
 * Required: 5 mandatory doc types (aadhaar front+back, pan, dl, selfie, address).
 * Police verification is optional (deferred with 30-day deadline).
 */
export async function submitKycDocumentsAction(payload: {
  docUrls: Record<string, string>;
  scalars: {
    experience_years: number;
    police_station_details: string;
    bank_name: string;
    bank_account_no: string;
    bank_ifsc: string;
    upi_id?: string;
    upi_number?: string;
    upi_qr_url?: string;
  };
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Validate required docs are present
  for (const docType of REQUIRED_AT_SUBMIT) {
    if (!payload.docUrls[docType]) {
      const label =
        docType === "aadhaar_front"
          ? "Aadhaar Card (Front)"
          : docType === "aadhaar_back"
            ? "Aadhaar Card (Back)"
            : docType.charAt(0).toUpperCase() + docType.slice(1).replace("_", " ");
      return { success: false, error: `Please upload your ${label}.` };
    }
  }

  // Validate scalars
  const scalarCheck = validateKycScalars(payload.scalars);
  if (!scalarCheck.ok) return { success: false, error: scalarCheck.error || "Validation failed" };

  const adminClient = createAdminClient();

  // Fetch police deadline from platform_settings
  const { data: setting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "police_verification_due_days")
    .single();
  const dueDays = parseInt(setting?.value || "30", 10);
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();

  // Upsert all document rows
  const docUpserts: Promise<UpsertResult>[] = [];

  for (const [docType, url] of Object.entries(payload.docUrls)) {
    if (!url) continue;
    const marker = "/partner-docs/";
    const idx = url.indexOf(marker);
    const storagePath = idx !== -1 ? url.slice(idx + marker.length).split("?")[0] : null;

    docUpserts.push(
      adminClient.from("partner_documents").upsert(
        {
          partner_id: user.id,
          doc_type: docType,
          file_url: url,
          storage_path: storagePath,
          status: "pending",
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "partner_id,doc_type" }
      ).select().single() as unknown as Promise<UpsertResult>
    );
  }

  // Create deferred police row if not uploaded
  if (!payload.docUrls["police_verification"]) {
    docUpserts.push(
      adminClient.from("partner_documents").upsert(
        {
          partner_id: user.id,
          doc_type: "police_verification",
          status: "deferred",
          due_at: dueDate,
        },
        { onConflict: "partner_id,doc_type" }
      ).select().single() as unknown as Promise<UpsertResult>
    );
  } else {
    // Police uploaded — mark as pending
    const policeUrl = payload.docUrls["police_verification"];
    const marker = "/partner-docs/";
    const idx = policeUrl.indexOf(marker);
    const policeStoragePath = idx !== -1 ? policeUrl.slice(idx + marker.length).split("?")[0] : null;

    docUpserts.push(
      adminClient.from("partner_documents").upsert(
        {
          partner_id: user.id,
          doc_type: "police_verification",
          file_url: policeUrl,
          storage_path: policeStoragePath,
          status: "pending",
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "partner_id,doc_type" }
      ).select().single() as unknown as Promise<UpsertResult>
    );
  }

  const results = await Promise.all(docUpserts);
  for (const r of results) {
    if (r.error) {
      console.warn("KYC submit doc upsert warning:", r.error.message);
      if (r.error.code !== "42P01" && !r.error.message?.includes("does not exist")) {
        return { success: false, error: "Failed to save documents. Please try again." };
      }
    }
  }

  // Update profile
  const scalarsToSave: Record<string, unknown> = {
    experience_years: payload.scalars.experience_years,
    police_station_details: payload.scalars.police_station_details,
    bank_name: payload.scalars.bank_name,
    bank_account_no: payload.scalars.bank_account_no,
    bank_ifsc: payload.scalars.bank_ifsc.trim().toUpperCase(),
  };
  if (payload.scalars.upi_id) scalarsToSave.upi_id = payload.scalars.upi_id;
  if (payload.scalars.upi_number) scalarsToSave.upi_number = payload.scalars.upi_number;
  if (payload.scalars.upi_qr_url) scalarsToSave.upi_qr_url = payload.scalars.upi_qr_url;

  // Dual-write doc URLs into kyc_documents JSONB for backward compatibility
  const legacyDocKeyMap: Record<string, string> = {
    aadhaar_front: "aadhaar_url",
    aadhaar_back: "aadhaar_back_url",
    pan: "pan_url",
    dl: "dl_url",
    selfie: "selfie_url",
    address_proof: "address_proof_url",
    police_verification: "police_verification_url",
  };
  for (const [docType, legKey] of Object.entries(legacyDocKeyMap)) {
    if (payload.docUrls[docType]) {
      scalarsToSave[legKey] = payload.docUrls[docType];
    }
  }

  const { data: currProfile } = await adminClient
    .from("profiles")
    .select("kyc_documents")
    .eq("id", user.id)
    .single();

  let existingKyc: Record<string, unknown> = {};
  if (currProfile?.kyc_documents) {
    if (typeof currProfile.kyc_documents === "string") {
      try {
        existingKyc = JSON.parse(currProfile.kyc_documents);
      } catch {
        existingKyc = {};
      }
    } else if (typeof currProfile.kyc_documents === "object" && currProfile.kyc_documents !== null) {
      existingKyc = currProfile.kyc_documents as Record<string, unknown>;
    }
  }
  const kycToSave = { ...existingKyc, ...scalarsToSave };

  const { error } = await adminClient
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_documents: kycToSave,
      kyc_rejection_reason: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("KYC submission error:", error.message);
    return { success: false, error: "Failed to submit documents." };
  }

  // Audit log
  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "partners",
    recordId: user.id,
    recordTitle: `KYC submitted by ${user.user_metadata?.full_name || user.email}`,
    newData: { kyc_status: "pending" },
  });

  // Notify admins
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
