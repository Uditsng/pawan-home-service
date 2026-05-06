import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

export default async function ServiceDetailsPage({ params }: { params: Promise<{ category: string, serviceId: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", resolvedParams.serviceId)
    .single();

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body bg-surface text-on-surface">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4 font-headline">Service Not Found</h1>
          <Link href={`/services/${resolvedParams.category}`} className="text-primary hover:underline font-bold">Go back to category</Link>
        </div>
      </div>
    );
  }

  const content = service.page_content || {};

  const catImageMap: Record<string, string> = {
    'pest_control': '/assets/indian_pest_control_pro_1776155620526.png',
    'cleaning': '/assets/hero_cleaning_1773410829223.png',
    'electrical': '/assets/hero_ac_repair_1773410812102.png',
    'hvac': '/assets/hero_ac_repair_1773410812102.png',
    'plumbing': '/assets/banner_cleaning_1773410846591.png',
    'landscaping': '/assets/indian_gardening_pro_1776693713648.png'
  };

  const displayImage = service.image_url || catImageMap[service.category] || '/assets/hero_cleaning_1773410829223.png';

  const defaultIncludes = ["Comprehensive Professional Service", "Standard Tools & Equipment", "Trusted & Background verified experts"];
  const defaultExcludes = ["Spare Parts not included", "Any masonry work required"];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-28 md:pb-32">
      {/* Top Banner & Header */}
      <div className="bg-surface-container pt-6 md:pt-10 px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-between relative z-10">
          <div className="flex-1 w-full">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-on-surface font-headline mb-3 md:mb-4 tracking-tight">{service.title}</h1>
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
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>currency_rupee</span> {service.base_price}
              </span>
            </div>
          </div>
          <div className="flex-1 w-full md:w-auto">
            <div className="relative w-full h-[200px] md:h-[300px] lg:h-[350px] max-w-lg mx-auto md:mx-0">
              <Image 
                src={displayImage} 
                alt={service.title} 
                fill
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
                {(content.included_features || defaultIncludes).map((item: string, i: number) => (
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
                {(content.excluded_features || defaultExcludes).map((item: string, i: number) => (
                  <li key={i} className="flex gap-2 md:gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-red-400 shrink-0 text-lg md:text-xl">close</span>
                    <span className="text-xs md:text-[15px] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        {content.faqs && content.faqs.length > 0 && (
          <section className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 md:mb-10 font-headline tracking-tighter">Frequently Asked Questions</h2>
            <div className="space-y-3 md:space-y-4">
              {content.faqs.map((faq: any, i: number) => (
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
      <div className="fixed bottom-0 w-full bg-surface-container-lowest border-t border-outline-variant/30 p-3 md:p-4 z-50 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div>
            <div className="text-lg md:text-xl font-extrabold font-headline text-on-surface tracking-tighter">₹{service.base_price}</div>
            <div className="text-[10px] md:text-xs text-on-surface-variant font-medium">Standard Fix Rate</div>
          </div>
          <Link href={`/checkout/schedule?serviceId=${service.id}`} className="btn-cta px-6 md:px-8 py-3 md:py-3.5 rounded-full font-bold shadow-lg font-headline transition-transform active:scale-95 block text-center text-sm md:text-base">
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
