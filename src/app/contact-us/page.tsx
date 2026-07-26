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
  { title: "Booking Coordination", desc: "Assistance with placing bookings, scheduling, technician status, and rescheduling.", icon: "calendar_month" },
  { title: "Billing & Refund Disputes", desc: "Verification of payment status, invoices, GST breakdowns, and refund credits.", icon: "receipt_long" },
  { title: "Grievances & Quality", desc: "Submitting compliance reports, requesting re-service, and conduct feedback.", icon: "rate_review" },
  { title: "Account & Profile Queries", desc: "Assistance with customer profile editing, addresses, and data requests.", icon: "manage_accounts" },
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

      <main className="grow max-w-3xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 z-10">
        
        {/* Minimal Header */}
        <section className="pb-6 border-b border-outline-variant/10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">
            Contact Us
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant font-medium mt-1">
            Have questions or need assistance? Reach out to our dedicated support desk.
          </p>
        </section>

        {/* Contact Info Channels Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email Support Card */}
          <a
            href={`mailto:${helplineEmail}`}
            onClick={(e) => handleEmailClick(e, helplineEmail)}
            className="glass-panel rounded-3xl p-6 space-y-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">mail</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Email Support</h3>
                <span className="text-sm font-bold text-primary font-mono group-hover:text-secondary transition-colors block mt-0.5">
                  {helplineEmail}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider pl-13">
              Response window: 12-24 hours
            </p>
          </a>

          {/* Helpline Phone Card */}
          <a
            href={`tel:${helplinePhone}`}
            onClick={(e) => handlePhoneClick(e, helplinePhone)}
            className="glass-panel rounded-3xl p-6 space-y-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">call</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider">Helpline Phone</h3>
                <span className="text-sm font-bold text-primary font-mono group-hover:text-secondary transition-colors block mt-0.5">
                  +91 74087 02019
                </span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider pl-13">
              Available: 9:00 AM - 8:00 PM (IST)
            </p>
          </a>
        </section>

        {/* Business Identification */}
        <section className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold font-headline text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">domain</span>
            Business Identification
          </h2>
          <div className="grid grid-cols-1 gap-3 text-xs md:text-sm">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Entity Name</span>
              <span className="font-bold text-primary text-xs">PHS Cleaning Company (Sole Proprietorship)</span>
            </div>
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Proprietor Name</span>
              <span className="font-bold text-primary text-xs">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-2 gap-1 sm:gap-4">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider shrink-0">Registered Office</span>
              <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-md">
                C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014, India
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wider">Active Jurisdiction</span>
              <span className="font-bold text-primary text-xs">Kanpur Nagar, Uttar Pradesh, India</span>
            </div>
          </div>
        </section>

        {/* Grievance Officer details */}
        <section className="glass-panel rounded-3xl p-6 space-y-3 bg-linear-to-br from-primary/5 to-secondary/5">
          <h2 className="text-sm font-bold font-headline text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">shield_person</span>
            Grievance Redressal Officer
          </h2>
          <p className="text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed">
            In compliance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer details are listed below:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
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
                className="font-bold text-primary hover:text-secondary font-mono mt-0.5 block transition-colors"
              >
                {helplineEmail}
              </a>
              <p className="text-[10px] text-on-surface-variant font-semibold">C1-40, Gulmohar Vihar, Naubasta, Kanpur</p>
            </div>
          </div>
        </section>

        {/* Support Categories */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold font-headline text-primary flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-[#059669]">support</span>
            Structured Support Desks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {supportServices.map((service, idx) => (
              <div key={idx} className="glass-panel rounded-3xl p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] text-base drop-shadow-sm">{service.icon}</span>
                  </div>
                  <h3 className="text-xs font-bold text-primary font-headline">{service.title}</h3>
                </div>
                <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed font-semibold">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Info Required Checklist */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <h2 className="text-sm font-bold font-headline text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">rule</span>
            Information Required for Resolution
          </h2>
          <p className="text-xs text-on-surface-variant font-semibold leading-relaxed">
            Please maintain the following records when contacting us to help resolve your query efficiently:
          </p>
          <ul className="space-y-2.5 text-xs text-on-surface-variant font-semibold">
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Booking:</strong> 16-character Booking ID, service address, and registered mobile number.</span>
            </li>
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Billing & Refunds:</strong> UPI/Bank transaction reference ID, timestamp, and payment status.</span>
            </li>
            <li className="flex items-start gap-2 bg-surface-container/20 p-2 rounded-xl border border-outline-variant/10">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5"></span>
              <span><strong>Quality Compliance:</strong> Specific dissatisfaction, time of service, and photos of issues.</span>
            </li>
          </ul>
        </section>

        {/* FAQs - Collapsible Accordion (Shrinked styling) */}
        <section className="space-y-4 pt-4 border-t border-outline-variant/10">
          <h2 className="text-base font-bold text-primary font-headline text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#059669]">quiz</span>
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3 max-w-2xl mx-auto">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 border border-outline-variant/20 shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs md:text-sm text-primary font-headline hover:bg-surface-container-low transition-colors"
                  >
                    <span className="pr-4 leading-snug">{faq.q}</span>
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 text-lg ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  
                  {/* Expanded Content Area with smooth transition */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-48 border-t border-outline-variant/5' : 'max-h-0'
                    } overflow-hidden`}
                  >
                    <div className="p-4 text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed bg-surface-container-lowest/30">
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
