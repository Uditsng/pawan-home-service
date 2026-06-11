import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | PHS Cleaning Company",
  description: "Read the Refund Policy for service bookings at PHS Cleaning Company.",
};

const sections = [
  {
    icon: "info",
    title: "1. Introduction",
    content: "This Refund Policy (\"Policy\") governs refunds, refund eligibility, refund processing, and related matters for services booked through PHS Cleaning Company. By booking any service through our website, mobile application, telephone support, or any other official booking channel, you agree to the terms of this Refund Policy. This Policy should be read together with our Terms & Conditions, Privacy Policy, and Cancellation Policy."
  },
  {
    icon: "business",
    title: "2. Business Information",
    content: "PHS Cleaning Company is a Sole Proprietorship owned and operated by Pavan Kumar.",
    list: [
      "Business Name: PHS Cleaning Company",
      "Owner: Pavan Kumar",
      "Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
      "Customer Support Email: phscustomercare15@gmail.com",
      "Customer Support Phone: +91 7408702019",
      "Service Area: Kanpur Nagar, Uttar Pradesh, India"
    ]
  },
  {
    icon: "engineering",
    title: "3. Our Business Model",
    content: "PHS Cleaning Company directly provides cleaning and related services through trained professionals assigned by the Company.",
    subContent: "Customer → Booking → PHS Cleaning Company → Professional Assignment → Service Delivery",
    footerText: "PHS Cleaning Company is the service provider and is responsible for service management, scheduling, professional assignment, customer support, and dispute resolution."
  },
  {
    icon: "payments",
    title: "4. Payment Policy",
    content: "All bookings require 100% advance payment at the time of booking. Payments may be accepted through UPI, Credit Cards, Debit Cards, Net Banking, Digital Wallets, and other approved digital payment methods. A booking shall be considered confirmed only after successful payment verification."
  },
  {
    icon: "policy",
    title: "5. Refund Eligibility",
    content: "Refund requests may be considered under the following circumstances:",
    nestedLists: [
      {
        title: "A. Cancellation Within Eligible Cancellation Period",
        items: [
          "Customers may be eligible for a full refund when the booking is cancelled within the permitted cancellation window as defined in the Cancellation Policy.",
          "No cancellation charges are applicable during the eligible cancellation period.",
          "Refund Amount: 100% of the amount paid."
        ]
      },
      {
        title: "B. Service Unavailable",
        items: [
          "Customers may be eligible for a full refund when PHS Cleaning Company is unable to provide the booked service, no suitable professional is available, operational limitations prevent service delivery, or the service location becomes temporarily unavailable.",
          "Refund Amount: 100% of the amount paid."
        ]
      },
      {
        title: "C. Duplicate Payment",
        items: [
          "If a customer is charged more than once for the same booking and duplicate payment is successfully verified, the excess amount paid shall be refunded."
        ]
      },
      {
        title: "D. Failed Booking with Successful Payment",
        items: [
          "If payment is successfully processed but the booking is not created due to technical issues, service request fails to generate, or platform errors prevent confirmation, the customer shall be eligible for a refund after verification.",
          "Refund Amount: 100% of the amount paid."
        ]
      },
      {
        title: "E. Company-Initiated Cancellation",
        items: [
          "If PHS Cleaning Company cancels a confirmed booking due to operational issues, professional unavailability, internal scheduling conflicts, safety concerns, or other legitimate operational reasons, the customer shall receive either a full refund or a free rescheduling option."
        ]
      }
    ]
  },
  {
    icon: "rate_review",
    title: "6. Service Quality Complaints",
    content: "Customer satisfaction is important to PHS Cleaning Company. If a customer believes that the delivered service does not meet reasonable service standards, the customer may submit a complaint containing booking details, a description of the issue, supporting photographs (if available), and relevant communication records. Complaints should be reported as soon as reasonably possible after service completion."
  },
  {
    icon: "check_circle",
    title: "7. Resolution of Service Quality Issues",
    content: "Each complaint shall be reviewed individually. Following review, PHS Cleaning Company may provide: Service correction, Re-service, Partial refund, Full refund, Service credit, or another alternative resolution. The final decision shall be made after evaluating the nature of the complaint, evidence submitted, service records, professional reports, and internal investigation findings. Refunds for quality-related issues are not automatic and shall be determined on a case-by-case basis."
  },
  {
    icon: "cancel",
    title: "8. Non-Refundable Situations",
    content: "Refunds may not be granted in the following circumstances:",
    nestedLists: [
      {
        title: "Customer No-Show",
        items: [
          "Customer is unavailable at the service location.",
          "Customer cannot be contacted.",
          "Access to premises is denied.",
          "Customer fails to cooperate with service delivery."
        ]
      },
      {
        title: "Incorrect Information",
        items: [
          "Wrong address is provided.",
          "Incorrect contact details are submitted.",
          "Service requirements are misrepresented."
        ]
      },
      {
        title: "Service Completion",
        items: [
          "Once a service has been fully completed according to the booking request and no legitimate quality concerns are identified, refunds may not be available."
        ]
      },
      {
        title: "Abuse of Refund Requests",
        items: [
          "Refund requests may be denied where there is reasonable evidence of fraudulent activity, false claims, abuse of company policies, or repeated misuse of refund procedures."
        ]
      }
    ]
  },
  {
    icon: "schedule",
    title: "9. Revisit Charges",
    content: "Where a service cannot be completed due to customer-related reasons (e.g. customer unavailable, locked premises, access restrictions, utility unavailability), PHS Cleaning Company may schedule a revisit. In such situations, a revisit charge may apply. The amount shall depend upon the service type and operational costs. Revisit charges are separate from refund eligibility."
  },
  {
    icon: "hourglass_empty",
    title: "10. Refund Processing",
    content: "Approved refunds shall be initiated by PHS Cleaning Company within approximately fifteen (15) minutes after refund approval. However, actual credit timing depends upon banking institutions, UPI providers, payment gateways, card networks, and financial institutions."
  },
  {
    icon: "update",
    title: "11. Refund Credit Timeline",
    content: "Although refund initiation may occur within fifteen (15) minutes, customers should allow up to:",
    list: [
      "24 hours for many UPI refunds",
      "3–7 business days for card payments",
      "7 business days for certain banking channels"
    ],
    footerText: "PHS Cleaning Company shall not be responsible for delays caused by external financial institutions."
  },
  {
    icon: "subscriptions",
    title: "12. Subscription Services",
    content: "PHS Cleaning Company may introduce recurring or subscription-based services in the future based on customer demand. If such services are launched, additional refund terms may apply, and separate subscription refund policies may be published. Until then, this Refund Policy applies only to standard service bookings."
  },
  {
    icon: "shield",
    title: "13. Fraud Prevention",
    content: "To protect customers and the Company, refund requests may be reviewed for identity verification, transaction verification, booking verification, and abuse detection. PHS Cleaning Company reserves the right to request additional information before processing refunds."
  },
  {
    icon: "thunderstorm",
    title: "14. Force Majeure",
    content: "Refund obligations may be affected by circumstances beyond the Company's reasonable control including natural disasters, floods, earthquakes, fires, government restrictions, public emergencies, civil disturbances, epidemics, pandemics, power failures, or internet outages. Each situation shall be assessed individually."
  },
  {
    icon: "edit_note",
    title: "15. Changes to This Policy",
    content: "PHS Cleaning Company reserves the right to modify, update, or revise this Refund Policy at any time. Updated versions shall become effective immediately upon publication on the Company's website, mobile application, or official communication channels."
  }
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">currency_rupee</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Refund Policy</h1>
              <p className="mt-2 text-on-primary/70 text-sm">Last Updated: June 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-on-surface mb-3 leading-tight">{s.title}</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">{s.content}</p>

                {s.list && (
                  <ul className="mt-4 space-y-2">
                    {s.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">check_circle</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.subContent && (
                  <div className="mt-4 p-4 bg-surface-dim rounded-xl border border-outline-variant/30 text-center font-semibold text-primary text-sm">
                    {s.subContent}
                  </div>
                )}

                {s.nestedLists && (
                  <div className="mt-4 space-y-4">
                    {s.nestedLists.map((subList) => (
                      <div key={subList.title} className="p-4 bg-surface-dim rounded-xl border border-outline-variant/20">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{subList.title}</h4>
                        <ul className="space-y-1.5">
                          {subList.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-secondary text-[14px] mt-0.5 shrink-0">arrow_right</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {s.footerText && (
                  <p className="mt-3 text-xs text-on-surface-variant/80 italic">{s.footerText}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Section 16: Contact Us */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">contact_support</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-on-surface mb-2">16. Contact Us</h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                For refund requests, payment issues, complaints, or support, please contact:
              </p>

              <div className="p-6 bg-surface-dim rounded-2xl border border-outline-variant/30 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Company</h4>
                  <p className="text-sm font-semibold text-on-surface">PHS Cleaning Company</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Owner</h4>
                  <p className="text-sm font-semibold text-on-surface">Pavan Kumar</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Address</h4>
                  <p className="text-sm font-semibold text-on-surface leading-snug">
                    C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a href="mailto:phscustomercare15@gmail.com" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary rounded-xl text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">email</span>phscustomercare15@gmail.com
                  </a>
                  <a href="tel:+917408702019" className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-outline-variant rounded-xl text-on-surface text-xs font-bold hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-[16px]">phone</span>+91 7408702019
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
