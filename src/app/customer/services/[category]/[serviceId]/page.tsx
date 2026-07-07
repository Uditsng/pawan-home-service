import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import DynamicServiceConfigurator from "@/components/DynamicServiceConfigurator";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import { formatStartingPrice } from "@/utils/pricingEngine";
import { Service, ServiceVariant, ServiceAddon, ServicePricingRule, ServicePageContent } from "@/lib/types";

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
  pricing_model?: "fixed" | "hourly" | "area" | "quantity" | "inspection" | "distance" | "hybrid" | null;

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

  // Fetch approved reviews (defensively handle database migration missing fields)
  let reviewsData = null;
  const extendedReviewsRes = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      quality_rating,
      behaviour_rating,
      timeliness_rating,
      value_rating,
      review_tags,
      review_images,
      customer:customer_id (
        full_name,
        avatar_url
      )
    `)
    .eq("service_id", service.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (extendedReviewsRes.error) {
    console.warn("Extended reviews query failed, trying basic query:", extendedReviewsRes.error.message);
    const basicReviewsRes = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        customer:customer_id (
          full_name,
          avatar_url
        )
      `)
      .eq("service_id", service.id)
      .order("created_at", { ascending: false });

    if (!basicReviewsRes.error && basicReviewsRes.data) {
      reviewsData = basicReviewsRes.data.map(r => ({
        ...r,
        quality_rating: null,
        behaviour_rating: null,
        timeliness_rating: null,
        value_rating: null,
        review_tags: [] as string[],
        review_images: [] as string[]
      }));
    } else {
      console.error("Basic reviews fallback query also failed:", basicReviewsRes.error?.message);
    }
  } else {
    reviewsData = extendedReviewsRes.data;
  }

  interface PublicReview {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    quality_rating: number | null;
    behaviour_rating: number | null;
    timeliness_rating: number | null;
    value_rating: number | null;
    review_tags: string[];
    review_images: string[];
    customer: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }

  const reviews = (reviewsData || []) as unknown as PublicReview[];
  const totalReviewsCount = reviews.length;
  const averageRating = totalReviewsCount > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
    : null;

  const getCategoryAverage = (key: keyof Pick<PublicReview, 'quality_rating' | 'behaviour_rating' | 'timeliness_rating' | 'value_rating'>) => {
    const ratedReviews = reviews.filter(r => r[key] !== null && r[key] !== undefined && r[key]! > 0);
    if (ratedReviews.length === 0) return null;
    return (ratedReviews.reduce((sum, r) => sum + (r[key] as number), 0) / ratedReviews.length).toFixed(1);
  };

  const avgQuality = getCategoryAverage('quality_rating');
  const avgBehaviour = getCategoryAverage('behaviour_rating');
  const avgTimeliness = getCategoryAverage('timeliness_rating');
  const avgValue = getCategoryAverage('value_rating');

  // Fetch variants, addons, and surcharge rules in parallel
  const [variantsRes, addonsRes, rulesRes] = await Promise.all([
    supabase
      .from("service_variants")
      .select("*")
      .eq("service_id", service.id)
      .eq("is_active", true)
      .order("price", { ascending: true }),
    supabase
      .from("service_addons")
      .select("*")
      .eq("service_id", service.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("service_pricing_rules")
      .select("*")
      .or(`service_id.eq.${service.id},service_id.is.null`)
      .eq("is_active", true)
  ]);

  const variants = (variantsRes.data || []) as ServiceVariant[];
  const addons = (addonsRes.data || []) as ServiceAddon[];
  const rules = (rulesRes.data || []) as ServicePricingRule[];

  const content = service.page_content || {};
  const iconName = service.subcategories?.icon_name || "sparkles";

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
      <div className="bg-surface-container pt-4 md:pt-6 px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto mb-4">
          <Link href={`/customer/services/${resolvedParams.category}/sub/${service.subcategory_id}`} className="inline-flex items-center gap-2 text-on-surface hover:opacity-80 transition-all">
            <span className="material-symbols-outlined text-[20px] md:text-[22px]">arrow_back</span>
            <span className="text-xs md:text-sm font-semibold">Back to Services</span>
          </Link>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-between relative z-10 pb-6 md:pb-10">
          <div className="flex-1 w-full">
            {/* Icon + Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <ServiceIconComponent iconName={iconName} className="w-7 h-7 md:w-8 md:h-8 text-emerald-600 drop-shadow-sm" />
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
                <span className="material-symbols-outlined text-yellow-500 text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> {averageRating ? `${averageRating} (${totalReviewsCount})` : "No ratings yet"}
              </span>
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Verified
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface px-2 py-1.5 md:py-2 rounded-full font-bold shadow-sm text-xs md:text-sm border border-outline-variant/30">
                {service.original_price ? (
                  <>
                    <span className="text-on-surface-variant/50 line-through text-xs font-semibold">₹{service.original_price}</span>
                    <span className="text-primary">{formatStartingPrice(service.base_price)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-primary">{formatStartingPrice(service.base_price, service.pricing_model ?? undefined)}</span>
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
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-8 md:space-y-16">

        {/* What Does Our Expert Do? */}
        <section>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-1 font-headline tracking-tighter">What Does Our Expert Do?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {/* Included */}
            <div className="px-0 py-2 md:py-4">
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

        {/* Pricing / Booking Section */}
        <DynamicServiceConfigurator
          key={service.id}
          service={service as unknown as Service}
          variants={variants}
          addons={addons}
          surchargeRules={rules}
          categorySlug={resolvedParams.category}
          subcategoryName={service.subcategories?.subcategory_name || "Service"}
          iconName={iconName}
        />

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

        {/* Customer Reviews Section */}
        <section className="max-w-4xl mx-auto border-t border-outline-variant/20 pt-8 md:pt-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 md:mb-10 font-headline tracking-tighter">Customer Reviews</h2>
          
          {totalReviewsCount === 0 ? (
            <div className="text-center bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 max-w-lg mx-auto">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">rate_review</span>
              <p className="font-bold text-primary font-headline text-sm md:text-base">No reviews yet</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Be the first to review this service after completing your booking!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Reviews Summary Stats */}
              <div className="bg-surface-container-low/40 rounded-3xl p-6 border border-outline-variant/10 space-y-5 lg:col-span-1 shadow-xs">
                <div className="text-center">
                  <h3 className="text-4xl md:text-5xl font-black text-primary font-headline tracking-tighter">{averageRating}</h3>
                  <div className="flex justify-center gap-0.5 mt-1.5 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-xl ${
                          star <= Math.round(Number(averageRating || 0)) ? "text-secondary" : "text-on-surface-variant/20"
                        }`}
                        style={star <= Math.round(Number(averageRating || 0)) ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant font-bold">Based on {totalReviewsCount} review{totalReviewsCount > 1 ? "s" : ""}</p>
                </div>

                {/* Category averages */}
                <div className="border-t border-outline-variant/10 pt-4 space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 mb-2">Category Scores</h4>
                  {avgQuality && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant/70 font-semibold">Quality of Work</span>
                      <span className="font-bold text-primary">{avgQuality} / 5</span>
                    </div>
                  )}
                  {avgBehaviour && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant/70 font-semibold">Behaviour</span>
                      <span className="font-bold text-primary">{avgBehaviour} / 5</span>
                    </div>
                  )}
                  {avgTimeliness && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant/70 font-semibold">Timeliness</span>
                      <span className="font-bold text-primary">{avgTimeliness} / 5</span>
                    </div>
                  )}
                  {avgValue && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant/70 font-semibold">Value for Money</span>
                      <span className="font-bold text-primary">{avgValue} / 5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 lg:col-span-2">
                {reviews.map((review) => {
                  const rDate = new Date(review.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const initial = review.customer?.full_name ? review.customer.full_name.charAt(0).toUpperCase() : "?";

                  return (
                    <div
                      key={review.id}
                      className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 space-y-3.5 shadow-xs"
                    >
                      {/* Customer Profile & Date */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-fixed/20 text-primary-fixed-variant flex items-center justify-center font-bold text-sm shrink-0 border border-outline-variant/5 relative">
                            {review.customer?.avatar_url ? (
                              <Image
                                src={review.customer.avatar_url}
                                alt="User avatar"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs md:text-sm font-bold text-primary leading-tight">
                              {review.customer?.full_name || "Customer"}
                            </h4>
                            <p className="text-[9px] text-on-surface-variant/50 font-bold">{rDate}</p>
                          </div>
                        </div>
                        <div className="flex gap-[0.5px]">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`material-symbols-outlined text-sm ${
                                star <= review.rating ? "text-secondary" : "text-on-surface-variant/20"
                              }`}
                              style={star <= review.rating ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Selected Tags */}
                      {review.review_tags && review.review_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {review.review_tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-bold bg-secondary/10 text-primary border border-secondary/15 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Review Comment */}
                      {review.comment && (
                        <p className="text-xs md:text-sm text-on-surface-variant italic font-medium leading-relaxed">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}

                      {/* Review Images */}
                      {review.review_images && review.review_images.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {review.review_images.map((img, idx) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/10 shadow-xs hover:opacity-95 transition-opacity cursor-zoom-in"
                            >
                              <Image
                                src={img}
                                alt={`User review attachment ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </main>


    </div>
  );
}
