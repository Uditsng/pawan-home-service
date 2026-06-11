"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { BookingStatus } from "@/lib/types";
import { notifyCustomer, notifyPartner } from "@/lib/notifications";
import crypto from "crypto";

// ─── Helper: Get authenticated partner or throw ──────────────

async function getAuthenticatedPartner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Not authenticated" };
  }

  return { supabase, user, error: null };
}

// ─── Helper: Log a booking event ─────────────────────────────

async function logBookingEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  eventType: string,
  actor: "USER" | "PARTNER" | "SYSTEM",
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: eventType,
    actor,
    metadata,
  });
}

// ─── REJECT JOB ──────────────────────────────────────────────
// When an auto-assigned partner can't do a job (sick, emergency, etc.)
// Logs rejection, triggers reassignment to next eligible partner.

export async function rejectJob(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string; reassigned?: boolean }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // Verify this booking is assigned to the current partner
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, partner_id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.partner_id !== user.id) {
    return { success: false, error: "This job is not assigned to you." };
  }

  const rejectableStatuses: BookingStatus[] = ["confirmed", "accepted"];
  if (!rejectableStatuses.includes(booking.status as BookingStatus)) {
    return {
      success: false,
      error: `Cannot reject a booking with status '${booking.status}'.`,
    };
  }

  // 1. Log the rejection
  const { error: rejectError } = await supabase
    .from("booking_rejections")
    .insert({
      booking_id: bookingId,
      partner_id: user.id,
      reason,
    });

  if (rejectError) {
    return { success: false, error: "Failed to record rejection." };
  }

  // 2. Try to reassign to another partner via RPC
  const { data: newPartnerId } = await supabase.rpc("reassign_partner", {
    p_booking_id: bookingId,
  });

  // 3. Log the event
  await logBookingEvent(supabase, bookingId, "PARTNER_REJECTED", "PARTNER", {
    rejected_by: user.id,
    reason,
    new_partner_id: newPartnerId || null,
  });

  if (!newPartnerId) {
    // No replacement found — set booking back to pending for admin handling
    await supabase
      .from("bookings")
      .update({
        partner_id: null,
        status: "pending" as BookingStatus,
      })
      .eq("id", bookingId);

    await logBookingEvent(
      supabase,
      bookingId,
      "PARTNER_REASSIGNED",
      "SYSTEM",
      {
        result: "no_partner_available",
        needs_admin_attention: true,
      }
    );
  } else {
    // Log successful reassignment
    await logBookingEvent(
      supabase,
      bookingId,
      "PARTNER_REASSIGNED",
      "SYSTEM",
      {
        new_partner_id: newPartnerId,
        result: "reassigned_successfully",
      }
    );
  }

  // Update rejection metrics for the partner
  const { data: profile } = await supabase
    .from("profiles")
    .select("jobs_cancelled_count, jobs_accepted_count")
    .eq("id", user.id)
    .single();

  if (profile) {
    const newCancelled = (profile.jobs_cancelled_count || 0) + 1;
    const accepted = profile.jobs_accepted_count || 1;
    await supabase
      .from("profiles")
      .update({
        jobs_cancelled_count: newCancelled,
        cancellation_rate: newCancelled / Math.max(accepted, 1),
      })
      .eq("id", user.id);
  }

  // ─── Notifications ─────────────────────────────────────────
  const { data: rejectBookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (rejectBookingInfo?.customer_id) {
    const svcTitle = (rejectBookingInfo.services as unknown as { title: string } | null)?.title ?? "your service";
    if (newPartnerId) {
      void notifyCustomer(
        rejectBookingInfo.customer_id,
        "New Professional Assigned",
        `A new professional has been assigned to your ${svcTitle} booking.`,
        "partner_reassigned",
        { booking_id: bookingId }
      );
    } else {
      void notifyCustomer(
        rejectBookingInfo.customer_id,
        "Finding a New Professional",
        `We're finding a new professional for your ${svcTitle} booking. Hang tight!`,
        "partner_reassigned",
        { booking_id: bookingId }
      );
    }
  }

  if (newPartnerId) {
    void notifyPartner(
      newPartnerId,
      "New Job Assigned",
      "You've been assigned a new job. Check your dashboard for details.",
      "partner_assigned",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true, reassigned: !!newPartnerId };
}

// ─── START JOB ───────────────────────────────────────────────
// Transition: CONFIRMED/ACCEPTED → IN_PROGRESS

export async function startJob(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "in_progress" as BookingStatus,
      started_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("partner_id", user.id) // Only the assigned partner can start
    .in("status", ["confirmed", "accepted"]) // Can start from confirmed or accepted
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: "Cannot start this job. It must be in 'confirmed' or 'accepted' state.",
    };
  }

  await logBookingEvent(supabase, bookingId, "JOB_STARTED", "PARTNER", {
    partner_id: user.id,
  });

  // ─── Notification: Customer ────────────────────────────────
  const { data: startBooking } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (startBooking?.customer_id) {
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const proName = partnerProfile?.full_name ?? "Your professional";
    const svcTitle = (startBooking.services as unknown as { title: string } | null)?.title ?? "your service";
    void notifyCustomer(
      startBooking.customer_id,
      "Service Started",
      `${proName} has started your ${svcTitle} service.`,
      "service_started",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── COMPLETE JOB ────────────────────────────────────────────
// Transition: IN_PROGRESS → COMPLETED

export async function completeJob(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "completed" as BookingStatus,
      completed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("partner_id", user.id) // Only the assigned partner
    .eq("status", "in_progress") // Must be in_progress
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: "Cannot complete this job. It must be in 'in_progress' state.",
    };
  }

  await logBookingEvent(supabase, bookingId, "JOB_COMPLETED", "PARTNER", {
    partner_id: user.id,
  });

  // Fire referral reward (fire-and-forget — never blocks completion)
  void supabase.rpc("complete_referral_reward", { p_booking_id: bookingId });

  // ─── Notification: Customer ────────────────────────────────
  const { data: completeBooking } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (completeBooking?.customer_id) {
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const proName = partnerProfile?.full_name ?? "Your professional";
    const svcTitle = (completeBooking.services as unknown as { title: string } | null)?.title ?? "your service";
    void notifyCustomer(
      completeBooking.customer_id,
      "Service Completed!",
      `${proName} has completed your ${svcTitle}. Rate your experience!`,
      "service_completed",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── CANCEL JOB ──────────────────────────────────────────────
// Transition: PENDING | CONFIRMED | ACCEPTED | IN_PROGRESS → CANCELLED

export async function cancelJob(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // First verify the booking is in a cancellable state
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, partner_id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Booking not found." };
  }

  const cancellableStatuses: BookingStatus[] = [
    "pending",
    "confirmed",
    "accepted",
    "in_progress",
  ];
  if (!cancellableStatuses.includes(booking.status as BookingStatus)) {
    return {
      success: false,
      error: `Cannot cancel a booking with status '${booking.status}'.`,
    };
  }

  // Partner can only cancel bookings assigned to them
  if (booking.partner_id && booking.partner_id !== user.id) {
    return {
      success: false,
      error: "You can only cancel bookings assigned to you.",
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled" as BookingStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by: "PARTNER",
      cancellation_reason: reason,
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Failed to cancel the booking." };
  }

  // Update partner cancellation metrics
  if (booking.partner_id === user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("jobs_cancelled_count, jobs_accepted_count")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newCancelled = (profile.jobs_cancelled_count || 0) + 1;
      const accepted = profile.jobs_accepted_count || 1;
      await supabase
        .from("profiles")
        .update({
          jobs_cancelled_count: newCancelled,
          cancellation_rate: newCancelled / Math.max(accepted, 1),
        })
        .eq("id", user.id);
    }
  }

  await logBookingEvent(supabase, bookingId, "JOB_CANCELLED", "PARTNER", {
    partner_id: user.id,
    reason,
  });

  // ─── Notification: Customer ────────────────────────────────
  const { data: cancelBookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (cancelBookingInfo?.customer_id) {
    const svcTitle = (cancelBookingInfo.services as unknown as { title: string } | null)?.title ?? "your service";
    void notifyCustomer(
      cancelBookingInfo.customer_id,
      "Booking Cancelled",
      `Your ${svcTitle} booking has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
      "booking_cancelled",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── START ROUTE ──────────────────────────────────────────────
// Transition: assigned -> professional_en_route
export async function startRoute(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "professional_en_route",
    })
    .eq("id", bookingId)
    .eq("partner_id", user.id)
    .in("status", ["assigned", "confirmed"])
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: "Cannot start route. Job must be assigned.",
    };
  }

  // Log to audit trail & events
  await logBookingEvent(supabase, bookingId, "START_ROUTE", "PARTNER", { partner_id: user.id });
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "START_ROUTE",
    actor: "PARTNER",
    metadata: { partner_id: user.id }
  });

  // Notify customer
  const { data: bookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (bookingInfo?.customer_id) {
    const svcTitle = (bookingInfo.services as any)?.title ?? "your service";
    void notifyCustomer(
      bookingInfo.customer_id,
      "Professional Dispatched",
      `Your professional is on their way for the ${svcTitle} booking.`,
      "general",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── REACH LOCATION (GENERATES ARRIVAL OTP) ───────────────────
// Transition: professional_en_route -> professional_arrived -> otp_pending
export async function reachLocation(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // Generate cryptographically secure 6 digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const generatedAt = new Date().toISOString();
  // Expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // First transition status to professional_arrived, then otp_pending
  const { data: bookingArrived, error: errorArrived } = await supabase
    .from("bookings")
    .update({
      status: "professional_arrived"
    })
    .eq("id", bookingId)
    .eq("partner_id", user.id)
    .eq("status", "professional_en_route")
    .select("id")
    .single();

  if (errorArrived || !bookingArrived) {
    return {
      success: false,
      error: "Cannot mark arrived. Job must be 'professional_en_route' status.",
    };
  }

  await logBookingEvent(supabase, bookingId, "PROFESSIONAL_ARRIVED", "PARTNER", { partner_id: user.id });
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "PROFESSIONAL_ARRIVED",
    actor: "PARTNER",
    metadata: { partner_id: user.id }
  });

  // 2. Generate OTP and transition to otp_pending
  const { data: bookingOtp, error: errorOtp } = await supabase
    .from("bookings")
    .update({
      status: "otp_pending",
      arrival_otp: otp,
      arrival_otp_generated_at: generatedAt,
      arrival_otp_expires_at: expiresAt,
      arrival_otp_verified: false,
      failed_otp_attempts: 0 // reset failed attempts counter for new OTP
    })
    .eq("id", bookingId)
    .select("id")
    .single();

  if (errorOtp || !bookingOtp) {
    return {
      success: false,
      error: "Failed to generate Arrival OTP.",
    };
  }

  await logBookingEvent(supabase, bookingId, "OTP_GENERATED", "SYSTEM", { type: "arrival" });
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "OTP_GENERATED",
    actor: "SYSTEM",
    metadata: { type: "arrival", expires_at: expiresAt }
  });

  // Notify customer
  const { data: bookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (bookingInfo?.customer_id) {
    const svcTitle = (bookingInfo.services as any)?.title ?? "your service";
    void notifyCustomer(
      bookingInfo.customer_id,
      "Professional Arrived",
      `Professional has arrived for your ${svcTitle}. Please verify OTP.`,
      "general",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── VERIFY ARRIVAL OTP ───────────────────────────────────────
// Transition: otp_pending -> in_progress
export async function verifyArrivalOtp(
  bookingId: string,
  enteredOtp: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // Fetch the booking details
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("status, partner_id, arrival_otp, arrival_otp_expires_at, arrival_otp_verified, failed_otp_attempts, customer_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.partner_id !== user.id) {
    return { success: false, error: "Unauthorized: This booking is not assigned to you." };
  }

  if (booking.status !== "otp_pending" || booking.arrival_otp_verified) {
    return { success: false, error: "Booking is not in OTP pending state." };
  }

  // Cost-effective Rate Limiting / Brute-force prevention checking
  const attempts = booking.failed_otp_attempts || 0;
  if (attempts >= 5) {
    return {
      success: false,
      error: "Too many failed attempts. Verification blocked. Please contact customer support.",
    };
  }

  // Check Expiration
  if (new Date() > new Date(booking.arrival_otp_expires_at!)) {
    return { success: false, error: "OTP has expired. Please request a new one." };
  }

  // Validate OTP
  if (booking.arrival_otp !== enteredOtp.trim()) {
    // Increment failed attempts directly in bookings table
    await supabase
      .from("bookings")
      .update({ failed_otp_attempts: attempts + 1 })
      .eq("id", bookingId);

    // Log failure event
    await supabase.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "OTP_VERIFICATION_FAILED",
      actor: "PARTNER",
      metadata: { type: "arrival", attempted_otp: enteredOtp }
    });

    return {
      success: false,
      error: `Invalid OTP. ${4 - attempts} attempts remaining.`,
    };
  }

  // Success: Update booking status to in_progress
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "in_progress",
      arrival_otp_verified: true,
      arrival_otp_verified_at: now,
      service_started_at: now,
      started_at: now,
      failed_otp_attempts: 0 // Reset attempts on success
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: "Failed to start service after OTP verification." };
  }

  // Log events
  await logBookingEvent(supabase, bookingId, "OTP_VERIFIED", "SYSTEM", { type: "arrival" });
  await logBookingEvent(supabase, bookingId, "JOB_STARTED", "PARTNER", { partner_id: user.id });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "OTP_VERIFIED",
    actor: "SYSTEM",
    metadata: { type: "arrival" }
  });
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "JOB_STARTED",
    actor: "PARTNER",
    metadata: { partner_id: user.id }
  });

  // Send notifications
  if (booking.customer_id) {
    void notifyCustomer(
      booking.customer_id,
      "Service Started",
      "Your home service has officially started.",
      "service_started",
      { booking_id: bookingId }
    );
  }

  void notifyPartner(
    user.id,
    "OTP Verified. Service Started",
    "Customer verification completed. Service may begin.",
    "general",
    { booking_id: bookingId }
  );

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── REQUEST SERVICE COMPLETION (GENERATES COMPLETION OTP) ────
// Transition: in_progress -> otp_pending
export async function requestCompletion(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  const otp = crypto.randomInt(100000, 999999).toString();
  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "otp_pending",
      completion_otp: otp,
      completion_otp_generated_at: generatedAt,
      completion_otp_expires_at: expiresAt,
      completion_otp_verified: false,
      failed_otp_attempts: 0 // Reset attempts for completion OTP
    })
    .eq("id", bookingId)
    .eq("partner_id", user.id)
    .eq("status", "in_progress")
    .select("id, customer_id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: "Cannot request completion. Job must be in progress.",
    };
  }

  await logBookingEvent(supabase, bookingId, "COMPLETION_OTP_GENERATED", "SYSTEM");
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "COMPLETION_OTP_GENERATED",
    actor: "SYSTEM",
    metadata: { expires_at: expiresAt }
  });

  // Notify customer
  if (data.customer_id) {
    void notifyCustomer(
      data.customer_id,
      "Please verify service completion",
      "Your professional wants to mark the service as complete. Please verify with OTP.",
      "general",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}

// ─── VERIFY COMPLETION OTP ────────────────────────────────────
// Transition: otp_pending -> completed
export async function verifyCompletionOtp(
  bookingId: string,
  enteredOtp: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("status, partner_id, completion_otp, completion_otp_expires_at, completion_otp_verified, failed_otp_attempts, customer_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.partner_id !== user.id) {
    return { success: false, error: "Unauthorized: This booking is not assigned to you." };
  }

  if (booking.status !== "otp_pending" || booking.completion_otp_verified) {
    return { success: false, error: "Booking is not waiting for completion OTP." };
  }

  // Cost-effective Rate Limiting
  const attempts = booking.failed_otp_attempts || 0;
  if (attempts >= 5) {
    return {
      success: false,
      error: "Too many failed attempts. Verification blocked. Please contact customer support.",
    };
  }

  if (new Date() > new Date(booking.completion_otp_expires_at!)) {
    return { success: false, error: "OTP has expired. Please request a new one." };
  }

  if (booking.completion_otp !== enteredOtp.trim()) {
    await supabase
      .from("bookings")
      .update({ failed_otp_attempts: attempts + 1 })
      .eq("id", bookingId);

    await supabase.from("booking_audit_trail").insert({
      booking_id: bookingId,
      action: "COMPLETION_OTP_VERIFICATION_FAILED",
      actor: "PARTNER",
      metadata: { attempted_otp: enteredOtp }
    });

    return {
      success: false,
      error: `Invalid OTP. ${4 - attempts} attempts remaining.`,
    };
  }

  // Success: Update status to completed
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completion_otp_verified: true,
      completion_otp_verified_at: now,
      service_completed_at: now,
      completed_at: now,
      failed_otp_attempts: 0
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: "Failed to mark booking completed." };
  }

  await logBookingEvent(supabase, bookingId, "COMPLETION_OTP_VERIFIED", "SYSTEM");
  await logBookingEvent(supabase, bookingId, "JOB_COMPLETED", "PARTNER", { partner_id: user.id });

  // Fire referral reward (fire-and-forget — never blocks completion)
  void supabase.rpc("complete_referral_reward", { p_booking_id: bookingId });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "COMPLETION_OTP_VERIFIED",
    actor: "SYSTEM",
    metadata: {}
  });
  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "JOB_COMPLETED",
    actor: "PARTNER",
    metadata: { partner_id: user.id }
  });

  // Notify customer
  if (booking.customer_id) {
    void notifyCustomer(
      booking.customer_id,
      "Service Completed Successfully",
      "Your service has been successfully completed. Thank you for choosing PHS!",
      "service_completed",
      { booking_id: bookingId }
    );
  }

  void notifyPartner(
    user.id,
    "Booking Completed",
    "Booking successfully completed. Payout recorded.",
    "general",
    { booking_id: bookingId }
  );

  revalidatePath("/partner", "layout");
  return { success: true };
}

export async function saveServiceAreas(
  serviceAreasStr: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  let serviceAreas: { pincode: string, locality: string, city: string }[] = [];
  if (serviceAreasStr) {
    try {
      serviceAreas = JSON.parse(serviceAreasStr);
    } catch (e) {
      console.error(e);
      return { success: false, error: "Invalid format for service areas." };
    }
  }

  if (serviceAreas.length === 0) {
    return { success: false, error: "Please select at least one service area." };
  }

  // 1. Delete existing service areas
  const { error: deleteError } = await supabase
    .from('partner_service_areas')
    .delete()
    .eq('partner_id', user.id);

  if (deleteError) {
    console.error('Delete Service Areas Error:', deleteError);
    return { success: false, error: "Failed to clear existing service areas." };
  }

  // 2. Insert new service areas
  const partnerAreas = serviceAreas.map(area => ({
    partner_id: user.id,
    pincode: area.pincode,
    city: area.locality // Save locality to city column to match onboarding
  }));

  const { error: insertError } = await supabase
    .from('partner_service_areas')
    .upsert(partnerAreas, { onConflict: 'partner_id, pincode', ignoreDuplicates: true });

  if (insertError) {
    console.error('Insert Service Areas Error:', insertError);
    return { success: false, error: "Failed to save service areas." };
  }

  revalidatePath("/partner/profile/services", "page");
  return { success: true };
}

// ─── TOGGLE ONLINE STATUS ─────────────────────────────────────
// Persists the partner's online/offline status to the database.
// 'active' = Online and available for job offers.
// 'offline' = Not available, will not receive any job broadcasts.
// Cannot toggle to offline while assigned to an active job (status stays 'busy').

export async function toggleOnlineStatus(
  goOnline: boolean
): Promise<{ success: boolean; error?: string; status?: string }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // Fetch current status first
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found." };

  // Block going offline when actively on a job
  if (!goOnline && ["professional_en_route", "professional_arrived", "otp_pending", "in_progress"].includes(profile.status)) {
    return {
      success: false,
      error: "Cannot go offline while you have an active job in progress.",
      status: profile.status,
    };
  }

  const newStatus = goOnline ? "active" : "offline";

  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update status." };
  }

  revalidatePath("/partner", "layout");
  return { success: true, status: newStatus };
}

// ─── CLAIM JOB OFFER ─────────────────────────────────────────
// Partner accepts an open job offer.
// Uses the atomic claim_booking_offer RPC to prevent race conditions.
// Returns success=false with reason='already_claimed' if another partner was faster.

export async function claimJobOffer(
  bookingId: string
): Promise<{ success: boolean; error?: string; alreadyClaimed?: boolean }> {
  const { supabase, user, error: authError } = await getAuthenticatedPartner();
  if (!user) return { success: false, error: authError ?? "Not authenticated" };

  // Verify the partner has an outstanding offer for this booking
  const { data: offer } = await supabase
    .from("booking_job_offers")
    .select("status")
    .eq("booking_id", bookingId)
    .eq("partner_id", user.id)
    .single();

  if (!offer) {
    return { success: false, error: "You have not been offered this booking." };
  }

  if (offer.status !== "offered") {
    return {
      success: false,
      alreadyClaimed: true,
      error: "This booking has already been accepted by another professional.",
    };
  }

  // Atomic claim via RPC
  const { data: result, error: rpcError } = await supabase.rpc("claim_booking_offer", {
    p_booking_id: bookingId,
    p_partner_id: user.id,
  });

  if (rpcError) {
    return { success: false, error: "Failed to claim booking. Please try again." };
  }

  const claimResult = result as { success: boolean; reason?: string };

  if (!claimResult.success) {
    // Another partner claimed it in the milliseconds between our check and RPC
    return {
      success: false,
      alreadyClaimed: true,
      error: "Another professional just accepted this booking first.",
    };
  }

  // Log the acceptance event
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "JOB_ACCEPTED",
    actor: "PARTNER",
    metadata: { partner_id: user.id },
  });

  // Notify the customer their professional has been confirmed
  const { data: bookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (bookingInfo?.customer_id) {
    const svcTitle =
      (bookingInfo.services as unknown as { title: string } | null)?.title ?? "your service";
    void notifyCustomer(
      bookingInfo.customer_id,
      "Professional Confirmed!",
      `A professional has been confirmed for your ${svcTitle} booking.`,
      "booking_confirmed",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/partner", "layout");
  return { success: true };
}
