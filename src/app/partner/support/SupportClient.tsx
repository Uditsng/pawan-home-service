"use client";

import { useState } from "react";

interface ContactItem {
  label: string;
  value: string;
  actionLabel?: string;
  actionHref?: string;
  isCopyable?: boolean;
}

export default function SupportClient() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const contactDetails: ContactItem[] = [
    {
      label: "Business Entity",
      value: "PHS Cleaning Company (Sole Proprietorship)",
    },
    {
      label: "Proprietor & Owner",
      value: "Pavan Kumar",
    },
    {
      label: "Registered Office Address",
      value: "C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
      isCopyable: true,
    },
    {
      label: "Helpline Email",
      value: "phscustomercare15@gmail.com",
      actionLabel: "Send Email",
      actionHref: "mailto:phscustomercare15@gmail.com",
      isCopyable: true,
    },
    {
      label: "Helpline Number",
      value: "+91 7408702019",
      actionLabel: "Call Support",
      actionHref: "tel:+917408702019",
      isCopyable: true,
    },
  ];

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Intro paragraph */}
      <div className="space-y-2 bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-xs border border-outline-variant/15">
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-medium">
          Our support team is here to help you with job assignments, payouts, profile updates, and any questions.
        </p>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-2">
          Support Hours: <span className="text-primary font-headline">9:00 AM - 8:00 PM (Mon - Sun)</span>
        </p>
      </div>

      {/* Details List */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-xs border border-outline-variant/15 space-y-5">
        {contactDetails.map((item, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-outline-variant/15 pb-4 last:border-0 last:pb-0"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                {item.label}
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary leading-normal block max-w-xl">
                {item.value}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 sm:mt-0 shrink-0">
              {item.actionHref && item.actionLabel && (
                <a
                  href={item.actionHref}
                  className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all duration-200 active:scale-95 cursor-pointer"
                  title={item.actionLabel}
                  aria-label={item.actionLabel}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {item.label.toLowerCase().includes("email") ? "mail" : "call"}
                  </span>
                </a>
              )}

              {item.isCopyable && (
                <button
                  onClick={() => void handleCopy(item.value, index)}
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 border ${
                    copiedIndex === index
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant/15 hover:bg-surface-container-high hover:text-primary"
                  }`}
                  title={copiedIndex === index ? "Copied!" : "Copy to clipboard"}
                  aria-label={copiedIndex === index ? "Copied" : "Copy"}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: copiedIndex === index ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {copiedIndex === index ? "check" : "content_copy"}
                  </span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
