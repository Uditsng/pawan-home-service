import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Help & Support | PHS Cleaning Company",
  description: "Get help with bookings, payments, partner support, and more at PHS Cleaning Company.",
};

const faqs = [
  { q: "How do I book a service?", a: "Select your desired service, choose a suitable time slot, complete the payment, and confirm your booking." },
  { q: "How do I join as a service partner?", a: "Register on the platform → Complete verification → Start receiving jobs." },
  { q: "Are service partners verified?", a: "Yes, all partners go through a verification process before approval." },
  { q: "Can I reschedule my booking?", a: "Yes, rescheduling is allowed based on partner availability." },
  { q: "Are there any hidden charges?", a: "No. We maintain transparent pricing with no hidden fees." },
  { q: "What if a service partner damages something?", a: "Verified partners are responsible for damages caused due to negligence during service delivery." },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">support_agent</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Help & Support</h1>
              <p className="mt-2 text-on-primary/70 text-sm">We&apos;re here to assist you with bookings, payments, and more.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <a href="mailto:pavanhomess@gmail.com" className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">email</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">Email Support</h3>
            <p className="text-sm text-primary font-medium group-hover:text-secondary transition-colors">pavanhomess@gmail.com</p>
          </a>
          <a href="tel:9648801462" className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">phone</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">Phone Support</h3>
            <p className="text-sm text-primary font-medium group-hover:text-secondary transition-colors">7408702019</p>
          </a>
        </div>

        {/* FAQs */}
        <h2 className="text-2xl font-bold text-on-surface mb-6">Frequently Asked Questions</h2>
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

        {/* Support Hours */}
        <div className="mt-12 bg-primary rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-2xl">schedule</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-primary mb-1">Support Hours</h3>
              <p className="text-on-primary/70 text-sm leading-relaxed">Our support team is available to help customers and partners regarding bookings, payments, and service concerns.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
