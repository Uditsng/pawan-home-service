import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getCachedPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, platformSettings] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getCachedPlatformSettings(),
  ]);

  const profile = {
    full_name: profileResult.data?.full_name || "Customer",
    avatar_url: profileResult.data?.avatar_url || ""
  };

  const referralReward = String(platformSettings.referralRewardReferrer);

  return (
    <div className="bg-surface-dim text-on-background min-h-screen pb-24 flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      <main className="flex-1 max-w-xl mx-auto w-full max-w-full px-4 md:px-5 pt-4 pb-8 relative z-10 space-y-3 md:space-y-4 min-w-0">
        {/* Profile Header Card */}
        <div className="bg-primary text-on-primary rounded-3xl p-5 md:p-6 shadow-sm flex items-center gap-3.5 md:gap-4 w-full min-w-0 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 md:w-18 md:h-18 rounded-full overflow-hidden bg-primary-fixed/20 flex items-center justify-center shrink-0 relative z-10 border-2 border-white/10">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" sizes="76px" />
            ) : (
              <span className="material-symbols-outlined text-[32px] md:text-[38px] text-on-primary/40">person</span>
            )}
          </div>
          <div className="min-w-0 flex-1 relative z-10">
            <h1 className="text-lg md:text-xl font-extrabold tracking-wide mb-0.5 truncate">{profile.full_name}</h1>
            <p className="text-xs md:text-sm text-on-primary/70 mb-1.5 font-medium truncate">{user.email}</p>
            <Link href="/customer/profile/edit" className="text-xs md:text-sm text-secondary font-bold inline-flex items-center hover:opacity-80 transition-opacity">
              Edit profile <span className="material-symbols-outlined text-sm ml-0.5">edit_square</span>
            </Link>
          </div>
        </div>

        {/* Top 2 Action Blocks */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full min-w-0">
          <Link href="/customer/bookings" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:bg-surface-container-low transition-colors h-24 md:h-28 min-w-0">
            <span className="material-symbols-outlined text-on-surface-variant text-xl md:text-2xl shrink-0">assignment</span>
            <span className="font-bold text-sm md:text-base text-on-surface leading-tight">My<br />bookings</span>
          </Link>
          <Link href="/customer/support" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:bg-surface-container-low transition-colors h-24 md:h-28 min-w-0">
            <span className="material-symbols-outlined text-on-surface-variant text-xl md:text-2xl shrink-0">support_agent</span>
            <span className="font-bold text-sm md:text-base text-on-surface leading-tight">Help &<br />Support</span>
          </Link>
        </div>

        {/* Refer block */}
        <Link href="/customer/profile/referral" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex items-center justify-between hover:bg-surface-container-low transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="material-symbols-outlined text-star text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
            <div className="flex items-center flex-wrap gap-y-1">
              <span className="font-bold text-sm md:text-base text-on-surface">Refer & earn</span>
              <span className="bg-star/15 text-star text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ml-1.5 md:ml-2 uppercase">Upto ₹{referralReward}</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant/60 text-lg md:text-xl">chevron_right</span>
        </Link>

        {/* Links List */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <Link href="/customer/offers" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">local_activity</span>
              <span className="font-semibold text-sm md:text-base text-on-surface">Offers & deals</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/30 text-lg md:text-xl group-hover:text-on-surface-variant/60 transition-colors">chevron_right</span>
          </Link>

          <Link href="/customer/profile/addresses" className="flex items-center justify-between p-4 md:p-5 border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-3 md:gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-lg md:text-xl">place</span>
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
          <p className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">App version: 2.0.3 (d1b0)</p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
