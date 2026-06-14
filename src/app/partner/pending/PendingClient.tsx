"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitKycDocumentsAction } from "./actions";
import { Button } from "@/components/ui/Button";
import LogoutButton from "@/components/LogoutButton";

interface PendingClientProps {
  initialKycStatus: string | null;
  rejectionReason: string | null;
  userId: string;
}

function getFilePath(userId: string, key: string, ext: string): string {
  return `${userId}/${key}-${Date.now()}.${ext}`;
}

export default function PendingClient({
  initialKycStatus,
  rejectionReason,
  userId,
}: PendingClientProps) {
  const [kycStatus, setKycStatus] = useState<string | null>(initialKycStatus);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (kycStatus === "approved") {
      const timer = setTimeout(() => {
        router.push("/partner/onboarding");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [kycStatus, router]);

  // Form states
  const [experience, setExperience] = useState<string>("");
  const [policeStation, setPoliceStation] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankIfsc, setBankIfsc] = useState<string>("");

  // Uploaded URLs
  const [urls, setUrls] = useState<Record<string, string>>({
    aadhaar: "",
    pan: "",
    dl: "",
    police: "",
    selfie: "",
    address: "",
  });

  const [filesSelected, setFilesSelected] = useState<Record<string, string>>({
    aadhaar: "",
    pan: "",
    dl: "",
    police: "",
    selfie: "",
    address: "",
  });

  const documentTypes = [
    { key: "aadhaar", label: "Aadhaar Card", icon: "badge" },
    { key: "pan", label: "PAN Card", icon: "credit_card" },
    { key: "dl", label: "Driving Licence", icon: "sports_motorsports" },
    { key: "selfie", label: "Selfie Photo", icon: "account_circle" },
    { key: "address", label: "Address Proof (e.g. Utility Bill)", icon: "home_pin" },
    { key: "police", label: "Police Verification Certificate", icon: "gavel" },
  ];

  const handleFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(`${file.name} exceeds the 2MB size limit.`);
      return;
    }

    // Allowed mime types
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg(`Only JPG, PNG, and PDF files are allowed.`);
      return;
    }

    setFilesSelected((prev) => ({ ...prev, [key]: file.name }));
    setIsUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "";
      const filePath = getFilePath(userId, key, ext);

      const { error: uploadError } = await supabase.storage
        .from("partner-docs")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("partner-docs")
        .getPublicUrl(filePath);

      setUrls((prev) => ({ ...prev, [key]: publicUrl }));
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to upload ${file.name}. Please try again.`);
      setFilesSelected((prev) => ({ ...prev, [key]: "" }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate uploads
    for (const doc of documentTypes) {
      if (!urls[doc.key]) {
        setErrorMsg(`Please upload your ${doc.label}.`);
        return;
      }
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

    startTransition(async () => {
      const payload = {
        aadhaar_url: urls.aadhaar,
        pan_url: urls.pan,
        dl_url: urls.dl,
        experience_years: Number(experience),
        police_verification_url: urls.police,
        police_station_details: policeStation.trim(),
        selfie_url: urls.selfie,
        address_proof_url: urls.address,
        bank_name: bankName.trim(),
        bank_account_no: bankAccount.trim(),
        bank_ifsc: bankIfsc.trim().toUpperCase(),
      };

      const result = await submitKycDocumentsAction(payload);
      if (result.success) {
        setKycStatus("pending");
      } else {
        setErrorMsg(result.error || "Submission failed.");
      }
    });
  };

  // State: Approved, redirecting...
  if (kycStatus === "approved") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased">
        <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[32px] shadow-[0_20px_50px_rgba(30,41,59,0.06)] border border-white/50 text-center relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/15 rounded-full blur-[60px] -z-10 -mr-16 -mt-16" />

          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <span className="material-symbols-outlined text-4xl text-secondary animate-bounce">
              check_circle
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tighter text-primary">
            Application Approved!
          </h1>
          
          <p className="text-on-surface-variant text-sm font-semibold mt-4 leading-relaxed max-w-md mx-auto">
            Your KYC verification is complete and has been approved. We are redirecting you to set up your profile and services.
          </p>

          <div className="flex justify-center mt-8 gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
              Redirecting to setup...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // State: Awaiting Review
  if (kycStatus === "pending") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased">
        <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[32px] shadow-[0_20px_50px_rgba(30,41,59,0.06)] border border-white/50 text-center relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/15 rounded-full blur-[60px] -z-10 -mr-16 -mt-16" />

          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <span className="material-symbols-outlined text-4xl text-secondary animate-pulse">
              hourglass_empty
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tighter text-primary">
            Verification Pending
          </h1>
          
          <p className="text-on-surface-variant text-sm font-semibold mt-4 leading-relaxed max-w-md mx-auto">
            Your documents have been submitted successfully. Our team will contact you shortly to perform offline verifications and activate your account.
          </p>

          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/15 text-left text-xs font-bold text-on-surface-variant space-y-2 mt-8">
            <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Submitted Details</p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-medium">
              <span className="text-primary font-bold">Experience:</span>
              <span>{experience || "Years of experience"} Years</span>
              <span className="text-primary font-bold">Police Station:</span>
              <span>{policeStation || "Local police station"}</span>
              <span className="text-primary font-bold">Bank Name:</span>
              <span>{bankName || "Bank name"}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/15 flex flex-col gap-3">
            <div className="text-xs text-on-surface-variant/75 font-semibold">
              Need assistance? Contact us at <span className="text-primary font-bold">office@phs.com</span>
            </div>
            <div className="flex justify-center mt-2">
              <LogoutButton variant="button" className="px-6 py-2 rounded-xl text-xs font-bold border-2 border-outline-variant hover:bg-surface-container transition-colors bg-transparent text-primary" />
            </div>
          </div>

        </div>
      </div>
    );
  }

  // State: Documents Upload Form (Null, Not Submitted, or Rejected)
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased pb-16">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl p-6 md:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(30,41,59,0.06)] border border-white/50 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -z-10 -mr-20 -mt-20" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            Verification Required
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tighter text-primary">
            Upload KYC Documents
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mt-2">
            Please upload clear copies (under 2MB, JPG/PNG/PDF) for offline registration audit.
          </p>
        </div>

        {kycStatus === "rejected" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 shadow-sm">
            <span className="material-symbols-outlined text-lg mt-0.5">warning</span>
            <div>
              <p className="font-extrabold text-sm">Verification Rejected</p>
              <p className="text-xs font-semibold text-red-600 mt-1">
                Reason: {rejectionReason || "Documents were not clear or incomplete."}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-bold text-primary">
          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentTypes.map((doc) => (
              <div
                key={doc.key}
                className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/15 flex flex-col justify-between h-[110px] relative hover:border-secondary/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    {doc.icon}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {doc.label}
                  </span>
                </div>

                <div className="mt-2.5">
                  {urls[doc.key] ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-extrabold">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span className="truncate max-w-[180px]">{filesSelected[doc.key]}</span>
                    </div>
                  ) : (
                    <label className="flex items-center gap-1.5 justify-center py-2 px-3 bg-white border border-outline-variant/30 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm w-full">
                      <span className="material-symbols-outlined text-xs">cloud_upload</span>
                      <span>Select File</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => void handleFileChange(doc.key, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Details fields */}
          <div className="border-t border-outline-variant/15 pt-6 space-y-4">
            <h3 className="text-sm font-headline font-black text-secondary uppercase tracking-wider mb-2">
              Technician details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Experience */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/60">
                  Years of Experience
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 5"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-white p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold text-xs text-primary placeholder:text-outline"
                />
              </div>

              {/* Local Police Station */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/60">
                  Local Police Station Details
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalyanpur Police Station, Kanpur"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full bg-white p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold text-xs text-primary placeholder:text-outline"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border-t border-outline-variant/15 pt-6 space-y-4">
            <h3 className="text-sm font-headline font-black text-secondary uppercase tracking-wider mb-2">
              Payout Bank Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/60">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold text-xs text-primary placeholder:text-outline"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/60">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10023412551"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-white p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold text-xs text-primary placeholder:text-outline"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/60">
                  IFSC Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBIN0001234"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  className="w-full bg-white p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold text-xs text-primary placeholder:text-outline"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-sm">error</span>
              {errorMsg}
            </div>
          )}

          <div className="pt-6 border-t border-outline-variant/15 flex gap-4">
            <LogoutButton variant="button" className="px-6 py-3 rounded-xl border-2 border-outline-variant hover:bg-surface-container font-bold text-on-surface-variant transition-colors bg-transparent" />
            <Button
              type="submit"
              disabled={isUploading || isPending}
              className="flex-1 py-4 bg-linear-to-br from-[#059669] to-success text-white font-extrabold text-[14px] rounded-xl hover:scale-[1.01] active:scale-95 shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-200 border-none cursor-pointer"
            >
              {isUploading ? "Uploading Documents..." : isPending ? "Submitting Application..." : "Submit KYC Documents"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
