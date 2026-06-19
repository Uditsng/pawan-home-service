import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartnerHeader from "@/components/PartnerHeader";
import PartnerBottomNav from "@/components/PartnerBottomNav";

export const metadata = {
  title: "Delete Account | PHS Cleaning Company",
  description: "Request partner account deletion.",
};

export default async function PartnerDeleteAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      <PartnerHeader initialStatus={profile?.status ?? "offline"} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 flex flex-col justify-center py-12 md:py-20">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/partner/profile" className="text-on-surface-variant hover:opacity-80 flex items-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <span className="text-[18px] font-extrabold text-[#1c2438]">Request account deletion</span>
        </div>

        <div className="max-w-md w-full rounded-3xl p-8 text-center shadow-sm relative overflow-hidden bg-white mx-auto border border-outline-variant/10">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Standard Emerald icon container as per rule 11-B & 8-H */}
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-[#059669] drop-shadow-sm">no_accounts</span>
          </div>

          <span className="inline-flex items-center gap-1 bg-secondary/20 px-3 py-1 rounded-full text-xs font-bold text-primary mb-4 uppercase tracking-wider">
            Coming Soon
          </span>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#1c2438] mb-3">
            Account Deletion
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
            We are working on an automated, secure account self-deletion interface for our professionals. Currently, this page is under development to ensure data security and platform integrity.
          </p>

          <div className="bg-[#f5f6f8] rounded-2xl p-4 mb-6 border border-outline-variant/10 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Urgent Request?
            </span>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Please email our security desk at{" "}
              <a href="mailto:phscustomercare15@gmail.com" className="text-primary font-bold hover:underline">
                phscustomercare15@gmail.com
              </a>{" "}
              from your registered email address. We will verify and purge all your personal records within 24-48 hours.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
            We value your privacy and handle all data requests in accordance with our terms.
          </div>
        </div>
      </main>

      <PartnerBottomNav />
    </div>
  );
}
