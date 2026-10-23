"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyCustomer, notifyPartner, notifyAdmins } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { isValidBookingSlot } from "@/utils/schedule";

interface BookingActionResult {
  success: boolean;
  error?: string;
  alreadyCancelled?: boolean;
  alreadyDone?: boolean;
  refunded?: boolean;
  refundEligible?: boolean;
  cancellationFee?: number;
  refundAmount?: number;
  releasedPartnerId?: string | null;
  newScheduledDate?: string | null;
}

interface BookingForNotify {
  id: string;
  services: { title: string } | null;
  customer_id: string;
  partner?: { full_name: string } | null;
  scheduled_date: string | null;
}

function mapCancelError(code?: string): string {
  switch (code) {
    case "booking_not_found":
      return "Booking not found.";
    case "unauthorized":
      return "You can only manage your own bookings.";
    case "booking_not_cancellable":
      return "This booking can no longer be cancelled.";
    default:
      return "Could not cancel the booking. Please try again.";
  }
}

function mapRescheduleError(code?: string): string {
  switch (code) {
    case "booking_not_found":
      return "Booking not found.";
    case "unauthorized":
      return "You can only manage your own bookings.";
    case "booking_not_reschedulable":
      return "This booking can no longer be rescheduled. It may already be in progress or finished.";
    case "invalid_slot":
      return "Please choose a valid date and time slot.";
    case "slot_in_past":
      return "The selected time slot is in the past. Please choose a future slot.";
    case "service_unavailable":
      return "This service is no longer available for booking.";
    default:
      return "Could not reschedule the booking. Please try again.";
  }
}

function isCancellableForUi(status: string): boolean {
  return ["pending", "confirmed", "assigned", "accepted", "reassigned"].includes(status);
}

export async function cancelBookingAction(
  bookingId: string,
  reason: string
): Promise<BookingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  // Client-side pre-check for a friendly error (RPC stays authoritative).
  const { data: precheck } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (precheck && precheck.status && !isCancellableForUi(precheck.status)) {
    return { success: false, error: "This booking has already progressed and can no longer be cancelled." };
  }

  const { data: result, error } = await supabase.rpc("customer_cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    console.error("[cancelBookingAction] RPC error:", error.message);
    return { success: false, error: mapCancelError(error.message) };
  }

  const rpcResult = result as {
    success: boolean;
    already_cancelled?: boolean;
    error?: string;
    refunded?: boolean;
    refund_eligible?: boolean;
    cancellation_fee?: number;
    refund_amount?: number;
    released_partner_id?: string | null;
  };

  if (!rpcResult || rpcResult.success !== true) {
    return {
      success: false,
      error: mapCancelError(rpcResult?.error),
    };
  }

  // Success — notify the released partner + the customer.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, services:service_id(title), customer_id, partner:partner_id(full_name)")
    .eq("id", bookingId)
    .maybeSingle<BookingForNotify>();

  const serviceTitle = booking?.services?.title ?? "your service";

  if (rpcResult.released_partner_id) {
    void notifyPartner(
      rpcResult.released_partner_id,
      "Booking Cancelled",
      `The ${serviceTitle} booking was cancelled by the customer.`,
      "booking_cancelled",
      { booking_id: bookingId, cancelled_by: "customer" }
    );
  }

  if (booking?.customer_id) {
    const fee = Number(rpcResult.cancellation_fee || 0);
    const refund = Number(rpcResult.refund_amount || 0);

    let customerMsg = `Your ${serviceTitle} booking was cancelled.`;
    if (rpcResult.refund_eligible) {
      if (fee > 0) {
        customerMsg = `Your ${serviceTitle} booking was cancelled. A 90% refund of ₹${refund.toLocaleString("en-IN")} (after 10% cancellation fee of ₹${fee.toLocaleString("en-IN")}) has been credited to your wallet.`;
      } else {
        customerMsg = `Your ${serviceTitle} booking was cancelled and your full refund of ₹${refund.toLocaleString("en-IN")} has been credited to your wallet.`;
      }
    } else {
      customerMsg = `Your ${serviceTitle} booking was cancelled. No refund applies as it was cancelled within 30 minutes of scheduled service time.`;
    }

    void notifyCustomer(
      booking.customer_id,
      rpcResult.refund_eligible ? "Booking Cancelled · Refunded" : "Booking Cancelled",
      customerMsg,
      "booking_cancelled",
      {
        booking_id: bookingId,
        refund_eligible: rpcResult.refund_eligible,
        refunded: rpcResult.refunded,
        cancellation_fee: fee,
        refund_amount: refund,
      }
    );
  }

  // Notify Admins
  void notifyAdmins(
    "Booking Cancelled by Customer",
    `Booking #${bookingId.substring(0, 8)} (${serviceTitle}) was cancelled by the customer.`,
    "booking_cancelled",
    {
      booking_id: bookingId,
      cancelled_by: "customer",
      cancellation_fee: Number(rpcResult.cancellation_fee || 0),
      refund_amount: Number(rpcResult.refund_amount || 0),
    }
  );

  revalidatePath("/customer/bookings", "page");
  revalidatePath(`/customer/bookings/${bookingId}/tracking`, "page");
  revalidatePath("/partner/jobs", "page");
  revalidatePath("/partner/dashboard", "page");
  revalidatePath("/admin/bookings", "page");

  return {
    success: true,
    alreadyCancelled: rpcResult.already_cancelled === true,
    refunded: rpcResult.refunded === true,
    refundEligible: rpcResult.refund_eligible === true,
    cancellationFee: rpcResult.cancellation_fee,
    refundAmount: rpcResult.refund_amount,
    releasedPartnerId: rpcResult.released_partner_id ?? null,
  };
}

