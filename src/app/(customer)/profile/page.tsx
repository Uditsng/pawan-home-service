import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const profile = {
    full_name: data?.full_name || "Customer",
    avatar_url: data?.avatar_url || ""
  };

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      {/* Green Header Section */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6 flex gap-4">
        <div className="flex items-center gap-3 md:gap-4 max-w-3xl mx-auto">
          <div className="w-[60px] h-[60px] md:w-[76px] md:h-[76px] rounded-full overflow-hidden bg-[#dcdff2] flex items-center justify-center shrink-0 relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" sizes="76px" />
            ) : (
              <span className="material-symbols-outlined text-[32px] md:text-[40px] text-[#a9b1c7]">person</span>
            )}
          </div>
          <div>
            <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-wide mb-0.5 md:mb-1">{profile.full_name}</h1>
            <p className="text-[12px] md:text-[13px] text-on-primary/50 mb-1.5 md:mb-2 font-medium break-all">{user.email}</p>
            <Link href="/profile/edit" className="text-[12px] md:text-[13px] text-on-primary font-bold flex items-center hover:opacity-80 transition-opacity">
              Edit profile <span className="material-symbols-outlined text-[13px] md:text-[14px] ml-0.5">edit_square</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 relative z-10 space-y-3 md:space-y-4">

        {/* Top 2 Action Blocks */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Link href="/bookings" className="bg-white p-4 md:p-5 rounded-[16px] md:rounded-[20px] shadow-sm flex flex-col justify-between hover:bg-slate-50 transition-colors h-[90px] md:h-[105px]">
            <span className="material-symbols-outlined text-slate-500 text-[20px] md:text-[24px]">assignment</span>
            <span className="font-bold text-[13px] md:text-[15px] text-[#1c2438] leading-tight">My<br />bookings</span>
          </Link>
          <Link href="/support" className="bg-white p-4 md:p-5 rounded-[16px] md:rounded-[20px] shadow-sm flex flex-col justify-between hover:bg-slate-50 transition-colors h-[90px] md:h-[105px]">
            <span className="material-symbols-outlined text-slate-500 text-[20px] md:text-[24px]">support_agent</span>
            <span className="font-bold text-[13px] md:text-[15px] text-[#1c2438] leading-tight">Help &<br />Support</span>
          </Link>
        </div>

        {/* Refer block */}
        <Link href="/profile/referral" className="bg-white p-4 md:p-[18px] rounded-[16px] md:rounded-[20px] shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="material-symbols-outlined text-[#eab308] text-[18px] md:text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
            <div className="flex items-center">
              <span className="font-bold text-[13px] md:text-[15px] text-[#1c2438]">Refer & earn</span>
              <span className="bg-[#fef9c3] text-[#ca8a04] text-[8px] md:text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] ml-2 md:ml-3 uppercase">Upto ₹100</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[18px] md:text-[20px]">chevron_right</span>
        </Link>

        {/* Links List */}
        <div className="bg-white rounded-[16px] md:rounded-[20px] shadow-sm overflow-hidden flex flex-col">
          <Link href="/profile/addresses" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">menu_book</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Saved addresses</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/about" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">info</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">About us</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/terms" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">description</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Terms of services</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/privacy" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">verified_user</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Privacy policy</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <Link href="/support/delete-account" className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">assignment</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Request account deletion</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </Link>

          <button className="flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors w-full text-left group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-slate-500 text-[18px] md:text-[20px]">logout</span>
              <span className="font-semibold text-[13px] md:text-[15px] text-[#1c2438]">Log out</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[18px] md:text-[20px] group-hover:text-slate-400 transition-colors">chevron_right</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 md:pt-8 pb-4">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">App version: 1.4.5 (d1b0)</p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
