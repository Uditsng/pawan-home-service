import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | PHS Cleaning Company",
  description: "How PHS Cleaning Company collects, uses, and protects your personal information.",
};

const sections = [
  {
    icon: "info",
    title: "1. Introduction",
    content: "PHS Cleaning Company (\"PHS\", \"Company\", \"we\", \"our\", or \"us\") is committed to protecting the privacy and personal information of our customers, professionals, website visitors, and application users. This Privacy Policy explains how we collect, use, store, process, and protect your information when you use our website, mobile application, services, or otherwise interact with us. By accessing or using our services, you agree to the collection and use of information in accordance with this Privacy Policy.",
  },
  {
    icon: "business",
    title: "2. Business Information",
    content: "PHS Cleaning Company is a Sole Proprietorship owned and operated by Pavan Kumar.",
    list: [
      "Business Name: PHS Cleaning Company",
      "Business Type: Sole Proprietorship",
      "Owner: Pavan Kumar",
      "Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India",
      "Email: phscustomercare15@gmail.com",
      "Phone: +91 7408702019",
      "Service Area: Kanpur Nagar, Uttar Pradesh, India"
    ],
  },
  {
    icon: "engineering",
    title: "3. About Our Services",
    content: "PHS Cleaning Company provides home cleaning and related services through trained professionals assigned and managed by the Company. Our business model operates as follows:",
    subContent: "Customer → Booking → PHS Cleaning Company → Professional Assignment → Service Delivery. Professionals providing services are engaged, assigned, managed, or hired by PHS Cleaning Company. PHS Cleaning Company is the service provider and is responsible for service management, scheduling, customer support, and operational coordination.",
  },
  {
    icon: "folder_shared",
    title: "4. Information We Collect",
    content: "We may collect the following information when you use our services:",
    nestedLists: [
      {
        title: "Personal Information",
        items: ["Full Name", "Mobile Number", "Email Address", "Residential or Service Address", "Profile Photograph (if uploaded)"]
      },
      {
        title: "Service Information",
        items: ["Service Bookings", "Service Preferences", "Service History", "Booking Status", "Customer Support Communications"]
      },
      {
        title: "Account Information",
        items: ["User Role (Customer, Professional, Admin)", "Login Credentials", "Account Activity"]
      },
      {
        title: "Transaction Information",
        items: ["Payment Status", "Transaction References", "Booking Payments"]
      }
    ],
    footerText: "PHS Cleaning Company does not intentionally collect sensitive personal information unless required for service delivery or legal compliance."
  },
  {
    icon: "data_usage",
    title: "5. How We Use Your Information",
    content: "We use collected information for legitimate business purposes including:",
    nestedLists: [
      {
        title: "Service Delivery",
        items: ["Creating and managing bookings", "Assigning professionals", "Scheduling appointments", "Providing customer support"]
      },
      {
        title: "Account Management",
        items: ["Creating user accounts", "Managing user profiles", "Verifying user identity"]
      },
      {
        title: "Operational Purposes",
        items: ["Service coordination", "Professional assignment", "Quality monitoring", "Complaint resolution"]
      },
      {
        title: "Communication",
        items: ["Booking confirmations", "Service reminders", "Important updates", "Customer support responses"]
      },
      {
        title: "Business Improvements",
        items: ["Service optimization", "User experience enhancement", "Platform performance monitoring", "Analytics and reporting"]
      },
      {
        title: "Legal Compliance",
        items: ["Regulatory compliance", "Fraud prevention", "Security monitoring", "Enforcement of company policies"]
      }
    ]
  },
  {
    icon: "lock",
    title: "6. Payment Information",
    content: "All bookings require advance payment at the time of booking through available digital payment methods. Payment processing may be handled by authorized third-party payment service providers. PHS Cleaning Company does not store complete debit card, credit card, banking PINs, UPI PINs, CVV numbers, or similar sensitive payment credentials on its systems. Payment service providers process such information according to their own privacy policies and security standards.",
  },
  {
    icon: "assignment_ind",
    title: "7. User Roles and Data Access",
    content: "Our platform supports the following user roles:",
    nestedLists: [
      {
        title: "Customer",
        items: ["Customers may access only information relating to their own account, bookings, profile, and service history."]
      },
      {
        title: "Professional",
        items: ["Professionals may access only information required to perform assigned services."]
      },
      {
        title: "Administrator",
        items: ["Administrators may access information necessary for managing operations, assigning professionals, handling bookings, customer support, and maintaining platform functionality."]
      }
    ],
    footerText: "Access controls are implemented to restrict unauthorized access to user information."
  },
  {
    icon: "share",
    title: "8. Sharing of Information",
    content: "PHS Cleaning Company does not sell personal information. We may share information only in the following circumstances:",
    nestedLists: [
      {
        title: "Service Fulfillment",
        items: ["Relevant customer details may be shared with assigned professionals for service delivery purposes."]
      },
      {
        title: "Service Providers",
        items: ["We may share information with payment processors, cloud hosting providers, technology partners, and communication service providers where necessary for business operations."]
      },
      {
        title: "Legal Requirements",
        items: ["We may disclose information if required by applicable law, court orders, government authorities, or law enforcement agencies."]
      },
      {
        title: "Business Protection",
        items: ["Information may be disclosed to prevent fraud, investigate abuse, protect users, or protect Company rights."]
      }
    ]
  },
  {
    icon: "hourglass_empty",
    title: "9. Data Retention",
    content: "We retain information only for as long as reasonably necessary to provide services, maintain records, resolve disputes, meet legal obligations, and enforce agreements. Retention periods may vary depending on the nature of the information and applicable legal requirements.",
  },
  {
    icon: "security",
    title: "10. Data Security",
    content: "PHS Cleaning Company takes reasonable administrative, technical, and organizational measures to protect user information against unauthorized access, disclosure, alteration, misuse, or destruction. Despite reasonable safeguards, no electronic system can guarantee absolute security. Users are responsible for maintaining the confidentiality of their login credentials.",
  },
  {
    icon: "how_to_reg",
    title: "11. Customer Rights",
    content: "Subject to applicable law, users may request access to their information, correction of inaccurate information, updating account details, deletion of information where legally permissible, or withdrawal of consent where applicable. Requests may be submitted using the contact information provided below.",
  },
  {
    icon: "child_care",
    title: "12. Children's Privacy",
    content: "Our services are intended for individuals who are legally capable of entering into binding agreements under applicable law. We do not knowingly collect personal information from children without appropriate authorization. If we become aware that information has been collected improperly, we may remove such information from our systems.",
  },
  {
    icon: "link",
    title: "13. Third-Party Services",
    content: "Our website and application may contain links to third-party services or websites. PHS Cleaning Company is not responsible for third-party privacy practices, content, or security measures. Users should review the privacy policies of such third parties separately.",
  },
  {
    icon: "cookie",
    title: "14. Cookies and Similar Technologies",
    content: "Our website or application may use cookies, analytics tools, and similar technologies to improve functionality, enhance user experience, analyze usage patterns, and improve platform performance. Users may control cookie preferences through browser settings where applicable.",
  },
  {
    icon: "update",
    title: "15. Changes to This Privacy Policy",
    content: "PHS Cleaning Company reserves the right to update or modify this Privacy Policy at any time. Changes become effective immediately upon publication on our website, application, or official communication channels. Users are encouraged to review this Privacy Policy periodically.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-3xl">privacy_tip</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">Privacy Policy</h1>
              <p className="mt-2 text-on-primary/70 text-sm">Last Updated: June 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="glass-panel rounded-2xl p-6 md:p-8 hover:shadow-ambient-hover transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-on-surface mb-3 leading-tight">{s.title}</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{s.content}</p>
                
                {s.list && (
                  <ul className="mt-4 space-y-2">
                    {s.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">check_circle</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.subContent && (
                  <div className="mt-4 p-4 bg-surface-dim rounded-xl border border-outline-variant/30 text-center font-semibold text-primary text-sm">
                    {s.subContent}
                  </div>
                )}

                {s.nestedLists && (
                  <div className="mt-4 space-y-4">
                    {s.nestedLists.map((subList) => (
                      <div key={subList.title} className="p-4 bg-surface-dim rounded-xl border border-outline-variant/20">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{subList.title}</h4>
                        <ul className="space-y-1.5">
                          {subList.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-secondary text-[14px] mt-0.5 shrink-0">arrow_right</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {s.footerText && (
                  <p className="mt-3 text-xs text-on-surface-variant/80 italic">{s.footerText}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Section 16: Contact Us Block */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">contact_support</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-on-surface mb-2">16. Contact Us</h2>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                If you have questions, concerns, complaints, or requests regarding this Privacy Policy or the handling of your personal information, please contact:
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
                    C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh - 208014, India
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
