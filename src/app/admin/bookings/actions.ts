"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

  // Update partner's last_assigned_at and job counts
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("jobs_offered_count, jobs_accepted_count")
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
  const excludePartners: string[] = [];

  // Log rejection if there was a current partner
  if (currentPartnerId) {
    excludePartners.push(currentPartnerId);

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

  // Attempt auto-assign to next available partner
  const { data: newPartnerId } = await supabase.rpc("auto_assign_partner", {
    p_service_id: booking.service_id,
    p_city: booking.city || "Local Area",
    p_scheduled_at: booking.scheduled_date || new Date().toISOString(),
    p_exclude_partners: excludePartners,
  });

  if (newPartnerId) {
    // New partner found
    await supabase
      .from("bookings")
      .update({
        partner_id: newPartnerId,
        status: "confirmed",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      event_type: "PARTNER_REASSIGNED",
      actor: "SYSTEM",
      metadata: {
        previous_partner_id: currentPartnerId,
        new_partner_id: newPartnerId,
        reason: reason || null,
        assignment_method: "admin_reassignment_rpc",
      },
    });
  } else {
    // No partner found — revert to pending for manual intervention
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
        result: "no_partner_available",
      },
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/partners");
  return { success: true, newPartnerId: newPartnerId || null };
}
