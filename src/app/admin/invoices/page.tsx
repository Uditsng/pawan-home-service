import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InvoicesConsole from "./InvoicesConsole";

export interface AdminInvoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  booking: {
    id: string;
    status: string;
    scheduled_date: string | null;
    services: {
      title: string;
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
}

export default async function AdminInvoicesPage() {
  const supabase = await createClient();

  // Validate admin authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/login");
  }

  // Fetch all invoices
  const { data: invoicesRaw, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      grand_total,
      payment_method,
      transaction_id,
      created_at,
      booking:booking_id (
        id,
        status,
        scheduled_date,
        services:service_id (title)
      ),
      customer:customer_id (
        id,
        full_name,
        phone,
        email
      ),
      partner:partner_id (
        id,
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch invoices for admin console:", error);
  }

  const invoices: AdminInvoice[] = (invoicesRaw || []).map((inv: any) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    subtotal: Number(inv.subtotal || 0),
    tax_rate: Number(inv.tax_rate || 18.00),
    tax_amount: Number(inv.tax_amount || 0),
    discount_amount: Number(inv.discount_amount || 0),
    grand_total: Number(inv.grand_total || 0),
    payment_method: inv.payment_method || "Card",
    transaction_id: inv.transaction_id || "",
    created_at: inv.created_at,
    booking: inv.booking ? {
      id: inv.booking.id,
      status: inv.booking.status,
      scheduled_date: inv.booking.scheduled_date,
      services: inv.booking.services ? {
        title: inv.booking.services.title
      } : null
    } : null,
    customer: inv.customer ? {
      id: inv.customer.id,
      full_name: inv.customer.full_name,
      phone: inv.customer.phone,
      email: inv.customer.email
    } : null,
    partner: inv.partner ? {
      id: inv.partner.id,
      full_name: inv.partner.full_name
    } : null
  }));

  // Fetch list of bookings completed but without invoices (for manual override/generation list)
  const { data: missingInvoicesBookings } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      total_amount,
      scheduled_date,
      services:service_id (title),
      customer:customer_id (full_name, phone)
    `)
    .eq("status", "completed");

  // Filter in JS to find bookings that do NOT have a corresponding invoice in the fetched list
  const existingBookingIds = new Set(invoices.map(i => i.booking?.id).filter(Boolean));
  const completedWithoutInvoice = (missingInvoicesBookings || [])
    .filter((b: any) => !existingBookingIds.has(b.id))
    .map((b: any) => ({
      id: b.id,
      total_amount: Number(b.total_amount || 0),
      scheduled_date: b.scheduled_date,
      service_title: b.services?.title || "Home Service",
      customer_name: b.customer?.full_name || "Unknown Customer",
      customer_phone: b.customer?.phone || ""
    }));

  return (
    <InvoicesConsole 
      initialInvoices={invoices} 
      completedWithoutInvoice={completedWithoutInvoice} 
    />
  );
}
