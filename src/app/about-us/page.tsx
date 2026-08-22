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
    icon: "assignment_turned_in",
    bg: "bg-blue-600",
    shadow: "shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
  },
  {
    title: "Vetted & Trained Professionals",
    desc: "All service professionals undergo background verification, identification checks, and practical training to ensure they meet our strict security, behavioral, and technical operational standards.",
    icon: "verified_user",
    bg: "bg-emerald-600",
    shadow: "shadow-[0_2px_8px_rgba(5,150,105,0.25)]"
  },
  {
    title: "Transparent & Upfront Pricing",
    desc: "We operate on a transparent pricing model. The base rates, material costs, and GST details are displayed upfront at booking time. We enforce a strict 'no hidden charges' policy.",
    icon: "payments",
    bg: "bg-amber-600",
    shadow: "shadow-[0_2px_8px_rgba(217,119,6,0.25)]"
  },
  {
    title: "Convenient Digital Bookings",
    desc: "Our responsive web and mobile application allow you to schedule appointments, select preferences, securely complete payments, and manage your service history with ease.",
    icon: "phone_android",
    bg: "bg-indigo-600",
    shadow: "shadow-[0_2px_8px_rgba(79,70,229,0.25)]"
  },
  {
    title: "Structured Grievance Support",
    desc: "Our customer support team is available during standard operating hours to manage reschedules, handle issues, and coordinate solutions for any service delivery concerns.",
    icon: "support_agent",
    bg: "bg-purple-600",
    shadow: "shadow-[0_2px_8px_rgba(147,51,234,0.25)]"
  },
  {
    title: "Accountability & Recourse",
    desc: "Because we manage the professionals directly, we provide structured dispute resolutions, including free re-service sessions and partial refunds for validated complaints.",
    icon: "gavel",
    bg: "bg-rose-600",
    shadow: "shadow-[0_2px_8px_rgba(225,29,72,0.25)]"
  },
];

