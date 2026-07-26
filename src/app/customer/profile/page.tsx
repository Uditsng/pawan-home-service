import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, platformSettings] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    fetchPlatformSettings(supabase),
  ]);

  const profile = {
    full_name: profileResult.data?.full_name || "Customer",
    avatar_url: profileResult.data?.avatar_url || ""
  };

  const referralReward = String(platformSettings.referralRewardReferrer);

  return (
    <div className="bg-surface-dim text-on-background min-h-screen pb-24 flex flex-col font-body">
      {/* Header Section */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6 flex gap-4">
        <div className="flex items-center gap-3 md:gap-4 max-w-3xl mx-auto">
          <div className="w-15 h-15 md:w-19 md:h-19 rounded-full overflow-hidden bg-primary-fixed/20 flex items-center justify-center shrink-0 relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" sizes="76px" />
            ) : (
              <span className="material-symbols-outlined text-[32px] md:text-[40px] text-on-primary/40">person</span>
            )}
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-wide mb-0.5 md:mb-1">{profile.full_name}</h1>
            <p className="text-xs md:text-sm text-on-primary/50 mb-1.5 md:mb-2 font-medium break-all">{user.email}</p>
            <Link href="/customer/profile/edit" className="text-xs md:text-sm text-on-primary font-bold flex items-center hover:opacity-80 transition-opacity">
              Edit profile <span className="material-symbols-outlined text-sm ml-0.5">edit_square</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 relative z-10 space-y-3 md:space-y-4">

        {/* Top 2 Action Blocks */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Link href="/customer/bookings" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:bg-surface-container-low transition-colors h-24 md:h-28">
            <span className="material-symbols-outlined text-on-surface-variant text-xl md:text-2xl">assignment</span>
            <span className="font-bold text-sm md:text-base text-on-surface leading-tight">My<br />bookings</span>
          </Link>
          <Link href="/customer/support" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:bg-surface-container-low transition-colors h-24 md:h-28">
            <span className="material-symbols-outlined text-on-surface-variant text-xl md:text-2xl">support_agent</span>
            <span className="font-bold text-sm md:text-base text-on-surface leading-tight">Help &<br />Support</span>
          </Link>
        </div>

        {/* Refer block */}
        <Link href="/customer/profile/referral" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex items-center justify-between hover:bg-surface-container-low transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="material-symbols-outlined text-star text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
            <div className="flex items-center flex-wrap gap-y-1">
              <span className="font-bold text-sm md:text-base text-on-surface">Refer & earn</span>
              <span className="bg-star/15 text-star text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ml-1.5 md:ml-2 uppercase">Upto ₹{referralReward}</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant/60 text-lg md:text-xl">chevron_right</span>
        </Link>

        {/* Links List */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <Link href="/customer/profile/addresses" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">location_on</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">Saved addresses</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/customer/profile/reviews" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">rate_review</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">My reviews</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/about-us" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">info</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">About us</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/terms-conditions" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">description</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">Terms & conditions</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/privacy-policy" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">verified_user</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">Privacy policy</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/customer/delete-account" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">assignment</span>
              <div className="flex items-center flex-wrap gap-y-1">
                <span className="font-semibold text-sm md:text-base text-on-surface">Request account deletion</span>
                <span className="bg-surface-container-highest text-on-surface-variant text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ml-2 md:ml-3 uppercase tracking-wide">Coming Soon</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <LogoutButton variant="list" />
        </div>

        {/* Footer */}
        <div className="text-center pt-6 md:pt-8 pb-4">
          <p className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">App version: 1.4.5 (d1b0)</p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
