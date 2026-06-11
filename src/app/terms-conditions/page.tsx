import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | PHS Cleaning Company",
  description: "Read the Terms & Conditions for using the PHS Cleaning Company platform and booking services.",
};

const sections = [
  {
    icon: "business",
    title: "1. Business Information",
    content: "PHS Cleaning Company is a Sole Proprietorship owned and operated by Pavan Kumar.",
    list: [
      "Business Name: PHS Cleaning Company",
      "Owner: Pavan Kumar",
      "Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
      "Email: phscustomercare15@gmail.com",
      "Phone: +91 7408702019",
      "Service Area: Kanpur Nagar, Uttar Pradesh, India"
    ]
  },
  {
    icon: "engineering",
    title: "2. About PHS Cleaning Company",
    content: "PHS Cleaning Company provides cleaning and related home services directly to customers. Unlike marketplace platforms, PHS Cleaning Company is the service provider. The Company: Accepts customer bookings, Assigns professionals, Manages scheduling, Handles customer support, Coordinates service delivery, and Processes payments and refunds.",
    subContent: "Customer → Booking → PHS Cleaning Company → Professional Assignment → Service Delivery",
    footerText: "Professionals performing services are engaged, assigned, employed, or contracted by PHS Cleaning Company for service fulfillment."
  },
  {
    icon: "assignment_ind",
    title: "3. Eligibility",
    content: "To use our services, you must be at least 18 years old, have the legal capacity to enter into contracts, provide accurate information, and comply with all applicable laws. By using the Platform, you represent that all information provided is accurate and complete."
  },
  {
    icon: "key",
    title: "4. Account Registration",
    content: "Certain features may require account creation. Users may be required to provide their Full Name, Mobile Number, Email Address, Service Address, and Profile Image. You are responsible for maintaining account confidentiality, securing login credentials, and all activities performed through your account. PHS Cleaning Company shall not be responsible for losses arising from unauthorized access caused by user negligence."
  },
  {
    icon: "supervised_user_circle",
    title: "5. User Roles",
    content: "The Platform enforces role-based access restrictions at all times under the following categories:",
    nestedLists: [
      {
        title: "Customer",
        items: ["Create bookings", "Manage profile", "View booking history", "Track service status"]
      },
      {
        title: "Professional",
        items: ["View assigned jobs", "Update job status", "Manage assigned service tasks"]
      },
      {
        title: "Administrator",
        items: ["Manage bookings", "Assign professionals", "Manage customers and professionals", "Operate the Platform"]
      }
    ]
  },
  {
    icon: "location_on",
    title: "6. Service Availability",
    content: "Services are currently offered exclusively within Kanpur Nagar, Uttar Pradesh, India. PHS Cleaning Company reserves the right to refuse service requests outside service areas, modify service coverage, and suspend service availability in specific locations."
  },
  {
    icon: "book_online",
    title: "7. Bookings",
    content: "Customers may book services through the Platform. A booking is considered confirmed only when required information is provided, payment is successfully completed, and a booking confirmation is issued. PHS Cleaning Company reserves the right to accept or reject bookings, reschedule bookings, assign or reassign professionals, and cancel bookings for operational reasons."
  },
  {
    icon: "badge",
    title: "8. Professional Assignment",
    content: "Professional assignment is managed exclusively by PHS Cleaning Company. Customers cannot demand specific professionals, specific staff members, or direct employment relationships with assigned professionals. The Company may replace assigned professionals whenever operationally necessary."
  },
  {
    icon: "payments",
    title: "9. Pricing",
    content: "Service prices displayed on the Platform may include service charges, applicable taxes, and other disclosed fees. Prices may change without notice. However, confirmed bookings shall be charged according to the price displayed at the time of booking."
  },
  {
    icon: "credit_card",
    title: "10. Payment Terms",
    content: "All bookings require 100% advance payment. Accepted payment methods may include UPI, Debit Cards, Credit Cards, Net Banking, Digital Wallets, and other approved digital payment methods. Payment must be successfully completed before service confirmation."
  },
  {
    icon: "policy",
    title: "11. Cancellation and Refunds",
    content: "Cancellation and refunds shall be governed by the Company's separate Cancellation Policy and Refund Policy. Customers are encouraged to review those policies before booking services."
  },
  {
    icon: "verified_user",
    title: "12. Customer Responsibilities",
    content: "Customers agree to provide accurate information, safe access to service locations, ensure professionals can perform services without obstruction, cooperate during service delivery, and maintain respectful behavior. Customers shall not harass or discriminate against professionals, engage in abusive conduct, use fraudulent payment methods, or misuse the Platform."
  },
  {
    icon: "meeting_room",
    title: "13. Property Access",
    content: "Customers are responsible for obtaining access permissions, arranging entry approvals, and providing access to required service areas. Delays caused by customer-side restrictions may result in rescheduling, revisit charges, or service delays."
  },
  {
    icon: "cancel_presentation",
    title: "14. Customer No-Show",
    content: "If the customer is unavailable, the service location is inaccessible, or the customer fails to respond, PHS Cleaning Company may cancel the booking, reschedule the booking, and/or apply revisit charges where applicable."
  },
  {
    icon: "rate_review",
    title: "15. Service Quality Complaints",
    content: "Customers may submit complaints regarding service quality, which should include booking information, description of concern, and supporting photographs if available. Each complaint shall be reviewed individually. Possible resolutions may include re-service, service correction, partial refund, full refund, or service credits, as determined by PHS Cleaning Company."
  },
  {
    icon: "copyright",
    title: "16. Intellectual Property",
    content: "All Platform content including logos, branding, graphics, text, software, designs, and service content belongs to PHS Cleaning Company unless otherwise stated. Users may not copy, reproduce, modify, distribute, or sell any Platform content without prior written permission."
  },
  {
    icon: "reviews",
    title: "17. User Content and Reviews",
    content: "Users may submit ratings, reviews, feedback, and suggestions. By submitting content, users grant PHS Cleaning Company a non-exclusive right to use such content for service improvement, marketing, customer support, and quality control. The Company reserves the right to remove inappropriate content."
  },
  {
    icon: "shield",
    title: "18. Privacy",
    content: "Collection and processing of personal information shall be governed by the Company's Privacy Policy. By using the Platform, users consent to the collection and use of information described in the Privacy Policy."
  },
  {
    icon: "report_problem",
    title: "19. Limitation of Liability",
    content: "To the maximum extent permitted by law, PHS Cleaning Company shall not be liable for indirect losses, consequential damages, loss of profits, business interruption, or delays caused by circumstances beyond reasonable control. The Company's total liability arising from any booking shall not exceed the amount paid for that specific booking."
  },
  {
    icon: "security",
    title: "20. Indemnification",
    content: "Users agree to indemnify and hold harmless PHS Cleaning Company, its owner, employees, professionals, contractors, and representatives against claims arising from violation of these Terms, misuse of the Platform, fraudulent activities, or violation of applicable laws."
  },
  {
    icon: "block",
    title: "21. Suspension and Termination",
    content: "PHS Cleaning Company may suspend or terminate accounts that violate these Terms, engage in fraud, abuse refund policies, harass staff or professionals, or create security risks. The Company may remove access without prior notice where necessary."
  },
  {
    icon: "thunderstorm",
    title: "22. Force Majeure",
    content: "PHS Cleaning Company shall not be liable for delays or failures caused by events beyond reasonable control, including natural disasters, floods, earthquakes, fire, government restrictions, pandemics, power failures, internet outages, or civil disturbances."
  },
  {
    icon: "edit_note",
    title: "23. Modifications",
    content: "PHS Cleaning Company reserves the right to modify these Terms at any time. Updated versions shall become effective upon publication on the Platform. Continued use of the Platform constitutes acceptance of revised Terms."
  },
  {
    icon: "gavel",
    title: "24. Governing Law",
    content: "These Terms shall be governed by the laws of India."
  },
  {
    icon: "balance",
    title: "25. Dispute Resolution",
    content: "Any dispute arising from these Terms shall first be attempted to be resolved amicably. If unresolved, disputes shall be subject to the jurisdiction of competent courts located in Kanpur, Uttar Pradesh, India."
  },
];

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">gavel</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Terms & Conditions</h1>
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

        {/* Section 26: Contact Information */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">contact_support</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-on-surface mb-2">26. Contact Information</h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                For legal notices, complaints, support requests, or questions regarding these Terms:
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
