import Image from "next/image";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | PHS Cleaning Company",
  description: "Learn about PHS Cleaning Company — your trusted provider of professional cleaning, repairs, and maintenance services in Kanpur.",
};

const serviceItems = [
  "Home Cleaning",
  "Deep Cleaning",
  "Bathroom Cleaning",
  "Kitchen Cleaning",
  "Room Cleaning",
  "Floor Cleaning",
  "Residential Cleaning Services",
  "Commercial Cleaning Services",
  "Customized Cleaning Solutions",
];

const whyChooseUs = [
  {
    icon: "engineering",
    title: "Professional Service Management",
    desc: "Every booking is managed through our internal system to ensure proper scheduling, assignment, and service coordination.",
  },
  {
    icon: "verified",
    title: "Trained Professionals",
    desc: "We work with professionals who are assigned based on operational requirements and service needs.",
  },
  {
    icon: "payments",
    title: "Transparent Pricing",
    desc: "Customers receive clear pricing before confirming bookings. No hidden charges.",
  },
  {
    icon: "touch_app",
    title: "Easy Booking Process",
    desc: "Our platform allows customers to book services conveniently from their mobile devices or computers.",
  },
  {
    icon: "support_agent",
    title: "Customer Support",
    desc: "Our support team is available to assist customers with bookings, service updates, complaints, and general inquiries.",
  },
  {
    icon: "assignment_turned_in",
    title: "Service Accountability",
    desc: "As the service provider, PHS Cleaning Company takes responsibility for managing bookings, assigning professionals, and addressing customer concerns.",
  },
];

