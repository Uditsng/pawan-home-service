"use client";

import Image from "next/image";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

const serviceItems = [
  { text: "Comprehensive Home Deep Cleaning", icon: "clean_hands" },
  { text: "Kitchen & Appliance Deep Cleaning", icon: "countertops" },
  { text: "Bathroom Sanitization & Cleaning", icon: "bathtub" },
  { text: "Sofa, Carpet & Upholstery Shampooing", icon: "chair" },
  { text: "Room & Specialized Area Cleaning", icon: "bedroom_parent" },
  { text: "Floor Scrubbing & Polishing Services", icon: "layers" },
  { text: "Residential & Post-Renovation Cleaning", icon: "home" },
  { text: "Commercial & Office Space Maintenance", icon: "corporate_fare" },
  { text: "Customized & Seasonal Cleaning Packages", icon: "package_2" },
];

const whyChooseUs = [
  {
    title: "Direct Service Ownership",
    desc: "Unlike standard third-party listing marketplaces, we are the direct service provider. We own the booking lifecycle, schedule the jobs, assign trained personnel, and stand fully accountable for the quality of the work delivered.",
    icon: "assignment_turned_in"
  },
  {
    title: "Vetted & Trained Professionals",
    desc: "All service professionals undergo background verification, identification checks, and practical training to ensure they meet our strict security, behavioral, and technical operational standards.",
    icon: "verified_user"
  },
  {
    title: "Transparent & Upfront Pricing",
    desc: "We operate on a transparent pricing model. The base rates, material costs, and GST details are displayed upfront at booking time. We enforce a strict 'no hidden charges' policy.",
    icon: "payments"
  },
  {
    title: "Convenient Digital Bookings",
    desc: "Our responsive web and mobile application allow you to schedule appointments, select preferences, securely complete payments, and manage your service history with ease.",
    icon: "phone_android"
  },
  {
    title: "Structured Grievance Support",
    desc: "Our customer support team is available during standard operating hours to manage reschedules, handle issues, and coordinate solutions for any service delivery concerns.",
    icon: "support_agent"
  },
  {
    title: "Accountability & Recourse",
    desc: "Because we manage the professionals directly, we provide structured dispute resolutions, including free re-service sessions and partial refunds for validated complaints.",
    icon: "gavel"
  },
];

const companyValues = [
  { title: "Customer Centricity", desc: "Every service protocol is optimized to prioritize customer comfort, safety, and property preservation.", icon: "person_celebrate" },
  { title: "Corporate Integrity", desc: "We commit to honest communication, legal compliance, fair wages for our professionals, and transparent pricing.", icon: "handshake" },
  { title: "Dependability", desc: "We respect your time. Our system is engineered for prompt arrivals, predictable timelines, and consistent results.", icon: "schedule" },
  { title: "Service Excellence", desc: "We continually test new cleaning products, update standard operating procedures, and refine our service guidelines.", icon: "workspace_premium" },
  { title: "Mutual Respect", desc: "We foster an ecosystem of respect and dignity between our customers, administrative staff, and service professionals.", icon: "diversity_3" },
];

