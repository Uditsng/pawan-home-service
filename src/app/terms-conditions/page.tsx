"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

interface TermSection {
  title: string;
  content: string;
  list?: string[];
  subContent?: string;
  nestedLists?: { title: string; items: string[] }[];
  footerText?: string;
}

const sections: TermSection[] = [
  {
    title: "1. Legal Entity & Proprietary Information",
    content: "This document constitutes a binding legal agreement between you ('User', 'Customer', 'you') and PHS Cleaning Company. PHS Cleaning Company is a Sole Proprietorship firm organized, registered, and existing under the laws of India, owned and operated exclusively by Pavan Kumar, with its principal place of business in Kanpur Nagar, Uttar Pradesh.",
    list: [
      "Official Trade Name: PHS Cleaning Company",
      "Proprietor & Operator: Pavan Kumar",
      "Registered Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
      "Corporate Helpline Email: phscustomercare15@gmail.com",
      "Helpline Phone Number: +91 7408702019",
      "Operational Territory: Kanpur Nagar, Uttar Pradesh, India"
    ]
  },
  {
    title: "2. Operational Business Model",
    content: "PHS Cleaning Company functions as a direct service provider rather than an aggregator marketplace. We own, control, and execute the entire service delivery lifecycle. We directly source, verify, train, equip, and assign the cleaning and maintenance professionals ('Professionals' or 'Pros') to perform doorstep tasks at customer properties. The Company remains legally responsible for customer scheduling, billing coordination, grievance management, and quality control.",
    subContent: "Customer → Digital Booking → PHS Operations Desk → Professional Assignment → On-Site Service Delivery",
    footerText: "Assigned Pros are engaged under direct contract, employment, or operational arrangements by PHS Cleaning Company."
  },
  {
    title: "3. User Eligibility & Capacity",
    content: "By accessing this Platform or booking a service, you represent and warrant that you are at least 18 years of age, possess the legal authority to enter into binding agreements under the Indian Contract Act, 1872, and have not been previously suspended or barred from using the Platform. If you are booking services on behalf of a corporate entity, you warrant that you have the explicit authorization to bind that entity to these Terms."
  },
  {
    title: "4. Account Registration & Cybersecurity",
    content: "To utilize certain service categories, you must register a customer profile. You agree to provide accurate, complete, and current information (Full Name, Mobile Number, Email Address, and complete Service Address). You are solely responsible for maintaining the confidentiality of your login credentials and for restricting access to your device. You agree to accept liability for all activities that occur under your account. The Company shall not be liable for losses resulting from unauthorized account usage arising from your failure to protect your login parameters."
  },
  {
    title: "5. Role-Based Access Controls",
    content: "To maintain platform security, the application enforces strict role-based access. Users are prohibited from attempting to bypass, hack, or exploit these boundary controls:",
    nestedLists: [
      {
        title: "Customer Portal",
        items: ["Configure saved addresses", "Create doorstep bookings", "Initiate advance digital payments", "Track service updates", "Review transaction histories"]
      },
      {
        title: "Partner (Professional) Portal",
        items: ["Complete mandatory service onboarding", "Select verified service categories and postal areas (pincodes)", "View assigned jobs", "Acknowledge status transitions", "Access customer directions"]
      },
      {
        title: "Administrative Control Panel",
        items: ["Global booking management", "Manual and automatic professional assignment checks", "Financial logging", "User management and platform parameter settings"]
      }
    ]
  },
  {
    title: "6. Territory Restrictions & Service Limits",
    content: "Our operational limits are strictly confined to Kanpur Nagar, Uttar Pradesh, India. If a customer places a booking for an address located outside our active operational boundaries, PHS reserves the right to reject the booking, refund the paid amount in full, and restrict account activity. The Service Area list is subject to periodic updates based on operational availability."
  },
  {
    title: "7. Doorstep Service Bookings",
    content: "A booking request constitutes an offer by you to purchase doorstep services. A binding contract is formed only when PHS Cleaning Company processes the 100% advance payment, verifies address feasibility, and updates the booking status to 'Confirmed' in your dashboard. We reserve the absolute right to reject any booking request without assigning a reason."
  },
  {
    title: "8. Assignment of Service Professionals",
    content: "The assignment of Professionals is determined exclusively by the Company's system logic (utilizing round-robin auto-assignment to optimize scheduling and territory coverage). While PHS ensures that all Pros are fully vetted, the Customer does not have the right to request or reject specific Pros, demand specific individuals, or seek direct employment agreements with the Pros. PHS reserves the right to replace assigned Pros at any point prior to service start."
  },
  {
    title: "9. Pricing Structures & Taxation",
    content: "All prices quoted on the Platform are in Indian Rupees (₹) and are inclusive of service costs, materials (where specified), and platform processing fees. GST and other applicable taxes will be detailed during checkout. PHS reserves the right to revise service prices at any time. However, confirmed bookings shall not be affected by subsequent price updates."
  },
  {
    title: "10. Advance Payment Terms",
    content: "We enforce a strict 100% advance payment policy for all standard doorstep bookings. Bookings will not be confirmed or dispatched unless the payment gateway verifies successful transaction completion. Payments must be processed through the approved digital channels (UPI, Credit Cards, Debit Cards, Net Banking, or authorized Wallets). Cash on Delivery (COD) is not accepted."
  },
  {
    title: "11. Cancellation, Rescheduling & Revisit Fees",
    content: "Cancellations and rescheduling requests are subject to the following rules:",
    nestedLists: [
      {
        title: "Cancellations",
        items: [
          "Cancellations requested more than 2 hours before the scheduled time slot: Eligible for a 100% refund.",
          "Cancellations requested within 2 hours of the scheduled time slot: A late cancellation penalty (retained as booking fee) may apply.",
          "Cancellations requested after the Professional has arrived at the property: Non-refundable."
        ]
      },
      {
        title: "Revisit Charges",
        items: [
          "If the Professional arrives but is unable to access the property, or if the customer is a no-show, PHS reserves the right to apply a revisit charge of ₹150 for rescheduling the service."
        ]
      }
    ]
  },
  {
    title: "12. Customer Cooperation & Workplace Safety",
    content: "The customer must provide a safe, non-hazardous, and cooperative environment for our Professionals. You agree to secure all high-value personal belongings, cash, jewelry, and delicate items before the Pro enters the property. Furthermore, you must provide the Pro with access to running water, adequate lighting, and electrical power. PHS reserves the right to instruct Pros to withdraw immediately from properties where they face verbal abuse, unsafe conditions, physical hazards, or harassment."
  },
  {
    title: "13. Access Permissions & Gate Passes",
    content: "You are solely responsible for securing all necessary clearances, society permissions, landlord approvals, and gate passes required for the Pro to enter your premises. PHS will not be liable for service delays or incomplete tasks resulting from society-level access denials."
  },
  {
    title: "14. Customer No-Show Policy",
    content: "A customer no-show occurs if the Pro arrives at the registered service address within the confirmed slot and the customer is unavailable, unreachable via the registered phone number, or refuses entry for more than 20 minutes. In such cases, the booking will be marked as cancelled, and the paid booking amount will be forfeited to cover operational and mobilization costs."
  },
  {
    title: "15. Quality Audits & Grievance Procedures",
    content: "If you are dissatisfied with the service quality, you must register a complaint within 24 hours of service completion via our Helpline Email (phscustomercare15@gmail.com) or Care Number (+91 7408702019). The complaint must include the Booking ID and photographic evidence of the areas of concern. PHS will investigate the claim and may offer a free re-cleaning of the affected areas, service credits, or a partial refund at its sole discretion."
  },
  {
    title: "16. Intellectual Property Protection",
    content: "All content displayed on the Platform, including but not limited to text, UI layouts, icons, logos, brand names, code, graphics, images, database schemas, and workflows, is the exclusive property of PHS Cleaning Company and is protected by Indian copyright, trademark, and intellectual property laws. You may not copy, scrape, distribute, modify, or reuse any content without our prior written consent."
  },
  {
    title: "17. Review Moderation & Feedback License",
    content: "Customers may post reviews and ratings. You warrant that any review submitted is accurate, honest, and free of defamatory, profane, or unlawful content. By posting a review, you grant PHS a perpetual, royalty-free, worldwide license to use, publish, translate, and distribute your feedback for marketing, service improvements, and public displays."
  },
  {
    title: "18. Data Protection & Privacy Compliance",
    content: "We collect and process your personal and transaction data in strict compliance with the Digital Personal Data Protection (DPDP) Act, 2023, and our Privacy Policy. By utilizing our Platform, you acknowledge that you have read and understood our data processing practices."
  },
  {
    title: "19. Limitation of Liability & Property Disclaimers",
    content: "To the maximum extent permitted by applicable law, PHS Cleaning Company's total liability for any claim, loss, damage, or service failure arising out of a booking shall be strictly limited to the amount paid by the customer for that specific booking. PHS shall not be liable for any indirect, incidental, special, exemplary, or consequential damages, including loss of profits, data loss, or property damage resulting from customer negligence or failure to secure high-value items.",
  },
  {
    title: "20. Mutual Indemnification",
    content: "You agree to defend, indemnify, and hold harmless PHS Cleaning Company, its proprietor (Pavan Kumar), employees, agents, and contractors from and against any and all claims, damages, liabilities, costs, and expenses (including legal fees) arising from your misuse of the Platform, breach of these Terms, violation of third-party rights, or unlawful conduct at the service premises."
  },
  {
    title: "21. Account Suspension & Termination",
    content: "PHS reserves the right to suspend, restrict, or terminate your account access without prior notice if we detect fraudulent transactions, repeated late cancellations, harassment of our Pros, abuse of the referral program, or actions that compromise the security and operational integrity of the Platform."
  },
  {
    title: "22. Force Majeure Events",
    content: "PHS Cleaning Company shall not be held liable for any delay, service failure, or non-performance resulting from causes beyond its reasonable control, including natural disasters, acts of God, floods, fires, earthquakes, strikes, lockouts, government restrictions, epidemics, pandemics, civic disturbances, power failures, or general internet outages."
  },
  {
    title: "23. Modification of Terms",
    content: "We reserve the right to amend these Terms & Conditions at our discretion. The 'Last Updated' date at the top will reflect the latest revision. Revised terms will become effective immediately upon posting. Your continued use of the Platform after amendments are posted constitutes your explicit acceptance of the updated terms."
  },
  {
    title: "24. Governing Jurisdiction",
    content: "These Terms & Conditions, the booking contracts, and the relationship between the customer and PHS Cleaning Company shall be governed by and construed in accordance with the laws of India, without reference to conflict of laws principles."
  },
  {
    title: "25. Dispute Resolution & Arbitration",
    content: "Any dispute, claim, or controversy arising out of or relating to these Terms, including service performance or billing, shall first be referred to our Grievance Desk for amicable resolution. If the dispute is not resolved within 30 days of referral, it shall be subject to the exclusive jurisdiction of the competent courts located in Kanpur Nagar, Uttar Pradesh, India."
  }
];

export default function TermsConditionsPage() {
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Terms & Conditions</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Operational Guidelines & Terms of Service</p>
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
                  26. Helpline & Legal Contacts
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
                  26. Helpline & Legal Contacts
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

            {/* Section 26: Helpline & Legal Contacts */}
            <section id="section-contact" className="scroll-mt-24 pt-6 border-t border-outline-variant/15 space-y-4">
              <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                  26
                </span>
                Helpline & Legal Contacts
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                For legal notices, complaints, support requests, or questions regarding these Terms, please contact our helpline:
              </p>

              <div className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Company</span>
                  <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Proprietor</span>
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
