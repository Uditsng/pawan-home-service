import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Shipping & Service Delivery Policy | PHS Cleaning Company",
  description: "Read the official Shipping and Service Delivery Policy of PHS Cleaning Company to learn about our doorstep service delivery models, timelines, and active zones.",
};

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
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">Shipping & Service Delivery Policy</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1">Last Updated: June 2026</p>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title} className="space-y-3">
            <h2 className="text-lg font-bold text-on-surface font-headline leading-tight">{s.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{s.content}</p>
          </section>
        ))}

        {/* Section 7: Contact & Helpline Support */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-lg font-bold text-on-surface font-headline">7. Contact & Helpline Support</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            If you have questions regarding doorstep service delivery, scheduling boundaries, or operational coverage, please contact support:
          </p>

          <div className="space-y-3 text-sm pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Company</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Owner</span>
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
