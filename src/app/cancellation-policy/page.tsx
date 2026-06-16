import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Cancellation Policy | PHS Cleaning Company",
  description: "Read the Cancellation and Rescheduling Policy for services at PHS Cleaning Company.",
};

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
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">Cancellation Policy</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1">Last Updated: June 2026</p>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title} className="space-y-3">
            <h2 className="text-lg font-bold text-on-surface font-headline leading-tight">{s.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{s.content}</p>

            {s.subContent && (
              <p className="text-xs text-primary font-mono bg-surface-container/30 px-3 py-2 rounded-lg border border-outline-variant/5 inline-block">
                {s.subContent}
              </p>
            )}

            {s.nestedLists && (
              <div className="space-y-3 pt-2">
                {s.nestedLists.map((subList) => (
                  <div key={subList.title} className="space-y-1">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{subList.title}</h4>
                    <ul className="space-y-1 text-xs text-on-surface-variant pl-4">
                      {subList.items.map((item) => (
                        <li key={item} className="list-disc pl-1 font-medium">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Section 15: Contact Information */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-lg font-bold text-on-surface font-headline">15. Contact Information</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            For questions, complaints, refund requests, cancellation assistance, or customer support, please contact:
          </p>

          <div className="space-y-3 text-sm pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Company</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Office Address</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0 text-left sm:text-right max-w-md">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Email Address</span>
              <a href="mailto:phscustomercare15@gmail.com" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">phscustomercare15@gmail.com</a>
            </div>
            <div className="flex flex-col sm:flex-row justify-between pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Helpline Phone</span>
              <a href="tel:+917408702019" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">+91 7408702019</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