const companyValues = [
  { title: "Customer Centricity", desc: "Every service protocol is optimized to prioritize customer comfort, safety, and property preservation.", icon: "person_celebrate", bg: "bg-rose-500" },
  { title: "Corporate Integrity", desc: "We commit to honest communication, legal compliance, fair wages for our professionals, and transparent pricing.", icon: "handshake", bg: "bg-blue-600" },
  { title: "Dependability", desc: "We respect your time. Our system is engineered for prompt arrivals, predictable timelines, and consistent results.", icon: "schedule", bg: "bg-emerald-600" },
  { title: "Service Excellence", desc: "We continually test new cleaning products, update standard operating procedures, and refine our service guidelines.", icon: "workspace_premium", bg: "bg-amber-500" },
  { title: "Mutual Respect", desc: "We foster an ecosystem of respect and dignity between our customers, administrative staff, and service professionals.", icon: "diversity_3", bg: "bg-purple-600" },
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

      <main className="grow max-w-3xl w-full mx-auto px-4 py-4 md:py-6 space-y-5 md:space-y-6 z-10">
        
        {/* Minimal Compact Header */}
        <section className="flex items-center gap-3.5 pb-3 border-b border-outline-variant/10">
          <div className="w-12 h-12 rounded-2xl border border-outline-variant/20 flex items-center justify-center shrink-0 overflow-hidden bg-surface-container-lowest p-1.5 shadow-sm">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              width={40}
              height={40}
              className="rounded-lg object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight font-headline text-primary leading-tight">
              About PHS Cleaning Company
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mt-0.5">
              Premium Home Services · Kanpur, India
            </p>
          </div>
        </section>

        {/* Business & Purpose / Legal Identity */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2.5 text-primary font-bold text-sm">
              <div className="w-8 h-8 bg-linear-to-br from-primary to-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,34,97,0.2)]">
                <span className="material-symbols-outlined text-white text-base">domain</span>
              </div>
              <h2 className="font-headline text-xs md:text-sm">Our Business & Purpose</h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Founded to elevate and organize the local home services sector, <strong>PHS Cleaning Company</strong> is Kanpur&apos;s premier service operation. We specialize in providing direct doorstep deep cleaning, sanitization, and technical repairs. By owning the full booking and dispatch lifecycle, we eliminate unreliable scheduling, hidden costs, and lack of accountability.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2.5 text-primary font-bold text-sm">
              <div className="w-8 h-8 bg-linear-to-br from-slate-700 to-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,34,97,0.2)]">
                <span className="material-symbols-outlined text-white text-base">gavel</span>
              </div>
              <h2 className="font-headline text-xs md:text-sm">Legal Identity & Structure</h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              <strong>PHS Cleaning Company</strong> is a legally registered Sole Proprietorship established under Indian laws, owned and operated exclusively by <strong>Pavan Kumar</strong>.
              Unlike standard aggregator platforms, we act as the primary service provider, maintaining direct oversight, training, and accountability for every assigned professional.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-outline-variant/10 pb-3 sm:pb-0 sm:pr-5">
            <div className="flex items-center gap-2.5 text-primary font-bold text-xs md:text-sm">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(5,150,105,0.3)]">
                <span className="material-symbols-outlined text-white text-sm">rocket_launch</span>
              </div>
              <h3 className="font-headline">Our Mission</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              To establish Kanpur&apos;s most dependable, transparent, and structured doorstep cleaning network, empowering skilled local professionals with fair opportunities while delivering top-tier maintenance solutions.
            </p>
          </div>
          <div className="space-y-2 sm:pl-1">
            <div className="flex items-center gap-2.5 text-primary font-bold text-xs md:text-sm">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(37,99,235,0.3)]">
                <span className="material-symbols-outlined text-white text-sm">visibility</span>
              </div>
              <h3 className="font-headline">Our Vision</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              To set the industry benchmark for doorstep maintenance operations in Uttar Pradesh, recognized for strict quality controls, robust data safety, and verified worker safety protocols.
            </p>
          </div>
        </section>

        {/* Core Offerings */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(13,148,136,0.25)]">
              <span className="material-symbols-outlined text-white text-base">design_services</span>
            </div>
            Our Core Offerings
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-on-surface-variant">
            {serviceItems.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5 bg-surface-container/30 px-3 py-2 rounded-xl border border-outline-variant/10">
                <span className="w-6 h-6 bg-emerald-500/10 rounded-md flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-sm">{item.icon}</span>
                </span>
                <span className="font-semibold text-on-surface-variant">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Why Trust Us */}
        <section className="space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 bg-linear-to-br from-emerald-600 to-teal-700 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(5,150,105,0.25)]">
              <span className="material-symbols-outlined text-white text-base">verified</span>
            </div>
            Why Customers Trust PHS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whyChooseUs.map((item, idx) => (
              <div key={idx} className="glass-panel rounded-2xl p-4 space-y-1.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 ${item.bg} ${item.shadow} rounded-xl flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white text-base drop-shadow-xs">{item.icon}</span>
                  </div>
                  <h3 className="text-xs font-bold text-primary font-headline">{item.title}</h3>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-semibold">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Core Values */}
        <section className="space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 bg-linear-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(244,63,94,0.25)]">
              <span className="material-symbols-outlined text-white text-base">favorite</span>
            </div>
            Our Core Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {companyValues.map((val, idx) => (
              <div key={idx} className="glass-panel rounded-2xl p-3.5 space-y-1.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 ${val.bg} rounded-lg flex items-center justify-center shrink-0 shadow-xs`}>
                    <span className="material-symbols-outlined text-white text-sm">{val.icon}</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-primary font-headline">{val.title}</h4>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed font-semibold">{val.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Delivery Coverage */}
        <section className="p-4 sm:p-5 bg-linear-to-br from-primary/5 to-secondary/5 rounded-2xl border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
              <div className="w-8 h-8 bg-linear-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(79,70,229,0.25)]">
                <span className="material-symbols-outlined text-white text-base">my_location</span>
              </div>
              Service Delivery Area
            </h3>
            <p className="text-xs text-on-surface-variant font-semibold">
              We deliver doorstep services exclusively to properties located within:
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-secondary text-primary font-bold text-xs rounded-full font-headline tracking-wide uppercase shrink-0 shadow-xs">
            Kanpur Nagar, UP, India
          </span>
        </section>

        {/* Corporate Office & Contacts */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-slate-800 to-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,34,97,0.2)]">
              <span className="material-symbols-outlined text-white text-base">contact_mail</span>
            </div>
            Corporate Office & Contacts
          </h2>
          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-1.5">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Business Entity</span>
              <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-1.5">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Owner / Proprietor</span>
              <span className="font-bold text-primary text-xs">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-1.5 gap-1 sm:gap-4">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider shrink-0">Registered Office</span>
              <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-md">
                C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-1.5">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Helpline Email</span>
              <a
                href={`mailto:${helplineEmail}`}
                onClick={(e) => handleEmailClick(e, helplineEmail)}
                className="text-primary hover:text-secondary font-bold text-xs font-mono transition-colors"
              >
                {helplineEmail}
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Helpline Phone</span>
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
