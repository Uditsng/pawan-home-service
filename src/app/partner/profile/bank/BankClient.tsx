"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { updatePaymentMethodAction } from "./actions";
import { Button } from "@/components/ui/Button";

interface BankClientProps {
  hasBankDetails: boolean;
  bankName: string | null;
  accountNo: string | null;
  ifsc: string | null;
  upiId: string | null;
  upiNumber: string | null;
  upiQrUrl: string | null;
  userId: string;
}

function maskAccountNo(accNum: string): string {
  if (accNum.length <= 4) return accNum;
  return `\u2022\u2022\u2022\u2022 ${accNum.slice(-4)}`;
}

export default function BankClient({
  hasBankDetails,
  bankName,
  accountNo,
  ifsc,
  upiId,
  upiNumber,
  upiQrUrl,
  userId,
}: BankClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable UPI state
  const [editUpiId, setEditUpiId] = useState(upiId || "");
  const [editUpiNumber, setEditUpiNumber] = useState(upiNumber || "");
  const [editUpiQrUrl, setEditUpiQrUrl] = useState(upiQrUrl || "");
  const [upiModified, setUpiModified] = useState(false);

  function markModified() {
    setUpiModified(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    if (!file.type.startsWith("image/")) {
      setErrorMsg("QR code must be an image (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("QR code image must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    (async () => {
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "";
        const filePath = `${userId}/upi_qr-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("partner-docs")
          .upload(filePath, file);
        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from("partner-docs")
          .getPublicUrl(filePath);

        setEditUpiQrUrl(publicUrl);
        markModified();
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to upload QR code. Please try again.");
      } finally {
        setIsUploading(false);
      }
    })();
  }

  function handleSaveUpi() {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await updatePaymentMethodAction({
        upi_id: editUpiId.trim(),
        upi_number: editUpiNumber.trim(),
        upi_qr_url: editUpiQrUrl,
      });
      if (result.success) {
        setSuccessMsg("UPI details saved successfully.");
        setUpiModified(false);
      } else {
        setErrorMsg(result.error || "Failed to save.");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Bank Account Card (locked) */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 shadow-xs border border-outline-variant/15">
        <div className="flex items-center gap-3.5 border-b border-outline-variant/15 pb-4 mb-5">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-primary">account_balance</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-on-surface">Payout Bank Account</h3>
            <p className="text-xs text-on-surface-variant font-medium">Verified for payouts</p>
          </div>
        </div>

        {!hasBankDetails ? (
          <div className="text-center py-6">
            <p className="text-xs text-on-surface-variant font-medium mb-4">
              No bank account added yet. Submit your verification documents to add a bank account.
            </p>
            <a
              href="/partner/pending"
              className="inline-flex items-center justify-center bg-primary text-on-primary font-bold text-xs px-6 py-3 rounded-2xl hover:bg-primary/95 transition-all"
            >
              Submit Documents
            </a>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Bank Name</span>
              <span className="text-base font-bold text-on-surface font-headline">{bankName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Account Number</span>
              <span className="text-base font-bold text-on-surface font-mono tracking-widest">
                {maskAccountNo(accountNo || "")}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">IFSC Code</span>
              <span className="text-base font-bold text-on-surface font-mono tracking-wider">{ifsc}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bank locked notice */}
      {hasBankDetails && (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex gap-3">
          <span className="material-symbols-outlined text-warning text-lg shrink-0 mt-0.5">lock</span>
          <div>
            <p className="text-xs font-bold text-on-surface">Bank Details Locked</p>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              For security, bank details cannot be edited in the app. Contact support to change your bank account.
            </p>
          </div>
        </div>
      )}

      {/* UPI Section (always editable) */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 shadow-xs border border-outline-variant/15">
        <div className="flex items-center gap-3.5 border-b border-outline-variant/15 pb-4 mb-5">
          <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-secondary">qr_code</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-on-surface">UPI Payments</h3>
            <p className="text-xs text-on-surface-variant font-medium">Add or update anytime for faster payouts</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">UPI ID</label>
              <input
                type="text"
                placeholder="e.g. name@okaxis"
                value={editUpiId}
                onChange={(e) => { setEditUpiId(e.target.value); markModified(); }}
                className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">UPI Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={editUpiNumber}
                onChange={(e) => { setEditUpiNumber(e.target.value); markModified(); }}
                className="w-full bg-surface p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none font-semibold text-xs text-on-surface placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* QR Upload */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">UPI QR Code</label>
            {editUpiQrUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editUpiQrUrl}
                  alt="UPI QR"
                  className="w-16 h-16 rounded-xl object-cover border border-outline-variant/20"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-on-surface">QR uploaded</p>
                  <div className="flex gap-2 mt-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer">
                      Replace
                      <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setEditUpiQrUrl(""); markModified(); }}
                      className="text-[10px] font-black uppercase tracking-widest text-error hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 bg-surface-container-low border border-dashed border-outline-variant/40 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">qr_code_scanner</span>
                <span className="text-xs font-bold text-on-surface">
                  {isUploading ? "Uploading..." : "Upload QR Code (optional)"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={isUploading} />
              </label>
            )}
          </div>

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

          <Button
            type="button"
            variant="primary"
            onClick={handleSaveUpi}
            disabled={isPending || isUploading || !upiModified}
            className="w-full py-2.5 bg-primary text-on-primary rounded-2xl font-black text-xs disabled:opacity-40"
          >
            {isPending ? "Saving..." : "Save UPI Details"}
          </Button>
        </div>
      </div>
    </div>
  );
}
