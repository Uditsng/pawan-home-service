import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us | PHS Cleaning Company",
  description: "Get in touch with PHS Cleaning Company support desk. Find helpline numbers, email addresses, registered office location, and grievance officer details.",
};

const faqs = [
  { 
    q: "How do I place a doorstep service booking?", 
    a: "You can book directly via our official platform by registering your mobile number, selecting your service category (e.g. Deep Cleaning, Pest Control), picking an available date/time window, and completing the 100% advance digital payment. A booking ID is generated instantly." 
  },
  { 
    q: "Can I reschedule or cancel a confirmed booking?", 
    a: "Yes. You can request booking reschedules or cancellations via the Customer Dashboard or by contacting customer support at +91 7408702019 at least 2 hours before the scheduled time slot. Cancellations within the 2-hour window may attract a penalty as per our Cancellation Policy." 
  },
  { 
    q: "How are service professionals assigned to my booking?", 
    a: "All service professionals are assigned dynamically by the PHS operational system based on qualification, rating, service areas, and availability. PHS maintains direct accountability for the assignment, coordination, and conduct of the assigned professionals." 
  },
  { 
    q: "Are the cleaning agents and tools provided by PHS?", 
    a: "Yes. Our assigned professionals carry all necessary professional-grade cleaning chemicals, sanitizers, and equipment. If you have specific material preferences or chemical allergies, please notify the operations team prior to arrival." 
  },
  { 
    q: "What should I do if my payment fails but the money is debited?", 
    a: "In case of transaction failures where funds are debited from your bank account, the bank will automatically reverse the transaction within 3 to 7 business days. Please share the bank transaction reference number with us at phscustomercare15@gmail.com for verification." 
  },
  { 
    q: "Who is responsible in case of property damage during service?", 
    a: "PHS Cleaning Company supervises all service fulfillment. In the rare event of damage caused due to verified professional negligence, please document the damage with photographs and submit a complaint to our care desk within 24 hours of service completion." 
  },
];

const supportServices = [
  { title: "Booking Coordination", desc: "Assistance with placing new bookings, service scheduling, technician check-in status, and appointment rescheduling." },
  { title: "Billing & Refund Disputes", desc: "Verification of payment statuses, processing invoice copies, GST breakdowns, duplicate charges, and refund credit tracking." },
  { title: "Grievances & Quality Feedback", desc: "Submitting quality compliance reports, requesting re-service sessions, reporting professional conduct issues, and rating feedback." },
  { title: "Account & Profile Queries", desc: "Assistance with customer profile editing, registered address changes, notification settings, and data erasure requests." },
];

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">Contact Us</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1">
          We are committed to delivering premium home services. Reach out to our team for assistance.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Contact Info Channels */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface-variant/70 uppercase tracking-wider">Email Support Desk</h3>
            <a href="mailto:phscustomercare15@gmail.com" className="text-base font-bold text-primary hover:text-secondary font-mono">
              phscustomercare15@gmail.com
            </a>
            <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wide">Response window: 12-24 hours</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface-variant/70 uppercase tracking-wider">Helpline Number</h3>
            <a href="tel:+917408702019" className="text-base font-bold text-primary hover:text-secondary font-mono">
              +91 7408702019
            </a>
            <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-wide">Available: 9:00 AM - 8:00 PM (IST)</p>
          </div>
        </section>

        {/* Business Details */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-xl font-bold font-headline tracking-tight">Business Identification</h2>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Entity Name</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company (Sole Proprietorship)</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Proprietor Name</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Registered Address</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0 text-left sm:text-right max-w-md">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur Nagar, Uttar Pradesh – 208014, India</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Active Jurisdiction</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">Kanpur Nagar, Uttar Pradesh, India</span>
            </div>
          </div>
        </section>

        {/* Grievance Officer details */}
        <section className="p-6 bg-surface-container/30 rounded-xl border border-outline-variant/10 space-y-4">
          <h2 className="text-base font-bold font-headline text-on-surface">Grievance Redressal Officer</h2>
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            In compliance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer is details below:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Name</p>
              <p className="font-bold text-on-surface">Pavan Kumar</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Designation</p>
              <p className="font-bold text-on-surface">Grievance & Compliance Officer</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Address</p>
              <p className="font-bold text-on-surface">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur Nagar, Uttar Pradesh – 208014, India</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Contact Email</p>
              <a href="mailto:phscustomercare15@gmail.com" className="font-bold text-primary font-mono">phscustomercare15@gmail.com</a>
            </div>
          </div>
        </section>

        {/* Support categories */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-xl font-bold font-headline tracking-tight">Structured Support Desks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {supportServices.map((service) => (
              <div key={service.title} className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface font-headline">{service.title}</h3>
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-medium">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preparation checklist */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-3">
          <h2 className="text-xl font-bold font-headline tracking-tight">Information Required for Resolution</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            To help us resolve your query efficiently, please maintain the following records when contacting us:
          </p>
          <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2"></span>
              <span><strong>For Booking Concerns:</strong> 16-character Booking ID, service address, and registered user mobile number.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2"></span>
              <span><strong>For Billing & Refunds:</strong> UPI/Bank transaction reference ID, timestamp of payment, and payment confirmation status.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2"></span>
              <span><strong>For Quality Compliance:</strong> Specific areas of dissatisfaction, time of service completion, and photographic proof of issues.</span>
            </li>
          </ul>
        </section>

        {/* FAQs */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-6">
          <h2 className="text-xl font-bold text-on-surface font-headline text-center">Customer FAQs</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface font-headline leading-snug">{faq.q}</h3>
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
