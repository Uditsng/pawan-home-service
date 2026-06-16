import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | PHS Cleaning Company",
  description: "Read the Privacy Policy of PHS Cleaning Company to learn how we collect, process, secure, and retain your data in compliance with DPDP Act 2023.",
};

interface PolicySection {
  title: string;
  content: string;
  list?: string[];
  subContent?: string;
  nestedLists?: { title: string; items: string[] }[];
  footerText?: string;
}

const sections: PolicySection[] = [
  {
    title: "1. Scope & Acceptance",
    content: "PHS Cleaning Company ('PHS', 'Firm', 'we', 'our', or 'us') values your privacy. This Privacy Policy details the types of personal data we collect, process, store, and share when you access our website, mobile application, or book our doorstep services. By registering, creating a profile, completing payments, or booking a service, you explicitly consent to the data collection and processing activities detailed in this policy.",
  },
  {
    title: "2. Data Fiduciary Information",
    content: "PHS Cleaning Company is a Sole Proprietorship organized under the laws of India, acting as the Data Fiduciary under the Digital Personal Data Protection (DPDP) Act, 2023.",
    list: [
      "Sole Proprietor & Data Representative: Pavan Kumar",
      "Registered Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India",
      "Grievance Inbox: phscustomercare15@gmail.com",
      "Helpline Phone: +91 7408702019"
    ],
  },
  {
    title: "3. Direct Service Data Flow",
    content: "We directly manage service delivery. We do not transfer your personal information to third-party marketplaces for bidding. All data flows securely from the customer booking portal to our internal operations desk, which then shares strictly necessary operational details (name, phone, address, slot) with the assigned service professional to facilitate doorstep service fulfillment.",
  },
  {
    title: "4. Categories of Data Collected",
    content: "We collect personal data that is essential for service delivery, secure payments, and account administration:",
    nestedLists: [
      {
        title: "A. Personally Identifiable Information (PII)",
        items: ["Full Name", "Contact Mobile Number", "Active Email Address", "Complete Service Address (including Landmarks and Pincodes)"]
      },
      {
        title: "B. Service & Transaction Data",
        items: ["Booked service categories and pricing", "Historical scheduling records", "Payment status (Success/Failure/Pending)", "UPI or bank transaction references", "Internal booking logs"]
      },
      {
        title: "C. Device & Technical Identifiers",
        items: ["IP Address", "Device make and model", "Browser type", "Access timestamps", "App crash reports and analytics logs"]
      }
    ],
    footerText: "We do not collect or store sensitive credit/debit card credentials, Net Banking PINs, or CVV codes. All payments are processed through secure, RBI-authorized third-party payment gateways."
  },
  {
    title: "5. Purpose of Data Processing",
    content: "We process your personal data under the lawful grounds of consent and legitimate business interests:",
    nestedLists: [
      {
        title: "Operational Fulfillment",
        items: ["Creating your account profile", "Verifying service eligibility in your pincode", "Scheduling and assigning service professionals", "Fulfilling quality re-cleans"]
      },
      {
        title: "Communications & Alerts",
        items: ["Dispatching automated booking confirmations", "Sending OTPs for login and verification", "Communicating technician arrival times", "Issuing service feedback requests"]
      },
      {
        title: "Platform Security & Compliance",
        items: ["Detecting and preventing fraudulent bookings", "Enforcing Terms & Conditions", "Complying with statutory tax mandates", "Responding to legal orders from law enforcement"]
      }
    ]
  },
  {
    title: "6. Security of Payment Operations",
    content: "All checkout transactions are encrypted using Industry-standard SSL technology. In compliance with PCI-DSS standards and RBI guidelines, we do not store your complete payment card details or net banking credentials. Third-party processors collect, verify, and complete transactions, governed by their respective privacy terms and compliance certificates.",
  },
  {
    title: "7. Role-Based Access Control (RBAC)",
    content: "To guarantee data isolation, the database schema implements Row Level Security (RLS) policies based on user roles:",
    nestedLists: [
      {
        title: "Customer Access Boundary",
        items: ["Customers can read and write only their own profiles, transaction entries, saved addresses, and outbound referrals."]
      },
      {
        title: "Professional Access Boundary",
        items: ["Service professionals can access only operational data (e.g. customer name, phone, address, and scheduled slot) assigned specifically to them by the admin."]
      },
      {
        title: "Administrator Access Boundary",
        items: ["Administrators retain operational access to configure settings, verify user records, audit bookings, and resolve support requests."]
      }
    ],
    footerText: "We enforce strict database query constraints to prevent unauthorized cross-role data exposure."
  },
  {
    title: "8. Information Sharing & Disclosures",
    content: "We do not trade, sell, or rent your personal information. Your data is disclosed only under the following operational guidelines:",
    nestedLists: [
      {
        title: "With Service Professionals",
        items: ["Shared strictly to enable physical access and complete doorstep cleaning or repair tasks."]
      },
      {
        title: "With Technical Service Providers",
        items: ["Shared with cloud database hosts (Supabase), SMS/OTP gateways (Twilio), push notification services, and payment processors to run platform services."]
      },
      {
        title: "Legal Mandates",
        items: ["Disclosed to regulatory authorities, court officers, or police desks when required to comply with a judicial proceeding or statutory audit."]
      }
    ]
  },
  {
    title: "9. Data Retention & Erasure Timeline",
    content: "We store your personal data only as long as your account remains active or as required to fulfill our legal, accounting, tax, and dispute resolution duties. Upon an explicit account deletion request, we will deactivate your account and wipe all personally identifiable information from our active databases within 30 days, unless required to retain specific transactions for legal audits.",
  },
  {
    title: "10. Administrative & Technical Safeguards",
    content: "We maintain appropriate technical, physical, and administrative controls (including firewalls, data encryption, and authorized access keys) to safeguard data against accidental loss, unauthorized alteration, or malicious exposure. However, because internet transmissions are never entirely secure, we cannot guarantee absolute security. You are advised to safeguard your mobile device and log credentials.",
  },
  {
    title: "11. Your Statutory Data Rights",
    content: "Under the DPDP Act 2023, you hold the following rights regarding your personal data:",
    list: [
      "Right to Access: Request a summary of the personal data we process and the reasons for processing.",
      "Right to Correction: Request correction, completion, or updates to inaccurate or outdated personal data.",
      "Right to Erasure: Request deletion of your personal data when it is no longer necessary for the purpose collected.",
      "Right to Withdraw Consent: Revoke consent at any time, which will immediately restrict further processing (though historical transactions will remain for legal compliance)."
    ],
  },
  {
    title: "12. Minor Data Restrictions",
    content: "Our services are directed to adults capable of entering into legal contracts. We do not intentionally compile or request information from minors. If we discover that a minor under 18 has submitted personal information, we will verify the claim and delete the data from our records immediately.",
  },
  {
    title: "13. External Hyperlinks",
    content: "Our applications and websites may feature links to external payment gateways, mapping services, or social portals. We do not oversee or endorse their privacy guidelines, cookies, or data safety policies. You should inspect their respective policies independently.",
  },
  {
    title: "14. Cookies & Session Analytics",
    content: "We use essential cookies, browser storage, and analytics tokens to persist your login state, remember service selections in your cart, track user navigation flow, and diagnose loading times. You can disable cookies in your browser, but some features of the Platform may cease to function correctly.",
  },
  {
    title: "15. Updates to This Policy",
    content: "We may update this Privacy Policy to reflect changing business standards or compliance changes. Any modifications will be posted here with an updated revision date. Your continued utilization of our services after updates are published signifies your acceptance of the revised terms.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Centered Minimal Header */}
      <header className="max-w-4xl mx-auto px-4 pt-12 pb-8 border-b border-outline-variant/15">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline">Privacy Policy</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1">Last Updated: June 2026</p>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title} className="space-y-3">
            <h2 className="text-lg font-bold text-on-surface font-headline leading-tight">{s.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{s.content}</p>

            {s.list && (
              <ul className="space-y-2 text-sm text-on-surface-variant pl-4">
                {s.list.map((item) => (
                  <li key={item} className="list-disc pl-1 font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {s.subContent && (
              <p className="text-xs text-primary font-mono bg-surface-container/30 px-3 py-2 rounded-lg border border-outline-variant/5 inline-block">
                {s.subContent}
              </p>
            )}

            {s.nestedLists && (
              <div className="space-y-3 pt-2">
                {s.nestedLists.map((subList) => (
                  <div key={subList.title} className="space-y-1">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{subList.title}</h4>
                    <ul className="space-y-1 text-xs text-on-surface-variant pl-4">
                      {subList.items.map((item) => (
                        <li key={item} className="list-disc pl-1 font-medium">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {s.footerText && (
              <p className="text-xs text-on-surface-variant/60 italic font-medium">{s.footerText}</p>
            )}
          </section>
        ))}

        {/* Section 16: Contact Details & Privacy Officer */}
        <section className="pt-6 border-t border-outline-variant/10 space-y-4">
          <h2 className="text-lg font-bold text-on-surface font-headline">16. Contact Details & Privacy Officer</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
            If you have questions, concerns, complaints, or requests regarding this Privacy Policy, your rights under the DPDP Act 2023, or the handling of your personal information, please contact our Grievance Desk:
          </p>

          <div className="space-y-3 text-sm pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Fiduciary Entity</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">PHS Cleaning Company</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Grievance Officer</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0">Pavan Kumar</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Office Address</span>
              <span className="font-bold text-on-surface text-xs mt-0.5 sm:mt-0 text-left sm:text-right max-w-md">C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:border-b border-outline-variant/5 pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Email Address</span>
              <a href="mailto:phscustomercare15@gmail.com" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">phscustomercare15@gmail.com</a>
            </div>
            <div className="flex flex-col sm:flex-row justify-between pb-2">
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-wider">Helpline Phone</span>
              <a href="tel:+917408702019" className="text-primary font-bold hover:text-secondary text-xs mt-0.5 sm:mt-0 font-mono">+91 7408702019</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
