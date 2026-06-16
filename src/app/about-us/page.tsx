import Image from "next/image";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | PHS Cleaning Company",
  description: "Learn about PHS Cleaning Company — Kanpur's trusted doorstep provider of professional home cleaning, deep cleaning, and service solutions. Owned and operated by Pavan Kumar.",
};

const serviceItems = [
  "Comprehensive Home Deep Cleaning",
  "Kitchen & Appliance Deep Cleaning",
  "Bathroom Sanitization & Cleaning",
  "Sofa, Carpet & Upholstery Shampooing",
  "Room & Specialized Area Cleaning",
  "Floor Scrubbing & Polishing Services",
  "Residential Cleaning & Post-Renovation Cleaning",
  "Commercial & Office Space Maintenance",
  "Customized & Seasonal Cleaning Packages",
];

const whyChooseUs = [
  {
    title: "Direct Service Ownership",
    desc: "Unlike standard third-party listing marketplaces, we are the direct service provider. We own the booking lifecycle, schedule the jobs, assign trained personnel, and stand fully accountable for the quality of the work delivered.",
  },
  {
    title: "Vetted & Trained Professionals",
    desc: "All service professionals undergo background verification, identification checks, and practical training to ensure they meet our strict security, behavioral, and technical operational standards.",
  },
  {
    title: "Transparent & Upfront Pricing",
    desc: "We operate on a transparent pricing model. The base rates, material costs, and GST details are displayed upfront at booking time. We enforce a strict 'no hidden charges' policy.",
  },
  {
    title: "Convenient Digital Bookings",
    desc: "Our responsive web and mobile application allow you to schedule appointments, select preferences, securely complete payments, and manage your service history with ease.",
  },
  {
    title: "Structured Grievance Support",
    desc: "Our customer support team is available during standard operating hours to manage reschedules, handle issues, and coordinate solutions for any service delivery concerns.",
  },
  {
    title: "Accountability & Recourse",
    desc: "Because we manage the professionals directly, we provide structured dispute resolutions, including free re-service sessions and partial refunds for validated complaints.",
  },
];

const companyValues = [
  { title: "Customer Centricity", desc: "Every service protocol is optimized to prioritize customer comfort, safety, and property preservation." },
  { title: "Corporate Integrity", desc: "We commit to honest communication, legal compliance, fair wages for our professionals, and transparent pricing." },
  { title: "Dependability", desc: "We respect your time. Our system is engineered for prompt arrivals, predictable timelines, and consistent results." },
  { title: "Service Excellence", desc: "We continually test new cleaning products, update standard operating procedures, and refine our service guidelines." },
  { title: "Mutual Respect", desc: "We foster an ecosystem of respect and dignity between our customers, administrative staff, and service professionals." },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-outline-variant/20 flex items-center justify-center shrink-0 overflow-hidden bg-white p-1">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight font-headline">
              About PHS Cleaning Company
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant/50 mt-1">
              Established in Kanpur, India
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Our Business & Purpose */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-headline tracking-tight">Our Business & Purpose</h2>
          <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
            Founded with the vision of formalizing and elevating the unorganized home maintenance sector, <strong>PHS Cleaning Company</strong> has established itself as Kanpur&apos;s premier service operation. We specialize in providing specialized deep cleaning, sanitization, and technical repair services directly at the doorstep of residential and commercial properties. We resolve the core challenges of the local service industry—unreliable scheduling, lack of accountability, and volatile pricing—by offering a fully structured, digital booking experience managed entirely by our dedicated operations desk.
          </p>
        </section>

        {/* Legal Identity & Structure */}
        <section className="space-y-4 pt-6 border-t border-outline-variant/10">
          <h2 className="text-xl font-bold font-headline tracking-tight">Legal Identity & Structure</h2>
          <div className="space-y-3 text-sm md:text-base text-on-surface-variant leading-relaxed">
            <p>
              <strong>PHS Cleaning Company</strong> is a legally registered Sole Proprietorship business established under the laws of India, owned and operated exclusively by <strong>Pavan Kumar</strong>.
            </p>
            <p>
              Unlike standard aggregator platforms that function as digital bulletin boards or marketplaces, PHS Cleaning Company acts as the primary service provider. We maintain direct oversight over the entire operation. We source, vet, train, assign, and equip the professionals who visit your premises. 
            </p>
            <p>
              This operational model ensures that we maintain complete accountability for service fulfillment, worker behavior, safety standards, and post-service customer resolutions.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-outline-variant/10">
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-headline">Our Mission</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              To establish Kanpur&apos;s most dependable, transparent, and structured doorstep cleaning service network, empowering skilled local professionals with fair work opportunities while delivering high-caliber sanitization and maintenance solutions to households and offices.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-headline">Our Vision</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              To set the industry benchmark for doorstep maintenance operations in Uttar Pradesh, recognized for strict service quality controls, robust data safety, customer-first grievance resolutions, and verified worker safety protocols.
            </p>
          </div>
        </section>

        {/* Core Offerings */}
        <section className="space-y-4 pt-6 border-t border-outline-variant/10">
          <h2 className="text-xl font-bold font-headline tracking-tight">Our Core Offerings</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-on-surface-variant">
            {serviceItems.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Why Choose Us */}
        <section className="space-y-6 pt-6 border-t border-outline-variant/10">
          <h2 className="text-xl font-bold font-headline tracking-tight">Why Customers Trust PHS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {whyChooseUs.map((item) => (
              <div key={item.title} className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface font-headline">{item.title}</h3>
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Core Values */}
        <section className="space-y-6 pt-6 border-t border-outline-variant/10">
          <h2 className="text-xl font-bold font-headline tracking-tight">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companyValues.map((val) => (
              <div key={val.title} className="space-y-1">
                <h4 className="text-sm font-bold text-on-surface font-headline">{val.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-medium">{val.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Delivery Coverage */}
        <section className="p-6 bg-surface-container/30 rounded-xl border border-outline-variant/10 space-y-2">
          <h3 className="text-base font-bold font-headline text-on-surface">Service Delivery Coverage</h3>
          <p className="text-xs text-on-surface-variant font-medium">
            We deliver doorstep services exclusively to properties located within:
          </p>
          <p className="text-secondary font-bold text-sm font-headline uppercase tracking-wider">Kanpur Nagar, Uttar Pradesh, India</p>
        </section>

        {/* Corporate Office & Contacts */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-xl font-bold font-headline tracking-tight">Corporate Office & Contacts</h2>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Business Entity</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company (Sole Proprietorship)</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Proprietor / Owner</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Registered Office Address</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0 text-left sm:text-right max-w-md">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Correspondence Email</span>
              <a href="mailto:phscustomercare15@gmail.com" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">phscustomercare15@gmail.com</a>
            </div>
            <div className="flex flex-col sm:flex-row justify-between pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Helpline Number</span>
              <a href="tel:+917408702019" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">+91 7408702019</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
