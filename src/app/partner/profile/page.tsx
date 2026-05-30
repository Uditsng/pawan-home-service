import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PartnerBottomNav from "@/components/PartnerBottomNav";
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
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      {/* Primary Header Section */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6 flex gap-4">
        <div className="flex items-center gap-3 md:gap-4 max-w-3xl mx-auto w-full">
          <div className="w-[60px] h-[60px] md:w-[76px] md:h-[76px] rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center shrink-0 relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name || "Partner"} fill className="object-cover" sizes="76px" />
            ) : (
              <span className="material-symbols-outlined text-[32px] md:text-[40px] text-slate-400">person</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5 md:mb-1">
              <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-wide">{profile.full_name || "Partner"}</h1>
              <span className="bg-success text-on-success text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] uppercase">Available</span>
            </div>
            <p className="text-[12px] md:text-[13px] text-on-primary/70 font-medium break-all">ID: #{profile.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-[12px] md:text-[13px] text-on-primary/70 font-medium break-all mb-1.5 md:mb-2">{profile.phone || user.email}</p>
            <Link href="/partner/profile/edit" className="text-[12px] md:text-[13px] text-on-primary font-bold flex items-center hover:opacity-80 transition-opacity">
              Edit profile <span className="material-symbols-outlined text-[13px] md:text-[14px] ml-0.5">edit_square</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 relative z-10 space-y-3 md:space-y-4">
        
        {/* Performance Stats Action Blocks */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white p-3 md:p-4 rounded-[16px] md:rounded-[20px] shadow-sm flex flex-col items-center justify-center text-center h-[90px] md:h-[105px]">
            <span className="font-extrabold text-[20px] md:text-[24px] text-[#1c2438]">{profile.rating_avg ? profile.rating_avg.toFixed(1) : "—"}</span>
            <span className="font-bold text-[11px] md:text-[12px] text-slate-500 uppercase tracking-widest mt-1">Rating</span>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-[16px] md:rounded-[20px] shadow-sm flex flex-col items-center justify-center text-center h-[90px] md:h-[105px]">
            <span className="font-extrabold text-[20px] md:text-[24px] text-[#1c2438]">{completedJobs}</span>
            <span className="font-bold text-[11px] md:text-[12px] text-slate-500 uppercase tracking-widest mt-1">Jobs Done</span>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-[16px] md:rounded-[20px] shadow-sm flex flex-col items-center justify-center text-center h-[90px] md:h-[105px]">
            <span className="font-extrabold text-[20px] md:text-[24px] text-[#1c2438]">{successRate}%</span>
            <span className="font-bold text-[11px] md:text-[12px] text-slate-500 uppercase tracking-widest mt-1">Success</span>
          </div>
        </div>

        {/* Links List */}
        <div className="bg-white rounded-[16px] md:rounded-[20px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">toggle_on</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Accepting New Jobs</span>
            </div>
            <div className="relative inline-block w-10 h-6 rounded-full bg-success transition-colors">
              <div className="absolute top-1 left-5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
            </div>
          </div>

          <Link href="/partner/profile/services" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">work</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Services & Areas</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/partner/profile/documents" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">badge</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Documents & Verification</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/partner/profile/bank" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">account_balance</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Bank Details</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/partner/profile/settings" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">settings</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">App Settings</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>
          
          <Link href="/partner/support" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">support_agent</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Help & Support</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/partner/delete-account" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">delete_forever</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Request account deletion</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <LogoutButton variant="list" />
        </div>

        {/* Footer */}
        <div className="text-center pt-6 md:pt-8 pb-4">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">App version: 1.0.2</p>
        </div>

      </main>

      <PartnerBottomNav />
    </div>
  );
}
