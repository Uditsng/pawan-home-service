import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Cancellation Policy | PHS Cleaning Company",
  description: "Read the Cancellation and Rescheduling Policy for services at PHS Cleaning Company.",
};

const sections = [
  {
    icon: "info",
    title: "1. Introduction",
    content: "This Cancellation and Refund Policy (\"Policy\") governs cancellations, rescheduling requests, and refunds for services booked through PHS Cleaning Company. By booking any service through our platform, website, mobile application, telephone, or any other booking channel, you agree to this Policy."
  },
  {
    icon: "business",
    title: "2. Business Model",
    content: "PHS Cleaning Company provides home cleaning and related services through trained professionals assigned by the Company. PHS Cleaning Company directly manages service allocation, scheduling, and customer support.",
    subContent: "Customer → Booking → PHS Cleaning Company Admin → Professional Assignment → Service Delivery"
  },
  {
    icon: "payments",
    title: "3. Payment Policy",
    content: "All service bookings must be paid in full at the time of booking through available digital payment methods. Accepted payment methods may include UPI, Debit Cards, Credit Cards, Net Banking, Digital Wallets, and other approved payment methods. Bookings shall be considered confirmed only after successful payment confirmation."
  },
  {
    icon: "cancel",
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
    icon: "schedule",
    title: "5. Rescheduling Policy",
    content: "Customers may request rescheduling of their booking. PHS Cleaning Company offers Free Rescheduling subject to professional availability, service area coverage, and operational feasibility. Rescheduling requests should be made as early as possible to avoid scheduling conflicts. PHS Cleaning Company reserves the right to propose alternative dates and time slots when the requested schedule is unavailable."
  },
  {
    icon: "policy",
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
    icon: "hourglass_empty",
    title: "7. Refund Processing Timeline",
    content: "Approved refunds shall be initiated within approximately fifteen (15) minutes after refund approval. However, the actual credit timeline depends on the customer's payment provider, bank, card issuer, UPI platform, or payment gateway. Typical processing times may vary from immediate credit or a few hours, up to 7 business days depending on the payment method used. PHS Cleaning Company shall not be responsible for delays caused by banking institutions or payment service providers."
  },
  {
    icon: "report_problem",
    title: "8. Customer No-Show and Revisit Charges",
    content: "Customers are expected to be available at the service location during the scheduled service window. If the customer is unavailable, access to the premises is denied, or the professional is unable to begin service due to customer-side issues, PHS Cleaning Company may mark the booking as a no-show, and/or apply a revisit charge for scheduling another visit. The amount of the revisit charge may vary depending on the service type, location, and operational costs."
  },
  {
    icon: "rate_review",
    title: "9. Service Quality Complaints",
    content: "Customer satisfaction is important to us. If a customer is dissatisfied with the service provided, a complaint should be submitted through email (phscustomercare15@gmail.com) or phone (+91 7408702019). Customers are encouraged to report concerns as soon as possible after service completion."
  },
  {
    icon: "check_circle",
    title: "10. Resolution of Service Quality Issues",
    content: "All quality-related complaints shall be reviewed on a case-by-case basis. Depending on the findings of the review, PHS Cleaning Company may choose to provide service correction, re-service, partial refund, full refund, service credit, or other appropriate resolutions. The final decision shall be made by PHS Cleaning Company after reviewing the circumstances of each case."
  },
  {
    icon: "subscriptions",
    title: "11. Subscription and Recurring Services",
    content: "PHS Cleaning Company may introduce subscription-based or recurring service plans in the future based on customer demand. If such plans are introduced, additional cancellation terms and refund conditions may apply, and separate plan-specific policies may be published. Until such plans are formally launched, this Policy applies to all standard bookings."
  },
  {
    icon: "shield",
    title: "12. Fraudulent or Abusive Activity",
    content: "PHS Cleaning Company reserves the right to deny refunds or cancel bookings where there is reasonable evidence of fraud, abuse of refund requests, misuse of promotional offers, repeated false complaints, or any activity intended to exploit Company policies."
  },
  {
    icon: "thunderstorm",
    title: "13. Force Majeure",
    content: "PHS Cleaning Company shall not be liable for delays, interruptions, rescheduling, or cancellations caused by events beyond reasonable control, including natural disasters, floods, earthquakes, fire, epidemics, pandemics, government restrictions, civil unrest, power failures, internet outages, transportation disruptions, or acts of God."
  },
  {
    icon: "edit_note",
    title: "14. Changes to This Policy",
    content: "PHS Cleaning Company reserves the right to modify, update, or revise this Policy at any time. Updated versions shall become effective immediately upon publication on the website, application, or other official communication channels."
  }
];

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">cancel_schedule_send</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Cancellation Policy</h1>
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
              </div>
            </div>
          </div>
        ))}

        {/* Section 15: Contact Information */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">contact_support</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-on-surface mb-2">15. Contact Information</h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                For questions, complaints, refund requests, cancellation assistance, or customer support, please contact:
              </p>

              <div className="p-6 bg-surface-dim rounded-2xl border border-outline-variant/30 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Company</h4>
                  <p className="text-sm font-semibold text-on-surface">PHS Cleaning Company</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Address</h4>
                  <p className="text-sm font-semibold text-on-surface leading-snug">
                    C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India
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
