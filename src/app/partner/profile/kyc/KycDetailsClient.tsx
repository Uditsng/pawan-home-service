"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { uploadRemainingKycAction } from "./actions";
import { Button } from "@/components/ui/Button";
import type { KycDocumentsData } from "@/lib/types";

interface KycDetailsClientProps {
  kycStatus: string;
  kycRejectionReason: string | null;
  kycDocuments: KycDocumentsData | null;
  userId: string;
}

interface FieldSpec {
  key: keyof KycDocumentsData;
  label: string;
  type: "document" | "text" | "number";
}

const KYC_FIELDS: FieldSpec[] = [
  { key: "aadhaar_url", label: "Aadhaar Card", type: "document" },
  { key: "pan_url", label: "PAN Card", type: "document" },
  { key: "dl_url", label: "Driving Licence", type: "document" },
  { key: "selfie_url", label: "Selfie Photo", type: "document" },
  { key: "address_proof_url", label: "Address Proof", type: "document" },
  { key: "police_verification_url", label: "Police Verification", type: "document" },
  { key: "experience_years", label: "Years of Experience", type: "number" },
  { key: "police_station_details", label: "Nearby Police Station", type: "text" },
  { key: "bank_name", label: "Bank Name", type: "text" },
  { key: "bank_account_no", label: "Account Number", type: "text" },
  { key: "bank_ifsc", label: "IFSC Code", type: "text" },
];

function getFilePath(userId: string, key: string, ext: string): string {
  return `${userId}/${key}-${Date.now()}.${ext}`;
}

function compressImage(file: File, quality = 0.7, maxWidth = 1600): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

function isFieldUploaded(docs: KycDocumentsData | null, key: keyof KycDocumentsData): boolean {
  if (!docs) return false;
  const val = docs[key];
  return val !== undefined && val !== null && val !== "";
}

function maskAccountNo(accNum: string): string {
  if (accNum.length <= 4) return accNum;
  return `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${accNum.slice(-4)}`;
}

