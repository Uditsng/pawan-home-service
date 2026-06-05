import BottomNav from "@/components/BottomNav";
import CustomerHeader from "@/components/CustomerHeader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wallet | PHS Company",
  description: "Secure payments and digital wallet.",
};

export default function WalletPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col items-center justify-center">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center shadow-tactile relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
          
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-[#059669] drop-shadow-sm">account_balance_wallet</span>
          </div>

          <span className="inline-flex items-center gap-1 bg-secondary/20 px-3 py-1 rounded-full text-xs font-bold text-on-secondary mb-4 uppercase tracking-wider">
            Coming Soon
          </span>

          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-3">
            Digital Wallet
          </h1>
          
          <p className="text-on-surface-variant text-sm md:text-base leading-relaxed mb-6 font-medium">
            We are currently building a secure digital wallet system! Soon, you will be able to load credits, receive instant refunds, manage service vouchers, and secure bookings with one-tap checkout.
          </p>

          <div className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant/80 font-medium">
            This feature is under development to assure seamless future payments.
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
