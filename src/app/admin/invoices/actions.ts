"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Regenerate or create an invoice for a completed booking (Admin Override)
 */
export async function regenerateInvoiceAction(bookingId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, total_amount, wallet_discount_applied, customer_id, partner_id, order_id, payment_method")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error("Booking not found.");
  }

  if (booking.status !== "completed") {
    throw new Error("Invoice can only be generated for completed bookings.");
  }

  // 2. Fetch tax rate from settings
  let taxRatePercent = 18.00;
  const { data: taxSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "tax_rate")
    .single();

  if (taxSetting && taxSetting.value) {
    const rawTax = typeof taxSetting.value === "string" 
      ? taxSetting.value 
      : String(taxSetting.value);
    const parsed = parseFloat(rawTax.replace(/%/g, "").replace(/"/g, "").trim());
    if (!isNaN(parsed)) taxRatePercent = parsed;
  }

  // 3. Fetch transaction ID and payment method
  let transactionId = "TXN-" + booking.id.substring(0, 8).toUpperCase();
  let paymentMethod = booking.payment_method || "Card";

  const { data: payment } = await supabase
    .from("payments")
    .select("razorpay_payment_id, payment_status")
    .or(`booking_id.eq.${booking.id},order_id.eq.${booking.order_id || "00000000-0000-0000-0000-000000000000"}`)
    .limit(1)
    .maybeSingle();

  if (payment) {
    if (payment.razorpay_payment_id) {
      transactionId = payment.razorpay_payment_id;
      paymentMethod = "Razorpay";
    }
  }

  // 4. Back-calculate amounts
  const discountAmount = Number(booking.wallet_discount_applied || 0);
  const grandTotal = Number(booking.total_amount || 0);
  const subtotal = Math.round(((grandTotal + discountAmount) / (1 + (taxRatePercent / 100))) * 100) / 100;
  const taxAmount = Math.round(((grandTotal + discountAmount) - subtotal) * 100) / 100;

  // 5. Check if invoice already exists
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingInvoice) {
    // Update existing invoice (preserves invoice_number)
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        customer_id: booking.customer_id,
        partner_id: booking.partner_id,
        subtotal,
        tax_rate: taxRatePercent,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingInvoice.id);

    if (updateError) {
      throw new Error("Failed to update existing invoice: " + updateError.message);
    }
  } else {
    // Insert new invoice (trigger will assign invoice_number)
    const { error: insertError } = await supabase
      .from("invoices")
      .insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        partner_id: booking.partner_id,
        subtotal,
        tax_rate: taxRatePercent,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        payment_status: "paid",
        payment_method: paymentMethod,
        transaction_id: transactionId
      });

    if (insertError) {
      throw new Error("Failed to create new invoice: " + insertError.message);
    }
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/customer/bookings");
  return { success: true };
}
