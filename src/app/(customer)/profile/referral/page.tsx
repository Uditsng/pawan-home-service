import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CustomerHeader from "@/components/CustomerHeader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer & Earn | PHS Company",
  description: "Invite friends and family to earn rewards.",
};

export default function ReferralComingSoonPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col items-center justify-center">
        
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center shadow-tactile relative overflow-hidden bg-white/70">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
          
          {/* Back button */}
          <div className="text-left mb-6">
            <Link 
              href="/profile" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Profile
            </Link>
          </div>

          {/* Standard Emerald icon container as per rule 11-B & 8-H */}
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-[#059669] drop-shadow-sm">card_giftcard</span>
          </div>

          <span className="inline-flex items-center gap-1 bg-secondary/20 px-3 py-1 rounded-full text-xs font-bold text-on-secondary mb-4 uppercase tracking-wider">
            Coming Soon
          </span>

          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-3">
            Refer & Earn
          </h1>
          
          <p className="text-on-surface-variant text-sm md:text-base leading-relaxed mb-6 font-medium">
            We are building a rewarding referral program! Soon, you will be able to share your unique invite code with friends and family. Once they complete their first booking, both of you will receive exciting reward credits directly in your wallets.
          </p>

          <div className="bg-surface-container rounded-2xl p-4 mb-6 border border-outline-variant/30 flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block">
                Estimated Bonus
              </span>
              <span className="font-headline text-lg font-bold text-on-surface">
                Upto ₹100 per invite
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-2xl">celebration</span>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant/80 font-medium">
            Stay tuned! We are finalizing the platform integration to launch this soon.
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
