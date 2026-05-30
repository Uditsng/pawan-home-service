"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Update a ticket's status, priority, and admin internal notes
 */
export async function updateTicketStatusAndNotes(
  ticketId: string,
  status: "open" | "in_progress" | "resolved",
  priority: "low" | "medium" | "high",
  internalNotes: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({
      status,
      priority,
      internal_notes: internalNotes,
      resolved_at: status === "resolved" ? new Date().toISOString() : null
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/disputes");
  return { success: true };
}

/**
 * Refund and cancel a booking associated with a dispute ticket
 */
export async function escalateOrRefundBooking(bookingId: string) {
  const supabase = await createClient();

  // 1. Update booking status to cancelled
  const { error: bErr } = await supabase
    .from("bookings")
    .update({
      status: "cancelled"
    })
    .eq("id", bookingId);

  if (bErr) {
    throw new Error(bErr.message);
  }

  // 2. Add dynamic cancellation booking event
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    event_type: "BOOKING_CANCELLED",
    actor: "ADMIN",
    metadata: {
      resolution: "REFUND_ISSUED_BY_ADMIN",
      refund_status: "initiated"
    }
  });

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
