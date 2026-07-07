import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ReviewsConsole from "./ReviewsConsole";

export interface SerializedReview {
  id: string;
  booking_id: string;
  partner_id: string | null;
  customer_id: string;
  service_id: string | null;
  rating: number;
  comment: string | null;
  quality_rating: number | null;
  behaviour_rating: number | null;
  timeliness_rating: number | null;
  value_rating: number | null;
  review_tags: string[];
  review_images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    full_name: string;
    email: string | null;
    avatar_url: string | null;
  } | null;
  partner: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  service: {
    title: string;
    category: string;
  } | null;
}

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  // Verify auth and admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // Fetch reviews with customer, partner, and service details (defensively handle database migration missing fields)
  let reviewsData = null;
  const extendedReviewsRes = await supabase
    .from("reviews")
    .select(`
      *,
      customer:customer_id (
        full_name,
        email,
        avatar_url
      ),
      partner:partner_id (
        full_name,
        avatar_url
      ),
      service:service_id (
        title,
        category
      )
    `)
    .order("created_at", { ascending: false });

  if (extendedReviewsRes.error) {
    console.warn("Extended reviews query failed for admin, trying basic query:", extendedReviewsRes.error.message);
    const basicReviewsRes = await supabase
      .from("reviews")
      .select(`
        id,
        booking_id,
        partner_id,
        customer_id,
        service_id,
        rating,
        comment,
        created_at,
        customer:customer_id (
          full_name,
          email,
          avatar_url
        ),
        partner:partner_id (
          full_name,
          avatar_url
        ),
        service:service_id (
          title,
          category
        )
      `)
      .order("created_at", { ascending: false });

    if (!basicReviewsRes.error && basicReviewsRes.data) {
      reviewsData = basicReviewsRes.data.map(r => ({
        ...r,
        quality_rating: null,
        behaviour_rating: null,
        timeliness_rating: null,
        value_rating: null,
        review_tags: [] as string[],
        review_images: [] as string[],
        status: "approved" as const, // Treat all legacy reviews as approved/live
        approved_by: null,
        approved_at: null,
        updated_at: r.created_at
      }));
    } else {
      console.error("Basic reviews fallback query for admin failed:", basicReviewsRes.error?.message);
    }
  } else {
    reviewsData = extendedReviewsRes.data;
  }

  const reviews = (reviewsData || []) as unknown as SerializedReview[];

  return (
    <div className="flex-grow p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full font-body selection:bg-secondary/30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
            Review Moderation
          </h1>
          <p className="text-xs text-on-surface-variant/70 font-semibold mt-1">
            Approve, reject, or hide customer ratings & reviews.
          </p>
        </div>
      </div>

      <ReviewsConsole initialReviews={reviews} />
    </div>
  );
}
