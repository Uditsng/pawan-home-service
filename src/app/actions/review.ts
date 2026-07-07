"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyPartner } from "@/lib/notifications";

// ─── Input Validation Constants ──────────────────────────────
const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 500;

// ─── SUBMIT REVIEW ───────────────────────────────────────────
// Called by the customer after a completed booking.
// Validates ownership, status, and prevents duplicate reviews.

export async function submitReview(
  bookingId: string,
  rating: number,
  comment?: string,
  categoryRatings?: {
    quality?: number;
    behaviour?: number;
    timeliness?: number;
    value?: number;
  },
  tags?: string[],
  images?: string[]
): Promise<{ success: boolean; error?: string }> {
  // ── 1. Authenticate ────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // ── 2. Validate input ──────────────────────────────────────
  const ratingInt = Math.round(rating);
  if (!Number.isInteger(ratingInt) || ratingInt < MIN_RATING || ratingInt > MAX_RATING) {
    return { success: false, error: "Rating must be between 1 and 5." };
  }

  const sanitizedComment = comment?.trim().slice(0, MAX_COMMENT_LENGTH) || null;

  // Validate category ratings if provided
  let quality: number | null = null;
  let behaviour: number | null = null;
  let timeliness: number | null = null;
  let value: number | null = null;

  if (categoryRatings) {
    if (categoryRatings.quality !== undefined) {
      const q = Math.round(categoryRatings.quality);
      if (q < 1 || q > 5) return { success: false, error: "Quality rating must be between 1 and 5." };
      quality = q;
    }
    if (categoryRatings.behaviour !== undefined) {
      const b = Math.round(categoryRatings.behaviour);
      if (b < 1 || b > 5) return { success: false, error: "Behaviour rating must be between 1 and 5." };
      behaviour = b;
    }
    if (categoryRatings.timeliness !== undefined) {
      const t = Math.round(categoryRatings.timeliness);
      if (t < 1 || t > 5) return { success: false, error: "Timeliness rating must be between 1 and 5." };
      timeliness = t;
    }
    if (categoryRatings.value !== undefined) {
      const v = Math.round(categoryRatings.value);
      if (v < 1 || v > 5) return { success: false, error: "Value rating must be between 1 and 5." };
      value = v;
    }
  }

  // ── 3. Fetch booking and validate ownership + status ───────
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, customer_id, partner_id, service_id, status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.customer_id !== user.id) {
    return { success: false, error: "You can only review your own bookings." };
  }

  if (booking.status !== "completed") {
    return {
      success: false,
      error: "You can only review completed bookings.",
    };
  }

  if (!booking.partner_id) {
    return {
      success: false,
      error: "No professional was assigned to this booking.",
    };
  }

  // ── 4. Check for existing review (duplicate prevention) ────
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingReview) {
    return {
      success: false,
      error: "You have already reviewed this booking.",
    };
  }

  // ── 5. Insert the review ──────────────────────────────────
  const { error: insertError } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    partner_id: booking.partner_id,
    customer_id: user.id,
    service_id: booking.service_id || null,
    rating: ratingInt,
    comment: sanitizedComment,
    quality_rating: quality,
    behaviour_rating: behaviour,
    timeliness_rating: timeliness,
    value_rating: value,
    review_tags: tags || [],
    review_images: images || [],
    status: "pending",
  });

  if (insertError) {
    console.error("submitReview insertError:", insertError);
    // Handle unique constraint violation gracefully
    if (insertError.code === "23505") {
      return {
        success: false,
        error: "You have already reviewed this booking.",
      };
    }
    return { success: false, error: "Failed to submit review. Please try again." };
  }

  // ── 6. Log the review event ───────────────────────────────
  // Audit trail — fire-and-forget
  void supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "REVIEW_SUBMITTED",
    actor: "USER",
    metadata: { rating: ratingInt, has_comment: !!sanitizedComment },
  });

  void supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "REVIEW_SUBMITTED",
    actor: "USER",
    metadata: {
      rating: ratingInt,
      customer_id: user.id,
      partner_id: booking.partner_id,
    },
  });

  // ── 7. Notify the partner ─────────────────────────────────
  void notifyPartner(
    booking.partner_id,
    "New Review Received!",
    `A customer rated your service ${ratingInt}★${sanitizedComment ? " with feedback." : "."}`,
    "review_received",
    { booking_id: bookingId, rating: ratingInt }
  );

  // ── 8. Revalidate relevant pages ──────────────────────────
  revalidatePath("/customer/bookings", "layout");
  revalidatePath(`/customer/bookings/${bookingId}/tracking`, "page");
  revalidatePath("/partner/performance", "page");
  revalidatePath("/partner/dashboard", "page");
  revalidatePath("/customer/services", "layout");

  return { success: true };
}

// ─── MODERATE REVIEW ──────────────────────────────────────────
// Called by admins to approve, reject, or hide reviews.
export async function moderateReview(
  reviewId: string,
  status: "approved" | "rejected" | "hidden",
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify auth and admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  // Fetch the review details
  const { data: review } = await supabase
    .from("reviews")
    .select("booking_id, partner_id, service_id")
    .eq("id", reviewId)
    .single();

  if (!review) {
    return { success: false, error: "Review not found." };
  }

  const now = new Date().toISOString();

  // Update status
  const { error: updateError } = await supabase
    .from("reviews")
    .update({
      status,
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? now : null,
      updated_at: now,
    })
    .eq("id", reviewId);

  if (updateError) {
    console.error("moderateReview updateError:", updateError);
    return { success: false, error: "Failed to moderate review." };
  }

  // Log moderation event
  void supabase.from("booking_events").insert({
    booking_id: review.booking_id,
    event_type: `REVIEW_${status.toUpperCase()}`,
    actor: "ADMIN",
    metadata: { review_id: reviewId, moderated_by: user.id },
  });

  void supabase.from("booking_audit_trail").insert({
    booking_id: review.booking_id,
    action: `REVIEW_${status.toUpperCase()}`,
    actor: "ADMIN",
    metadata: { review_id: reviewId, moderated_by: user.id },
  });

  // Revalidate relevant pages
  revalidatePath("/admin/reviews", "page");
  revalidatePath("/partner/performance", "page");
  revalidatePath("/partner/dashboard", "page");
  revalidatePath("/customer/bookings", "layout");
  revalidatePath("/customer/services", "layout");
  if (review.booking_id) {
    revalidatePath(`/customer/bookings/${review.booking_id}/tracking`, "page");
  }

  return { success: true };
}

// ─── GET PENDING REVIEWS COUNT ─────────────────────────────────
export async function getPendingReviewsCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    console.error("getPendingReviewsCount error:", error);
    return 0;
  }

  return count || 0;
}
