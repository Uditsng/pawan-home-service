import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceSnapshot } from "./invoiceTypes";
import { generateAndSaveInvoice } from "./invoiceGenerator";

export type InvoiceUserRole = "customer" | "partner" | "admin";

export interface InvoiceDetails {
  id: string;
  booking_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: string;
  transaction_id: string;
  payment_status?: string | null;
  created_at: string;
  booking: {
    id: string;
    status: string;
    scheduled_date: string | null;
    created_at: string;
    address: string | null;
    city: string | null;
    pincode: string | null;
    pricing_model: string | null;
    selected_duration_minutes: number | null;
    base_price: number | null;
    meeting_location: string | null;
    destination: string | null;
    expected_bags: number | null;
    business_name: string | null;
    business_gstin: string | null;
    total_amount: number;
    wallet_discount_applied: number | null;
    service_id: string;
    services: {
      title: string;
      category?: string;
    } | null;
  } | null;
  customer: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  partner: {
    id: string;
    full_name: string;
  } | null;
  snapshot: InvoiceSnapshot | null;
}

const INVOICE_SELECT = `
  *,
  booking:booking_id (
    id,
    status,
    scheduled_date,
    created_at,
    address,
    city,
    pincode,
    pricing_model,
    selected_duration_minutes,
    base_price,
    meeting_location,
    destination,
    expected_bags,
    business_name,
    business_gstin,
    total_amount,
    wallet_discount_applied,
    service_id,
    services:service_id (title, category)
  ),
  customer:customer_id (id, full_name, phone, email),
  partner:partner_id (id, full_name)
`;

export async function fetchInvoiceWithRelations(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<InvoiceDetails | null> {
  const { data } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return (data as unknown as InvoiceDetails) ?? null;
}

export interface ResolveInvoiceResult {
  invoice: InvoiceDetails | null;
  isCompleted: boolean;
}

/**
 * Loads the invoice for a booking after authorizing access.
 *
 * Authorization: the booking ownership check runs against the user-scoped
 * client (RLS enforced), so only the booking's customer/partner or an admin
 * can proceed. Reads + recovery writes then use the service-role client —
 * this also fixes auto-recovery, which a customer could never perform before
 * (no INSERT/UPDATE RLS policy on invoices for customers).
 */
export async function resolveInvoice(params: {
  supabase: SupabaseClient;
  adminClient: SupabaseClient;
  bookingId: string;
  userId: string;
  role: InvoiceUserRole;
}): Promise<ResolveInvoiceResult> {
  const { supabase, adminClient, bookingId, userId, role } = params;

  let bookingQuery = supabase.from("bookings").select("id, status").eq("id", bookingId);
  if (role === "customer") bookingQuery = bookingQuery.eq("customer_id", userId);
  if (role === "partner") bookingQuery = bookingQuery.eq("partner_id", userId);

  const { data: booking } = await bookingQuery.single();
  if (!booking) return { invoice: null, isCompleted: false };

  const isCompleted = booking.status === "completed";

  let invoice = await fetchInvoiceWithRelations(adminClient, bookingId);

  // Recover when the invoice is missing entirely, or when a trigger-created
  // invoice has no snapshot (pre-2026-08-01 bug). The app compiles a full,
  // authoritative snapshot that the DB fallback compiler cannot match.
  if (isCompleted && (!invoice || !invoice.snapshot)) {
    try {
      await generateAndSaveInvoice(adminClient, bookingId);
      invoice = await fetchInvoiceWithRelations(adminClient, bookingId);
    } catch (err) {
      console.error("Invoice auto-recovery failed:", err);
    }
  }

  return { invoice, isCompleted };
}
