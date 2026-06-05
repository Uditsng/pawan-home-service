import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CustomerHeader from "@/components/CustomerHeader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account | PHS Company",
  description: "Request account deletion.",
};

export default function DeleteAccountComingSoonPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col items-center justify-center">

        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center shadow-tactile relative overflow-hidden bg-white/70">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />


          {/* Standard Emerald icon container as per rule 11-B & 8-H */}
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-[#059669] drop-shadow-sm">no_accounts</span>
          </div>

          <span className="inline-flex items-center gap-1 bg-secondary/20 px-3 py-1 rounded-full text-xs font-bold text-on-secondary mb-4 uppercase tracking-wider">
            Coming Soon
          </span>

          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-3">
            Account Deletion
          </h1>

          <p className="text-on-surface-variant text-sm leading-relaxed mb-6 font-medium">
            We are working on an automated, secure account self-deletion interface. Currently, this page is under development to ensure data security standards are met.
          </p>

          <div className="bg-surface-container rounded-2xl p-4 mb-6 border border-outline-variant/30 text-left">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1">
              Urgent Request?
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Please email our security desk at <a href="mailto:pavanhomess@gmail.com" className="text-primary font-bold hover:underline">pavanhomess@gmail.com</a> from your registered email address. We will verify and purge all your personal records within 24-48 hours.
            </p>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant/80 font-medium">
            We value your privacy and handle all data requests in accordance with our terms.
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
