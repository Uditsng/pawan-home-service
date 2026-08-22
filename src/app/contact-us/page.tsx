"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

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
  { title: "Booking Coordination", desc: "Assistance with placing bookings, scheduling, technician status, and rescheduling.", icon: "calendar_month", bg: "bg-blue-600", shadow: "shadow-[0_2px_8px_rgba(37,99,235,0.25)]" },
  { title: "Billing & Refund Disputes", desc: "Verification of payment status, invoices, GST breakdowns, and refund credits.", icon: "receipt_long", bg: "bg-emerald-600", shadow: "shadow-[0_2px_8px_rgba(5,150,105,0.25)]" },
  { title: "Grievances & Quality", desc: "Submitting compliance reports, requesting re-service, and conduct feedback.", icon: "rate_review", bg: "bg-amber-600", shadow: "shadow-[0_2px_8px_rgba(217,119,6,0.25)]" },
  { title: "Account & Profile Queries", desc: "Assistance with customer profile editing, addresses, and data requests.", icon: "manage_accounts", bg: "bg-purple-600", shadow: "shadow-[0_2px_8px_rgba(147,51,234,0.25)]" },
];

export default function ContactUsPage() {
  const helplinePhone = "+917408702019";
  const helplineEmail = "phscustomercare15@gmail.com";
  
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface relative overflow-hidden flex flex-col">
      <Header />

      {/* Background Decorative Ambient Blobs */}
      <div className="absolute top-24 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-24 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <main className="grow max-w-3xl w-full mx-auto px-4 py-4 md:py-6 space-y-5 md:space-y-6 z-10">
        
        {/* Minimal Header */}
        <section className="pb-3 border-b border-outline-variant/10">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-headline text-primary">
            Contact Us
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            Have questions or need assistance? Reach out to our dedicated support desk.
          </p>
        </section>

        {/* Contact Info Channels Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {/* WhatsApp Support Card */}
          <a
            href="https://wa.me/917408702019?text=Hello%20PHS%20Support%2C%20I%20need%20assistance"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel rounded-2xl p-4 space-y-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group block border border-emerald-500/20 bg-linear-to-br from-emerald-500/5 to-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,211,102,0.3)] group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">WhatsApp Chat</h3>
                <span className="text-xs sm:text-sm font-bold text-primary font-mono group-hover:text-[#128C7E] transition-colors block mt-0.5 truncate">
                  Instant Support
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 font-bold uppercase tracking-wider pl-13 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
              Fastest Response
            </p>
          </a>

          {/* Helpline Phone Card */}
          <a
            href={`tel:${helplinePhone}`}
            onClick={(e) => handlePhoneClick(e, helplinePhone)}
            className="glass-panel rounded-2xl p-4 space-y-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group block border border-blue-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-white text-xl">call</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Helpline Phone</h3>
                <span className="text-xs sm:text-sm font-bold text-primary font-mono group-hover:text-blue-600 transition-colors block mt-0.5 truncate">
                  +91 74087 02019
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider pl-13">
              9:00 AM - 8:00 PM IST
            </p>
          </a>

          {/* Email Support Card */}
          <a
            href={`mailto:${helplineEmail}`}
            onClick={(e) => handleEmailClick(e, helplineEmail)}
            className="glass-panel rounded-2xl p-4 space-y-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group block border border-rose-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-white text-xl">mail</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Email Desk</h3>
                <span className="text-[11px] sm:text-xs font-bold text-primary font-mono group-hover:text-rose-600 transition-colors block mt-0.5 truncate">
                  {helplineEmail}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider pl-13">
              12-24 Hours Window
            </p>
          </a>
        </section>

        {/* Business Identification */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-primary to-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,34,97,0.2)]">
              <span className="material-symbols-outlined text-white text-base">domain</span>
            </div>
            Business Identification
          </h2>
          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-1.5">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Entity Name</span>
              <span className="font-bold text-primary text-xs">PHS Cleaning Company (Sole Proprietorship)</span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-1.5">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Proprietor Name</span>
              <span className="font-bold text-primary text-xs">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-1.5 gap-1 sm:gap-4">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider shrink-0">Registered Office</span>
              <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-md">
                C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014, India
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Active Jurisdiction</span>
              <span className="font-bold text-primary text-xs">Kanpur Nagar, Uttar Pradesh, India</span>
            </div>
          </div>
        </section>

        {/* Grievance Officer details */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-2.5 bg-linear-to-br from-primary/5 to-secondary/5">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(147,51,234,0.25)]">
              <span className="material-symbols-outlined text-white text-base">shield_person</span>
            </div>
            Grievance Redressal Officer
          </h2>
          <p className="text-[10px] md:text-[11px] text-on-surface-variant font-semibold leading-relaxed">
            In compliance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="bg-surface-container-lowest/60 p-3 rounded-xl border border-outline-variant/10">
              <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Name & Designation</p>
              <p className="font-bold text-primary mt-0.5">Pavan Kumar</p>
              <p className="text-[10px] text-on-surface-variant font-semibold">Grievance & Compliance Officer</p>
            </div>
            <div className="bg-surface-container-lowest/60 p-3 rounded-xl border border-outline-variant/10">
              <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Contact Details</p>
              <a
                href={`mailto:${helplineEmail}`}
                onClick={(e) => handleEmailClick(e, helplineEmail)}
                className="font-bold text-primary hover:text-secondary font-mono mt-0.5 block transition-colors text-xs truncate"
              >
                {helplineEmail}
              </a>
              <p className="text-[10px] text-on-surface-variant font-semibold">C1-40, Gulmohar Vihar, Naubasta, Kanpur</p>
            </div>
          </div>
        </section>

        {/* Support Categories */}
        <section className="space-y-3">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(13,148,136,0.25)]">
              <span className="material-symbols-outlined text-white text-base">headset_mic</span>
            </div>
            Structured Support Desks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supportServices.map((service, idx) => (
              <div key={idx} className="glass-panel rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 ${service.bg} ${service.shadow} rounded-xl flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white text-base drop-shadow-xs">{service.icon}</span>
                  </div>
                  <h3 className="text-xs font-bold text-primary font-headline">{service.title}</h3>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-semibold">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Info Required Checklist */}
        <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-2.5">
          <h2 className="text-xs md:text-sm font-bold font-headline text-primary flex items-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(217,119,6,0.25)]">
              <span className="material-symbols-outlined text-white text-base">checklist</span>
            </div>
            Information Required for Resolution
          </h2>
          <p className="text-[11px] text-on-surface-variant font-semibold leading-relaxed">
            Please keep the following details ready when reaching out for faster resolution:
          </p>
          <ul className="space-y-2 text-xs text-on-surface-variant font-semibold">
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Booking:</strong> 16-character Booking ID, service address, and registered phone number.</span>
            </li>
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Billing & Refunds:</strong> UPI/Bank transaction reference ID, timestamp, and receipt.</span>
            </li>
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Quality Compliance:</strong> Details of issue, time of service, and photos if applicable.</span>
            </li>
          </ul>
        </section>

        {/* FAQs - Collapsible Accordion */}
        <section className="space-y-3 pt-3 border-t border-outline-variant/10">
          <h2 className="text-sm md:text-base font-bold text-primary font-headline text-center flex items-center justify-center gap-2.5">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.25)]">
              <span className="material-symbols-outlined text-white text-base">quiz</span>
            </div>
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-2.5 max-w-2xl mx-auto">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="glass-panel rounded-xl overflow-hidden transition-all duration-300 border border-outline-variant/20 shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs text-primary font-headline hover:bg-surface-container-low transition-colors"
                  >
                    <span className="pr-4 leading-snug">{faq.q}</span>
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 text-base ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  
                  {/* Expanded Content Area */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-48 border-t border-outline-variant/5' : 'max-h-0'
                    } overflow-hidden`}
                  >
                    <div className="p-3.5 text-[11px] text-on-surface-variant font-semibold leading-relaxed bg-surface-container-lowest/30">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
