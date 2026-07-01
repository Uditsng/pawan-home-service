"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface QuoteItemInput {
  item_type: "material" | "labour";
  name: string;
  quantity: number;
  unit_price: number;
}

/**
 * Professional creates a detailed quotation for a booking.
 */
export async function createBookingQuoteAction(
  bookingId: string,
  items: QuoteItemInput[],
  taxRate: number = 18,
  discount: number = 0,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify booking exists
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, status")
    .eq("id", bookingId)
    .single();
  if (!booking) throw new Error("Booking not found");

  // Calculate quote totals
  let subtotal = 0;
  const quoteItemRows = items.map((item) => {
    const total = Number(item.quantity) * Number(item.unit_price);
    subtotal += total;
    return {
      item_type: item.item_type,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: total,
    };
  });

  const gst = Math.round(subtotal * (taxRate / 100));
  const finalTotal = Math.max(0, subtotal + gst - discount);

  // Insert quote record
  const { data: quote, error: quoteErr } = await supabase
    .from("booking_quotes")
    .insert({
      booking_id: bookingId,
      professional_id: user.id,
      customer_id: booking.customer_id,
      status: "pending_customer_approval",
      tax_rate: taxRate,
      discount: discount,
      total_amount: finalTotal,
      notes: notes || null,
      expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours expiry
    })
    .select("id")
    .single();

  if (quoteErr || !quote) {
    console.error("Quote creation error:", quoteErr);
    throw new Error(quoteErr?.message || "Failed to create quotation.");
  }

  // Insert quote items
  const itemsWithQuoteId = quoteItemRows.map((row) => ({
    ...row,
    quote_id: quote.id,
  }));
  const { error: itemsErr } = await supabase
    .from("booking_quote_items")
    .insert(itemsWithQuoteId);

  if (itemsErr) {
    console.error("Quote items insertion error:", itemsErr);
    // clean up quote
    await supabase.from("booking_quotes").delete().eq("id", quote.id);
    throw new Error("Failed to save quotation items.");
  }

  // Update booking event / history
  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: booking.status,
    changed_by: user.id,
    remarks: `Quotation sent to customer: ₹${finalTotal}`,
  });

  revalidatePath(`/customer/bookings/${bookingId}/tracking`);
  revalidatePath(`/partner/jobs`);
  return { success: true, quoteId: quote.id };
}

/**
 * Customer responds (Approves / Declines) to a quote.
 */
export async function respondToQuoteAction(quoteId: string, approve: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch quote
  const { data: quote } = await supabase
    .from("booking_quotes")
    .select("*, booking:booking_id(*)")
    .eq("id", quoteId)
    .single();
  if (!quote) throw new Error("Quotation not found");

  const bookingId = quote.booking_id;
  const statusStr = approve ? "approved" : "declined";

  // Update quote status
  const { error: quoteUpdateErr } = await supabase
    .from("booking_quotes")
    .update({ status: statusStr })
    .eq("id", quoteId);

  if (quoteUpdateErr) throw new Error("Failed to update quotation response.");

  // Log status history
  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: quote.booking.status,
    changed_by: user.id,
    remarks: `Customer ${statusStr} quotation of ₹${quote.total_amount}`,
  });

  if (approve) {
    // 1. Calculate new booking amount (cumulative if it is extra work, or override if it's the initial inspection quote)
    const isInitialInspection = quote.booking.pricing_model === "inspection";
    
    let newBookingTotal = Number(quote.total_amount);
    if (!isInitialInspection) {
      // Extra work - add to existing total
      newBookingTotal = Number(quote.booking.total_amount) + Number(quote.total_amount);
    }

    // 2. Update booking
    const { error: bookingUpdateErr } = await supabase
      .from("bookings")
      .update({
        total_amount: newBookingTotal,
        final_price: newBookingTotal,
        // Move status from professional_arrived to in_progress if it was initial inspection
        status: isInitialInspection ? "in_progress" : quote.booking.status
      })
      .eq("id", bookingId);

    if (bookingUpdateErr) throw new Error("Failed to update booking totals.");

    // 3. Update booking_pricing breakdown
    const { data: pricing } = await supabase
      .from("booking_pricing")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (pricing) {
      if (isInitialInspection) {
        // Initial inspection - update the base price and overall totals
        await supabase
          .from("booking_pricing")
          .update({
            base_price: Number(quote.total_amount), // base price becomes the quote amount
            gst_amount: Math.round(Number(quote.total_amount) * (Number(quote.tax_rate) / 100)),
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      } else {
        // Extra work - log the extra charges in surcharges JSONB array
        const currentSurcharges = Array.isArray(pricing.surcharges) ? pricing.surcharges : [];
        const updatedSurcharges = [
          ...currentSurcharges,
          { name: `Approved Extra Work: ${quote.notes || "Additional charges"}`, amount: Number(quote.total_amount) }
        ];

        await supabase
          .from("booking_pricing")
          .update({
            surcharges: updatedSurcharges,
            total_price: newBookingTotal,
          })
          .eq("id", pricing.id);
      }
    }
  }

  revalidatePath(`/customer/bookings/${bookingId}/tracking`);
  revalidatePath(`/partner/jobs`);
  return { success: true };
}
