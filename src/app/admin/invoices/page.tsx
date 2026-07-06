import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InvoicesConsole from "./InvoicesConsole";
import { InvoiceSnapshot } from "@/lib/invoice/invoiceTypes";

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

interface DBInvoiceRow {
  id: string;
  invoice_number: string;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  grand_total: number | null;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  snapshot: Record<string, unknown> | null;
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

interface DBMissingInvoiceBooking {
  id: string;
  status: string;
  total_amount: number | null;
  scheduled_date: string | null;
  services: {
    title: string;
  } | null;
  customer: {
    full_name: string;
    phone: string | null;
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

  // Fetch invoices and missing invoice bookings in parallel
  const [invoicesRes, missingInvoicesRes] = await Promise.all([
    supabase
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
        snapshot,
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
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select(`
        id,
        status,
        total_amount,
        scheduled_date,
        services:service_id (title),
        customer:customer_id (full_name, phone)
      `)
      .eq("status", "completed")
  ]);

  const { data: invoicesRaw, error } = invoicesRes;
  const { data: missingInvoicesBookings } = missingInvoicesRes;

  if (error) {
    console.error("Failed to fetch invoices for admin console:", error);
  }

  const invoices: AdminInvoice[] = ((invoicesRaw as unknown as DBInvoiceRow[]) || []).map((inv) => {
    const snapshot = inv.snapshot as unknown as InvoiceSnapshot | null;

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      subtotal: Number(snapshot?.financials?.subtotal ?? inv.subtotal ?? 0),
      tax_rate: Number(snapshot?.financials?.tax_rate ?? inv.tax_rate ?? 18.00),
      tax_amount: Number(snapshot?.financials?.tax_amount ?? inv.tax_amount ?? 0),
      discount_amount: Number(snapshot?.financials?.discount_amount ?? inv.discount_amount ?? 0),
      grand_total: Number(snapshot?.financials?.grand_total ?? inv.grand_total ?? 0),
      payment_method: snapshot?.payment?.method ?? inv.payment_method ?? "Card",
      transaction_id: snapshot?.payment?.transaction_id ?? inv.transaction_id ?? "",
      created_at: inv.created_at,
      booking: snapshot?.booking ? {
        id: snapshot.booking.id,
        status: inv.booking?.status || "completed",
        scheduled_date: snapshot.booking.scheduled_date,
        services: {
          title: snapshot.booking.service_title || "Home Service"
        }
      } : inv.booking ? {
        id: inv.booking.id,
        status: inv.booking.status,
        scheduled_date: inv.booking.scheduled_date,
        services: inv.booking.services ? {
          title: inv.booking.services.title
        } : null
      } : null,
      customer: snapshot?.customer ? {
        id: snapshot.customer.id,
        full_name: snapshot.customer.full_name,
        phone: snapshot.customer.phone || null,
        email: snapshot.customer.email || null
      } : inv.customer ? {
        id: inv.customer.id,
        full_name: inv.customer.full_name,
        phone: inv.customer.phone,
        email: inv.customer.email
      } : null,
      partner: snapshot?.partner ? {
        id: snapshot.partner.id,
        full_name: snapshot.partner.full_name
      } : inv.partner ? {
        id: inv.partner.id,
        full_name: inv.partner.full_name
      } : null
    };
  });

  // Filter in JS to find bookings that do NOT have a corresponding invoice in the fetched list
  const existingBookingIds = new Set(invoices.map(i => i.booking?.id).filter(Boolean));
  const completedWithoutInvoice = ((missingInvoicesBookings as unknown as DBMissingInvoiceBooking[]) || [])
    .filter((b) => !existingBookingIds.has(b.id))
    .map((b) => ({
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
