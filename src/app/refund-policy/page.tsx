"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

interface PolicySection {
  title: string;
  content: string;
  list?: string[];
  subContent?: string;
  nestedLists?: { title: string; items: string[] }[];
  footerText?: string;
}

const sections: PolicySection[] = [
  {
    title: "1. Scope & Application",
    content: "This Refund Policy ('Policy') governs billing cancellations, refunds, transaction failures, and customer credits for services booked through PHS Cleaning Company. By placing a booking through our web application or customer support helpline, you explicitly agree to the rules and timelines outlined in this Policy. This document operates in conjunction with our Terms & Conditions, Privacy Policy, and Cancellation Policy."
  },
  {
    title: "2. Business Operator Profile",
    content: "PHS Cleaning Company is a Sole Proprietorship firm organized under Indian laws, owned and managed by Pavan Kumar.",
    list: [
      "Company Trade Name: PHS Cleaning Company",
      "Proprietor & Operator: Pavan Kumar",
      "Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
      "Billing Support Email: phscustomercare15@gmail.com",
      "Billing Helpline Phone: +91 7408702019",
      "Service Territory Limit: Kanpur Nagar, Uttar Pradesh, India"
    ]
  },
  {
    title: "3. Direct Service Ownership Model",
    content: "PHS operates a direct doorstep service model. We directly assign our trained and verified Professionals to execute bookings. We do not operate as an intermediary listing portal. Consequently, all payment collections, service quality checks, and refund dispersals are handled directly by our administrative operations desk.",
    subContent: "Booking Confirmed → Payment Gateway Captured → PHS Operations Vetted → Professional Assigned → Complete Doorstep Delivery",
    footerText: "We take full corporate responsibility for processing refunds and managing transaction disputes."
  },
  {
    title: "4. Advance Payment Requirements",
    content: "All doorstep bookings placed on the Platform require a 100% advance digital payment to be finalized. We accept payments via RBI-compliant channels, including UPI, Debit Cards, Credit Cards, Net Banking, and authorized digital wallets. Bookings will remain in 'Pending' status and no service professional will be dispatched until payment is verified by our system."
  },
  {
    title: "5. Standard Refund Eligibility Rules",
    content: "Refunds are processed strictly according to the following eligibility guidelines:",
    nestedLists: [
      {
        title: "A. Timely Customer Cancellation",
        items: [
          "Cancellations submitted through the Customer Portal or helpline more than 2 hours prior to the scheduled service time slot are eligible for a 100% refund of the paid booking amount.",
          "Cancellations submitted within 2 hours of the scheduled time slot may attract a cancellation charge to compensate assigned professionals for mobilization and loss of booking slot.",
          "Cancellations requested after the assigned Professional has arrived at the doorstep are completely non-refundable."
        ]
      },
      {
        title: "B. Operational Service Unavailability",
        items: [
          "If PHS is unable to fulfill a confirmed booking due to technician unavailability, unexpected scheduling conflicts, extreme weather events, or local operational restrictions, the customer will receive a 100% refund.",
          "Alternatively, customers may choose to reschedule the booking to a later date at no additional cost."
        ]
      },
      {
        title: "C. Double / Duplicate Transactions",
        items: [
          "If a customer is charged multiple times due to a gateway lag or network timeout, PHS will audit the transaction logs. Upon verifying duplicate payment receipts, the excess debited amount will be refunded in full."
        ]
      },
      {
        title: "D. Payment Debited but Booking Failed",
        items: [
          "If funds are successfully debited from the customer's account but the platform fails to generate a booking confirmation due to system errors, the customer is eligible for a full refund."
        ]
      }
    ]
  },
  {
    title: "6. Service Quality Audits & Grievances",
    content: "We take quality seriously. If you believe the doorstep cleaning or repair service was performed unsatisfactorily, you must file an audit request within 24 hours of service completion. Please send your Booking ID, a clear description of the issues, and supporting photographs to phscustomercare15@gmail.com. PHS will initiate an internal audit, inspect the work reports, verify logs, and contact the assigned Professional to determine eligibility."
  },
  {
    title: "7. Quality Dispute Resolutions",
    content: "Following the service quality audit, PHS will offer one of the following resolutions based on the severity of verified issues: (a) A complimentary re-service session to rectify the affected areas within 24-48 hours; (b) A partial service credit applied to your wallet; (c) A partial refund of the booking fee; or (d) A full refund for severe, verified failures. The final decision is reserved by PHS Cleaning Company based on audit evidence.",
  },
  {
    title: "8. Non-Refundable Situations",
    content: "Refunds will not be issued under the following circumstances:",
    nestedLists: [
      {
        title: "Customer Accessibility Failures",
        items: [
          "Customer is absent at the service address during the scheduled time slot.",
          "Premises are locked, inaccessible, or secure access permissions are denied.",
          "Customer fails to answer calls from the assigned Professional or operations desk for more than 20 minutes."
        ]
      },
      {
        title: "Provision of Inaccurate Data",
        items: [
          "Invalid, incomplete, or wrong doorstep addresses provided.",
          "Incorrect mobile number entered, preventing operational contact.",
          "Under-reporting service size (e.g. booking a 1-room clean for a 3-bedroom apartment)."
        ]
      },
      {
        title: "Utility Unavailability",
        items: [
          "Lack of running water or electrical power at the property, preventing the completion of cleaning or repair tasks."
        ]
      },
      {
        title: "Policy Abuse & Fraud",
        items: [
          "Repeated late cancellations, filing false damage claims, or exploiting the referral/promo system for financial benefit."
        ]
      }
    ]
  },
  {
    title: "9. Revisit & Rescheduling Charges",
    content: "If a doorstep service cannot be performed due to customer accessibility failures, utility unavailability, or missing gate passes, the booking will be cancelled without a refund. To reschedule the service, the customer must pay a flat Revisit Fee of ₹150. This fee covers the mobilization costs of the assigned Professional.",
  },
  {
    title: "10. Refund Initiation Timelines",
    content: "Once a refund request is audited and approved by the PHS finance desk, we initiate the payment reversal instantly (typically within 15 minutes). The refund is routed back through the original payment gateway to the customer's source account (bank account, credit card, or UPI wallet). PHS does not store or distribute cash refunds.",
  },
  {
    title: "11. Bank Clearing Cycles",
    content: "While PHS initiates refunds immediately, the actual credit timeline is governed by banking systems and gateways. Customers should expect the following clearing cycles:",
    list: [
      "UPI Payments: 24 to 48 hours",
      "Net Banking & Wallets: 3 to 5 business days",
      "Credit & Debit Cards: 5 to 7 business days (excluding bank holidays)"
    ],
    footerText: "PHS Cleaning Company shall not be held liable for clearance lags or processing delays on the part of your issuing bank or payment aggregator."
  },
  {
    title: "12. Fraud & Security Reviews",
    content: "To maintain platform security, all refund requests exceeding ₹2,000 are subject to an administrative security review. We may request proof of identity, bank account details, or transaction screenshots to verify the recipient. PHS reserves the right to withhold refunds if suspicious, collusive, or fraudulent patterns are detected."
  },
  {
    title: "13. Amendment of Refund Policy",
    content: "PHS Cleaning Company reserves the right to amend, alter, or update this Refund Policy at any time. Modified policies will become effective immediately upon being posted to the Platform. Customers are requested to review the Refund Policy before completing bookings."
  }
];

export default function RefundPolicyPage() {
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Refund Policy</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Transaction Auditing & Refund Timelines</p>
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
                  14. Helpline & Billing Support
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
                  14. Helpline & Support
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

                {s.list && (
                  <ul className="space-y-1.5 pl-5 pt-1">
                    {s.list.map((item, lIdx) => (
                      <li key={lIdx} className="list-disc text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

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

                {s.footerText && (
                  <p className="text-[10px] md:text-xs text-on-surface-variant/60 italic font-semibold pt-1">
                    {s.footerText}
                  </p>
                )}
              </section>
            ))}

            {/* Section 14: Helpline & Billing Support */}
            <section id="section-contact" className="scroll-mt-24 pt-6 border-t border-outline-variant/15 space-y-4">
              <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                  14
                </span>
                Helpline & Billing Support
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                For refund audits, duplicate billing concerns, or payment failure reversals, please contact:
              </p>

              <div className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Company</span>
                  <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Billing Desk</span>
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
