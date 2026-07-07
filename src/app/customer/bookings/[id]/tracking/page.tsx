import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import TrackingClient from "./TrackingClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Booking Status | PHS Cleaning Company",
    description: "View your booking status and details.",
  };
}

interface SubcategoryInfo {
  subcategory_name: string;
  icon_name: string;
}

interface ServiceInfo {
  title: string;
  category: string;
  subcategories: SubcategoryInfo | null;
}

interface PartnerInfo {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating_avg: number | null;
  jobs_accepted_count: number | null;
}

interface BookingDetails {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  total_amount: number;
  address: string | null;
  city: string | null;
  arrival_otp: string | null;
  arrival_otp_verified: boolean;
  completion_otp: string | null;
  completion_otp_verified: boolean;
  services: ServiceInfo | null;
  partner: PartnerInfo | null;
  started_at: string | null;
  pricing_model: "fixed" | "hourly" | null;
  selected_duration_minutes: number | null;
  notified_30m_remaining: boolean | null;
  notified_time_completed: boolean | null;
}

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingTrackingPage({ params }: TrackingPageProps) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch booking with service + subcategory + partner details
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      created_at,
      total_amount,
      address,
      city,
      arrival_otp,
      arrival_otp_verified,
      completion_otp,
      completion_otp_verified,
      started_at,
      pricing_model,
      selected_duration_minutes,
      notified_30m_remaining,
      notified_time_completed,
      services (
        title,
        category,
        subcategories (
          subcategory_name,
          icon_name
        )
      ),
      partner:partner_id (
        full_name,
        avatar_url,
        phone,
        rating_avg,
        jobs_accepted_count
      )
    `)
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single();

  const booking = bookingData as unknown as BookingDetails | null;

  if (!booking) {
    redirect("/customer/bookings");
  }

  // Fetch existing review if booking is completed
  let existingReview: {
    rating: number;
    comment: string | null;
    quality_rating?: number | null;
    behaviour_rating?: number | null;
    timeliness_rating?: number | null;
    value_rating?: number | null;
    review_tags?: string[] | null;
    review_images?: string[] | null;
  } | null = null;
  if (booking.status === "completed") {
    const extendedReviewRes = await supabase
      .from("reviews")
      .select("rating, comment, quality_rating, behaviour_rating, timeliness_rating, value_rating, review_tags, review_images")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (extendedReviewRes.error) {
      console.warn("Extended review query failed on tracking, trying basic query:", extendedReviewRes.error.message);
      const basicReviewRes = await supabase
        .from("reviews")
        .select("rating, comment")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (basicReviewRes.data) {
        existingReview = {
          ...basicReviewRes.data,
          quality_rating: null,
          behaviour_rating: null,
          timeliness_rating: null,
          value_rating: null,
          review_tags: [],
          review_images: [],
        };
      }
    } else if (extendedReviewRes.data) {
      existingReview = extendedReviewRes.data;
    }
  }

  // Fetch booking extensions
  const { data: extensionsData } = await supabase
    .from("booking_extensions")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  const extensions = (extensionsData || []) as any[];

  return (
    <TrackingClient
      initialBooking={booking}
      initialExtensions={extensions}
      existingReview={existingReview}
    />
  );
}
