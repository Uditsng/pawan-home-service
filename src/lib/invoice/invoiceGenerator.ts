import { calculateInvoice } from "./calculateInvoice";
import { InvoiceSnapshot, InvoiceSeller } from "./invoiceTypes";
import { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_COMPANY_PROFILE: InvoiceSeller = {
  company_name: "PHS Cleaning Company",
  legal_name: "PHS Cleaning Company Private Limited",
  logo_url: "/PHS.png",
  gst_number: "05AAACP9876M1ZX",
  support_phone: "+91 98765 43210",
  support_email: "support@phs.com",
  website: "www.phs.com",
  address: "123, Premium Heights, Civil Lines, Dehradun, Uttarakhand - 248001",
  tagline: "Professional Home Services",
  footer_text: "Thank you for choosing PHS Cleaning Company. We value your business!",
};

/**
 * Fetches booking information and compiles an immutable InvoiceSnapshot.
 */
export async function compileInvoiceSnapshot(supabase: SupabaseClient, bookingId: string): Promise<InvoiceSnapshot> {
  // 1. Fetch Booking and joined service details
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      *,
      services:service_id (
        title,
        subcategory_id,
        gst_applicable
      )
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingError?.message || "Unknown error"}`);
  }

  // Fetch service category
  let categoryName = "Cleaning";
  if (booking.services?.subcategory_id) {
    const { data: subcat } = await supabase
      .from("subcategories")
      .select("subcategory_name, categories(category_name)")
      .eq("id", booking.services.subcategory_id)
      .single();
    const categories = subcat?.categories as unknown as { category_name?: string | null } | { category_name?: string | null }[] | null;
    if (categories) {
      const cat = Array.isArray(categories) ? categories[0] : categories;
      if (cat?.category_name) {
        categoryName = cat.category_name;
      }
    }
  }

  // 2. Fetch Booking Pricing
  const { data: bookingPricing } = await supabase
    .from("booking_pricing")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  // 3. Fetch Paid/Completed Extensions
  const { data: extensionsData } = await supabase
    .from("booking_extensions")
    .select("*")
    .eq("booking_id", bookingId)
    .in("status", ["paid", "active", "completed"]);
  const extensions = extensionsData || [];

  // 4. Fetch Profiles
  const { data: customer } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", booking.customer_id)
    .single();

  let partner = null;
  if (booking.partner_id) {
    const { data: partnerData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.partner_id)
      .single();
    if (partnerData) {
      partner = {
        id: booking.partner_id,
        full_name: partnerData.full_name,
      };
    }
  }

  // 5. Fetch Platform settings
  let companyProfile = DEFAULT_COMPANY_PROFILE;
  const { data: taxSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "tax_rate")
    .maybeSingle();
  
  let taxRatePercent = 18.00;
  if (taxSetting?.value) {
    const rawTax = typeof taxSetting.value === "string" ? taxSetting.value : String(taxSetting.value);
    const parsed = parseFloat(rawTax.replace(/%/g, "").replace(/"/g, "").trim());
    if (!isNaN(parsed)) taxRatePercent = parsed;
  }

  const { data: companySetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "invoice_company_profile")
    .maybeSingle();

  if (companySetting?.value) {
    try {
      companyProfile = typeof companySetting.value === "string" 
        ? JSON.parse(companySetting.value) 
        : companySetting.value;
    } catch (e) {
      console.warn("Failed to parse company profile settings from DB:", e);
    }
  }

  // 6. Fetch Transaction Details
  let transactionId = "TXN-" + booking.id.substring(0, 8).toUpperCase();
  let paymentMethod = booking.payment_method || "Cash";

  const { data: payment } = await supabase
    .from("payments")
    .select("razorpay_payment_id, payment_status, created_at")
    .or(`booking_id.eq.${booking.id},order_id.eq.${booking.order_id || "00000000-0000-0000-0000-000000000000"}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payment?.razorpay_payment_id) {
    transactionId = payment.razorpay_payment_id;
    paymentMethod = "Razorpay";
  }

  // Calculate pricing
  const calculation = calculateInvoice({
    booking,
    bookingPricing,
    extensions,
    taxRatePercent,
  });

  const snapshot: InvoiceSnapshot = {
    version: "1.0",
    invoice_number: "", // Will be assigned by BEFORE INSERT DB trigger or set by save function
    invoice_date: new Date().toISOString(),
    financials: {
      subtotal: calculation.subtotal,
      tax_rate: taxRatePercent,
      tax_amount: calculation.taxAmount,
      discount_amount: calculation.discountAmount,
      grand_total: calculation.grandTotal,
      discounts: calculation.discounts,
    },
    seller: companyProfile,
    customer: {
      id: booking.customer_id,
      full_name: customer?.full_name || "Valued Customer",
      phone: customer?.phone || null,
      email: customer?.email || null,
      address: booking.address,
      city: booking.city,
      pincode: booking.pincode,
      business_name: booking.business_name || null,
      business_gstin: booking.business_gstin || null,
    },
    partner,
    booking: {
      id: booking.id,
      scheduled_date: booking.scheduled_date,
      created_at: booking.created_at,
      service_title: booking.services?.title || "Home Service",
      category_name: categoryName,
      pricing_model: booking.pricing_model || "fixed",
      meeting_location: booking.meeting_location || null,
      destination: booking.destination || null,
      expected_bags: booking.expected_bags || 0,
    },
    line_items: calculation.lineItems,
    payment: {
      method: paymentMethod,
      status: payment?.payment_status || booking.payment_status || "paid",
      transaction_id: transactionId,
      paid_at: payment?.created_at || booking.completed_at || new Date().toISOString(),
    },
  };

  return snapshot;
}

