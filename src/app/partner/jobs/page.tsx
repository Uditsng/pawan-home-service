import PartnerBottomNav from "@/components/PartnerBottomNav";
import PartnerHeader from "@/components/PartnerHeader";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import JobsClient, { RawOfferRow } from "./JobsClient";
import type { BookingWithDetails } from "@/lib/types";

export default async function PartnerJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── Fetch partner status + all job lists in parallel ──────────
  const [profileResult, assignedResult, activeResult, completedResult, offersResult] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .in("status", ["assigned", "confirmed"])
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .in("status", ["accepted", "professional_en_route", "professional_arrived", "otp_pending", "in_progress"])
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("bookings")
      .select("*, services:service_id(title, category), customer:customer_id(full_name)")
      .eq("partner_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20),
    // Open job offers for this partner
    supabase
      .from("booking_job_offers")
      .select(`
        id, booking_id, broadcast_tier, created_at,
        bookings:booking_id (
          id, service_id, city, area, pincode, scheduled_date, total_amount, address,
          services:service_id ( title, category )
        )
      `)
      .eq("partner_id", user.id)
      .eq("status", "offered")
      .order("created_at", { ascending: false }),
  ]);

  const partnerStatus = profileResult.data?.status ?? "offline";
  const assignedJobs  = (assignedResult.data  || []) as BookingWithDetails[];
  const activeJobs    = (activeResult.data    || []) as BookingWithDetails[];
  const completedJobs = (completedResult.data || []) as BookingWithDetails[];
  const offeredJobs = (offersResult.data as unknown as RawOfferRow[] || []).map((row) => {
    const rawBooking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    const rawService = rawBooking?.services
      ? (Array.isArray(rawBooking.services) ? rawBooking.services[0] : rawBooking.services)
      : null;

    return {
      id: row.id,
      booking_id: row.booking_id,
      broadcast_tier: row.broadcast_tier,
      created_at: row.created_at,
      bookings: rawBooking
        ? {
            id: rawBooking.id,
            service_id: rawBooking.service_id,
            city: rawBooking.city,
            area: rawBooking.area,
            pincode: rawBooking.pincode,
            scheduled_date: rawBooking.scheduled_date,
            total_amount: Number(rawBooking.total_amount || 0),
            address: rawBooking.address,
            services: rawService
              ? {
                  title: rawService.title,
                  category: rawService.category,
                }
              : null,
          }
        : null,
    };
  });

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <PartnerHeader initialStatus={partnerStatus} />

      <main className="max-w-7xl mx-auto px-5 pt-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black font-headline tracking-tighter text-on-surface">
              Job Center
            </h1>
            <p className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mt-0.5">
              Offers, assigned & active missions
            </p>
          </div>
        </div>

        {/* Tab Bar is rendered by JobsClient */}
        <JobsClient
          assignedJobs={assignedJobs}
          activeJobs={activeJobs}
          completedJobs={completedJobs}
          offeredJobs={offeredJobs}
        />
      </main>

      <PartnerBottomNav />
    </div>
  );
}
