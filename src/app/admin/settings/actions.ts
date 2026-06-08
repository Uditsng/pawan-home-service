"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Save settings to database
 */
export async function updateSettingsAction(settings: {
  tax_rate?: string;
  free_cancellation_window?: string;
  partner_penalty_rate?: string;
  service_areas?: string[];
}) {
  await requireAdmin();
  const supabase = await createClient();

  // Update tax_rate
  if (settings.tax_rate !== undefined) {
    await supabase
      .from("platform_settings")
      .upsert({ key: "tax_rate", value: JSON.stringify(settings.tax_rate) });
  }

  // Update free_cancellation_window
  if (settings.free_cancellation_window !== undefined) {
    await supabase
      .from("platform_settings")
      .upsert({ key: "free_cancellation_window", value: JSON.stringify(settings.free_cancellation_window) });
  }

  // Update partner_penalty_rate
  if (settings.partner_penalty_rate !== undefined) {
    await supabase
      .from("platform_settings")
      .upsert({ key: "partner_penalty_rate", value: JSON.stringify(settings.partner_penalty_rate) });
  }

  // Update service_areas
  if (settings.service_areas !== undefined) {
    await supabase
      .from("platform_settings")
      .upsert({ key: "service_areas", value: JSON.stringify(settings.service_areas) });
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Seed Demo Data in Supabase
 */
export async function seedDemoDataAction() {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch available services, customers, and partners
  const { data: services } = await supabase.from("services").select("id, title, base_price, category");
  const { data: customers } = await supabase.from("profiles").select("id, full_name").eq("role", "customer");
  const { data: partners } = await supabase.from("profiles").select("id, full_name").eq("role", "partner");

  if (!services || services.length === 0) {
    throw new Error("No services found in database. Please create services in the admin catalog first.");
  }
  if (!customers || customers.length === 0) {
    throw new Error("No customers found in database. Please register at least one customer account.");
  }
  if (!partners || partners.length === 0) {
    throw new Error("No partners found in database. Please register and onboard at least one partner professional.");
  }

  // Clean existing bookings, reviews, tickets to start fresh
  // We perform simple deletes (bookings cascade delete handles dependants)
  await supabase.from("tickets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("booking_rejections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("booking_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const now = new Date();
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(now.getDate() - daysAgo);
    return d.toISOString();
  };

  // Generate 8-12 completed & cancelled bookings over the past month
  const customersCount = customers.length;
  const partnersCount = partners.length;
  const servicesCount = services.length;

  // Let's create realistic bookings
  const mockBookingTemplates = [
    { daysAgo: 20, status: "completed", refund: false, rating: 5, comment: "Amazing job! Professional arrived on time and did thorough cleaning." },
    { daysAgo: 15, status: "completed", refund: false, rating: 4, comment: "Very good service. Cleared up all our pest concerns." },
    { daysAgo: 10, status: "completed", refund: false, rating: 2, comment: "Arrived an hour late. Left some mess in the kitchen. Disappointed.", ticket: { reason: "Late arrival and incomplete service cleaning", priority: "medium", status: "resolved" } },
    { daysAgo: 7, status: "completed", refund: false, rating: 5, comment: "Quick and polite! Highly recommend." },
    { daysAgo: 5, status: "cancelled", refund: false, ticket: { reason: "Provider canceled last minute. Seeking refund/redistribution", priority: "high", status: "open" } },
    { daysAgo: 3, status: "completed", refund: false, rating: 1, comment: "Left chemicals exposed near pets! Extremely dangerous and rude behavior.", ticket: { reason: "Safety hazard: exposed chemical pesticides near pets", priority: "high", status: "in_progress" } },
    { daysAgo: 2, status: "completed", refund: false, rating: 4, comment: "Very helpful plumbing work." },
    { daysAgo: 1, status: "confirmed" },
    { daysAgo: 0.5, status: "pending" }
  ];

  for (let i = 0; i < mockBookingTemplates.length; i++) {
    const template = mockBookingTemplates[i];
    const customer = customers[i % customersCount];
    const partner = partners[i % partnersCount];
    const service = services[i % servicesCount];
    const scheduledDate = getPastDate(template.daysAgo);

    // 1. Insert Booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        customer_id: customer.id,
        partner_id: template.status === "pending" ? null : partner.id,
        service_id: service.id,
        status: template.status,
        total_amount: service.base_price,
        city: "Roorkee",
        pincode: "247667",
        address: "Apt 4B, Sector 3, Civil Lines",
        scheduled_date: scheduledDate,
        created_at: getPastDate(template.daysAgo + 1),
        accepted_at: template.status === "pending" ? null : getPastDate(template.daysAgo + 0.9)
      })
      .select("id")
      .single();

    if (bErr) {
      console.error("Seeding booking error:", bErr);
      continue;
    }

    // 2. Insert Review if completed and rating specified
    if (template.status === "completed" && template.rating !== undefined) {
      await supabase.from("reviews").insert({
        booking_id: booking.id,
        customer_id: customer.id,
        partner_id: partner.id,
        rating: template.rating,
        comment: template.comment,
        created_at: getPastDate(template.daysAgo - 0.1)
      });
    }

    // 3. Insert Dispute (Ticket) if template.ticket specified
    if (template.ticket) {
      await supabase.from("tickets").insert({
        booking_id: booking.id,
        customer_id: customer.id,
        partner_id: template.status === "pending" ? null : partner.id,
        reason: template.ticket.reason,
        priority: template.ticket.priority,
        status: template.ticket.status,
        internal_notes: template.ticket.status === "resolved" ? "Re-cleaning session organized. Customer is satisfied with resolutions." : "Awaiting response from professional.",
        created_at: getPastDate(template.daysAgo - 0.2),
        resolved_at: template.ticket.status === "resolved" ? getPastDate(template.daysAgo - 0.5) : null
      });
    }

    // 4. Insert some booking events
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      event_type: "BOOKING_CREATED",
      actor: "USER",
      metadata: { customer_name: customer.full_name, amount: service.base_price },
      created_at: getPastDate(template.daysAgo + 1)
    });

    if (template.status !== "pending") {
      await supabase.from("booking_events").insert({
        booking_id: booking.id,
        event_type: "PARTNER_AUTO_ASSIGNED",
        actor: "SYSTEM",
        metadata: { partner_name: partner.full_name },
        created_at: getPastDate(template.daysAgo + 0.9)
      });
    }
  }

  // Update partner jobs counts to keep profile stats in sync
  for (const partner of partners) {
    const { data: counts } = await supabase
      .from("bookings")
      .select("status")
      .eq("partner_id", partner.id);

    const completed = counts?.filter(b => b.status === "completed").length || 0;
    const cancelled = counts?.filter(b => b.status === "cancelled").length || 0;
    const accepted = counts?.filter(b => b.status !== "cancelled" && b.status !== "pending").length || 0;
    const offered = counts?.length || 0;

    await supabase
      .from("profiles")
      .update({
        jobs_offered_count: offered,
        jobs_accepted_count: accepted,
        jobs_cancelled_count: cancelled,
        rating_avg: completed > 0 ? 4.5 : 4.8 // Seed average rating
      })
      .eq("id", partner.id);
  }

  // Revalidate paths
  revalidatePath("/admin/settings");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");

  return { success: true, count: mockBookingTemplates.length };
}
