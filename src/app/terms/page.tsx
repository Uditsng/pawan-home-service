import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | PHS Cleaning Company",
  description:
    "Read the Terms of Service for PHS Cleaning Company. Understand your rights and responsibilities when using our platform.",
};

const sections = [
  {
    icon: "handshake",
    title: "Acceptance of Terms",
    content:
      "By accessing or using PHS Cleaning Company, you agree to comply with these Terms of Service.",
  },
  {
    icon: "event_note",
    title: "Service Booking",
    content:
      "Users can book services through our platform using online payment methods. Advance payment may be required before service confirmation.",
  },
  {
    icon: "assignment_ind",
    title: "User Responsibilities",
    content: "Users agree to:",
    list: [
      "Provide accurate information",
      "Maintain respectful behavior with service partners",
      "Ensure safe access to the service location",
      "Avoid misuse or fraudulent activities",
    ],
  },
  {
    icon: "verified",
    title: "Partner Verification",
    content:
      "All service partners undergo a verification process before joining the platform. However, service quality may vary depending on the nature of the work.",
  },
  {
    icon: "schedule",
    title: "Rescheduling Policy",
    content: "Customers may request rescheduling based on partner availability.",
  },
  {
    icon: "block",
    title: "Cancellation Policy",
    content: "Once a booking is confirmed, cancellations are not permitted.",
  },
  {
    icon: "report_problem",
    title: "Damage Liability",
    content:
      "Partners are responsible for damages caused directly due to negligence during service delivery.",
  },
  {
    icon: "gavel",
    title: "Fraud & Misconduct",
    content:
      "Any fraudulent activity, abuse, fake bookings, or misconduct may result in account suspension or legal action.",
  },
  {
    icon: "policy",
    title: "Limitation of Liability",
    content:
      "PHS Cleaning Company acts as a service platform connecting customers and service providers. We are not liable for indirect losses, delays, or circumstances beyond reasonable control.",
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">description</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">
                Terms of Service
              </h1>
              <p className="mt-2 text-on-primary/70 text-sm">
                Last updated: May 2026
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={section.title}
              className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">
                    {section.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-lg font-bold text-on-surface">{section.title}</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{section.content}</p>
                  {section.list && (
                    <ul className="mt-3 space-y-2">
                      {section.list.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">
                            check_circle
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
