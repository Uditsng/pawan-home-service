import PartnerBottomNav from "@/components/PartnerBottomNav";
import PartnerHeader from "@/components/PartnerHeader";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import JobsClient from "./JobsClient";
import type { BookingWithDetails } from "@/lib/types";

export default async function PartnerJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ─── Assigned jobs: auto-assigned to this partner, confirmed status ──
  const { data: assignedData } = await supabase
    .from("bookings")
    .select(
      "*, services:service_id(title, category), customer:customer_id(full_name)"
    )
    .eq("partner_id", user.id)
    .eq("status", "confirmed")
    .order("scheduled_date", { ascending: true });

  // ─── Active jobs: assigned to this partner, in accepted/in_progress ──
  const { data: activeData } = await supabase
    .from("bookings")
    .select(
      "*, services:service_id(title, category), customer:customer_id(full_name)"
    )
    .eq("partner_id", user.id)
    .in("status", ["accepted", "in_progress"])
    .order("scheduled_date", { ascending: true });

  // ─── Completed jobs: done by this partner ──────────────────
  const { data: completedData } = await supabase
    .from("bookings")
    .select(
      "*, services:service_id(title, category), customer:customer_id(full_name)"
    )
    .eq("partner_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(20);

  const assignedJobs = (assignedData || []) as BookingWithDetails[];
  const activeJobs = (activeData || []) as BookingWithDetails[];
  const completedJobs = (completedData || []) as BookingWithDetails[];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <PartnerHeader />

      <main className="max-w-7xl mx-auto px-5 pt-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black font-headline tracking-tighter text-on-surface">
              Job Center
            </h1>
            <p className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mt-0.5">
              Your assigned & active missions
            </p>
          </div>
          <button className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm font-bold text-on-surface-variant">
              filter_list
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Filter
            </span>
          </button>
        </div>

        {/* Tab Bar is rendered by JobsClient */}
        <JobsClient
          assignedJobs={assignedJobs}
          activeJobs={activeJobs}
          completedJobs={completedJobs}
        />
      </main>

      <PartnerBottomNav />
    </div>
  );
}
