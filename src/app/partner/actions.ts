"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { BookingStatus } from "@/lib/types";
import { notifyCustomer, notifyPartner } from "@/lib/notifications";

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
