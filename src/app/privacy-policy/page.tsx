"use client";

import { type ReactNode, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { handleEmailClick, handlePhoneClick } from "@/utils/contact";

type PolicyBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; title: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "callout"; title?: string; items: string[] }
  | { type: "contact" };

interface PolicySection {
  title: string;
  blocks: PolicyBlock[];
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-on-surface">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const sections: PolicySection[] = [
  {
    title: "1. Background",
    blocks: [
      {
        type: "paragraph",
        text: "PHS Cleaning Company ('PHS', 'Company', 'we', 'our', or 'us') provides premium doorstep home management, cleaning, maintenance, repair, and pest control services. This Privacy Policy explains how we collect, use, store, share, and protect your personal data ('Personal Data') when you visit our website, use our mobile application, book our services, or interact with our customer-care desk.",
      },
      {
        type: "subheading",
        title: "1.1 Purpose of this Policy",
      },
      {
        type: "bullets",
        items: [
          "Describes the categories of Personal Data we collect and the lawful grounds for processing.",
          "Explains how your data is used, shared, and safeguarded across our Customer, Partner, and Admin portals.",
          "Sets out your rights, retention timelines, and the procedure to raise requests or grievances.",
        ],
      },
      {
        type: "subheading",
        title: "1.2 Acceptance of this Policy",
      },
      {
        type: "bullets",
        items: [
          "By registering an account, creating a profile, completing a payment, or booking a doorstep service, you consent to the collection and processing described in this Policy.",
          "You may withdraw consent at any time, subject to the limitations described in Section 19.",
          "If you do not agree with any part of this Policy, please do not use our Platform.",
        ],
      },
    ],
  },
  {
    title: "2. Personal Data We Collect",
    blocks: [
      {
        type: "paragraph",
        text: "We collect only the Personal Data that is necessary to operate the Platform, deliver services, secure payments, and meet our legal obligations.",
      },
      {
        type: "subheading",
        title: "2.1 Identity & Contact Information",
      },
      {
        type: "bullets",
        items: [
          "Full name",
          "Mobile number (used for OTP verification and service SMS)",
          "Email address (for invoices, receipts, and support correspondence)",
          "Profile photograph/avatar (optional)",
          "Date of birth or government identifiers (only where required for verification)",
        ],
      },
      {
        type: "subheading",
        title: "2.2 Address & Location Information",
      },
      {
        type: "bullets",
        items: [
          "Saved delivery/service addresses, including house number, street, landmark, city, and PIN code",
          "Optional GPS coordinates (latitude/longitude) when you use 'Use my current location'",
          "Service-area availability preferences",
        ],
      },
      {
        type: "subheading",
        title: "2.3 Account & Device Information",
      },
      {
        type: "bullets",
        items: [
          "Login activity and OTP verification events",
          "Device make, model, and operating system",
          "Browser type and version",
          "IP address and approximate region",
          "In-app notification device tokens used for push notifications",
          "App version and feature usage",
        ],
      },
      {
        type: "paragraph",
        text: "We do not collect sensitive financial credentials such as credit/debit card numbers, CVV codes, or net banking passwords on our servers. Card payments are processed directly by our RBI-authorized payment gateway (Razorpay).",
      },
    ],
  },
  {
    title: "3. Professional / Partner Data",
    blocks: [
      {
        type: "paragraph",
        text: "If you register as a Professional (Partner), we collect additional data to verify your identity, manage your profile, assign jobs, and ensure compliance with onboarding and audit requirements.",
      },
      {
        type: "subheading",
        title: "3.1 Identity & KYC Documents",
      },
      {
        type: "bullets",
        items: [
          "Full name, mobile number, and email address",
          "Profile photo",
          "Government-issued identity documents (e.g., Aadhaar, PAN) and bank account details for payouts",
          "Self-attested KYC documents uploaded to our secure document store",
        ],
      },
      {
        type: "subheading",
        title: "3.2 Professional Profile & Performance",
      },
      {
        type: "bullets",
        items: [
          "Service categories and sub-categories you offer",
          "Service pincodes/areas you cover",
          "Completed jobs, ratings, reviews, and service history",
          "Assignment, rejection, and cancellation metrics used for fair job allocation",
          "Last assigned timestamp used by our round-robin assignment engine",
        ],
      },
    ],
  },
  {
    title: "4. Booking & Service Information",
    blocks: [
      {
        type: "paragraph",
        text: "Whenever you place a booking, we collect the information required to schedule, price, coordinate, and deliver the service.",
      },
      {
        type: "bullets",
        items: [
          "Selected service, subcategory, variants, and add-ons",
          "Preferred date and time slot",
          "Booking address and mapping coordinates",
          "Answers to service-specific booking forms",
          "Quotations and approvals for inspection-based or extra work",
          "Pricing breakdown, discounts, wallet credits, and payment status",
        ],
      },
      {
        type: "paragraph",
        text: "This information is snapshotted into the booking and order records so it remains accurate for fulfillment, invoicing, audits, and dispute resolution even if you later edit your profile.",
      },
    ],
  },
  {
    title: "5. Payments & Wallet",
    blocks: [
      {
        type: "paragraph",
        text: "Payments for bookings, wallet recharges, and offer-card purchases are processed through RBI-authorized payment partners such as Razorpay. We process payment-related data but never store raw card credentials.",
      },
      {
        type: "bullets",
        items: [
          "Razorpay order IDs, payment IDs, and signature (for transaction verification)",
          "Payment method used (UPI, card, net banking, or wallet)",
          "Wallet transaction history, including cash and bonus balances, recharges, and offer purchases",
          "Refund and reversal records",
        ],
      },
      {
        type: "paragraph",
        text: "We comply with applicable payment-card industry standards and RBI guidelines. All payment transactions are encrypted in transit between your device, Razorpay, and our servers.",
      },
    ],
  },
  {
    title: "6. Referrals",
    blocks: [
      {
        type: "paragraph",
        text: "Our referral program lets you invite friends to join PHS. When a friend registers using your referral code or link, we record the attribution so that wallet rewards can be issued accurately.",
      },
      {
        type: "bullets",
        items: [
          "Your unique referral code",
          "The referred friend's account details and sign-up source (code or link)",
          "Referral status history and the reward configuration snapshot in effect at sign-up",
          "Wallet credit events issued to you and your referred friend",
        ],
      },
      {
        type: "paragraph",
        text: "Referral rewards are issued only after successful, attributable registration and are subject to the Referral Program terms, including our anti-fraud safeguards.",
      },
    ],
  },
  {
    title: "7. Reviews & Ratings",
    blocks: [
      {
        type: "paragraph",
        text: "You may write reviews, assign ratings, and upload photos after a completed service. Reviews help other customers choose services and inform our quality programs.",
      },
      {
        type: "bullets",
        items: [
          "Rating out of five stars and written feedback",
          "Photographs of the completed work (optional)",
          "Professional and admin responses to your review",
          "Moderation actions taken on your content",
        ],
      },
      {
        type: "paragraph",
        text: "Reviews are displayed publicly on service and professional profiles. We moderate content that violates our guidelines and may remove content that exposes the Personal Data of third parties.",
      },
    ],
  },
  {
    title: "8. Notifications & Device Data",
    blocks: [
      {
        type: "paragraph",
        text: "With your permission, we send transactional and promotional notifications via push notification, SMS, and email.",
      },
      {
        type: "bullets",
        items: [
          "Device tokens registered with our push notification (FCM) service",
          "Opt-in/opt-out preferences",
          "Read/unread state and delivery status of notifications",
        ],
      },
      {
        type: "paragraph",
        text: "Notifications inform you about job assignment, booking status changes, offers, low wallet balance, and support responses.",
      },
      {
        type: "paragraph",
        text: "You can disable push notifications from device settings or in-app preferences. Disabling them may prevent important service updates from reaching you.",
      },
    ],
  },
  {
    title: "9. Technical Information, Analytics & Logs",
    blocks: [
      {
        type: "paragraph",
        text: "We collect limited technical and usage data to keep the Platform fast, secure, and reliable.",
      },
      {
        type: "bullets",
        items: [
          "IP address, browser, device make/model, and operating system",
          "Pages visited, feature interactions, and approximate region",
          "Performance and speed metrics via Vercel Analytics and Vercel Speed Insights",
          "Admin audit logs that capture actor, action, and IP address for accountability",
        ],
      },
      {
        type: "paragraph",
        text: "We do not use crash-reporting SDKs or device fingerprinting. Where possible, analytics are aggregated so they cannot be tied back to you individually.",
      },
      {
        type: "paragraph",
        text: "Server and audit logs are retained for security monitoring, fraud prevention, and troubleshooting, consistent with the retention periods in Section 17.",
      },
    ],
  },
  {
    title: "10. Search, Interest & Service Availability",
    blocks: [
      {
        type: "paragraph",
        text: "We use search and availability data to recommend relevant services and to decide which services to launch in your area.",
      },
      {
        type: "bullets",
        items: [
          "Search terms entered on our Platform",
          "Services viewed and added to cart",
          "Service-interest and waitlist requests, including 'Coming Soon' services",
          "PIN-code availability checks run against our service-area engine",
        ],
      },
      {
        type: "paragraph",
        text: "Interest and waitlist data helps us plan supply, onboard professionals, and decide when a service should go live in your location.",
      },
    ],
  },
  {
    title: "11. How We Collect Personal Data",
    blocks: [
      {
        type: "subheading",
        title: "11.1 Information You Provide",
      },
      {
        type: "bullets",
        items: [
          "Account registration and profile completion",
          "Booking and checkout forms",
          "Reviews, support tickets, and feedback",
          "KYC document uploads (Partners)",
          "Referral sign-ups and waitlist registrations",
        ],
      },
      {
        type: "subheading",
        title: "11.2 Information Collected Automatically",
      },
      {
        type: "bullets",
        items: [
          "Browser cookies and platform local storage",
          "Device and technical identifiers described in Section 2.3",
          "Server and access logs",
          "Optional geolocation when you enable current-location features",
        ],
      },
      {
        type: "subheading",
        title: "11.3 Information From Third Parties",
      },
      {
        type: "bullets",
        items: [
          "Payment confirmations and status from Razorpay",
          "OTP delivery confirmations from our SMS gateway (Twilio)",
          "Referral attribution from your referred friend's registration",
          "Service-area and pin-code lookups from public postal APIs",
        ],
      },
    ],
  },
  {
    title: "12. How We Use Personal Data",
    blocks: [
      {
        type: "paragraph",
        text: "We process Personal Data for the following purposes, on the lawful grounds of consent, contract performance, and legitimate business interest:",
      },
      {
        type: "numbered",
        items: [
          "Create, manage, and authenticate your account",
          "Send and verify OTPs for login and registration",
          "Validate service availability at your pincode",
          "Process payments, wallet transactions, and refunds",
          "Confirm, schedule, and manage bookings",
          "Auto-assign professionals using our round-robin assignment engine",
          "Coordinate service delivery between customers and professionals",
          "Generate and manage quotations for inspection-based services",
          "Secure approval for extra work or additional charges",
          "Provide customer support and grievance resolution",
          "Send push, SMS, and email notifications about your bookings",
          "Issue invoices and tax receipts",
          "Administer referrals, rewards, and wallet credits",
          "Manage offer-card purchases and entitlements",
          "Serve and manage waitlist registrations",
          "Collect and display reviews and ratings",
          "Improve service quality, content, and recommendations",
          "Measure and analyze platform performance",
          "Detect and prevent fraud, abuse, and security threats",
          "Comply with legal, regulatory, and tax obligations",
          "Enforce our Terms & Conditions",
          "Support internal administration and audits",
        ],
      },
    ],
  },
  {
    title: "13. How We Share Personal Data",
    blocks: [
      {
        type: "paragraph",
        text: "We do not sell, rent, or trade your Personal Data. We share data only as necessary to deliver services and operate the Platform.",
      },
      {
        type: "subheading",
        title: "13.1 With Assigned Professionals",
      },
      {
        type: "bullets",
        items: [
          "Customer name",
          "Service address, city, and pincode",
          "Mapped GPS coordinates (where provided) to aid navigation",
          "Booking date, time, and service requirements",
          "Relevant form answers needed to perform the task",
        ],
      },
      {
        type: "paragraph",
        text: "Professionals require this information to reach your premises and deliver the booked service. Access is limited to bookings assigned to the specific professional and is enforced through row-level access controls.",
      },
      {
        type: "subheading",
        title: "13.2 With Service Providers",
      },
      {
        type: "bullets",
        items: [
          "Cloud database and hosting (Supabase)",
          "SMS/OTP gateway (Twilio)",
          "Push notification delivery (Google Firebase Cloud Messaging)",
          "Payment processing and webhook reconciliation (Razorpay)",
          "Analytics and performance monitoring (Vercel)",
        ],
      },
      {
        type: "subheading",
        title: "13.3 With Mapping & Utility Partners",
      },
      {
        type: "bullets",
        items: [
          "OpenStreetMap and Leaflet tiles for map previews and location picking",
          "Google Maps (where enabled) for geocoding and navigation",
          "India Post pincode API for service-area validation",
        ],
      },
      {
        type: "subheading",
        title: "13.4 Legal & Regulatory Disclosures",
      },
      {
        type: "bullets",
        items: [
          "To law enforcement, courts, or regulators where required by law, judicial order, or statutory audit",
          "To our professional advisers and auditors under confidentiality obligations",
          "To a successor entity in the event of a business transfer (see Section 25)",
        ],
      },
    ],
  },
  {
    title: "14. Maps & Location Data",
    blocks: [
      {
        type: "paragraph",
        text: "Location data is strictly optional. We never require GPS access to register; you can always type your address and pincode manually.",
      },
      {
        type: "quote",
        text: "\"Use my current location\" — we request location access only to pre-fill your address automatically.",
      },
      {
        type: "bullets",
        items: [
          "When you grant location permissions, we read your GPS coordinates to pre-fill the address form",
          "Coordinates are stored on your saved address and snapshotted into bookings/orders at checkout",
          "Coordinates are shared with the assigned Professional to help them navigate to your home",
          "Admins have operational access to booking addresses for scheduling and support",
          "We do not track your location in the background when the app is closed",
        ],
      },
      {
        type: "paragraph",
        text: "You can revoke location permissions anytime through your browser or device settings; the Platform continues to function with a manually entered address.",
      },
    ],
  },
  {
    title: "15. Cookies, Local Storage & Similar Technologies",
    blocks: [
      {
        type: "paragraph",
        text: "We use cookies, local storage, and similar technologies to keep you signed in, remember preferences, and improve the experience.",
      },
      {
        type: "bullets",
        items: [
          "Session tokens and cached user/session state (local storage)",
          "Cart and service selections",
          "Referral deep-link and offer/wallet intent values",
          "Notification and booking cache-invalidation keys",
          "Analytics and performance markers",
        ],
      },
      {
        type: "paragraph",
        text: "You can clear or disable cookies/local storage in your browser or app settings. Some features may not work correctly if essential storage is blocked.",
      },
    ],
  },
  {
    title: "16. Data Security",
    blocks: [
      {
        type: "paragraph",
        text: "We apply a defense-in-depth approach to protect your data:",
      },
      {
        type: "bullets",
        items: [
          "Encryption of data in transit (TLS/SSL) over HTTPS",
          "Row Level Security (RLS) and role-based access across the Customer, Partner, and Admin portals",
          "Server-side, service-role restricted operations for financial mutations such as wallet credits",
          "Protected-column triggers that prevent unauthorized profile and balance edits",
          "Storage-bucket access controls and file-size limits on uploads",
          "Audit logging of administrative actions",
        ],
      },
      {
        type: "paragraph",
        text: "While we take every reasonable precaution, no method of transmission or storage is guaranteed to be 100% secure. Please protect your device and passwords, and never share OTPs with anyone, including callers claiming to be our professionals.",
      },
    ],
  },
  {
    title: "17. Data Retention",
    blocks: [
      {
        type: "paragraph",
        text: "We keep Personal Data only as long as needed for the purposes described in this Policy or as required by law.",
      },
      {
        type: "bullets",
        items: [
          "Account and profile data: while your account remains active",
          "Booking, order, invoice, and payment records: as required by accounting and tax laws (typically up to 8 years)",
          "Wallet transaction and recharge records: while your account is active and thereafter as required by statutory records",
          "Partner KYC documents: while the partner relationship is active and for the statutory audit window afterwards",
          "Reviews: while the service or professional profile is published",
          "Audit logs and security data: for a limited security-monitoring window",
        ],
      },
      {
        type: "paragraph",
        text: "When data is no longer needed, we delete it or render it unidentifiable in line with our retention schedule. See Section 18 for erasure requests.",
      },
    ],
  },
  {
    title: "18. Account Deletion & Data Erasure Requests",
    blocks: [
      {
        type: "paragraph",
        text: "You may request deletion of your account and associated Personal Data at any time. Self-serve account deletion is handled through our support team to prevent accidental loss of booking and legal records.",
      },
      {
        type: "bullets",
        items: [
          "Email your request to phscustomercare15@gmail.com from your registered email address",
          "Our team verifies your identity before processing any request",
          "Routine deletion of active data is processed within 30 days of a verified request",
          "Certain records (invoices, payments, tax details, dispute records) are retained for the statutory period required by law even after account deletion",
          "A confirmation is sent to your registered email once processing is complete",
        ],
      },
      {
        type: "paragraph",
        text: "Note that deleting your account does not automatically remove public reviews or content you posted; please raise a separate request if you also want those removed.",
      },
    ],
  },
  {
    title: "19. Your Privacy Rights",
    blocks: [
      {
        type: "paragraph",
        text: "Under the DPDP Act 2023 and this Policy, you have the following rights, exercisable free of charge:",
      },
      {
        type: "bullets",
        items: [
          "Right to Access: request a summary of your Personal Data and why it is processed",
          "Right to Correction: correct or update inaccurate or incomplete data",
          "Right to Erasure: request deletion when data is no longer needed (see Section 18)",
          "Right to Withdraw Consent: withdraw consent for processing where consent is the lawful basis",
          "Right to Nominate: nominate a person to exercise your rights in the event of your incapacity or death",
          "Right to Grievance Redressal: raise a complaint with our Grievance Officer or the Data Protection Board of India (DPBI)",
        ],
      },
      {
        type: "paragraph",
        text: "To exercise any of these rights, contact our Grievance Desk using the details in Section 27. We may ask for identity verification to protect your data.",
      },
    ],
  },
  {
    title: "20. Information About Professionals",
    blocks: [
      {
        type: "paragraph",
        text: "Our Professionals are verified service providers engaged by PHS. Certain professional data is shown to customers to enable informed choices.",
      },
      {
        type: "bullets",
        items: [
          "Professional name and profile photo",
          "Average rating and number of completed jobs",
          "Service categories offered and indicative pricing",
          "Availability and assigned job details",
        ],
      },
      {
        type: "paragraph",
        text: "We do not expose professionals' private contact details, KYC documents, or bank information on customer-facing pages. Customer data and professional data are isolated using row-level access controls.",
      },
    ],
  },
  {
    title: "21. Public Reviews & Content",
    blocks: [
      {
        type: "paragraph",
        text: "Content you post publicly (reviews, ratings, photos) may be visible to other users and used for moderation and quality purposes.",
      },
      {
        type: "bullets",
        items: [
          "Reviews appear on the relevant service or professional profile",
          "Photos attached to reviews may be moderated before display",
          "We may contact you about your feedback for quality assurance",
        ],
      },
      {
        type: "callout",
        title: "Do NOT submit in public content",
        items: [
          "Payment card details, CVV, one-time passwords, or net banking credentials",
          "Government ID numbers (Aadhaar, PAN) or sensitive documents",
          "Medical or health information",
          "Personal information about other people without their consent",
          "Abusive, defamatory, or threatening content",
        ],
      },
      {
        type: "paragraph",
        text: "Content that violates these rules will be removed, and repeated violations may lead to action on your account.",
      },
    ],
  },
  {
    title: "22. Children's Privacy",
    blocks: [
      {
        type: "paragraph",
        text: "Our Platform and services are directed to adults aged 18 and above who can enter into binding contracts. We do not knowingly collect Personal Data from children.",
      },
      {
        type: "paragraph",
        text: "If you believe a child has provided us Personal Data without parental consent, contact us at the details in Section 27. Upon verification, we will delete such data promptly.",
      },
    ],
  },
  {
    title: "23. Third-Party Websites & Links",
    blocks: [
      {
        type: "paragraph",
        text: "The Platform may contain links to third-party websites or services (for example, payment pages, mapping services, app stores, and social media).",
      },
      {
        type: "bullets",
        items: [
          "Third parties operate under their own privacy policies and terms",
          "We are not responsible for their data practices or content",
          "You should review their policies before sharing data with them",
        ],
      },
      {
        type: "paragraph",
        text: "Our payment, SMS, and analytics providers are trusted partners; however, they are independent data processors and their practices are governed by their own terms.",
      },
    ],
  },
  {
    title: "24. International Data Transfers",
    blocks: [
      {
        type: "paragraph",
        text: "Some of our service providers process data on infrastructure that may be located outside India (for example, cloud hosting, analytics, and push-notification infrastructure).",
      },
      {
        type: "paragraph",
        text: "When Personal Data is transferred internationally, we rely on contractual safeguards and the reasonable security standards required under applicable law, including the DPDP Act 2023. By using the Platform, you consent to such transfers to the extent permitted by law.",
      },
    ],
  },
  {
    title: "25. Business Transactions",
    blocks: [
      {
        type: "paragraph",
        text: "If PHS is involved in a merger, acquisition, reorganization, or sale of assets, Personal Data may be transferred as part of that transaction.",
      },
      {
        type: "paragraph",
        text: "We will notify affected users of such a transfer and of any material change to the processing of their data. This Policy will continue to apply to data transferred to the successor in a manner consistent with this Policy.",
      },
    ],
  },
  {
    title: "26. Changes to This Privacy Policy",
    blocks: [
      {
        type: "paragraph",
        text: "We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law.",
      },
      {
        type: "bullets",
        items: [
          "Material changes will be published on this page with the revised 'Last Updated' date",
          "Where required, we will notify you via email or an in-app notification",
          "Your continued use of the Platform after changes take effect constitutes acceptance of the revised Policy",
          "We encourage you to review this Policy periodically",
        ],
      },
    ],
  },
  {
    title: "27. Contact & Grievance Redressal",
    blocks: [
      {
        type: "paragraph",
        text: "If you have questions, concerns, complaints, or requests about this Policy or your Personal Data, please contact our Grievance Desk:",
      },
      {
        type: "bullets",
        items: [
          "Official Privacy / Grievance Email: phscustomercare15@gmail.com",
          "Registered Business Address: C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
          "Grievance Officer: Pavan Kumar (Sole Proprietor) — reachable at +91 74087 02019",
          "Response Timeframe: We acknowledge complaints within 72 hours and aim to resolve them within 15 days; complex issues may take up to 30 days",
          "Payment-Feature Escalation: For payment-related grievances, you may additionally approach your bank or the Reserve Bank of India's ombudsman scheme",
        ],
      },
      {
        type: "contact",
      },
    ],
  },
  {
    title: "28. Important Notice",
    blocks: [
      {
        type: "paragraph",
        text: "Nothing in this Privacy Policy limits your rights under the Digital Personal Data Protection Act, 2023, or any other applicable Indian law. If any provision of this Policy is held invalid or unenforceable, the remaining provisions remain in full force.",
      },
      {
        type: "paragraph",
        text: "This Policy is governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts at Kanpur Nagar, Uttar Pradesh.",
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  const helplinePhone = "+917408702019";
  const helplineEmail = "phscustomercare15@gmail.com";

  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col relative overflow-hidden">
      <Header />

      {/* Decorative blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <main className="grow max-w-4xl w-full mx-auto px-4 py-8 md:py-12 space-y-6 z-10">

        {/* Simple Header */}
        <header className="pb-6 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-primary">Privacy Policy</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Data Protection · DPDP Act 2023</p>
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10 shrink-0 self-start sm:self-auto">
            Last Updated: September 2026
          </span>
        </header>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start relative">

          {/* Mobile Jump to section dropdown */}
          <div className="md:hidden relative z-20">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-surface-container-lowest/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-outline-variant/30 text-xs font-bold text-primary shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#059669] text-lg">toc</span>
                Jump to Section
              </span>
              <span className={`material-symbols-outlined text-lg transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl p-2 space-y-1 animate-[slideDown_0.15s_ease-out]">
                {sections.map((s, idx) => (
                  <a
                    key={idx}
                    href={`#section-${idx}`}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-[11px] font-semibold text-on-surface-variant hover:text-secondary rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Left Column Index (Desktop only) */}
          <aside className="hidden md:block md:col-span-1 sticky top-24 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pr-2 py-1">
            <h3 className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-3 pl-1">Table of Contents</h3>
            <ul className="space-y-2 border-l border-outline-variant/10">
              {sections.map((s, idx) => (
                <li key={idx}>
                  <a
                    href={`#section-${idx}`}
                    className="block pl-3 text-[11px] font-semibold text-on-surface-variant/75 hover:text-secondary border-l border-transparent hover:border-secondary -ml-px transition-all leading-snug"
                  >
                    {s.title.replace(/^\d+\.\s+/, '')}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          {/* Right Column Content */}
          <div className="md:col-span-3 space-y-8">
            {sections.map((s, idx) => (
              <section key={idx} id={`section-${idx}`} className="scroll-mt-24 space-y-2.5">
                <h2 className="text-sm font-bold text-primary font-headline flex items-center gap-2">
                  <span className="text-[10px] bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-md font-headline font-bold">
                    {idx + 1}
                  </span>
                  {s.title.replace(/^\d+\.\s+/, '')}
                </h2>

                {s.blocks.map((block, bIdx) => {
                  switch (block.type) {
                    case "paragraph":
                      return (
                        <p key={bIdx} className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-semibold">
                          {renderInline(block.text)}
                        </p>
                      );
                    case "subheading":
                      return (
                        <h3 key={bIdx} className="text-[11px] md:text-xs font-bold text-primary pt-1 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-secondary shrink-0"></span>
                          {block.title}
                        </h3>
                      );
                    case "bullets":
                      return (
                        <ul key={bIdx} className="space-y-1.5 pl-5 pt-1">
                          {block.items.map((item, lIdx) => (
                            <li key={lIdx} className="list-disc text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed">
                              {renderInline(item)}
                            </li>
                          ))}
                        </ul>
                      );
                    case "numbered":
                      return (
                        <ol key={bIdx} className="space-y-1.5 pl-5 pt-1 list-decimal [&>li::marker]:text-secondary [&>li::marker]:font-bold">
                          {block.items.map((item, lIdx) => (
                            <li key={lIdx} className="text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed">
                              {renderInline(item)}
                            </li>
                          ))}
                        </ol>
                      );
                    case "quote":
                      return (
                        <blockquote key={bIdx} className="bg-surface-container/30 border-l-2 border-secondary/60 rounded-r-2xl px-4 py-3 text-[11px] md:text-xs text-on-surface font-semibold leading-relaxed italic">
                          {renderInline(block.text)}
                        </blockquote>
                      );
                    case "callout":
                      return (
                        <div key={bIdx} className="bg-error/5 border border-error/20 rounded-2xl p-4 space-y-2">
                          {block.title && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-error flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              {block.title}
                            </p>
                          )}
                          <ul className="space-y-1.5 pl-5">
                            {block.items.map((item, cIdx) => (
                              <li key={cIdx} className="list-disc text-[11px] md:text-xs text-on-surface-variant font-semibold leading-relaxed">
                                {renderInline(item)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    case "contact":
                      return (
                        <div key={bIdx} className="glass-panel rounded-3xl p-5 space-y-3 text-xs md:text-sm">
                          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                            <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Fiduciary Entity</span>
                            <span className="font-bold text-primary text-xs">PHS Cleaning Company</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                            <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Grievance Officer</span>
                            <span className="font-bold text-primary text-xs">Pavan Kumar</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-outline-variant/10 pb-2 gap-1 sm:gap-4">
                            <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider shrink-0">Office Address</span>
                            <span className="font-semibold text-primary text-xs text-left sm:text-right max-w-sm">
                              C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, UP – 208014
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                            <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Email Address</span>
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
                      );
                    default:
                      return null;
                  }
                })}
              </section>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}