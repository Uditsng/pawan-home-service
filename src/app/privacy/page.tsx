import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Pavan Home Solutions",
  description: "How Pavan Home Solutions collects, uses, and protects your personal information.",
};

const sections = [
  { icon: "folder_shared", title: "Information We Collect", content: "We may collect the following information:", list: ["Name", "Phone number", "Address", "Location details", "Payment-related information"] },
  { icon: "data_usage", title: "Purpose of Data Collection", content: "We collect user information to:", list: ["Process bookings", "Connect customers with service providers", "Improve service quality", "Provide customer support", "Prevent fraud and misuse"] },
  { icon: "lock", title: "Payment Security", content: "Payments are securely processed through our payment gateway. We do not store sensitive payment card details on our servers." },
  { icon: "security", title: "Data Protection", content: "We implement reasonable security practices to protect user information from unauthorized access or misuse." },
  { icon: "share", title: "Third-Party Sharing", content: "User information may be shared with verified service partners only for fulfilling booked services." },
  { icon: "how_to_reg", title: "User Consent", content: "By using our platform, users consent to the collection and use of information described in this policy." },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-on-primary/70 hover:text-on-primary transition-colors mb-3">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">privacy_tip</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Privacy Policy</h1>
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
                {s.list && (
                  <ul className="mt-3 space-y-2">
                    {s.list.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <h2 className="text-xl font-bold text-on-surface mb-4">Contact Us</h2>
          <p className="text-sm text-on-surface-variant mb-6">For privacy-related concerns:</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:pavanhomess@gmail.com" className="inline-flex items-center gap-3 px-6 py-3 bg-primary rounded-xl text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[20px]">email</span>pavanhomess@gmail.com
            </a>
            <a href="tel:9648801462" className="inline-flex items-center gap-3 px-6 py-3 border border-outline-variant rounded-xl text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[20px]">phone</span>9648801462
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
