import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | PHS Company",
  description: "Read the Terms & Conditions for using the PHS Company platform.",
};

const sections = [
  { icon: "sell", title: "Pricing Policy", content: "All service prices are displayed transparently. No hidden charges will be added without customer approval." },
  { icon: "credit_card", title: "Advance Payment", content: "Certain services require advance online payment for booking confirmation." },
  { icon: "event_available", title: "Service Availability", content: "Services are subject to availability based on partner location, workload, and operational conditions." },
  { icon: "schedule", title: "Rescheduling", content: "Customers may request service rescheduling before the assigned service time." },
  { icon: "currency_rupee", title: "Refund Policy", content: "Refund requests will be reviewed only in exceptional circumstances where services could not be delivered due to platform-side issues." },
  { icon: "engineering", title: "Partner Rights", content: "Service partners may accept or reject jobs based on availability, location, or operational constraints." },
];

const platformRights = [
  "Modify pricing",
  "Update policies",
  "Suspend accounts involved in suspicious activities",
  "Refuse services in unsafe conditions",
];

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">gavel</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Terms & Conditions</h1>
              <p className="mt-2 text-on-primary/70 text-sm">Last updated: May 2026</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-4">
        {sections.map((s, i) => (
          <div key={s.title} className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">{s.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="text-lg font-bold text-on-surface">{s.title}</h2>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{s.content}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Platform Rights */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">admin_panel_settings</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">07</span>
                <h2 className="text-lg font-bold text-on-surface">Platform Rights</h2>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">PHS Company reserves the right to:</p>
              <ul className="space-y-2">
                {platformRights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