const companyValues = [
  { icon: "sentiment_satisfied", title: "Customer First", desc: "We place customer satisfaction at the center of our operations." },
  { icon: "gavel", title: "Integrity", desc: "We believe in honest communication, transparent pricing, and ethical business practices." },
  { icon: "verified_user", title: "Reliability", desc: "We strive to deliver services on time and as promised." },
  { icon: "workspace_premium", title: "Quality", desc: "We continuously work to improve service standards and operational excellence." },
  { icon: "handshake", title: "Respect", desc: "We treat customers, professionals, and team members with professionalism and respect." },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src="/PHS.png"
                alt="PHS Cleaning Company Logo"
                width={80}
                height={80}
                className="rounded-2xl"
              />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">
                About PHS Cleaning Company
              </h1>
              <p className="mt-3 text-on-primary/70 text-base md:text-lg max-w-2xl leading-relaxed">
                Clean Spaces. Better Living. Trusted Service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16 space-y-12">
        {/* Welcome Section */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Welcome to PHS Cleaning Company</h2>
          <p className="text-on-surface-variant leading-relaxed">
            At <strong>PHS Cleaning Company</strong>, we believe that every home and workplace deserves to be clean, hygienic, comfortable, and professionally maintained. We are a Kanpur-based cleaning service company committed to providing reliable, affordable, and high-quality cleaning solutions to households and businesses. Our goal is simple: to help our customers enjoy cleaner, healthier, and more organized spaces without the stress and effort of managing cleaning tasks themselves.
          </p>
        </div>

        {/* Who We Are */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Who We Are</h2>
          <div className="space-y-4 text-on-surface-variant leading-relaxed">
            <p>
              <strong>PHS Cleaning Company</strong> is a Sole Proprietorship business owned and operated by <strong>Pavan Kumar</strong>.
            </p>
            <p>
              Unlike marketplace platforms that merely connect customers with independent service providers, PHS Cleaning Company directly manages service operations. Our professionals are assigned and supervised through our internal management process to ensure consistency, accountability, and service quality.
            </p>
            <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4 bg-surface-dim p-6 rounded-2xl border border-outline-variant/30">
              <span className="font-semibold text-primary">Customer</span>
              <span className="material-symbols-outlined text-secondary hidden md:block">arrow_forward</span>
              <span className="material-symbols-outlined text-secondary md:hidden">arrow_downward</span>
              <span className="font-semibold text-primary">PHS Cleaning Company</span>
              <span className="material-symbols-outlined text-secondary hidden md:block">arrow_forward</span>
              <span className="material-symbols-outlined text-secondary md:hidden">arrow_downward</span>
              <span className="font-semibold text-primary">Professional Assignment</span>
              <span className="material-symbols-outlined text-secondary hidden md:block">arrow_forward</span>
              <span className="material-symbols-outlined text-secondary md:hidden">arrow_downward</span>
              <span className="font-semibold text-primary">Service Completion</span>
            </div>
            <p className="mt-4">
              This approach allows us to maintain greater control over service quality, scheduling, customer support, and issue resolution.
            </p>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-primary text-on-primary rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary text-2xl">rocket_launch</span>
                </div>
                <h2 className="text-xl font-bold">Our Mission</h2>
              </div>
              <p className="text-on-primary/80 text-sm leading-relaxed">
                Our mission is to make professional cleaning services accessible, affordable, and dependable for every household and business in our service area, creating employment opportunities for skilled professionals.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between border border-outline-variant/30">
            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-2xl">visibility</span>
                </div>
                <h2 className="text-xl font-bold text-on-surface">Our Vision</h2>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Our vision is to become one of the most trusted cleaning service providers in Kanpur and expand our reputation through reliability, professionalism, and customer-first service.
              </p>
            </div>
          </div>
        </div>

        {/* What We Do */}
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-on-surface mb-6 text-center">What We Do</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceItems.map((item) => (
              <div key={item} className="flex items-center gap-3 p-4 bg-surface-dim rounded-xl border border-outline-variant/20 hover:border-secondary/30 transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-base">check_circle</span>
                </div>
                <span className="text-sm font-semibold text-on-surface">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-8 text-center">Why Choose PHS Cleaning Company</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseUs.map((item) => (
              <div key={item.title} className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">{item.icon}</span>
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">{item.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quality, Safety, & Technology */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-3xl p-8 hover:shadow-ambient transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl">workspace_premium</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Commitment to Quality</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Customer satisfaction is at the heart of everything we do. We continuously work to improve service quality, professional performance, and customer support.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-8 hover:shadow-ambient transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl">shield_person</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Safety & Trust</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              We focus on professional conduct, customer privacy, secure handling of your details, and ethical business practices.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-8 hover:shadow-ambient transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl">devices</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Tech-Driven Convenience</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Our website and mobile application make it easy to create accounts, book services, view history, and contact support.
            </p>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-8 text-center">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {companyValues.map((val) => (
              <div key={val.title} className="glass-panel rounded-2xl p-5 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3 shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-xl">{val.icon}</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">{val.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Service Area */}
        <div className="bg-primary rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-2xl">location_on</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-primary mb-1">Service Area</h3>
                <p className="text-on-primary/70 text-sm leading-relaxed">
                  Currently, PHS Cleaning Company provides services exclusively within:
                </p>
                <p className="text-secondary font-semibold text-base mt-0.5">Kanpur Nagar, Uttar Pradesh, India</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 hover:shadow-ambient transition-all duration-300">
          <h2 className="text-2xl font-bold text-on-surface mb-6">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: "business", label: "Company Name", value: "PHS Cleaning Company" },
              { icon: "person", label: "Owner", value: "Pavan Kumar" },
              {
                icon: "location_on",
                label: "Address",
                value:
                  "C1-40, Gulmohar Vihar, Near Shivaji Pulia, Naubasta, Kanpur, Uttar Pradesh – 208014, India",
              },
              {
                icon: "email",
                label: "Email",
                value: "phscustomercare15@gmail.com",
                href: "mailto:phscustomercare15@gmail.com",
              },
              { icon: "phone", label: "Phone", value: "+91 7408702019", href: "tel:7408702019" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm text-primary hover:text-secondary transition-colors font-medium"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm text-on-surface font-medium">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
