"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyCustomer, notifyPartner } from "@/lib/notifications";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { triggerDispatchBatch } from "@/app/actions/dispatch";

/**
 * Helper to throw user-friendly error messages for database schema issues.
 */
function handleDatabaseError(error: { message?: string; code?: string }): never {
  // Missing database function => required SQL migration was not applied.
  if (
    error.code === "PGRST202" ||
    error.message?.includes("Could not find the function")
  ) {
    throw new Error(
      "MIGRATION_REQUIRED: A required database function is missing. " +
        "Please run supabase/migrations/20260825000000_admin_reassign_redispatch_fix.sql " +
        "in your Supabase Dashboard SQL Editor."
    );
  }
  if (error.code === '42703' || error.message?.includes("column")) {
    throw new Error(
      "DATABASE_SCHEMA_ERROR: A required column is missing in the database. " +
      "Run the pending files in supabase/migrations/ via your Supabase Dashboard SQL Editor " +
      "(at minimum 20260825000001_dispatch_escalation_live_remediation.sql).\n\n" +
      `[DB] ${error.message || "unknown error"}`
    );
  }
  throw new Error(
    `${error.message || "An unknown database error occurred."} [code: ${error.code ?? "n/a"}]`
  );
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
    updateData.refund_eligible = true;
    if (cancellationReason) {
      updateData.cancellation_reason = cancellationReason;
    }
  }

  if (status === "completed") {
    const now = new Date().toISOString();
    updateData.completed_at = now;
    updateData.service_completed_at = now;
    // Set completion_otp_verified so the invoice auto-creation trigger fires
    updateData.completion_otp_verified = true;
    updateData.completion_otp_verified_at = now;
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

  if (status === "completed") {
    const { data: completedBooking } = await supabase
      .from("bookings")
      .select("partner_id")
      .eq("id", bookingId)
      .single();
    if (completedBooking?.partner_id) {
      void supabase.from("profiles").update({ is_available: true }).eq("id", completedBooking.partner_id);
    }
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
 * Manually Assign a Partner to a Booking (Admin Action)
 * Uses the authoritative finalize_booking_assignment RPC to ensure
 * atomic assignment, competing offer expiration, availability update,
 * and metric single-ownership.
 */
export async function manualAssignPartnerAction(
  bookingId: string,
  partnerId: string,
  overrideEligibility: boolean = false,
  overrideReason?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: result, error: rpcError } = await supabase.rpc("finalize_booking_assignment", {
    p_booking_id: bookingId,
    p_partner_id: partnerId,
    p_assigned_by: "admin",
    p_override_eligibility: overrideEligibility,
    p_override_reason: overrideReason || null,
  });

  if (rpcError) {
    handleDatabaseError(rpcError);
  }

  const assignResult = result as { success: boolean; reason?: string };

  if (!assignResult || !assignResult.success) {
    switch (assignResult?.reason) {
      case "already_assigned":
        throw new Error("This booking has already been assigned to another professional.");
      case "service_mismatch":
        throw new Error("Selected professional does not offer this service. Use force assignment if intentional.");
      case "pincode_mismatch":
        throw new Error("Selected professional does not serve this pincode. Use force assignment if intentional.");
      case "partner_not_active":
        throw new Error("Selected professional is currently inactive or offline.");
      case "invalid_partner":
        throw new Error("Selected user is not an active professional.");
      default:
        throw new Error(assignResult?.reason || "Failed to assign professional.");
    }
  }

  // Log assignment event
  const isForceAssigned = overrideEligibility === true;
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: isForceAssigned ? "ADMIN_FORCE_ASSIGNED" : "PARTNER_AUTO_ASSIGNED",
    actor: "ADMIN",
    metadata: {
      partner_id: partnerId,
      assignment_method: isForceAssigned ? "admin_force_override" : "admin_manual_assignment",
      override_reason: overrideReason || null,
    },
  });

  await supabase.from("booking_audit_trail").insert({
    booking_id: bookingId,
    action: isForceAssigned ? "ADMIN_FORCE_ASSIGNED" : "PARTNER_ASSIGNED",
    actor: "ADMIN",
    metadata: {
      partner_id: partnerId,
      assignment_method: isForceAssigned ? "admin_force_override" : "admin_manual_assignment",
      override_reason: overrideReason || null,
    },
  });

  // ─── Notifications ─────────────────────────────────────────
  const { data: bookingInfo } = await supabase
    .from("bookings")
    .select("customer_id, services:service_id(title), city, scheduled_date")
    .eq("id", bookingId)
    .single();

  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", partnerId)
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

export interface ReassignPartnerResult {
  success: boolean;
  /** Number of professionals the fresh broadcast reached. */
  dispatched: number;
  /** broadcasting | exhausted | blocked | failed */
  dispatchStatus: string;
  /** Actual block/failure reason from the dispatch engine, when present. */
  reason?: string | null;
}

/**
 * Reassign Partner — atomically releases the current professional via the
 * admin_release_booking_assignment RPC (rejection log, metrics, full offer
 * cleanup, dispatch-state reset, audit records in one locked transaction),
 * then runs a fresh Tier-1 broadcast and reports its real outcome.
 */
export async function reassignPartnerAction(
  bookingId: string,
  reason?: string
): Promise<ReassignPartnerResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "admin_release_booking_assignment",
    {
      p_booking_id: bookingId,
      p_reason: reason ?? null,
    }
  );

  if (rpcError) {
    handleDatabaseError(rpcError);
  }

  const release = rpcResult as { success: boolean; reason?: string; previous_partner_id?: string | null } | null;

  if (!release?.success) {
    switch (release?.reason) {
      case "unauthorized":
        throw new Error("You are not authorized to reassign bookings.");
      case "booking_not_found":
        throw new Error("Booking not found.");
      case "booking_not_reassignable":
        throw new Error("Completed or cancelled bookings cannot be reassigned.");
      case "reset_failed":
        throw new Error("Failed to reset the booking for redispatch. Please try again.");
      default:
        throw new Error(release?.reason || "Failed to release the current professional.");
    }
  }

  const currentPartnerId = release.previous_partner_id ?? null;

  // Fresh Tier-1 broadcast. Awaited so the admin sees the real outcome.
  const dispatch = await triggerDispatchBatch(bookingId, 1);

  let dispatchStatus: string;
  if (dispatch.error) {
    dispatchStatus = "failed";
  } else if (dispatch.dispatched > 0) {
    dispatchStatus = "broadcasting";
  } else if (dispatch.reason === "exhausted") {
    dispatchStatus = "exhausted";
  } else {
    dispatchStatus = "blocked";
  }

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
  return {
    success: true,
    dispatched: dispatch.dispatched,
    dispatchStatus,
    reason: dispatch.error ?? dispatch.reason ?? null,
  };
}

/**
 * Fetch Pricing Breakdown for a Booking (on-demand in detail drawer)
 */
export interface BookingPricingData {
  base_price: number;
  addons_total: number;
  gst_amount: number;
  discount_amount: number;
  wallet_discount: number;
  surcharges?: Record<string, unknown> | null;
  total_amount?: number;
  pricing_config?: Record<string, unknown> | null;
}

export async function getBookingPricingAction(bookingId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('booking_pricing')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error("Error fetching booking pricing:", error);
    return null;
  }

  return data as unknown as BookingPricingData;
}
