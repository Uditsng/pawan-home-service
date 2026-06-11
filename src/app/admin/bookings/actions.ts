"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyCustomer, notifyPartner } from "@/lib/notifications";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Helper to throw user-friendly error messages for database schema issues.
 */
function handleDatabaseError(error: { message?: string; code?: string }): never {
  if (error.code === '42703' || error.message?.includes("column")) {
    throw new Error(
      "DATABASE_SCHEMA_ERROR: One or more required columns are missing from the 'bookings' table. " +
      "Please run these SQL commands in your Supabase Dashboard SQL Editor:\n\n" +
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI';\n" +
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address TEXT;"
    );
  }
  throw new Error(error.message || "An unknown database error occurred.");
}

/**
 * Update Booking Status (Operational Override)
 * Handles status transitions for admin: cancel, complete, confirm
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: string,
  cancellationReason?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };

  if (status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
    updateData.cancelled_by = "SYSTEM";
    if (cancellationReason) {
      updateData.cancellation_reason = cancellationReason;
    }
  }

  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  if (status === "in_progress") {
    updateData.started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (error) {
    handleDatabaseError(error);
  }

  // Log booking event for audit trail
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type:
      status === "cancelled"
        ? "JOB_CANCELLED"
        : status === "completed"
        ? "JOB_COMPLETED"
        : status === "in_progress"
        ? "JOB_STARTED"
        : "BOOKING_CREATED",
    actor: "SYSTEM",
    metadata: {
      admin_override: true,
      new_status: status,
      reason: cancellationReason || null,
    },
  });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "ADMIN_OVERRIDE",
    actor: "ADMIN",
    metadata: {
      new_status: status,
      cancellation_reason: cancellationReason || null,
    },
  });

  // ─── Notifications ─────────────────────────────────────────
  // Fetch booking details for notification context
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("customer_id, partner_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (bookingData?.customer_id) {
    const serviceTitle = (bookingData.services as unknown as { title: string } | null)?.title ?? "your service";

    if (status === "cancelled") {
      void notifyCustomer(
        bookingData.customer_id,
        "Booking Cancelled",
        `Your booking for ${serviceTitle} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ""}`,
        "booking_cancelled",
        { booking_id: bookingId }
      );
      if (bookingData.partner_id) {
        void notifyPartner(
          bookingData.partner_id,
          "Job Cancelled",
          `The booking for ${serviceTitle} has been cancelled by admin.`,
          "booking_cancelled",
          { booking_id: bookingId }
        );
      }
    } else if (status === "completed") {
      void notifyCustomer(
        bookingData.customer_id,
        "Service Completed!",
        `Your ${serviceTitle} service is complete. Rate your experience!`,
        "service_completed",
        { booking_id: bookingId }
      );
    } else if (status === "in_progress") {
      void notifyCustomer(
        bookingData.customer_id,
        "Service Started",
        `Your ${serviceTitle} service has started.`,
        "service_started",
        { booking_id: bookingId }
      );
    } else if (status === "confirmed") {
      void notifyCustomer(
        bookingData.customer_id,
        "Booking Confirmed",
        `Your booking for ${serviceTitle} has been confirmed.`,
        "booking_confirmed",
        { booking_id: bookingId }
      );
    }
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

/**
 * Manually Assign a Partner to a Booking (Admin Override)
 * Sets partner_id, updates status to confirmed, logs event.
 */
