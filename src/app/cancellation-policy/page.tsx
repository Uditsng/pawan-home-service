"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

interface PolicySection {
  title: string;
  content: string;
  subContent?: string;
  nestedLists?: { title: string; items: string[] }[];
}

const sections: PolicySection[] = [
  {
    title: "1. Introduction",
    content: "This Cancellation and Refund Policy (\"Policy\") governs cancellations, rescheduling requests, and refunds for services booked through PHS Cleaning Company. By booking any service through our platform, website, mobile application, telephone, or any other booking channel, you agree to this Policy."
  },
  {
    title: "2. Business Model",
    content: "PHS Cleaning Company provides home cleaning and related services through trained professionals assigned by the Company. PHS Cleaning Company directly manages service allocation, scheduling, and customer support.",
    subContent: "Customer → Booking → PHS Cleaning Company Admin → Professional Assignment → Service Delivery"
  },
  {
    title: "3. Payment Policy",
    content: "All service bookings must be paid in full at the time of booking through available digital payment methods. Accepted payment methods may include UPI, Debit Cards, Credit Cards, Net Banking, Digital Wallets, and other approved payment methods. Bookings shall be considered confirmed only after successful payment confirmation."
  },
  {
    title: "4. Cancellation Policy",
    content: "Our cancellation rules are structured as follows:",
    nestedLists: [
      {
        title: "4.1 Customer-Initiated Cancellation",
        items: [
          "Customers may cancel a booking within one (1) hour of placing the booking.",
          "If a cancellation request is submitted within this period, no cancellation charges will apply and the customer will be eligible for a full refund.",
          "After the permitted cancellation period expires, cancellation requests may not be eligible for a refund and shall be reviewed at the sole discretion of PHS Cleaning Company."
        ]
      },
      {
        title: "4.2 Company-Initiated Cancellation",
        items: [
          "PHS Cleaning Company reserves the right to cancel or reschedule a booking due to professional unavailability, operational issues, safety concerns, force majeure events, service area restrictions, or incorrect booking information.",
          "In such cases, customers may receive a full refund or a free rescheduling option at the discretion of PHS Cleaning Company."
        ]
      }
    ]
  },
  {
    title: "5. Rescheduling Policy",
    content: "Customers may request rescheduling of their booking. PHS Cleaning Company offers Free Rescheduling subject to professional availability, service area coverage, and operational feasibility. Rescheduling requests should be made as early as possible to avoid scheduling conflicts. PHS Cleaning Company reserves the right to propose alternative dates and time slots when the requested schedule is unavailable."
  },
  {
    title: "6. Refund Policy",
    content: "Below is a summary of refund scenarios:",
    nestedLists: [
      {
        title: "6.1 Eligible Refund Scenarios",
        items: [
          "Customer cancels within the permitted cancellation period.",
          "Service cannot be provided by PHS Cleaning Company.",
          "Professional is unavailable and rescheduling is not accepted.",
          "Duplicate payment is successfully verified.",
          "Technical errors result in incorrect charges."
        ]
      },
      {
        title: "6.2 Non-Eligible Refund Scenarios",
        items: [
          "Cancellation requests outside the permitted cancellation period.",
          "Customer refusal to accept service after professional dispatch.",
          "Incorrect information provided by the customer.",
          "Customer absence at the service location.",
          "Violation of platform terms and policies."
        ]
      }
    ]
  },
  {
    title: "7. Refund Processing Timeline",
    content: "Approved refunds shall be initiated within approximately fifteen (15) minutes after refund approval. However, the actual credit timeline depends on the customer's payment provider, bank, card issuer, UPI platform, or payment gateway. Typical processing times may vary from immediate credit or a few hours, up to 7 business days depending on the payment method used. PHS Cleaning Company shall not be responsible for delays caused by banking institutions or payment service providers."
  },
  {
    title: "8. Customer No-Show and Revisit Charges",
    content: "Customers are expected to be available at the service location during the scheduled service window. If the customer is unavailable, access to the premises is denied, or the professional is unable to begin service due to customer-side issues, PHS Cleaning Company may mark the booking as a no-show, and/or apply a revisit charge for scheduling another visit. The amount of the revisit charge may vary depending on the service type, location, and operational costs."
  },
  {
    title: "9. Service Quality Complaints",
    content: "Customer satisfaction is important to us. If a customer is dissatisfied with the service provided, a complaint should be submitted through email (phscustomercare15@gmail.com) or phone (+91 7408702019). Customers are encouraged to report concerns as soon as possible after service completion."
  },
  {
    title: "10. Resolution of Service Quality Issues",
    content: "All quality-related complaints shall be reviewed on a case-by-case basis. Depending on the findings of the review, PHS Cleaning Company may choose to provide service correction, re-service, partial refund, full refund, service credit, or other appropriate resolutions. The final decision shall be made by PHS Cleaning Company after reviewing the circumstances of each case."
  },
  {
    title: "11. Subscription and Recurring Services",
    content: "PHS Cleaning Company may introduce subscription-based or recurring service plans in the future based on customer demand. If such plans are introduced, additional cancellation terms and refund conditions may apply, and separate plan-specific policies may be published. Until such plans are formally launched, this Policy applies to all standard bookings."
  },
  {
    title: "12. Fraudulent or Abusive Activity",
    content: "PHS Cleaning Company reserves the right to deny refunds or cancel bookings where there is reasonable evidence of fraud, abuse of refund requests, misuse of promotional offers, repeated false complaints, or any activity intended to exploit Company policies."
  },
  {
    title: "13. Force Majeure",
    content: "PHS Cleaning Company shall not be liable for delays, interruptions, rescheduling, or cancellations caused by events beyond reasonable control, including natural disasters, floods, earthquakes, fire, epidemics, pandemics, government restrictions, civil unrest, power failures, internet outages, transportation disruptions, or acts of God."
  },
  {
    title: "14. Changes to This Policy",
    content: "PHS Cleaning Company reserves the right to modify, update, or revise this Policy at any time. Updated versions shall become effective immediately upon publication on the website, application, or other official communication channels."
  }
];

export default function CancellationPolicyPage() {
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Cancellation Policy</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Cancellation, Rescheduling & Refund Timelines</p>
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
                  15. Contact Information
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
                  15. Contact Information
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

                {s.subContent && (
                  <p className="text-[10px] text-primary font-mono bg-surface-container/40 px-3 py-1.5 rounded-xl border border-outline-variant/10 inline-block font-semibold">
                    {s.subContent}
                  </p>
                )}

                {s.nestedLists && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {s.nestedLists.map((subList, sIdx) => (
                      <div key={sIdx} className="bg-surface-container/20 p-3 rounded-2xl border border-outline-variant/10 space-y-1.5">
                        <h4 className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-secondary"></span>
                          {subList.title}
                        </h4>
                        <ul className="space-y-1 pl-3">
                          {subList.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="list-disc text-[10px] md:text-[11px] text-on-surface-variant/90 font-semibold leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* Section 15: Contact Information */}
            <section id="section-contact" className="scroll-mt-24 pt-6 border-t border-outline-variant/15 space-y-4">
              <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                  15
                </span>
                Contact Information
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                For questions, complaints, refund requests, cancellation assistance, or customer support, please contact:
              </p>

              <div className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Company</span>
                  <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
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