export default function KycDetailsClient({
  kycStatus,
  kycRejectionReason,
  kycDocuments,
  userId,
}: KycDetailsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const docs = kycDocuments;
  const missingFields = KYC_FIELDS.filter((f) => !isFieldUploaded(docs, f.key));
  const canUploadRemaining = kycStatus === "approved" && missingFields.length > 0;

  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});

  function renderStatusBanner() {
    if (kycStatus === "approved" && missingFields.length === 0) {
      return (
        <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-xs font-bold text-success flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          All KYC details are complete and verified.
        </div>
      );
    }
    if (kycStatus === "approved" && missingFields.length > 0) {
      return (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs font-bold text-warning-container">
          Your KYC is approved but {missingFields.length} detail{missingFields.length > 1 ? "s are" : " is"} missing. Fill them in below.
        </div>
      );
    }
    if (kycStatus === "pending") {
      return (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs font-bold text-primary">
          Your documents are under review. You will be notified once complete.
        </div>
      );
    }
    if (kycStatus === "rejected") {
      return (
        <div className="bg-error/10 border border-error/20 rounded-xl p-3 text-xs font-bold text-error">
          KYC rejected.{kycRejectionReason ? ` Reason: ${kycRejectionReason}` : ""} Please resubmit from the verification page.
        </div>
      );
    }
    return (
      <div className="bg-surface-container rounded-xl p-3 text-xs font-bold text-on-surface-variant">
        Documents saved as draft. Please submit from the verification page.
      </div>
    );
  }

  function renderFieldValue(spec: FieldSpec) {
    const val = docs?.[spec.key];
    if (!val) {
      return <span className="text-xs text-on-surface-variant/60">Not uploaded</span>;
    }

    const isUrl = typeof val === "string" && val.startsWith("http");
    if (isUrl) {
      return (
        <a
          href={val}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-primary underline underline-offset-2"
        >
          View document
        </a>
      );
    }

    const displayValue = spec.type === "number" ? `${val} Years` : String(val);
    return (
      <span className="text-sm font-bold text-primary">
        {spec.key === "bank_account_no" ? maskAccountNo(String(val)) : displayValue}
      </span>
    );
  }

  function handleDocFileChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Only JPG, PNG, and PDF files are allowed.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const sizeLimit = isImage ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > sizeLimit) {
      setErrorMsg(`${file.name} exceeds the ${isImage ? "10MB" : "2MB"} size limit.`);
      return;
    }

    setFileNames((prev) => ({ ...prev, [key]: file.name }));
    setIsUploading(true);

    (async () => {
      try {
        const fileToUpload = isImage ? await compressImage(file) : file;
        const supabase = createClient();
        const ext = fileToUpload.name.split(".").pop() || "";
        const filePath = getFilePath(userId, key, ext);

        const { error: uploadError } = await supabase.storage
          .from("partner-docs")
          .upload(filePath, fileToUpload);

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from("partner-docs")
          .getPublicUrl(filePath);

        setUploadedUrls((prev) => ({ ...prev, [key]: publicUrl }));
      } catch (err) {
        console.error(err);
        setErrorMsg(`Failed to upload ${file.name}. Please try again.`);
        setFileNames((prev) => ({ ...prev, [key]: "" }));
      } finally {
        setIsUploading(false);
      }
    })();
  }

  function handleSubmitClick() {
    setErrorMsg(null);

    for (const field of missingFields) {
      if (field.type === "document" && !uploadedUrls[field.key]) {
        setErrorMsg(`Please upload your ${field.label}.`);
        return;
      }
      if (field.type === "text" && !textValues[field.key]?.trim()) {
        setErrorMsg(`Please enter your ${field.label}.`);
        return;
      }
      if (field.type === "number") {
        const numVal = Number(textValues[field.key]);
        if (!textValues[field.key] || isNaN(numVal) || numVal < 0) {
          setErrorMsg(`Please enter valid ${field.label}.`);
          return;
        }
      }
    }

    setShowWarningModal(true);
  }

  function handleConfirmSubmit() {
    setShowWarningModal(false);
    setErrorMsg(null);

    startTransition(async () => {
      const payload: Partial<KycDocumentsData> = {};

      for (const field of missingFields) {
        if (field.type === "document") {
          const url = uploadedUrls[field.key];
          if (url) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload as any)[field.key] = url;
          }
        } else if (field.type === "number") {
          const val = textValues[field.key];
          if (val) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload as any)[field.key] = Number(val);
          }
        } else {
          const val = textValues[field.key];
          if (val?.trim()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload as any)[field.key] = field.key === "bank_ifsc" ? val.trim().toUpperCase() : val.trim();
          }
        }
      }

      const result = await uploadRemainingKycAction(payload);
      if (result.success) {
        setSuccessMsg("Details submitted. Admin team has been notified.");
      } else {
        setErrorMsg(result.error || "Submission failed.");
      }
    });
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {renderStatusBanner()}

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

      {/* Uploaded Details */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 divide-y divide-outline-variant/15">
        <div className="px-4 py-3">
          <h3 className="text-sm font-bold text-on-surface">Your KYC Details</h3>
          <p className="text-[11px] text-on-surface-variant">Uploaded details are locked and cannot be changed.</p>
        </div>
        {KYC_FIELDS.map((spec) => {
          const uploaded = isFieldUploaded(docs, spec.key);
          return (
            <div key={spec.key} className="px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-on-surface shrink-0">{spec.label}</span>
              <div className="flex items-center gap-2 min-w-0">
                {renderFieldValue(spec)}
                {uploaded && (
                  <span className="material-symbols-outlined text-success text-sm shrink-0">check_circle</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Remaining */}
      {canUploadRemaining && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 divide-y divide-outline-variant/15">
          <div className="px-4 py-3">
            <h3 className="text-sm font-bold text-on-surface">Upload Remaining Details</h3>
            <p className="text-[11px] text-on-surface-variant">{missingFields.length} field{missingFields.length > 1 ? "s" : ""} remaining</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            {missingFields.filter((f) => f.type === "document").map((spec) => (
              <div key={spec.key}>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1.5">{spec.label} *</label>
                <label className="flex items-center gap-2 bg-surface-container-low border border-dashed border-outline-variant/40 rounded-xl px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">upload</span>
                  <span className="text-xs font-bold text-on-surface truncate">
                    {uploadedUrls[spec.key] ? fileNames[spec.key] || "Uploaded" : "Choose file"}
                  </span>
                  {uploadedUrls[spec.key] && (
                    <span className="material-symbols-outlined text-success text-sm ml-auto shrink-0">check_circle</span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="sr-only"
                    onChange={(e) => handleDocFileChange(spec.key, e)}
                    disabled={isUploading}
                  />
                </label>
              </div>
            ))}

            {missingFields.filter((f) => f.type !== "document").map((spec) => (
              <div key={spec.key}>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1.5">{spec.label} *</label>
                <input
                  type={spec.type === "number" ? "number" : "text"}
                  placeholder={
                    spec.key === "bank_ifsc" ? "SBIN0001234"
                    : spec.key === "bank_name" ? "State Bank of India"
                    : spec.key === "bank_account_no" ? "Account number"
                    : spec.key === "police_station_details" ? "Station name"
                    : "e.g. 5"
                  }
                  value={textValues[spec.key] || ""}
                  onChange={(e) => setTextValues((prev) => ({ ...prev, [spec.key]: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-2.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-sm"
                />
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitClick}
              disabled={isPending || isUploading}
              className="w-full py-2.5 bg-secondary hover:brightness-105 text-primary rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : isPending ? "Submitting..." : "Submit Remaining Details"}
            </Button>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowWarningModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl p-5 border border-outline-variant/30 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-headline font-black text-on-surface mb-2 text-center">
              Confirm Submission
            </h3>
            <p className="text-xs text-on-surface-variant text-center mb-5 leading-relaxed">
              You <strong>cannot change</strong> these details after submitting. Make sure everything is correct.
            </p>
            <div className="space-y-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="w-full py-2.5 bg-secondary hover:brightness-105 text-primary rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Yes, Submit"}
              </Button>
              <Button
                type="button"
                variant="slate"
                onClick={() => setShowWarningModal(false)}
                className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-sm"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