export default function AboutUsPage() {
  const helplinePhone = "+917408702019";
  const helplineEmail = "phscustomercare15@gmail.com";

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface relative overflow-hidden flex flex-col">
      <Header />
      
      {/* Background Decorative Ambient Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <main className="grow max-w-3xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 z-10">
        
        {/* Minimal Compact Header */}
        <section className="flex items-center gap-4 pb-6 border-b border-outline-variant/10">
          <div className="w-14 h-14 rounded-2xl border border-outline-variant/20 flex items-center justify-center shrink-0 overflow-hidden bg-surface-container-lowest p-2 shadow-sm">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary leading-tight">
              About PHS Cleaning Company
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mt-0.5">
              Premium Home Services · Kanpur, India
            </p>
          </div>
        </section>

        {/* Business & Purpose / Legal Identity */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-base">
              <span className="material-symbols-outlined text-[#059669]">domain</span>
              <h2 className="font-headline">Our Business & Purpose</h2>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-medium">
              Founded to elevate and organize the local home services sector, <strong>PHS Cleaning Company</strong> is Kanpur&apos;s premier service operation. We specialize in providing direct doorstep deep cleaning, sanitization, and technical repairs. By owning the full booking and dispatch lifecycle, we eliminate unreliable scheduling, hidden costs, and lack of accountability.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-base">
              <span className="material-symbols-outlined text-[#059669]">gavel</span>
              <h2 className="font-headline">Legal Identity & Structure</h2>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-medium">
              <strong>PHS Cleaning Company</strong> is a legally registered Sole Proprietorship established under Indian laws, owned and operated exclusively by <strong>Pavan Kumar</strong>.
              Unlike standard aggregator platforms, we act as the primary service provider, maintaining direct oversight, training, and accountability for every assigned professional.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="glass-panel rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-outline-variant/10 pb-4 sm:pb-0 sm:pr-6">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span className="material-symbols-outlined text-[#059669] text-xl">rocket_launch</span>
              <h3 className="font-headline">Our Mission</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              To establish Kanpur&apos;s most dependable, transparent, and structured doorstep cleaning network, empowering skilled local professionals with fair opportunities while delivering top-tier maintenance solutions.
            </p>
          </div>
          <div className="space-y-2 sm:pl-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span className="material-symbols-outlined text-[#059669] text-xl">visibility</span>
              <h3 className="font-headline">Our Vision</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              To set the industry benchmark for doorstep maintenance operations in Uttar Pradesh, recognized for strict quality controls, robust data safety, and verified worker safety protocols.
            </p>
          </div>
        </section>

        {/* Core Offerings */}
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold font-headline text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">design_services</span>
            Our Core Offerings
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
            {serviceItems.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 bg-surface-container/30 px-3 py-2 rounded-xl border border-outline-variant/10">
                <span className="material-symbols-outlined text-[#059669] text-lg">{item.icon}</span>
                <span className="font-semibold text-on-surface-variant">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Why Trust Us */}
        <section className="space-y-4">
          <h2 className="text-base font-bold font-headline text-primary flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-[#059669]">verified</span>
            Why Customers Trust PHS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whyChooseUs.map((item, idx) => (
              <div key={idx} className="glass-panel rounded-3xl p-5 space-y-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] text-lg drop-shadow-sm">{item.icon}</span>
                  </div>
                  <h3 className="text-xs font-bold text-primary font-headline">{item.title}</h3>
                </div>
                <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed font-semibold">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Core Values */}
        <section className="space-y-4">
          <h2 className="text-base font-bold font-headline text-primary flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-[#059669]">favorite</span>
            Our Core Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {companyValues.map((val, idx) => (
              <div key={idx} className="glass-panel rounded-3xl p-4 space-y-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] text-base">{val.icon}</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-primary font-headline">{val.title}</h4>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed font-semibold">{val.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Delivery Coverage */}
        <section className="p-5 bg-linear-to-br from-primary/5 to-secondary/5 rounded-3xl border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[#059669] text-xl">my_location</span>
              Service Delivery Area
            </h3>
            <p className="text-xs text-on-surface-variant font-semibold">
              We deliver doorstep services exclusively to properties located within:
            </p>
          </div>
          <span className="px-4 py-2 bg-secondary text-primary font-bold text-xs rounded-full font-headline tracking-wide uppercase shrink-0 shadow-sm">
            Kanpur Nagar, UP, India
          </span>
        </section>

        {/* Corporate Office & Contacts */}
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold font-headline text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">contact_mail</span>
            Corporate Office & Contacts
          </h2>
          <div className="grid grid-cols-1 gap-3 text-xs md:text-sm">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Business Entity</span>
              <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Owner / Proprietor</span>
              <span className="font-bold text-primary text-xs">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-2 gap-1 sm:gap-4">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider shrink-0">Registered Office</span>
              <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-md">
                C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Helpline Email</span>
              <a
                href={`mailto:${helplineEmail}`}
                onClick={(e) => handleEmailClick(e, helplineEmail)}
                className="text-primary hover:text-secondary font-bold text-xs font-mono transition-colors"
              >
                {helplineEmail}
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Helpline Phone</span>
              <a
                href={`tel:${helplinePhone}`}
                onClick={(e) => handlePhoneClick(e, helplinePhone)}
                className="text-primary hover:text-secondary font-bold text-xs font-mono transition-colors"
              >
                +91 74087 02019
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
