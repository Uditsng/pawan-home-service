import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import type { PartnerProfile } from "@/lib/types";

export default async function PartnerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch partner profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as PartnerProfile | null;
  if (!profile || profile.role !== "partner") {
    redirect("/login");
  }

  // Calculate success rate safely
  const completedJobs = profile.jobs_accepted_count || 0;
  const offeredJobs = profile.jobs_offered_count || 1; 
  const successRate = profile.acceptance_rate
    ? Math.round(profile.acceptance_rate * 100)
    : Math.round((completedJobs / offeredJobs) * 100);

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen pb-24 lg:pb-12 flex flex-col">
      <div className="bg-primary text-on-primary py-6 sm:py-8 px-4 sm:px-6 lg:px-8 border-b border-outline-variant/15 shadow-sm">
        <div className="flex items-center gap-4 max-w-5xl mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center shrink-0 relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name || "Professional"} fill className="object-cover" sizes="80px" />
            ) : (
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-on-primary">person</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black font-headline tracking-wide">{profile.full_name || "Professional"}</h1>
              {profile.status === "active" && (
                <span className="bg-secondary text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Online</span>
              )}
              {profile.status === "offline" && (
                <span className="bg-white/20 text-on-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Offline</span>
              )}
              {["busy", "professional_en_route", "professional_arrived", "otp_pending", "in_progress"].includes(profile.status) && (
                <span className="bg-warning/30 text-warning-container text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">On A Job</span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-on-primary/80 font-medium mb-2">{profile.phone || user.email}</p>
            <Link href="/partner/profile/edit" prefetch={false} className="text-xs sm:text-sm text-secondary font-bold inline-flex items-center gap-1 hover:underline">
              <span>Edit profile</span>
              <span className="material-symbols-outlined text-sm">edit_square</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Performance Stats Action Blocks */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col items-center justify-center text-center">
            <span className="font-black text-2xl sm:text-3xl text-primary font-headline">{profile.rating_avg ? profile.rating_avg.toFixed(1) : "—"}</span>
            <span className="font-bold text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-widest mt-1">Rating</span>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col items-center justify-center text-center">
            <span className="font-black text-2xl sm:text-3xl text-primary font-headline">{completedJobs}</span>
            <span className="font-bold text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-widest mt-1">Jobs Done</span>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col items-center justify-center text-center">
            <span className="font-black text-2xl sm:text-3xl text-primary font-headline">{successRate}%</span>
            <span className="font-bold text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-widest mt-1">Success</span>
          </div>
        </div>

        {/* Links List Grid */}
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl shadow-xs overflow-hidden divide-y divide-outline-variant/15">

          <Link href="/partner/profile/services" prefetch={false} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">work</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-on-surface">My Services & Areas</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
          </Link>

          <Link href="/partner/profile/bank" prefetch={false} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">account_balance</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-on-surface">Bank Details & Payouts</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
          </Link>

          <Link href="/partner/profile/settings" prefetch={false} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">settings</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-on-surface">Settings</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
          </Link>
          
          <Link href="/partner/support" prefetch={false} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">support_agent</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-on-surface">Help & Support</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
          </Link>

          <Link href="/partner/delete-account" prefetch={false} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-error">Delete Account</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/50 group-hover:text-error group-hover:translate-x-1 transition-all">chevron_right</span>
          </Link>

          <LogoutButton variant="list" />
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-4">
          <p className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest">PHS Professional App v1.0.2</p>
        </div>

      </main>
    </div>
  );
}
