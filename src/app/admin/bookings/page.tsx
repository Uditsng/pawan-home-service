import { createClient } from "@/utils/supabase/server";
import { BookingsCommand } from "./BookingsCommand";

// ─── Typed Interfaces (exported for client component) ────────

export interface SerializedBooking {
  id: string;
  status: string;
  total_amount: number;
  city: string | null;
  pincode: string | null;
  address: string | null;
  payment_method: string | null;
  scheduled_date: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  customer_id: string | null;
  partner_id: string | null;
  arrival_otp: string | null;
  arrival_otp_verified: boolean;
  completion_otp: string | null;
  completion_otp_verified: boolean;
  failed_otp_attempts: number;
  service_started_at: string | null;
  service_completed_at: string | null;
  service: {
    id: string;
    title: string;
    category: string;
  } | null;
  customer: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  partner: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    status: string;
  } | null;
}

export interface AvailablePartner {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  rating_avg: number;
  jobs_done: number;
  reliability_rate: number;
  cities: string[];
  pincodes: string[];
  skills: string[];
}

export interface BookingStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

// ─── Server Component ────────────────────────────────────────

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  let bookingsRaw: Record<string, unknown>[] = [];
  let isSchemaError = false;

  // ─── 1. Primary Bookings Query (full relational join) ──────
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      total_amount,
      city,
      pincode,
      address,
      payment_method,
      scheduled_date,
      created_at,
      accepted_at,
      started_at,
      completed_at,
      cancelled_at,
      cancelled_by,
      cancellation_reason,
      customer_id,
      partner_id,
      arrival_otp,
      arrival_otp_verified,
      completion_otp,
      completion_otp_verified,
      failed_otp_attempts,
      service_started_at,
      service_completed_at,
      service:service_id (id, title, category),
      customer:customer_id (id, full_name, email, phone, avatar_url),
      partner:partner_id (id, full_name, email, phone, avatar_url, status)
    `)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    // Schema fallback: if new columns don't exist yet, retry without them
    if (
      error.code === "42703" ||
      error.message?.includes("address") ||
      error.message?.includes("payment_method")
    ) {
      isSchemaError = true;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          total_amount,
          city,
          pincode,
          scheduled_date,
          created_at,
          accepted_at,
          started_at,
          completed_at,
          cancelled_at,
          cancelled_by,
          cancellation_reason,
          customer_id,
          partner_id,
          service:service_id (id, title, category),
          customer:customer_id (id, full_name, email, phone, avatar_url),
          partner:partner_id (id, full_name, email, phone, avatar_url, status)
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!fallbackError && fallbackData) {
        bookingsRaw = fallbackData.map((b) => ({
          ...b,
          address: null,
          payment_method: "UPI",
        }));
      } else {
        console.error("Fallback bookings query also failed:", fallbackError);
      }
    } else {
      console.error("Bookings query error:", error);
    }
  } else if (data) {
    bookingsRaw = data;
  }

  // ─── 2. Serialize bookings with safe typing ────────────────

  const bookings: SerializedBooking[] = bookingsRaw.map((b: Record<string, unknown>) => {
    const svc = b.service as Record<string, unknown> | null;
    const cust = b.customer as Record<string, unknown> | null;
    const part = b.partner as Record<string, unknown> | null;

    return {
      id: String(b.id || ""),
      status: String(b.status || "pending"),
      total_amount: Number(b.total_amount || 0),
      city: (b.city as string) || null,
      pincode: (b.pincode as string) || null,
      address: (b.address as string) || null,
      payment_method: (b.payment_method as string) || "UPI",
      scheduled_date: (b.scheduled_date as string) || null,
      created_at: String(b.created_at || ""),
      accepted_at: (b.accepted_at as string) || null,
      started_at: (b.started_at as string) || null,
      completed_at: (b.completed_at as string) || null,
      cancelled_at: (b.cancelled_at as string) || null,
      cancelled_by: (b.cancelled_by as string) || null,
      cancellation_reason: (b.cancellation_reason as string) || null,
      customer_id: (b.customer_id as string) || null,
      partner_id: (b.partner_id as string) || null,
      arrival_otp: (b.arrival_otp as string) || null,
      arrival_otp_verified: !!b.arrival_otp_verified,
      completion_otp: (b.completion_otp as string) || null,
      completion_otp_verified: !!b.completion_otp_verified,
      failed_otp_attempts: Number(b.failed_otp_attempts || 0),
      service_started_at: (b.service_started_at as string) || null,
      service_completed_at: (b.service_completed_at as string) || null,
      service: svc
        ? {
            id: String(svc.id || ""),
            title: String(svc.title || "Home Service"),
            category: String(svc.category || "General"),
          }
        : null,
      customer: cust
        ? {
            id: String(cust.id || ""),
            full_name: String(cust.full_name || "Unknown Customer"),
            email: (cust.email as string) || null,
            phone: (cust.phone as string) || null,
            avatar_url: (cust.avatar_url as string) || null,
          }
        : null,
      partner: part
        ? {
            id: String(part.id || ""),
            full_name: String(part.full_name || "Unknown Professional"),
            email: (part.email as string) || null,
            phone: (part.phone as string) || null,
            avatar_url: (part.avatar_url as string) || null,
            status: String(part.status || "offline"),
          }
        : null,
    };
  });

  // ─── 5. Filter Options (distinct categories & cities) ──────

  const serviceCategories = Array.from(
    new Set(bookings.map((b) => b.service?.category).filter(Boolean))
  ) as string[];

  const cities = Array.from(
    new Set(bookings.map((b) => b.city).filter(Boolean))
  ) as string[];

  // ─── 6. Available Partners for Manual Assign Drawer ────────

  const { data: partnersData } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      status,
      rating_avg,
      jobs_accepted_count,
      jobs_offered_count,
      jobs_cancelled_count,
      partner_services:partner_services(
        services:services(title)
      ),
      partner_service_areas:partner_service_areas(
        pincode,
        city
      )
    `)
    .eq("role", "partner")
    .in("status", ["active", "offline"]);

  const availablePartners: AvailablePartner[] = (partnersData || []).map(
    (p: Record<string, unknown>) => {
      const serviceAreas = (p.partner_service_areas as Record<string, unknown>[]) || [];
      const partnerServices = (p.partner_services as Record<string, unknown>[]) || [];

      const accepted = Number(p.jobs_accepted_count || 0);
      const offered = Number(p.jobs_offered_count || 1);
      const reliability = offered > 0 ? Math.round((accepted / offered) * 100) : 98;

      return {
        id: String(p.id || ""),
        full_name: String(p.full_name || "Unknown Professional"),
        email: (p.email as string) || null,
        phone: (p.phone as string) || null,
        avatar_url: (p.avatar_url as string) || null,
        status: String(p.status || "offline"),
        rating_avg: Number(p.rating_avg || 4.8),
        jobs_done: accepted,
        reliability_rate: reliability,
        cities: Array.from(
          new Set(serviceAreas.map((sa) => sa.city as string).filter(Boolean))
        ),
        pincodes: serviceAreas
          .map((sa) => sa.pincode as string)
          .filter(Boolean),
        skills: partnerServices
          .map(
            (ps) =>
              ((ps.services as Record<string, unknown>)?.title as string) || ""
          )
          .filter(Boolean),
      };
    }
  );

  // ─── 7. Render ─────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">
            Bookings
          </h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Track all bookings, assign partners, and manage orders.
          </p>
        </div>
      </div>

      {/* Graceful Schema Warning Banner */}
      {isSchemaError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-700">
                warning
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">
                Database Schema Upgrade Required
              </h4>
              <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                The bookings table is missing the columns{" "}
                <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                  payment_method
                </code>{" "}
                and{" "}
                <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                  address
                </code>
                . Please execute the migration queries inside your Supabase
                Dashboard SQL editor.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl border border-amber-500/25 transition-all text-center">
            Schema Pending
          </div>
        </div>
      )}

      {/* Interactive Bookings Command Client Application */}
      <BookingsCommand
        initialBookings={bookings}
        serviceCategories={serviceCategories}
        cities={cities}
        availablePartners={availablePartners}
      />
    </div>
  );
}
