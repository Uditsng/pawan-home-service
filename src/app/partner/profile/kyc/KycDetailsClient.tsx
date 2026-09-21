"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { uploadPartnerDocumentAction, getPartnerDocumentSignedUrl } from "./actions";
import { Button } from "@/components/ui/Button";
import {
  DOC_TYPE_CONFIG,
  KYC_ALL_TYPES,
  STATUS_LABELS,
} from "@/lib/documents/partnerDocConfig";
import type { PartnerDocument, PartnerDocumentType, KycDocumentsData } from "@/lib/types";

interface KycDetailsClientProps {
  kycStatus: string;
  kycRejectionReason: string | null;
  kycDocuments: KycDocumentsData | null;
  documents: PartnerDocument[];
  userId: string;
}

const AADHAAR_TYPES: PartnerDocumentType[] = ["aadhaar_front", "aadhaar_back"];

export default function KycDetailsClient({
  kycStatus,
  kycRejectionReason,
  kycDocuments,
  documents,
  userId,
}: KycDetailsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Build a map of doc_type -> PartnerDocument
  const docMap: Record<string, PartnerDocument> = {};
  for (const d of documents) {
    docMap[d.doc_type] = d;
  }

  const canUpload = kycStatus === "approved" || kycStatus === "action_required";

  // Uploaded required docs count
  const requiredTypes = KYC_ALL_TYPES.filter((t) => t !== "police_verification");
  const completedCount = requiredTypes.filter(
    (t) => docMap[t]?.status === "approved" || docMap[t]?.status === "pending"
  ).length;

  function getStatusBadge(status: string) {
    const info = STATUS_LABELS[status] || STATUS_LABELS.missing;
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest ${info.color}`}>
        {info.label}
      </span>
    );
  }

  function handleDocUpload(docType: PartnerDocumentType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Please upload JPG, PNG, WebP, or PDF.");
      return;
    }
    const isImage = file.type.startsWith("image/");
    const limit = isImage ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > limit) {
      setErrorMsg(`File too large. Max ${isImage ? "10 MB" : "2 MB"}.`);
      return;
    }

    setIsUploading(true);
    (async () => {
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "";
        const filePath = `${userId}/${docType}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("partner-docs")
          .upload(filePath, file);
        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from("partner-docs")
          .getPublicUrl(filePath);

        const result = await uploadPartnerDocumentAction(docType, publicUrl, filePath);
        if (result.success) {
          setSuccessMsg(`${DOC_TYPE_CONFIG[docType].label} uploaded. Admin has been notified.`);
        } else {
          setErrorMsg(result.error || "Upload failed.");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    })();
  }

  function handleViewDoc(docId: string) {
    startTransition(async () => {
      const result = await getPartnerDocumentSignedUrl(docId);
      if (result.signedUrl) {
        window.open(result.signedUrl, "_blank");
      } else {
        setErrorMsg(result.error || "Could not load document.");
      }
    });
  }

  // ─── Render single doc row ───
  function renderDocRow(docType: PartnerDocumentType, opts?: { subLabel?: string }) {
    const cfg = DOC_TYPE_CONFIG[docType];
    const doc = docMap[docType];
    const status = doc?.status || "missing";
    const canReupload = canUpload && ["missing", "deferred", "rejected", "resubmit_required"].includes(status);

    return (
      <div
        key={docType}
        className={`px-4 py-3 flex items-center justify-between gap-3 ${
          status === "rejected" || status === "resubmit_required" ? "bg-error/5" : ""
        } ${status === "deferred" ? "bg-warning/5" : ""}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#059669] text-sm drop-shadow-sm">
              {cfg.icon}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">
              {cfg.label}
              {opts?.subLabel && <span className="text-on-surface-variant"> ({opts.subLabel})</span>}
            </p>
            {(status === "rejected" || status === "resubmit_required") && doc?.rejection_reason && (
              <p className="text-[10px] text-error font-medium mt-0.5 truncate">
                {doc.rejection_reason}
              </p>
            )}
            {status === "deferred" && doc?.due_at && (
              <p className="text-[10px] text-warning-container font-medium mt-0.5">
                Due by {new Date(doc.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(status)}

          {doc?.id && (status === "approved" || status === "pending") && (
            <button
              type="button"
              onClick={() => handleViewDoc(doc.id)}
              disabled={isPending}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              View
            </button>
          )}

          {canReupload && (
            <label className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer">
              {isUploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept={cfg.acceptAttr}
                className="hidden"
                onChange={(e) => handleDocUpload(docType, e)}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Status banner */}
      {kycStatus === "approved" && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-xs font-bold text-success flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Your KYC is verified. {completedCount < requiredTypes.length && `${completedCount}/${requiredTypes.length} documents approved.`}
        </div>
      )}
      {kycStatus === "pending" && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs font-bold text-primary">
          Your documents are under review. You will be notified once complete.
        </div>
      )}
      {kycStatus === "rejected" && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-3 text-xs font-bold text-error">
          KYC rejected.{kycRejectionReason ? ` Reason: ${kycRejectionReason}` : ""} Please re-upload from below.
        </div>
      )}
      {kycStatus === "action_required" && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs font-bold text-warning-container">
          Please update the highlighted documents below.
        </div>
      )}

      {errorMsg && (
        <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-xs font-bold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-success/10 border border-success/20 text-success p-3 rounded-xl text-xs font-bold">
          {successMsg}
        </div>
      )}

      {/* Documents list */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 divide-y divide-outline-variant/15">
        <div className="px-4 py-3">
          <h3 className="text-sm font-bold text-on-surface">Document Verification</h3>
          <p className="text-[11px] text-on-surface-variant">
            {canUpload ? "Re-upload any rejected or missing documents below." : "Documents are locked after approval."}
          </p>
        </div>

        {/* Aadhaar group */}
        {AADHAAR_TYPES.map((t) => renderDocRow(t, { subLabel: t === "aadhaar_front" ? "Front" : "Back" }))}

        {/* Other doc types */}
        {KYC_ALL_TYPES.filter((t) => !AADHAAR_TYPES.includes(t)).map((t) => renderDocRow(t))}
      </div>

      {/* Scalar details (read-only) */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 divide-y divide-outline-variant/15">
        <div className="px-4 py-3">
          <h3 className="text-sm font-bold text-on-surface">Professional Details</h3>
          <p className="text-[11px] text-on-surface-variant">Submit from the verification page to update.</p>
        </div>
        {[
          { label: "Years of Experience", val: kycDocuments?.experience_years ? `${kycDocuments.experience_years} Years` : null },
          { label: "Police Station", val: kycDocuments?.police_station_details || null },
          { label: "Bank Name", val: kycDocuments?.bank_name || null },
          { label: "Account Number", val: kycDocuments?.bank_account_no ? `\u2022\u2022\u2022\u2022 ${kycDocuments.bank_account_no.slice(-4)}` : null },
          { label: "IFSC Code", val: kycDocuments?.bank_ifsc || null },
        ].map(({ label, val }) => (
          <div key={label} className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-on-surface shrink-0">{label}</span>
            <span className="text-xs font-medium text-on-surface-variant text-right">{val || "Not set"}</span>
          </div>
        ))}
      </div>

      {/* UPI details */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 divide-y divide-outline-variant/15">
        <div className="px-4 py-3">
          <h3 className="text-sm font-bold text-on-surface">UPI Details</h3>
          <p className="text-[11px] text-on-surface-variant">Manage from your <a href="/partner/profile/bank" className="text-primary font-bold hover:underline">Bank & Payments</a> page.</p>
        </div>
        {[
          { label: "UPI ID", val: kycDocuments?.upi_id || null },
          { label: "UPI Number", val: kycDocuments?.upi_number || null },
        ].map(({ label, val }) => (
          <div key={label} className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-on-surface shrink-0">{label}</span>
            <span className="text-xs font-medium text-on-surface-variant text-right">{val || "Not set"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
