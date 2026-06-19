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
      actionLabel: "Compose Email",
      actionHref: "mailto:phscustomercare15@gmail.com",
      isCopyable: true,
    },
    {
      label: "Helpline Number",
      value: "+91 7408702019",
      actionLabel: "Call Hotline",
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
      <div className="space-y-2 bg-white rounded-3xl p-5 shadow-sm border border-outline-variant/10">
        <p className="text-sm text-slate-500 leading-relaxed font-medium">
          We stand fully accountable for our services. Partner support desk is available to assist you with booking assignment status, payout issues, registration updates, and customer complaints.
        </p>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Operational Hours: <span className="text-[#1c2438]">9:00 AM - 8:00 PM (Mon - Sun)</span>
        </p>
      </div>

      {/* Details List */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-outline-variant/10 space-y-5">
        {contactDetails.map((item, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-primary leading-normal block max-w-xl">
                {item.value}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 sm:mt-0 shrink-0">
              {item.actionHref && item.actionLabel && (
                <a
                  href={item.actionHref}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/10 text-[#059669] hover:bg-green-600 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer"
                  title={item.actionLabel}
                  aria-label={item.actionLabel}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.label.toLowerCase().includes("email") ? "mail" : "call"}
                  </span>
                </a>
              )}

              {item.isCopyable && (
                <button
                  onClick={() => void handleCopy(item.value, index)}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 cursor-pointer active:scale-95 border ${
                    copiedIndex === index
                      ? "bg-green-500/10 text-[#059669] border-[#059669]/20"
                      : "bg-surface-container text-on-surface-variant border-outline-variant/10 hover:bg-slate-50 hover:text-primary"
                  }`}
                  title={copiedIndex === index ? "Copied!" : "Copy to clipboard"}
                  aria-label={copiedIndex === index ? "Copied" : "Copy"}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
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
