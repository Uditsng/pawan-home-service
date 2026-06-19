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
  comment?: string
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

  return { success: true };
}
