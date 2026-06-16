import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";

interface ServicePageContent {
  about_text?: string;
  included_features?: string[];
  excluded_features?: string[];
  faqs?: { question: string; answer: string }[];
  why_choose_us?: { icon: string; title: string; desc: string }[];
  how_to_book_steps?: { step: number; title: string; desc: string }[];
}

interface ServiceWithSubcategory {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  image_url?: string;
  category?: string;
  page_content: ServicePageContent;
  subcategory_id: string;
  price_breakdown: string | null;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function ServiceDetailsPage({ params }: { params: Promise<{ category: string, serviceId: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select(`
      *,
      subcategories (
        subcategory_name,
        icon_name,
        categories (
          category_name
        )
      )
    `)
    .eq("id", resolvedParams.serviceId)
    .single() as { data: ServiceWithSubcategory | null };

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body bg-surface text-on-surface">
        <div className="text-center">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">error_outline</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mb-4 font-headline">Service Not Found</h1>
          <Link href={`/customer/services/${resolvedParams.category}`} className="text-primary hover:underline font-bold">Go back to category</Link>
        </div>
      </div>
    );
  }

  const content = service.page_content || {};
  const iconName = service.subcategories?.icon_name || "home_repair_service";

  const catImageMap: Record<string, string> = {
    'pest_control': '/assets/indian_pest_control_pro_1776155620526.png',
    'cleaning': '/assets/hero_cleaning_1773410829223.png',
    'electrical': '/assets/hero_ac_repair_1773410812102.png',
    'hvac': '/assets/hero_ac_repair_1773410812102.png',
    'plumbing': '/assets/banner_cleaning_1773410846591.png',
    'landscaping': '/assets/indian_gardening_pro_1776693713648.png'
  };

  const displayImage = service.image_url || catImageMap[service.category || ''] || '/assets/hero_cleaning_1773410829223.png';

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-28 md:pb-32">
      {/* Top Banner & Header */}
      <div className="bg-surface-container pt-6 md:pt-10 px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-between relative z-10">
          <div className="flex-1 w-full">
            {/* Icon + Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl md:text-3xl text-[#059669] drop-shadow-sm">{iconName}</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-on-surface font-headline tracking-tight">{service.title}</h1>
                {/* <p className="text-xs md:text-sm text-on-surface-variant font-medium mt-1">{subcatName}</p> */}
              </div>
            </div>

            <p className="text-sm md:text-lg text-on-surface-variant mb-5 md:mb-8 max-w-lg leading-relaxed">
              {content.about_text?.split('.')[0] || service.description || "Professional and top-tier services tailored to you."}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-yellow-500 text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.8 (10k+)
              </span>
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Verified
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                {service.original_price ? (
                  <>
                    <span className="text-on-surface-variant/50 line-through text-xs font-semibold">₹{service.original_price}</span>
                    <span className="text-primary">₹{service.base_price}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-primary text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>currency_rupee</span> {service.base_price}
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex-1 w-full md:w-auto">
            <div className="relative w-full h-[200px] md:h-[300px] lg:h-[350px] max-w-lg mx-auto md:mx-0">
              <Image
                src={displayImage}
                alt={service.title}
                fill
                loading="lazy"
                className="rounded-2xl md:rounded-3xl shadow-xl object-cover border border-outline-variant/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-16 md:space-y-24">

        {/* What Does Our Expert Do? */}
        <section>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-1 font-headline tracking-tighter">What Does Our Expert Do?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {/* Included */}
            <div className="px-0 py-6 md:py-8">
              <h3 className="text-on-surface font-headline tracking-tight font-bold flex items-center gap-2 mb-4 md:mb-6 text-sm md:text-base">
                <span className="material-symbols-outlined rounded-full bg-primary/20 text-primary p-1 text-[18px] md:text-[24px]">check</span> What&apos;s Included
              </h3>
              <ul className="space-y-2">
                {(content.included_features && content.included_features.length > 0 ? content.included_features : ["Comprehensive Professional Service", "Standard Tools & Equipment", "Trusted & Background verified experts"]).map((item: string, i: number) => (
                  <li key={i} className="flex gap-2 md:gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary shrink-0 text-lg md:text-xl">done</span>
                    <span className="text-xs md:text-[15px] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Excluded */}
            <div className="px-0 py-6 md:py-8">
              <h3 className="text-on-surface font-headline tracking-tight font-bold flex items-center gap-2 mb-4 md:mb-6 text-sm md:text-base">
                <span className="material-symbols-outlined rounded-full bg-red-100 text-red-600 p-1 text-[18px] md:text-[24px]">close</span> What&apos;s Excluded
              </h3>
              <ul className="space-y-2">
                {(content.excluded_features && content.excluded_features.length > 0 ? content.excluded_features : ["Spare Parts not included", "Any masonry work required"]).map((item: string, i: number) => (
                  <li key={i} className="flex gap-2 md:gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-red-400 shrink-0 text-lg md:text-xl">close</span>
                    <span className="text-xs md:text-[15px] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing Details */}
        {service.price_breakdown && (
          <section className="max-w-3xl mx-auto">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-secondary/10 px-3 py-1 rounded-full text-secondary font-bold text-xs border border-secondary/20">
                    <span className="material-symbols-outlined text-xs font-bold">payments</span> Pricing Details
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-on-surface font-headline tracking-tighter">
                    Transparent Pricing & Rates
                  </h3>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed max-w-md">
                    We charge a standard base rate for our expert service. Additional work, custom parts, or special requirements are billed transparently as per the rate details.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 min-w-[220px] shadow-xs flex flex-col justify-center">
                  <span className="text-[10px] md:text-xs text-on-surface-variant font-bold uppercase tracking-wider block mb-1">Base Price</span>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    {service.original_price && (
                      <span className="text-sm md:text-base text-on-surface-variant/50 line-through font-semibold">₹{service.original_price}</span>
                    )}
                    <span className="text-3xl font-black text-primary font-headline tracking-tighter">₹{service.base_price}</span>
                  </div>
                  <div className="border-t border-outline-variant/30 pt-2 mt-2">
                    <span className="text-[10px] text-on-surface-variant/80 font-bold uppercase tracking-wider block mb-1">Rate Details</span>
                    <span className="text-xs md:text-sm text-on-surface font-medium leading-tight block">{service.price_breakdown}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Why Choose Us */}
        {content.why_choose_us && content.why_choose_us.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 md:mb-10 font-headline tracking-tighter">Why Choose Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.why_choose_us.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 md:p-6 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-sm md:text-base mb-1">{item.title}</h4>
                    <p className="text-xs md:text-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {content.faqs && content.faqs.length > 0 && (
          <section className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 md:mb-10 font-headline tracking-tighter">Frequently Asked Questions</h2>
            <div className="space-y-3 md:space-y-4">
              {content.faqs.map((faq, i) => (
                <details key={i} className="group bg-surface-container-low rounded-xl md:rounded-2xl border border-outline-variant/20 [&_summary::-webkit-details-marker]:hidden cursor-pointer">
                  <summary className="flex items-center justify-between p-4 md:p-6 font-bold text-base md:text-lg select-none text-on-surface">
                    {faq.question}
                    <span className="material-symbols-outlined text-primary transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <div className="px-4 md:px-6 pb-4 md:pb-6 text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-3 md:pt-4 mt-2 text-sm md:text-base">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 w-full bg-surface-container-lowest border-t border-outline-variant/30 p-3 md:p-4 z-50 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-2">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              {/* {service.original_price && (
                <span className="text-xs text-on-surface-variant/50 line-through font-semibold">₹{service.original_price}</span>
              )} */}
              <span className="text-lg md:text-xl font-extrabold font-headline text-on-surface tracking-tighter">₹{service.base_price}</span>
              {/* {service.price_breakdown && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full border border-secondary/20">
                  Rates Apply
                </span>
              )} */}
            </div>
            <div className="text-[10px] md:text-xs text-on-surface-variant font-medium">
              {service.price_breakdown ? "Base Price" : "Standard Fix Rate"}
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[280px]">
            <AddToCartButton item={{
              serviceId: service.id,
              title: service.title,
              iconName: iconName,
              basePrice: service.base_price,
              subcategoryName: service.subcategories?.subcategory_name || "Service",
              categorySlug: resolvedParams.category
            }} />
            <Link href={`/customer/checkout/schedule?serviceId=${service.id}`} className="px-6 md:px-8 py-2.5 text-xs md:text-sm bg-primary text-white font-headline font-bold rounded-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center shrink-0">
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
