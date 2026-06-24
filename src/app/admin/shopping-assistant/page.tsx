import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import AdminShoppingAssistant from "./AdminShoppingAssistant";

export interface AdminPackage {
  id: string;
  service_id: string;
  duration_minutes: number;
  price: number;
  original_price: number | null;
  is_active: boolean;
}

export interface AdminBooking {
  id: string;
  customer_id: string;
  partner_id: string | null;
  status: string;
  total_amount: number;
  base_price: number | null;
  final_price: number | null;
  pricing_model: string | null;
  selected_duration_minutes: number | null;
  meeting_location: string | null;
  destination: string | null;
  expected_bags: number;
  scheduled_date: string;
  created_at: string;
  customer: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  partner: {
    id: string;
    full_name: string;
    phone: string | null;
  } | null;
}

export default async function AdminShoppingAssistantPage() {
  await requireAdmin();
  const supabase = await createClient();

  const CARRYBUDDY_SERVICE_ID = "7e3a6a9b-6401-4f56-8360-7a0be7470dae";

  // Fetch duration packages for CarryBuddy
  const { data: packages } = await supabase
    .from("service_duration_pricing")
    .select("*")
    .eq("service_id", CARRYBUDDY_SERVICE_ID)
    .order("duration_minutes", { ascending: true });

  // Fetch CarryBuddy bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      partner_id,
      status,
      total_amount,
      base_price,
      final_price,
      pricing_model,
      selected_duration_minutes,
      meeting_location,
      destination,
      expected_bags,
      scheduled_date,
      created_at,
      customer:customer_id (
        id,
        full_name,
        email,
        phone
      ),
      partner:partner_id (
        id,
        full_name,
        phone
      )
    `)
    .eq("service_id", CARRYBUDDY_SERVICE_ID)
    .order("created_at", { ascending: false });

  // Convert types to clean, strictly-typed records
  const typedPackages: AdminPackage[] = (packages || []).map((pkg) => ({
    id: pkg.id,
    service_id: pkg.service_id,
    duration_minutes: Number(pkg.duration_minutes),
    price: Number(pkg.price),
    original_price: pkg.original_price ? Number(pkg.original_price) : null,
    is_active: Boolean(pkg.is_active),
  }));

  const typedBookings: AdminBooking[] = (bookings || []).map((b) => {
    const cust = Array.isArray(b.customer) ? b.customer[0] : b.customer;
    const part = Array.isArray(b.partner) ? b.partner[0] : b.partner;

    return {
      id: b.id,
      customer_id: b.customer_id,
      partner_id: b.partner_id,
      status: b.status,
      total_amount: Number(b.total_amount),
      base_price: b.base_price ? Number(b.base_price) : null,
      final_price: b.final_price ? Number(b.final_price) : null,
      pricing_model: b.pricing_model,
      selected_duration_minutes: b.selected_duration_minutes ? Number(b.selected_duration_minutes) : null,
      meeting_location: b.meeting_location,
      destination: b.destination,
      expected_bags: Number(b.expected_bags || 0),
      scheduled_date: b.scheduled_date,
      created_at: b.created_at,
      customer: cust
        ? {
            id: cust.id,
            full_name: cust.full_name,
            email: cust.email,
            phone: cust.phone,
          }
        : null,
      partner: part
        ? {
            id: part.id,
            full_name: part.full_name,
            phone: part.phone,
          }
        : null,
    };
  });

  return (
    <AdminShoppingAssistant
      initialPackages={typedPackages}
      initialBookings={typedBookings}
    />
  );
}