/**
 * Auto-recovers or regenerates an invoice by creating/updating the snapshot in the database.
 */
export async function generateAndSaveInvoice(supabase: SupabaseClient, bookingId: string): Promise<InvoiceSnapshot> {
  const snapshot = await compileInvoiceSnapshot(supabase, bookingId);

  // Check if invoice row exists
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing) {
    // Preserve existing invoice number in the snapshot
    snapshot.invoice_number = existing.invoice_number;

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        subtotal: snapshot.financials.subtotal,
        tax_rate: snapshot.financials.tax_rate,
        tax_amount: snapshot.financials.tax_amount,
        discount_amount: snapshot.financials.discount_amount,
        grand_total: snapshot.financials.grand_total,
        payment_method: snapshot.payment.method,
        transaction_id: snapshot.payment.transaction_id,
        snapshot: snapshot as unknown as Record<string, unknown>, // Save full snapshot JSONB
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }
  } else {
    // Insert new invoice row. The BEFORE INSERT trigger will generate the invoice number, 
    // and then we can update the snapshot JSONB with the generated invoice number afterwards if needed,
    // but actually the BEFORE INSERT trigger assign_invoice_number() already has logic to set NEW.invoice_number and inject it into the snapshot!
    // However, to ensure perfect consistency, let's insert it, fetch the returned row, patch the snapshot, and write it back.
    const { data: inserted, error: insertError } = await supabase
      .from("invoices")
      .insert({
        booking_id: bookingId,
        customer_id: snapshot.customer.id,
        partner_id: snapshot.partner?.id || null,
        subtotal: snapshot.financials.subtotal,
        tax_rate: snapshot.financials.tax_rate,
        tax_amount: snapshot.financials.tax_amount,
        discount_amount: snapshot.financials.discount_amount,
        grand_total: snapshot.financials.grand_total,
        payment_status: "paid",
        payment_method: snapshot.payment.method,
        transaction_id: snapshot.payment.transaction_id,
        snapshot: snapshot as unknown as Record<string, unknown>,
      })
      .select("id, invoice_number, snapshot")
      .single();

    if (insertError) {
      throw new Error(`Failed to insert invoice: ${insertError.message}`);
    }

    // Read the returned snapshot (database trigger assign_invoice_number populated it)
    if (inserted?.snapshot) {
      return inserted.snapshot as unknown as InvoiceSnapshot;
    } else {
      // Manual fallback if trigger failed to populate snapshot
      snapshot.invoice_number = inserted.invoice_number;
      await supabase
        .from("invoices")
        .update({ snapshot: snapshot as unknown as Record<string, unknown> })
        .eq("id", inserted.id);
    }
  }

  return snapshot;
}
