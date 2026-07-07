import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface ReviewDetails {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  review_tags: string[];
  review_images: string[];
  booking: {
    services: {
      title: string;
    } | null;
  } | null;
}

export default async function CustomerReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all reviews submitted by this customer (defensively handle database migration missing fields)
  let reviewsData = null;
  const extendedReviewsRes = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      review_tags,
      review_images,
      booking:booking_id (
        services:service_id (
          title
        )
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (extendedReviewsRes.error) {
    console.warn("Extended reviews query failed for customer, trying basic query:", extendedReviewsRes.error.message);
    const basicReviewsRes = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        booking:booking_id (
          services:service_id (
            title
          )
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (!basicReviewsRes.error && basicReviewsRes.data) {
      reviewsData = basicReviewsRes.data.map(r => ({
        ...r,
        review_tags: [] as string[],
        review_images: [] as string[]
      }));
    } else {
      console.error("Basic reviews fallback query for customer failed:", basicReviewsRes.error?.message);
    }
  } else {
    reviewsData = extendedReviewsRes.data;
  }

  const reviews = (reviewsData || []) as unknown as ReviewDetails[];

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      {/* Navy Header Section */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/customer/profile"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-[20px] md:text-[24px] font-extrabold tracking-wide">My Reviews</h1>
            <p className="text-[12px] text-on-primary/60 font-medium">Your ratings and feedback</p>
          </div>
        </div>
      </div>

      {/* Main Reviews Container */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-5 space-y-4">
        {reviews.length === 0 ? (
          /* Empty State */
          <div className="glass-panel p-10 rounded-[20px] bg-white/60 backdrop-blur-xl border border-outline-variant/10 flex flex-col items-center justify-center text-center mt-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-3xl">rate_review</span>
            </div>
            <h3 className="text-base font-bold text-primary font-headline">No reviews submitted yet</h3>
            <p className="text-xs text-on-surface-variant max-w-[280px] mt-1 mb-6">
              You can rate and review your bookings once they are marked completed by the professional.
            </p>
            <Link
              href="/customer/bookings"
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-xs transition-transform active:scale-95 hover:opacity-90 shadow-sm"
            >
              Go to bookings
            </Link>
          </div>
        ) : (
          /* Reviews List */
          reviews.map((review) => {
            const serviceTitle = review.booking?.services?.title ?? "Service Completed";
            const reviewDate = new Date(review.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={review.id}
                className="glass-panel p-5 rounded-[20px] bg-white/60 backdrop-blur-xl border border-outline-variant/10 shadow-sm hover:translate-y-[-2px] transition-transform duration-200"
              >
                {/* Top Row: Service & Date */}
                <div className="flex justify-between items-start gap-4 mb-2.5">
                  <div>
                    <h3 className="font-headline font-black text-sm md:text-base text-primary leading-snug">
                      {serviceTitle}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/60 font-semibold">{reviewDate}</p>
                  </div>
                  <div className="flex gap-[1px]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-[15px] ${
                          star <= review.rating ? "text-secondary" : "text-on-surface-variant/20"
                        }`}
                        style={star <= review.rating ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {review.review_tags && review.review_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
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

                {/* Comment Text */}
                {review.comment && (
                  <p className="text-xs md:text-sm text-on-surface-variant italic bg-surface-container-lowest/40 p-3 rounded-xl border border-outline-variant/5">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}

                {/* Images */}
                {review.review_images && review.review_images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {review.review_images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/20 shadow-xs"
                      >
                        <Image
                          src={img}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}
