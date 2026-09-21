"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitKycDocumentsAction, saveKycDraftAction } from "./actions";
import { Button } from "@/components/ui/Button";
import LogoutButton from "@/components/LogoutButton";
import {
  DOC_TYPE_CONFIG,
  AADHAAR_GROUP,
  KYC_MANDATORY_TYPES,
  STATUS_LABELS,
} from "@/lib/documents/partnerDocConfig";
import type { PartnerDocument, PartnerDocumentType } from "@/lib/types";

interface PendingClientProps {
  initialKycStatus: string | null;
  rejectionReason: string | null;
  initialKycDocuments: Record<string, unknown> | null;
  initialDocuments: PartnerDocument[];
  userId: string;
}

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

export default function PendingClient({
  initialKycStatus,
  rejectionReason,
  initialKycDocuments,
  initialDocuments,
  userId,
}: PendingClientProps) {
  const [kycStatus, setKycStatus] = useState<string | null>(initialKycStatus);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (kycStatus === "approved") {
      const timer = setTimeout(() => router.push("/partner/onboarding"), 2000);
      return () => clearTimeout(timer);
    }
  }, [kycStatus, router]);

  const scalars = initialKycDocuments as Record<string, unknown> | null;

  // Form scalars
  const [experience, setExperience] = useState(
    scalars?.experience_years ? String(scalars.experience_years) : ""
  );
  const [policeStation, setPoliceStation] = useState(
    (scalars?.police_station_details as string) || ""
  );
  const [bankName, setBankName] = useState((scalars?.bank_name as string) || "");
  const [bankAccount, setBankAccount] = useState((scalars?.bank_account_no as string) || "");
  const [bankIfsc, setBankIfsc] = useState((scalars?.bank_ifsc as string) || "");
  const [upiId, setUpiId] = useState((scalars?.upi_id as string) || "");
  const [upiNumber, setUpiNumber] = useState((scalars?.upi_number as string) || "");

  // Document URLs — seeded from existing documents
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const doc of initialDocuments) {
      if (doc.file_url) map[doc.doc_type] = doc.file_url;
    }
    return map;
  });

  const [fileNames, setFileNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const doc of initialDocuments) {
      if (doc.file_url) map[doc.doc_type] = doc.file_url.split("/").pop() || "Uploaded";
    }
    return map;
  });

  const [showReviewModal, setShowReviewModal] = useState(false);

  // Required document types (excluding police)
  const requiredDocs = KYC_MANDATORY_TYPES.filter((t) => t !== "police_verification");
  const completedRequired = requiredDocs.filter((t) => urls[t]).length;
  const allRequiredUploaded = completedRequired === requiredDocs.length;
  const progressPct = Math.round((completedRequired / requiredDocs.length) * 100);

  const isDocUploaded = (key: string) => Boolean(urls[key]);

  // Handle file selection + upload
  const handleFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg(
        `This file type (${file.type || "unknown"}) is not accepted. Please upload JPG, PNG, WebP, or PDF.`
      );
      return;
    }

    const isImage = file.type.startsWith("image/");
    const sizeLimit = isImage ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > sizeLimit) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(
        `This file is ${sizeMB} MB. Please upload a ${isImage ? "photo under 10 MB" : "PDF under 2 MB"}.`
      );
      return;
    }

    setFileNames((prev) => ({ ...prev, [key]: file.name }));
    setIsUploading(true);

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

      setUrls((prev) => ({ ...prev, [key]: publicUrl }));
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to upload ${file.name}. Please try again.`);
      setFileNames((prev) => ({ ...prev, [key]: "" }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await saveKycDraftAction({
        docUrls: urls,
        scalars: {
          experience_years: experience ? Number(experience) : null,
          police_station_details: policeStation.trim() || undefined,
          bank_name: bankName.trim() || undefined,
          bank_account_no: bankAccount.trim() || undefined,
          bank_ifsc: bankIfsc.trim() || undefined,
          upi_id: upiId.trim() || undefined,
          upi_number: upiNumber.trim() || undefined,
        },
      });
      if (result.success) {
        setKycStatus("draft");
        setSuccessMsg("Draft saved! You can come back and finish later.");
      } else {
        setErrorMsg(result.error || "Save draft failed.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!allRequiredUploaded) {
      const missing = requiredDocs
        .filter((t) => !urls[t])
        .map((t) => DOC_TYPE_CONFIG[t].label)
        .join(", ");
      setErrorMsg(`Please upload all required documents: ${missing}`);
      return;
    }

    if (!experience || isNaN(Number(experience)) || Number(experience) < 0) {
      setErrorMsg("Please enter valid years of experience.");
      return;
    }
    if (!policeStation.trim()) {
      setErrorMsg("Please enter nearby police station details.");
      return;
    }
    if (!bankName.trim() || !bankAccount.trim() || !bankIfsc.trim()) {
      setErrorMsg("Please fill in all bank details.");
      return;
    }

    setShowReviewModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowReviewModal(false);
    startTransition(async () => {
      const result = await submitKycDocumentsAction({
        docUrls: urls,
        scalars: {
          experience_years: Number(experience),
          police_station_details: policeStation.trim(),
          bank_name: bankName.trim(),
          bank_account_no: bankAccount.trim(),
          bank_ifsc: bankIfsc.trim().toUpperCase(),
          upi_id: upiId.trim() || undefined,
          upi_number: upiNumber.trim() || undefined,
        },
      });
      if (result.success) {
        setKycStatus("pending");
      } else {
        setErrorMsg(result.error || "Submission failed.");
      }
    });
  };

  // ─── Approved redirecting ───
  if (kycStatus === "approved") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased">
        <div className="w-full max-w-xl bg-surface-container-lowest p-8 md:p-12 rounded-3xl shadow-xs border border-outline-variant/15 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-success/10 rounded-full blur-2xl -z-10 -mr-16 -mt-16" />
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-success animate-bounce">check_circle</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-on-surface">Verification Approved!</h1>
          <p className="text-on-surface-variant text-sm font-medium mt-4 leading-relaxed max-w-md mx-auto">
            Your documents are verified. Redirecting you to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  // ─── Pending review ───
  if (kycStatus === "pending" || kycStatus === "action_required") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased">
        <div className="w-full max-w-xl bg-surface-container-lowest p-8 md:p-12 rounded-3xl shadow-xs border border-outline-variant/15 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl -z-10 -mr-16 -mt-16" />
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-primary animate-pulse">hourglass_empty</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-on-surface">
            {kycStatus === "action_required" ? "Action Required" : "Document Review Pending"}
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mt-4 leading-relaxed max-w-md mx-auto">
            {kycStatus === "action_required"
              ? "Please review and update the requested documents below."
              : "Your documents have been submitted. Our team is reviewing them and will activate your account shortly."}
          </p>
          {kycStatus === "action_required" && rejectionReason && (
            <div className="mt-6 p-4 bg-error/10 border border-error/20 text-error rounded-2xl text-left text-xs font-bold">
              Reason: {rejectionReason}
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-outline-variant/15 flex flex-col gap-3">
            <p className="text-xs text-on-surface-variant font-medium">
              Need help? Call <a href="tel:7408702019" className="text-primary font-bold hover:underline">7408702019</a> or email{" "}
              <a href="mailto:phsapp0@gmail.com" className="text-primary font-bold hover:underline">phsapp0@gmail.com</a>
            </p>
            <LogoutButton variant="button" className="px-6 py-2 rounded-xl text-xs font-bold border border-outline-variant hover:bg-surface-container transition-colors bg-transparent text-on-surface-variant" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Main upload form ───
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center p-4 sm:p-6 pb-24 antialiased">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 bg-secondary/15 border border-secondary/30 rounded-full px-3 py-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Document Verification
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-on-surface">
            Upload Verification Documents
          </h1>
          <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-2 max-w-lg mx-auto">
            Clear photos of your documents help us verify you faster. Each card below shows exactly what to upload.
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface">Required documents</span>
            <span className="text-xs font-black text-primary">{completedRequired} of {requiredDocs.length}</span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-secondary to-success rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {kycStatus === "rejected" && (
          <div className="p-4 bg-error/10 border border-error/20 text-error rounded-2xl flex items-start gap-3 text-xs font-bold">
            <span className="material-symbols-outlined text-lg mt-0.5">warning</span>
            <div>
              <p className="font-extrabold">Verification Needs Attention</p>
              <p className="text-error/80 mt-1">{rejectionReason || "Documents were not clear or incomplete."}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ═══ SECTION 1: IDENTITY DOCUMENTS ═══ */}
          <section className="space-y-4">
            <h3 className="text-sm font-headline font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">badge</span>
              Identity Documents
            </h3>

            {/* Aadhaar Card — Dual Upload */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">badge</span>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-on-surface">Aadhaar Card</p>
                  <p className="text-[11px] text-on-surface-variant font-medium">Both sides required</p>
                </div>
                {isDocUploaded("aadhaar_front") && isDocUploaded("aadhaar_back") && (
                  <span className="material-symbols-outlined text-success text-lg ml-auto">check_circle</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AADHAAR_GROUP.map((docType) => {
                  const cfg = DOC_TYPE_CONFIG[docType];
                  const uploaded = isDocUploaded(docType);
                  return (
                    <div
                      key={docType}
                      className={`border rounded-xl p-3 transition-all ${
                        uploaded ? "border-success/30 bg-success/5" : "border-outline-variant/30"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-2">
                        {docType === "aadhaar_front" ? "Front Side" : "Back Side"}
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-medium mb-3">{cfg.hint}</p>
                      {uploaded ? (
                        <div className="flex items-center gap-2 text-success text-xs font-bold">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span className="truncate max-w-32">{fileNames[docType]}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`capture-${docType}`) as HTMLInputElement;
                              input?.click();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                            Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`file-${docType}`) as HTMLInputElement;
                              input?.click();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-surface-container-low border border-outline-variant/30 text-on-surface text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">folder_open</span>
                            Choose File
                          </button>
                          <input
                            id={`capture-${docType}`}
                            type="file"
                            accept={cfg.acceptAttr}
                            capture="environment"
                            className="hidden"
                            onChange={(e) => void handleFileChange(docType, e)}
                          />
                          <input
                            id={`file-${docType}`}
                            type="file"
                            accept={cfg.acceptAttr}
                            className="hidden"
                            onChange={(e) => void handleFileChange(docType, e)}
                          />
                          <p className="text-[10px] text-on-surface-variant/60 text-center">
                            {cfg.acceptMimes.map((m) => m.split("/")[1]?.toUpperCase()).filter(Boolean).join(", ")} &middot; Max {cfg.maxSizeMB.image} MB
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PAN, DL, Selfie, Address — single upload cards */}
            {(["pan", "dl", "selfie", "address_proof"] as PartnerDocumentType[]).map((docType) => {
              const cfg = DOC_TYPE_CONFIG[docType];
              const uploaded = isDocUploaded(docType);
              return (
                <div
                  key={docType}
                  className={`bg-surface-container-lowest rounded-2xl border p-4 sm:p-5 transition-all ${
                    uploaded ? "border-success/30" : "border-outline-variant/15"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{cfg.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-wider text-on-surface">{cfg.label}</p>
                      <p className="text-[11px] text-on-surface-variant font-medium truncate">{cfg.hint}</p>
                    </div>
                    {uploaded && (
                      <span className="material-symbols-outlined text-success text-lg shrink-0">check_circle</span>
                    )}
                  </div>

                  {uploaded ? (
                    <div className="flex items-center gap-2 text-success text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span className="truncate max-w-48">{fileNames[docType]}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUrls((p) => ({ ...p, [docType]: "" }));
                          setFileNames((p) => ({ ...p, [docType]: "" }));
                        }}
                        className="ml-auto text-on-surface-variant hover:text-error text-[10px] font-black uppercase tracking-widest cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`capture-${docType}`) as HTMLInputElement;
                            input?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">photo_camera</span>
                          Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`file-${docType}`) as HTMLInputElement;
                            input?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-container-low border border-outline-variant/30 text-on-surface text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">folder_open</span>
                          Choose File
                        </button>
                      </div>
                      <input
                        id={`capture-${docType}`}
                        type="file"
                        accept={cfg.acceptAttr}
                        capture="environment"
                        className="hidden"
                        onChange={(e) => void handleFileChange(docType, e)}
                      />
                      <input
                        id={`file-${docType}`}
                        type="file"
                        accept={cfg.acceptAttr}
                        className="hidden"
                        onChange={(e) => void handleFileChange(docType, e)}
                      />
                      <p className="text-[10px] text-on-surface-variant/60 text-center">
                        {cfg.acceptMimes.map((m) => m.split("/")[1]?.toUpperCase()).filter(Boolean).join(", ")} &middot; Max {cfg.maxSizeMB.image} MB
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* ═══ SECTION 2: WORK & BANK DETAILS ═══ */}
          <section className="space-y-4">
            <h3 className="text-sm font-headline font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">work</span>
              Work & Bank Details
            </h3>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Years of Experience</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 5"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Local Police Station</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kalyanpur Police Station, Kanpur"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>

              <div className="border-t border-outline-variant/15 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Bank Account for Payouts</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SBI"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10023412551"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">IFSC Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SBIN0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ SECTION 3: UPI — Optional ═══ */}
          <section className="space-y-4">
            <h3 className="text-sm font-headline font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">qr_code</span>
              UPI Payments
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">Optional</span>
            </h3>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 sm:p-5 space-y-4">
              <p className="text-[11px] text-on-surface-variant font-medium">
                Add your UPI details for faster payouts. You can add these anytime later from your profile.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. name@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">UPI Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={upiNumber}
                    onChange={(e) => setUpiNumber(e.target.value)}
                    className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ═══ SECTION 4: POLICE VERIFICATION — Optional ═══ */}
          <section className="space-y-4">
            <h3 className="text-sm font-headline font-black text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">gavel</span>
              Police Verification
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">Optional</span>
            </h3>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-600 drop-shadow-sm">info</span>
                </div>
                <div>
                  <p className="text-xs font-black text-on-surface">Not ready yet? No problem.</p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                    You can start working while your police verification is being processed. Upload it within <strong>30 days</strong> of your account being approved.
                  </p>
                </div>
              </div>

              {isDocUploaded("police_verification") ? (
                <div className="flex items-center gap-2 text-success text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="truncate max-w-48">{fileNames["police_verification"]}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUrls((p) => ({ ...p, police_verification: "" }));
                      setFileNames((p) => ({ ...p, police_verification: "" }));
                    }}
                    className="ml-auto text-on-surface-variant hover:text-error text-[10px] font-black uppercase tracking-widest cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("capture-police_verification") as HTMLInputElement;
                        input?.click();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("file-police_verification") as HTMLInputElement;
                        input?.click();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-container-low border border-outline-variant/30 text-on-surface text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">folder_open</span>
                      Choose File
                    </button>
                  </div>
                  <input
                    id="capture-police_verification"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void handleFileChange("police_verification", e)}
                  />
                  <input
                    id="file-police_verification"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => void handleFileChange("police_verification", e)}
                  />
                  <p className="text-[10px] text-on-surface-variant/60 text-center">
                    JPG, PNG, WebP, PDF &middot; Max 10 MB
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ═══ Messages ═══ */}
          {successMsg && (
            <div className="p-4 bg-success/10 border border-success/20 text-success text-xs font-bold rounded-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-error/10 border border-error/20 text-error text-xs font-bold rounded-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {errorMsg}
            </div>
          )}

          {/* ═══ Actions ═══ */}
          <div className="pt-4 border-t border-outline-variant/15 flex gap-4">
            <LogoutButton variant="button" className="px-4 py-3 rounded-2xl border border-outline-variant hover:bg-surface-container font-bold text-xs text-on-surface-variant transition-colors bg-transparent" />
            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={isUploading || isPending}
              className="px-4 py-3 bg-warning/15 border border-warning/30 text-on-surface font-extrabold text-xs rounded-2xl"
            >
              Save Draft
            </Button>
            <Button
              type="submit"
              disabled={isUploading || isPending}
              className="flex-1 py-3 bg-primary text-on-primary font-extrabold text-xs rounded-2xl hover:bg-primary/95 shadow-sm active:scale-[0.98] transition-all"
            >
              {isUploading ? "Uploading..." : isPending ? "Submitting..." : "Review & Submit"}
            </Button>
          </div>
        </form>
      </div>

      {/* ═══ REVIEW MODAL ═══ */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowReviewModal(false)} />
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl p-5 border border-outline-variant/30 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-headline font-black text-on-surface mb-2 text-center">Review Before Submit</h3>
            <p className="text-xs text-on-surface-variant text-center mb-5 leading-relaxed">
              Our team will review your documents within <strong>24-48 hours</strong>. You&apos;ll be notified once verified.
            </p>

            <div className="space-y-2 mb-5">
              {requiredDocs.map((docType) => (
                <div key={docType} className="flex items-center gap-2 text-xs font-bold text-on-surface">
                  <span className={`material-symbols-outlined text-sm ${urls[docType] ? "text-success" : "text-error"}`}>
                    {urls[docType] ? "check_circle" : "cancel"}
                  </span>
                  <span className="truncate">{DOC_TYPE_CONFIG[docType].label}</span>
                </div>
              ))}
              {urls["police_verification"] && (
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-sm text-success">check_circle</span>
                  <span className="truncate">Police Verification</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="w-full py-3 bg-primary text-on-primary rounded-2xl font-black text-xs"
              >
                {isPending ? "Submitting..." : "Yes, Submit for Review"}
              </Button>
              <Button
                type="button"
                variant="slate"
                onClick={() => setShowReviewModal(false)}
                className="w-full py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-bold text-xs"
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