export async function rescheduleBookingAction(
  bookingId: string,
  date: string,
  time: string
): Promise<BookingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const cleanTime = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return { success: false, error: "Please choose a valid date and time slot." };
  }

  // Validate against the live schedule config (same source as the UI and the
  // parse_slot_timestamp DB validation) — the RPC remains authoritative.
  const settings = await fetchPlatformSettings(supabase);
  if (!isValidBookingSlot(cleanTime, settings.scheduleConfig)) {
    return { success: false, error: "Please choose a valid date and time slot." };
  }

  const { data: result, error } = await supabase.rpc("customer_reschedule_booking", {
    p_booking_id: bookingId,
    p_new_date: date.trim(),
    p_new_time: cleanTime,
  });

  if (error) {
    console.error("[rescheduleBookingAction] RPC error:", error.message);
    return { success: false, error: mapRescheduleError(error.message) };
  }

  const rpcResult = result as {
    success: boolean;
    already_done?: boolean;
    error?: string;
    old_scheduled_date?: string | null;
    new_scheduled_date?: string | null;
    released_partner_id?: string | null;
  };

  if (!rpcResult || rpcResult.success !== true) {
    return {
      success: false,
      error: mapRescheduleError(rpcResult?.error),
    };
  }

  // Success — fetch context for notifications.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, services:service_id(title), customer_id, scheduled_date")
    .eq("id", bookingId)
    .maybeSingle<BookingForNotify>();

  const serviceTitle = booking?.services?.title ?? "your service";

  // Re-dispatch for the new slot (idempotent — offer insert is guarded by upsert).
  if (!rpcResult.already_done) {
    void triggerDispatchBatch(bookingId, 1);
  }

  if (rpcResult.released_partner_id) {
    void notifyPartner(
      rpcResult.released_partner_id,
      "Booking Rescheduled",
      `The ${serviceTitle} booking was rescheduled to a new slot.`,
      "booking_rescheduled",
      { booking_id: bookingId, old_scheduled_date: rpcResult.old_scheduled_date, new_scheduled_date: rpcResult.new_scheduled_date }
    );
  }

  if (booking?.customer_id) {
    void notifyCustomer(
      booking.customer_id,
      "Booking Rescheduled",
      `Your ${serviceTitle} booking has been moved to ${rpcResult.new_scheduled_date ?? "a new slot"}.`,
      "booking_rescheduled",
      { booking_id: bookingId, old_scheduled_date: rpcResult.old_scheduled_date, new_scheduled_date: rpcResult.new_scheduled_date }
    );
  }

  revalidatePath("/customer/bookings", "page");
  revalidatePath(`/customer/bookings/${bookingId}/tracking`, "page");
  revalidatePath("/partner/jobs", "page");
  revalidatePath("/partner/dashboard", "page");
  revalidatePath("/admin/bookings", "page");

  return {
    success: true,
    alreadyDone: rpcResult.already_done === true,
    releasedPartnerId: rpcResult.released_partner_id ?? null,
    newScheduledDate: rpcResult.new_scheduled_date ?? null,
  };
}