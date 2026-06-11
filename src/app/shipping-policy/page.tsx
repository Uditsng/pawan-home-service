import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Shipping Policy | PHS Cleaning Company",
  description: "Read the Shipping and Service Delivery Policy for PHS Cleaning Company.",
};

const sections = [
  {
    icon: "info",
    title: "1. Service-Based Operations",
    content: "PHS Cleaning Company provides professional home cleaning, repairs, and maintenance services directly at the customer's specified service location (doorstep). Because we do not sell or ship physical products, a traditional shipping policy for physical goods is not applicable to our business operations."
  },
  {
    icon: "location_on",
    title: "2. Service Delivery Area",
    content: "All services booked on our platform are delivered directly on-site at the address provided by the customer during the booking process. Currently, PHS Cleaning Company provides services exclusively within Kanpur Nagar, Uttar Pradesh, India."
  },
  {
    icon: "local_shipping",
    title: "3. No Physical Shipping of Goods",
    content: "We do not dispatch, ship, or deliver any physical items, products, packages, or equipment to your address via postal services, couriers, or logistics partners. Any cleaning agents, tools, or repair machinery required for the completion of the service are brought directly by our assigned service professionals at the scheduled appointment time."
  },
  {
    icon: "schedule",
    title: "4. Scheduling & Service Delivery Window",
    content: "Service delivery occurs within the date and time window selected by the customer and confirmed by PHS Cleaning Company. Our professionals strive to arrive promptly. Any delays caused by traffic, weather, or operational constraints will be communicated to the customer in advance."
  }
];

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">local_shipping</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Shipping Policy</h1>
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
              </div>
            </div>
          </div>
        ))}

        {/* Contact Information */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">contact_support</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-on-surface mb-2">5. Contact Information</h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                If you have questions regarding doorstep service delivery, scheduling, or operational coverage, please contact support:
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
