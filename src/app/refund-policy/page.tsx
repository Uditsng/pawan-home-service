import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | PHS Cleaning Company",
  description: "Read the official Refund Policy of PHS Cleaning Company detailing booking refunds, cancellation penalties, re-service audits, and bank processing timelines.",
};

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
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">Refund Policy</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1">Last Updated: June 2026</p>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title} className="space-y-3">
            <h2 className="text-lg font-bold text-on-surface font-headline leading-tight">{s.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{s.content}</p>

            {s.list && (
              <ul className="space-y-2 text-sm text-on-surface-variant pl-4">
                {s.list.map((item) => (
                  <li key={item} className="list-disc pl-1 font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            )}

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

            {s.footerText && (
              <p className="text-xs text-on-surface-variant/60 italic font-medium">{s.footerText}</p>
            )}
          </section>
        ))}

        {/* Section 14: Helpline & Billing Support */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-lg font-bold text-on-surface font-headline">14. Helpline & Billing Support</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            For refund audits, duplicate billing concerns, or payment failure reversals, please contact:
          </p>

          <div className="space-y-3 text-sm pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Company</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Billing Desk</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Office Address</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0 text-left sm:text-right max-w-md">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India</span>
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
