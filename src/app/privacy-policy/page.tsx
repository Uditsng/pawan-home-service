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
    title: "1. Scope & Acceptance",
    content: "PHS Cleaning Company ('PHS', 'Firm', 'we', 'our', or 'us') values your privacy. This Privacy Policy details the types of personal data we collect, process, store, and share when you access our website, mobile application, or book our doorstep services. By registering, creating a profile, completing payments, or booking a service, you explicitly consent to the data collection and processing activities detailed in this policy.",
  },
  {
    title: "2. Data Fiduciary Information",
    content: "PHS Cleaning Company is a Sole Proprietorship organized under the laws of India, acting as the Data Fiduciary under the Digital Personal Data Protection (DPDP) Act, 2023.",
    list: [
      "Sole Proprietor & Data Representative: Pavan Kumar",
      "Registered Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India",
      "Grievance Inbox: phscustomercare15@gmail.com",
      "Helpline Phone: +91 7408702019"
    ],
  },
  {
    title: "3. Direct Service Data Flow",
    content: "We directly manage service delivery. We do not transfer your personal information to third-party marketplaces for bidding. All data flows securely from the customer booking portal to our internal operations desk, which then shares strictly necessary operational details (name, phone, address, slot) with the assigned service professional to facilitate doorstep service fulfillment.",
  },
  {
    title: "4. Categories of Data Collected",
    content: "We collect personal data that is essential for service delivery, secure payments, and account administration:",
    nestedLists: [
      {
        title: "A. Personally Identifiable Information (PII)",
        items: ["Full Name", "Contact Mobile Number", "Active Email Address", "Complete Service Address (including Landmarks and Pincodes)"]
      },
      {
        title: "B. Service & Transaction Data",
        items: ["Booked service categories and pricing", "Historical scheduling records", "Payment status (Success/Failure/Pending)", "UPI or bank transaction references", "Internal booking logs"]
      },
      {
        title: "C. Device & Technical Identifiers",
        items: ["IP Address", "Device make and model", "Browser type", "Access timestamps", "App crash reports and analytics logs"]
      }
    ],
    footerText: "We do not collect or store sensitive credit/debit card credentials, Net Banking PINs, or CVV codes. All payments are processed through secure, RBI-authorized third-party payment gateways."
  },
  {
    title: "5. Purpose of Data Processing",
    content: "We process your personal data under the lawful grounds of consent and legitimate business interests:",
    nestedLists: [
      {
        title: "Operational Fulfillment",
        items: ["Creating your account profile", "Verifying service eligibility in your pincode", "Scheduling and assigning service professionals", "Fulfilling quality re-cleans"]
      },
      {
        title: "Communications & Alerts",
        items: ["Dispatching automated booking confirmations", "Sending OTPs for login and verification", "Communicating technician arrival times", "Issuing service feedback requests"]
      },
      {
        title: "Platform Security & Compliance",
        items: ["Detecting and preventing fraudulent bookings", "Enforcing Terms & Conditions", "Complying with statutory tax mandates", "Responding to legal orders from law enforcement"]
      }
    ]
  },
  {
    title: "6. Security of Payment Operations",
    content: "All checkout transactions are encrypted using Industry-standard SSL technology. In compliance with PCI-DSS standards and RBI guidelines, we do not store your complete payment card details or net banking credentials. Third-party processors collect, verify, and complete transactions, governed by their respective privacy terms and compliance certificates.",
  },
  {
    title: "7. Role-Based Access Control (RBAC)",
    content: "To guarantee data isolation, the database schema implements Row Level Security (RLS) policies based on user roles:",
    nestedLists: [
      {
        title: "Customer Access Boundary",
        items: ["Customers can read and write only their own profiles, transaction entries, saved addresses, and outbound referrals."]
      },
      {
        title: "Professional Access Boundary",
        items: ["Service professionals can access only operational data (e.g. customer name, phone, address, and scheduled slot) assigned specifically to them by the admin."]
      },
      {
        title: "Administrator Access Boundary",
        items: ["Administrators retain operational access to configure settings, verify user records, audit bookings, and resolve support requests."]
      }
    ],
    footerText: "We enforce strict database query constraints to prevent unauthorized cross-role data exposure."
  },
  {
    title: "8. Information Sharing & Disclosures",
    content: "We do not trade, sell, or rent your personal information. Your data is disclosed only under the following operational guidelines:",
    nestedLists: [
      {
        title: "With Service Professionals",
        items: ["Shared strictly to enable physical access and complete doorstep cleaning or repair tasks."]
      },
      {
        title: "With Technical Service Providers",
        items: ["Shared with cloud database hosts (Supabase), SMS/OTP gateways (Twilio), push notification services, and payment gateways to run platform services."]
      },
      {
        title: "Legal Mandates",
        items: ["Disclosed to regulatory authorities, court officers, or police desks when required to comply with a judicial proceeding or statutory audit."]
      }
    ]
  },
  {
    title: "9. Data Retention & Erasure Timeline",
    content: "We store your personal data only as long as your account remains active or as required to fulfill our legal, accounting, tax, and dispute resolution duties. Upon an explicit account deletion request, we will deactivate your account and wipe all personally identifiable information from our active databases within 30 days, unless required to retain specific transactions for legal audits.",
  },
  {
    title: "10. Administrative & Technical Safeguards",
    content: "We maintain appropriate technical, physical, and administrative controls (including firewalls, data encryption, and authorized access keys) to safeguard data against accidental loss, unauthorized alteration, or malicious exposure. However, because internet transmissions are never entirely secure, we cannot guarantee absolute security. You are advised to safeguard your mobile device and log credentials.",
  },
  {
    title: "11. Your Statutory Data Rights",
    content: "Under the DPDP Act 2023, you hold the following rights regarding your personal data:",
    list: [
      "Right to Access: Request a summary of the personal data we process and the reasons for processing.",
      "Right to Correction: Request correction, completion, or updates to inaccurate or outdated personal data.",
      "Right to Erasure: Request deletion of your personal data when it is no longer necessary for the purpose collected.",
      "Right to Withdraw Consent: Revoke consent at any time, which will immediately restrict further processing (though historical transactions will remain for legal compliance)."
    ],
  },
  {
    title: "12. Minor Data Restrictions",
    content: "Our services are directed to adults capable of entering into legal contracts. We do not intentionally compile or request information from minors. If we discover that a minor under 18 has submitted personal information, we will verify the claim and delete the data from our records immediately.",
  },
  {
    title: "13. External Hyperlinks",
    content: "Our applications and websites may feature links to external payment gateways, mapping services, or social portals. We do not oversee or endorse their privacy guidelines, cookies, or data safety policies. You should inspect their respective policies independently.",
  },
  {
    title: "14. Cookies & Session Analytics",
    content: "We use essential cookies, browser storage, and analytics tokens to persist your login state, remember service selections in your cart, track user navigation flow, and diagnose loading times. You can disable cookies in your browser, but some features of the Platform may cease to function correctly.",
  },
  {
    title: "15. Updates to This Policy",
    content: "We may update this Privacy Policy to reflect changing business standards or compliance changes. Any modifications will be posted here with an updated revision date. Your continued utilization of our services after updates are published signifies your acceptance of the revised terms.",
  },
];

export default function PrivacyPolicyPage() {
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Privacy Policy</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Compliance Desk · DPDP Act 2023</p>
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
                  16. Contact Details & Privacy Officer
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
                  16. Contact Details
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

            {/* Section 16: Contact Details & Privacy Officer */}
            <section id="section-contact" className="scroll-mt-24 pt-6 border-t border-outline-variant/15 space-y-4">
              <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                  16
                </span>
                Contact Details & Privacy Officer
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                If you have questions, concerns, complaints, or requests regarding this Privacy Policy, your rights under the DPDP Act 2023, or the handling of your personal information, please contact our Grievance Desk:
              </p>

              <div className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Fiduciary Entity</span>
                  <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Grievance Officer</span>
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
