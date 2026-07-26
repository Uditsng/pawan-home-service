"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

interface PolicySection {
  title: string;
  content: string;
}

const sections: PolicySection[] = [
  {
    title: "1. Service-Based Doorstep Delivery Model",
    content: "PHS Cleaning Company provides professional home cleaning, deep sanitization, and maintenance services executed directly at the location specified by the customer (doorstep delivery). Because we operate purely as a service-based business, a traditional shipping policy for physical inventory, postal parcels, or retail shipping is not applicable to our operations."
  },
  {
    title: "2. Operational Territory Limits",
    content: "We deliver doorstep services exclusively within our designated operational boundaries in Kanpur Nagar, Uttar Pradesh, India. Any booking requests placed for properties situated outside our active postal codes or municipal boundaries will be cancelled, and any prepaid amounts will be refunded in full."
  },
  {
    title: "3. Service Materials & Equipment Dispatch",
    content: "Customers are not required to provide specialized cleaning tools, machinery, or cleaning solutions. All necessary chemical agents, industrial vacuum cleaners, single-disc scrubbing machines, and microfiber wipers are brought directly to your property by our assigned service professionals at the confirmed appointment time. We do not ship or courier any tools or cleaning kits to your address ahead of the appointment."
  },
  {
    title: "4. Scheduling & Arrival Time Slots",
    content: "During the checkout process, you must select an available date and time slot for service execution. Our operations desk makes reasonable efforts to ensure the assigned Professional arrives at your doorstep within 30 minutes of the confirmed slot. Any delays caused by traffic congestion, weather anomalies, vehicle breakdowns, or emergency scheduling conflicts will be communicated to you by our helpdesk."
  },
  {
    title: "5. Customer Readiness Requirements",
    content: "To guarantee smooth service delivery, the customer must ensure: (a) Safe entry permissions, gate passes, and society approvals are pre-arranged; (b) Running water and electrical connections are available; and (c) High-value belongings are secured. Failure to provide basic access or utilities within 20 minutes of arrival will result in a cancelled booking, and the paid booking fee will be forfeited to cover worker mobilization."
  },
  {
    title: "6. Rescheduling & Revisit Fees",
    content: "If a confirmed doorstep booking cannot be completed due to society entry restrictions, lack of power/water, or customer absence, the service may be rescheduled subject to a flat Revisit Fee of ₹150. This charge is applied directly to cover the transportation costs and operational loss of the assigned Professional."
  }
];

export default function ShippingPolicyPage() {
  const helplinePhone = "+917408702019";
  const helplineEmail = "phscustomercare15@gmail.com";
  
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col relative overflow-hidden">
      <Header />

      {/* Decorative blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <main className="grow max-w-4xl w-full mx-auto px-4 py-8 md:py-12 space-y-6 z-10">
        
        {/* Simple Header */}
        <header className="pb-6 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Shipping & Service Delivery</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Doorstep Execution & Dispatch Boundaries</p>
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10 shrink-0 self-start sm:self-auto">
            Last Updated: June 2026
          </span>
        </header>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start relative">
          
          {/* Mobile Jump to section dropdown */}
          <div className="md:hidden relative z-20">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-surface-container-lowest/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-outline-variant/30 text-xs font-bold text-primary shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#059669] text-lg">toc</span>
                Jump to Section
              </span>
              <span className={`material-symbols-outlined text-lg transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl p-2 space-y-1 animate-[slideDown_0.15s_ease-out]">
                {sections.map((s, idx) => (
                  <a
                    key={idx}
                    href={`#section-${idx}`}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-[11px] font-semibold text-on-surface-variant hover:text-secondary rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
                <a
                  href="#section-contact"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-3 py-2 text-[11px] font-semibold text-on-surface-variant hover:text-secondary rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  7. Contact & Helpline Support
                </a>
              </div>
            )}
          </div>

          {/* Sticky Left Column Index (Desktop only) */}
          <aside className="hidden md:block md:col-span-1 sticky top-24 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pr-2 py-1">
            <h3 className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-3 pl-1">Table of Contents</h3>
            <ul className="space-y-2 border-l border-outline-variant/10">
              {sections.map((s, idx) => (
                <li key={idx}>
                  <a
                    href={`#section-${idx}`}
                    className="block pl-3 text-[11px] font-semibold text-on-surface-variant/75 hover:text-secondary border-l border-transparent hover:border-secondary -ml-px transition-all leading-snug"
                  >
                    {s.title.replace(/^\d+\.\s+/, '')}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#section-contact"
                  className="block pl-3 text-[11px] font-semibold text-on-surface-variant/75 hover:text-secondary border-l border-transparent hover:border-secondary -ml-px transition-all leading-snug"
                >
                  7. Helpline & Support
                </a>
              </li>
            </ul>
          </aside>

          {/* Right Column Content */}
          <div className="md:col-span-3 space-y-8">
            {sections.map((s, idx) => (
              <section key={idx} id={`section-${idx}`} className="scroll-mt-24 space-y-2.5">
                <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                    {idx + 1}
                  </span>
                  {s.title.replace(/^\d+\.\s+/, '')}
                </h2>
                
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-semibold">
                  {s.content}
                </p>
              </section>
            ))}

            {/* Section 7: Contact & Helpline Support */}
            <section id="section-contact" className="scroll-mt-24 pt-6 border-t border-outline-variant/15 space-y-4">
              <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                  7
                </span>
                Contact & Helpline Support
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                If you have questions regarding doorstep service delivery, scheduling boundaries, or operational coverage, please contact support:
              </p>

              <div className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Company</span>
                  <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Proprietor / Owner</span>
                  <span className="font-bold text-primary text-xs">Pavan Kumar</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-2 gap-1 sm:gap-4">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider shrink-0">Office Address</span>
                  <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-sm">
                    C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Email Address</span>
                  <a
                    href={`mailto:${helplineEmail}`}
                    onClick={(e) => handleEmailClick(e, helplineEmail)}
                    className="text-primary hover:text-secondary font-bold text-xs font-mono transition-colors"
                  >
                    {helplineEmail}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Helpline Phone</span>
                  <a
                    href={`tel:${helplinePhone}`}
                    onClick={(e) => handlePhoneClick(e, helplinePhone)}
                    className="text-primary hover:text-secondary font-bold text-xs font-mono transition-colors"
                  >
                    +91 74087 02019
                  </a>
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
