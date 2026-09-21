import type { PartnerDocument, PartnerDocumentType } from "@/lib/types";

export interface DocTypeConfig {
  label: string;
  hint: string;
  icon: string;
  required: boolean;
  acceptMimes: string[];
  acceptAttr: string;
  maxSizeMB: { image: number; pdf: number };
}

export const DOC_TYPE_CONFIG: Record<PartnerDocumentType, DocTypeConfig> = {
  aadhaar_front: {
    label: "Aadhaar Card \u2014 Front",
    hint: "Front side showing your photo, name, and 12-digit number",
    icon: "badge",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
  aadhaar_back: {
    label: "Aadhaar Card \u2014 Back",
    hint: "Back side showing address and hologram",
    icon: "badge",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
  pan: {
    label: "PAN Card",
    hint: "Your PAN card with name and photo",
    icon: "credit_card",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
  dl: {
    label: "Driving Licence",
    hint: "Your valid driving licence",
    icon: "sports_motorsports",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
  selfie: {
    label: "Selfie Photo",
    hint: "A clear, well-lit face photo (not a group photo)",
    icon: "photo_camera",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp",
    maxSizeMB: { image: 10, pdf: 0 },
  },
  address_proof: {
    label: "Address Proof",
    hint: "Utility bill, bank statement, or rental agreement",
    icon: "home_pin",
    required: true,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
  police_verification: {
    label: "Police Verification",
    hint: "Police clearance certificate (optional \u2014 upload within 30 days of approval)",
    icon: "gavel",
    required: false,
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptAttr: "image/jpeg,image/png,image/webp,application/pdf",
    maxSizeMB: { image: 10, pdf: 2 },
  },
};

export const KYC_MANDATORY_TYPES: PartnerDocumentType[] = (
  Object.keys(DOC_TYPE_CONFIG) as PartnerDocumentType[]
).filter((k) => DOC_TYPE_CONFIG[k].required);

export const KYC_ALL_TYPES: PartnerDocumentType[] = Object.keys(
  DOC_TYPE_CONFIG
) as PartnerDocumentType[];

export const AADHAAR_GROUP: PartnerDocumentType[] = [
  "aadhaar_front",
  "aadhaar_back",
];

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  missing: { label: "Not uploaded", color: "text-on-surface-variant" },
  pending: { label: "Under review", color: "text-primary" },
  approved: { label: "Approved", color: "text-success" },
  rejected: { label: "Rejected", color: "text-error" },
  resubmit_required: { label: "Re-upload required", color: "text-error" },
  deferred: { label: "Optional \u2014 add later", color: "text-warning-container" },
  expired: { label: "Expired", color: "text-error" },
};

// ─── Legacy JSONB → normalized table bridge ──────────────────
// Old partners stored file URLs in profiles.kyc_documents JSONB with keys
// like "aadhaar_url", "pan_url", etc.  After migration these map to rows
// in partner_documents.  This helper fills any gaps so pre-migration data
// is always visible in admin & partner panels.

const LEGACY_KEY_MAP: Record<PartnerDocumentType, string> = {
  aadhaar_front: "aadhaar_url",
  aadhaar_back: "aadhaar_back_url",
  pan: "pan_url",
  dl: "dl_url",
  selfie: "selfie_url",
  address_proof: "address_proof_url",
  police_verification: "police_verification_url",
};

/**
 * Merge normalized partner_documents table rows with legacy kyc_documents JSONB.
 * Table rows take precedence; legacy URLs fill any gaps so pre-migration
 * data remains visible in both admin and partner panels.
 */
export function mergePartnerDocuments(
  tableDocs: PartnerDocument[],
  legacyJsonb: Record<string, unknown> | null | undefined,
  kycStatus: string
): PartnerDocument[] {
  const merged = new Map<string, PartnerDocument>();

  // 1. All table rows are authoritative
  for (const doc of tableDocs) {
    merged.set(doc.doc_type, doc);
  }

  // 2. For any doc type missing from the table, try the legacy JSONB
  if (legacyJsonb) {
    for (const [docType, legacyKey] of Object.entries(LEGACY_KEY_MAP)) {
      if (merged.has(docType)) continue;
      const url = legacyJsonb[legacyKey];
      if (typeof url !== "string" || !url.startsWith("http")) continue;

      const status = kycStatus === "approved" ? "approved"
        : kycStatus === "pending" ? "pending"
          : "missing";

      merged.set(docType, {
        id: `legacy-${docType}`,
        partner_id: "",
        doc_type: docType as PartnerDocumentType,
        status,
        file_url: url,
        storage_path: null,
        rejection_reason: null,
        due_at: null,
        expires_at: null,
        uploaded_at: null,
        reviewed_at: null,
        reviewed_by: null,
        metadata: {},
        created_at: "",
        updated_at: "",
      });
    }
  }

  return Array.from(merged.values());
}