export async function manualAssignPartnerAction(
  bookingId: string,
  partnerId: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      partner_id: partnerId,
      status: "confirmed",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    handleDatabaseError(error);
  }

  // Log assignment event
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "PARTNER_AUTO_ASSIGNED",
    actor: "SYSTEM",
    metadata: {
      partner_id: partnerId,
      assignment_method: "admin_manual_override",
    },
  });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "PARTNER_ASSIGNED",
    actor: "ADMIN",
    metadata: {
      partner_id: partnerId,
      assignment_method: "admin_manual_override",
    },
  });

  // Update partner's last_assigned_at and job counts
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("jobs_offered_count, jobs_accepted_count, full_name")
    .eq("id", partnerId)
    .single();

  if (partnerProfile) {
    await supabase
      .from("profiles")
      .update({
        jobs_offered_count: (partnerProfile.jobs_offered_count || 0) + 1,
        jobs_accepted_count: (partnerProfile.jobs_accepted_count || 0) + 1,
        last_assigned_at: new Date().toISOString(),
      })
      .eq("id", partnerId);
  }

  // ─── Notifications ─────────────────────────────────────────
  const { data: bookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title), city, scheduled_date")
    .eq("id", bookingId)
    .single();

  if (bookingInfo) {
    const serviceTitle = (bookingInfo.services as unknown as { title: string } | null)?.title ?? "your service";
    const partnerName = partnerProfile?.full_name ?? "a professional";

    // Notify customer about assignment
    if (bookingInfo.customer_id) {
      void notifyCustomer(
        bookingInfo.customer_id,
        "Professional Assigned!",
        `${partnerName} has been assigned to your ${serviceTitle} booking.`,
        "partner_assigned",
        { booking_id: bookingId, partner_id: partnerId }
      );
    }

    // Notify partner about the new job
    void notifyPartner(
      partnerId,
      "New Job Assigned",
      `You've been assigned a ${serviceTitle} job${bookingInfo.city ? ` in ${bookingInfo.city}` : ""}.`,
      "partner_assigned",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/partners");
  return { success: true };
}

/**
 * Reassign Partner — Reject current partner and attempt auto-assign next.
 * Logs rejection in booking_rejections, calls RPC for next partner.
 */
export async function reassignPartnerAction(
  bookingId: string,
  reason?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  // Get current booking data for reassignment context
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("partner_id, service_id, city, scheduled_date")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    throw new Error("Failed to fetch booking details for reassignment.");
  }

  const currentPartnerId = booking.partner_id;

  // Log rejection if there was a current partner
  if (currentPartnerId) {
    await supabase.from("booking_rejections").insert({
      booking_id: bookingId,
      partner_id: currentPartnerId,
      reason: reason || "Admin initiated reassignment",
    });

    // Update partner cancellation metrics
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("jobs_cancelled_count, cancellation_rate, jobs_offered_count")
      .eq("id", currentPartnerId)
      .single();

    if (partnerProfile) {
      const newCancelCount = (partnerProfile.jobs_cancelled_count || 0) + 1;
      const totalOffered = partnerProfile.jobs_offered_count || 1;
      await supabase
        .from("profiles")
        .update({
          jobs_cancelled_count: newCancelCount,
          cancellation_rate: newCancelCount / totalOffered,
        })
        .eq("id", currentPartnerId);
    }
  }

  // Revert to pending (Unassigned) for manual intervention
  await supabase
    .from("bookings")
    .update({
      partner_id: null,
      status: "pending",
    })
    .eq("id", bookingId);

  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "PARTNER_REASSIGNED",
    actor: "SYSTEM",
    metadata: {
      previous_partner_id: currentPartnerId,
      new_partner_id: null,
      reason: reason || null,
      result: "manual_intervention_required",
    },
  });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: "PARTNER_REASSIGNED",
    actor: "ADMIN",
    metadata: {
      previous_partner_id: currentPartnerId || null,
      reason: reason || null,
    },
  });

  // ─── Notifications ─────────────────────────────────────────
  if (currentPartnerId) {
    void notifyPartner(
      currentPartnerId,
      "Job Reassigned",
      `You have been removed from a booking.${reason ? ` Reason: ${reason}` : ""}`,
      "partner_reassigned",
      { booking_id: bookingId }
    );
  }

  // Fetch customer to notify
  const { data: reassignBooking } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title)")
    .eq("id", bookingId)
    .single();

  if (reassignBooking?.customer_id) {
    const svcTitle = (reassignBooking.services as unknown as { title: string } | null)?.title ?? "your service";
    void notifyCustomer(
      reassignBooking.customer_id,
      "Finding a New Professional",
      `We're reassigning a professional for your ${svcTitle} booking. Hang tight!`,
      "partner_reassigned",
      { booking_id: bookingId }
    );
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/partners");
  return { success: true, newPartnerId: null };
}
