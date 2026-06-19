"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface InvoiceClientActionsProps {
  invoiceNumber: string;
}

export default function InvoiceClientActions({ invoiceNumber }: InvoiceClientActionsProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("download") === "true" || params.get("print") === "true") {
      // Small timeout to allow styling and content to render fully
      const timer = setTimeout(() => {
        window.print();
        // Clear parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Invoice ${invoiceNumber} - PHS Cleaning Company`,
      text: `View my PHS Cleaning Company service invoice ${invoiceNumber}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled sharing or it failed, fallback to copy
        console.log("Share failed or cancelled, falling back to copy", err);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <Button
        variant="outline"
        onClick={handlePrint}
        className="flex-1 sm:flex-initial py-2.5 px-4 text-xs font-black uppercase tracking-widest border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors text-primary flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
        Download PDF
      </Button>

      <Button
        variant="primary"
        onClick={handleShare}
        className="flex-1 sm:flex-initial py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-base">
          {copied ? "check" : "share"}
        </span>
        {copied ? "Copied Link" : "Share Invoice"}
      </Button>
    </div>
  );
}
