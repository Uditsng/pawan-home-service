import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us | PHS Cleaning Company",
  description: "Get in touch with PHS Cleaning Company for service bookings, cancellations, payments, and general support.",
};

const faqs = [
  { q: "How do I book a service?", a: "Select your desired service, choose a suitable time slot, complete the payment, and confirm your booking." },
  { q: "How do I join as a service partner?", a: "Register on the platform → Complete verification → Start receiving jobs." },
  { q: "Are service partners verified?", a: "Yes, all partners go through a verification process before approval." },
  { q: "Can I reschedule my booking?", a: "Yes, rescheduling is allowed based on partner availability." },
  { q: "Are there any hidden charges?", a: "No. We maintain transparent pricing with no hidden fees." },
  { q: "What if a service partner damages something?", a: "Verified partners are responsible for damages caused due to negligence during service delivery." },
];

const supportServices = [
  { icon: "book_online", title: "Booking Assistance", desc: "New service bookings, booking modifications, service scheduling, and rescheduling requests." },
  { icon: "manage_accounts", title: "Account Support", desc: "Login issues, account management, profile updates, and password assistance." },
  { icon: "payments", title: "Payment Support", desc: "Payment confirmations, failed transactions, refund-related inquiries, and billing concerns." },
  { icon: "engineering", title: "Service Support", desc: "Service status updates, professional assignment inquiries, and special requests." },
  { icon: "rate_review", title: "Complaints & Feedback", desc: "Service quality concerns, customer experience feedback, conduct complaints, and suggestions." },
];

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">support_agent</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Contact Us</h1>
              <p className="mt-2 text-on-primary/70 text-sm">We&apos;re here to assist you with bookings, payments, and more.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12">
        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="mailto:phscustomercare15@gmail.com" className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group bg-white/70">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">email</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">Email Support</h3>
            <p className="text-sm text-primary font-medium group-hover:text-secondary transition-colors">phscustomercare15@gmail.com</p>
          </a>
          <a href="tel:+917408702019" className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group bg-white/70">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">phone</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">Phone Support</h3>
            <p className="text-sm text-primary font-medium group-hover:text-secondary transition-colors">+91 7408702019</p>
          </a>
        </div>

        {/* Business Information & Address */}
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <h2 className="text-xl font-bold text-on-surface mb-6">Business Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">business</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Company</p>
                <p className="text-sm text-on-surface font-medium">PHS Cleaning Company (Sole Proprietorship)</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">person</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Owner</p>
                <p className="text-sm text-on-surface font-medium">Pavan Kumar</p>
              </div>
            </div>
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">location_on</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Registered Address</p>
                <p className="text-sm text-on-surface font-medium leading-relaxed">
                  C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur Nagar, Uttar Pradesh – 208014, India
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">explore</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Service Area</p>
                <p className="text-sm text-on-surface font-medium">Kanpur Nagar, Uttar Pradesh, India</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Support Services List */}
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-6 text-center">How We Can Assist You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportServices.map((service) => (
              <div key={service.title} className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#059669] text-xl">{service.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-on-surface mb-2">{service.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{service.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Before Contacting Support Checklist */}
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">checklist</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface mb-2">Before Contacting Support</h2>
              <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                To help us resolve your query more efficiently, please keep the following information ready:
              </p>
              <ul className="space-y-2.5">
                {[
                  "For Existing Bookings: Booking ID, registered phone number, service address, and date.",
                  "For Payment Queries: Transaction reference number, payment screenshot, and Booking ID.",
                  "For Service Complaints: Booking details, description of the issue, and supporting photos if applicable."
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">help</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-on-surface mb-2">{faq.q}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Hours */}
        <div className="bg-primary rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-2xl">schedule</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-primary mb-1">Customer Support Hours</h3>
              <p className="text-on-primary/70 text-sm leading-relaxed">
                Our team is available <span className="text-secondary font-bold">9:00 AM - 8:00 PM (Monday - Sunday)</span> to help regarding bookings, payments, and service concerns. We make reasonable efforts to respond to customer inquiries as quickly as possible.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
