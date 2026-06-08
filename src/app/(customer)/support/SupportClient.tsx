"use client";

import { useState } from "react";

interface ContactItem {
  icon: string;
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
      icon: "business",
      label: "Company Name",
      value: "PHS Cleaning Company",
    },
    {
      icon: "person",
      label: "Founder",
      value: "Pavan Gupta",
    },
    {
      icon: "location_on",
      label: "Address",
      value: "LIG 38, W-Block, Gulmohar Vihar, Keshav Nagar, Juhi, Kanpur – 208014, Uttar Pradesh, India",
      isCopyable: true,
    },
    {
      icon: "email",
      label: "Email",
      value: "pavanhomess@gmail.com",
      actionLabel: "Send Email",
      actionHref: "mailto:pavanhomess@gmail.com",
      isCopyable: true,
    },
    {
      icon: "phone",
      label: "Phone",
      value: "9648801462",
      actionLabel: "Call Now",
      actionHref: "tel:9648801462",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: Premium Welcome Card */}
      <div className="md:col-span-1 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col justify-between h-full min-h-[300px] relative overflow-hidden bg-linear-to-br from-white/90 to-surface/80 border border-outline-variant/30 shadow-ambient">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl text-[#059669] drop-shadow-sm">support_agent</span>
            </div>
            <h2 className="font-headline text-lg md:text-xl font-bold tracking-tight text-on-surface mb-2">
              Contact Information
            </h2>
            <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed font-medium">
              We are dedicated to providing premium support services. Reach out to us via any of these channels and we will get back to you promptly.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-[11px] text-on-surface-variant/80 font-medium">
            Support Hours: <span className="text-on-surface font-bold">9:00 AM - 8:00 PM</span> (Mon - Sun)
          </div>
        </div>
      </div>

      {/* Right Column: Contact Details Cards */}
      <div className="md:col-span-2 space-y-4">
        {contactDetails.map((item, index) => (
          <div 
            key={index} 
            className="glass-panel rounded-2xl p-4 md:p-5 flex items-start gap-4 hover:shadow-ambient-hover transition-all duration-300 relative group overflow-hidden bg-white/70"
          >
            {/* Standard Emerald icon container as per rule 11-B & 8-H */}
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">
                {item.icon}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-0.5">
                {item.label}
              </span>
              
              <span className="text-sm md:text-base font-bold text-on-surface block leading-tight break-words pr-2">
                {item.value}
              </span>

              {/* Actions (Email, Call, or Copy) */}
              <div className="flex items-center gap-3 mt-2.5">
                {item.actionHref && item.actionLabel && (
                  <a 
                    href={item.actionHref}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    {item.actionLabel}
                  </a>
                )}
                
                {item.isCopyable && (
                  <button 
                    onClick={() => handleCopy(item.value, index)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedIndex === index ? "done" : "content_copy"}
                    </span>
                    {copiedIndex === index ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
