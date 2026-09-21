import { DOC_TYPE_CONFIG } from "@/lib/documents/partnerDocConfig";
import type { PartnerDocumentType } from "@/lib/types";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Server-side file validation for partner document uploads.
 * Client-side checks exist too — this is the authoritative gate.
 */
export function validatePartnerDocument(
  docType: PartnerDocumentType,
  fileSizeBytes: number,
  mimeType: string
): ValidationResult {
  const config = DOC_TYPE_CONFIG[docType];
  if (!config) {
    return { ok: false, error: `Unknown document type: ${docType}` };
  }

  if (!config.acceptMimes.includes(mimeType)) {
    const allowed = config.acceptMimes
      .map((m) => m.split("/")[1]?.toUpperCase() || m)
      .join(", ");
    return {
      ok: false,
      error: `File type "${mimeType}" is not accepted. Please upload ${allowed}.`,
    };
  }

  const isImage = mimeType.startsWith("image/");
  const maxSizeMB = isImage ? config.maxSizeMB.image : config.maxSizeMB.pdf;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (fileSizeBytes > maxSizeBytes) {
    const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `File is ${sizeMB} MB. Maximum allowed is ${maxSizeMB} MB for ${isImage ? "images" : "PDFs"}.`,
    };
  }

  if (fileSizeBytes === 0) {
    return { ok: false, error: "File is empty. Please select a valid document." };
  }

  return { ok: true };
}

/**
 * Validate non-document fields for KYC submission.
 */
export function validateKycScalars(data: {
  experience_years?: number | null;
  police_station_details?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
}): ValidationResult {
  if (
    data.experience_years === undefined ||
    data.experience_years === null ||
    isNaN(data.experience_years) ||
    data.experience_years < 0
  ) {
    return { ok: false, error: "Please enter valid years of experience." };
  }

  if (!data.police_station_details?.trim()) {
    return { ok: false, error: "Please enter nearby police station details." };
  }

  if (
    !data.bank_name?.trim() ||
    !data.bank_account_no?.trim() ||
    !data.bank_ifsc?.trim()
  ) {
    return {
      ok: false,
      error: "Please fill in all bank details (Bank Name, Account Number, IFSC).",
    };
  }

  if (data.bank_ifsc.trim().length < 4) {
    return { ok: false, error: "IFSC code must be at least 4 characters." };
  }

  return { ok: true };
}
