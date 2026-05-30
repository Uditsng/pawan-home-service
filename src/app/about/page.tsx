import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | Pavan Home Solutions",
  description:
    "Learn about Pavan Home Solutions — your trusted platform for premium home services including cleaning, pest control, repairs, and more.",
};

const serviceCategories = [
  {
    title: "Cleaning & Housekeeping",
    icon: "cleaning_services",
    items: [
      "Sofa & Upholstery Care",
      "Full Home Deep Cleaning",
      "Kitchen Deep Cleaning",
      "Bathroom Deep Cleaning",
      "Water Tank & Sump Cleaning",
      "Vehicle Wash & Detailing",
    ],
  },
  {
    title: "Pest Control Services",
    icon: "pest_control",
    items: [
      "General Pest Management",
      "Bed Bug Extermination",
      "Termite Protection",
      "Mosquito & Flying Insect Control",
      "Rodent & Rat Control",
      "Crawling Insect Control",
    ],
  },
  {
    title: "Home Repairs & Maintenance",
    icon: "home_repair_service",
    items: [
      "Plumbing Services",
      "Electrical Services",
      "Carpentry Services",
      "AC & Appliance Repair",
    ],
  },
  {
    title: "Renovation & Home Improvement",
    icon: "format_paint",
    items: [
      "Wall Painting & Texturing",
      "Waterproofing & Seepage Control",
    ],
  },
  {
    title: "Logistics & Events",
    icon: "local_shipping",
    items: [
      "Packers & Movers",
      "Event & Party Decoration",
      "Business Marketing & Advertising",
    ],
  },
];

const whyChooseUs = [
  {
    icon: "verified_user",
    title: "Verified Partners",
    description: "All professionals are trained and verified before joining our platform.",
  },
  {
    icon: "payments",
    title: "Transparent Pricing",
    description: "No hidden charges — what you see is exactly what you pay.",
  },
  {
    icon: "touch_app",
    title: "Easy Booking",
    description: "Book any service in just a few taps with our seamless experience.",
  },
  {
    icon: "speed",
    title: "Fast Response",
    description: "Quick turnaround with reliable customer support at every step.",
  },
  {
    icon: "shield",
    title: "Safe & Professional",
    description: "Every service is delivered with safety and professionalism in mind.",
  },
  {
    icon: "event_available",
    title: "Flexible Scheduling",
    description: "Reschedule or adjust timings as per your convenience.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-on-primary/70 hover:text-on-primary transition-colors mb-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src="/PHS.png"
                alt="Pavan Home Solutions Logo"
                width={80}
                height={80}
                className="rounded-2xl"
              />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-on-primary tracking-tight">
                About Pavan Home Solutions
              </h1>
              <p className="mt-3 text-on-primary/70 text-base md:text-lg max-w-2xl leading-relaxed">
                Making home services simple, reliable, and professional — one booking at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Welcome to Pavan Home Solutions</h2>
          <div className="space-y-4 text-on-surface-variant leading-relaxed">
            <p>
              At Pavan Home Solutions, we are committed to making home services simple, reliable, and
              professional. Founded by <strong className="text-on-surface">Pavan Gupta</strong>, our
              platform connects customers with trusted and verified service professionals for a wide range
              of home maintenance, cleaning, pest control, repair, and improvement services.
            </p>
            <p>
              We understand how difficult it can be to find dependable professionals for household needs.
              That&apos;s why we built a platform focused on quality, transparency, safety, and customer
              satisfaction.
            </p>
            <p>
              Whether you need deep cleaning, plumbing repairs, pest control, electrical work, painting,
              appliance servicing, or packers and movers — Pavan Home Solutions is your one-stop solution.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="max-w-7xl mx-auto px-4 pb-12 md:pb-16">
        <div className="bg-primary rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-2xl">rocket_launch</span>
              </div>
              <h2 className="text-2xl font-bold text-on-primary">Our Mission</h2>
            </div>
            <p className="text-on-primary/80 text-base md:text-lg leading-relaxed max-w-3xl">
              Our mission is to provide affordable, high-quality, and trustworthy home services while
              empowering skilled professionals with better work opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 pb-12 md:pb-16">
        <h2 className="text-2xl font-bold text-on-surface mb-8 text-center">Why Choose Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {whyChooseUs.map((item) => (
            <div
              key={item.title}
              className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#059669] text-2xl drop-shadow-sm">
                  {item.icon}
                </span>
              </div>
              <h3 className="text-base font-semibold text-on-surface mb-2">{item.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section className="max-w-7xl mx-auto px-4 pb-12 md:pb-16">
        <h2 className="text-2xl font-bold text-on-surface mb-8 text-center">Services We Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceCategories.map((category) => (
            <div
              key={category.title}
              className="glass-panel rounded-2xl p-6 hover:shadow-ambient-hover transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#059669] text-xl drop-shadow-sm">
                    {category.icon}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-on-surface">{category.title}</h3>
              </div>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">
                      check_circle
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-7xl mx-auto px-4 pb-12 md:pb-16">
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-on-surface mb-6">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: "business", label: "Company Name", value: "Pavan Home Solutions" },
              { icon: "person", label: "Founder", value: "Pavan Gupta" },
              {
                icon: "location_on",
                label: "Address",
                value:
                  "LIG 38, W-Block, Gulmohar Vihar, Keshav Nagar, Juhi, Kanpur – 208014, Uttar Pradesh, India",
              },
              {
                icon: "email",
                label: "Email",
                value: "pavanhomess@gmail.com",
                href: "mailto:pavanhomess@gmail.com",
              },
              { icon: "phone", label: "Phone", value: "9648801462", href: "tel:9648801462" },
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
