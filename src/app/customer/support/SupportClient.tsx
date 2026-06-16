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
    <div className="space-y-8 mt-6">
      {/* Intro paragraph */}
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
          We stand fully accountable for our doorstep cleaning and maintenance services. Contact our central support desk for help with booking statuses, billing issues, reschedules, or service quality audits.
        </p>
        <p className="text-xs text-on-surface-variant font-bold">
          Operational Hours: <span className="text-on-surface">9:00 AM - 8:00 PM (Mon - Sun)</span>
        </p>
      </div>

      {/* Details List */}
      <div className="border-t border-outline-variant/15 pt-6 space-y-6">
        {contactDetails.map((item, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-outline-variant/5 pb-4 last:border-0 last:pb-0">
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-on-surface leading-normal block max-w-xl">
                {item.value}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-1 sm:mt-0 shrink-0">
              {item.actionHref && item.actionLabel && (
                <a
                  href={item.actionHref}
                  className="text-xs font-bold text-primary hover:text-secondary underline decoration-dotted transition-colors"
                >
                  {item.actionLabel}
                </a>
              )}
              
              {item.isCopyable && (
                <button
                  onClick={() => handleCopy(item.value, index)}
                  className="text-xs font-bold text-on-surface-variant hover:text-on-surface underline decoration-dotted transition-colors cursor-pointer"
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
