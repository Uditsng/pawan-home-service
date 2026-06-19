import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartnerHeader from "@/components/PartnerHeader";
import PartnerBottomNav from "@/components/PartnerBottomNav";

interface KycDocumentsData {
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
}

export default async function PartnerBankDetailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch partner profile, retrieving kyc_documents
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, kyc_documents")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const kycDocs = profile.kyc_documents as KycDocumentsData | null;
  const hasBankDetails = kycDocs?.bank_name && kycDocs?.bank_account_no && kycDocs?.bank_ifsc;

  // Mask bank account number to show only last 4 digits
  const maskAccountNo = (accNum: string) => {
    if (accNum.length <= 4) return accNum;
    return `•••• •••• ${accNum.slice(-4)}`;
  };

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen pb-24 flex flex-col font-sans">
      <PartnerHeader initialStatus={profile.status ?? "offline"} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/partner/profile" className="text-on-surface-variant hover:opacity-80 flex items-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <span className="text-[18px] font-extrabold text-[#1c2438]">Bank Details</span>
        </div>

        {!hasBankDetails ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant/10 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-[#ef4444] drop-shadow-sm">account_balance_wallet</span>
            </div>
            <h2 className="text-lg font-black text-[#1c2438] mb-2">No Bank Details Found</h2>
            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed max-w-md mx-auto">
              You haven&apos;t added any bank details yet. Complete your KYC document submission to register your payout bank account.
            </p>
            <Link
              href="/partner/pending"
              className="inline-flex items-center justify-center bg-primary text-white font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Complete KYC Verification
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-[#059669] drop-shadow-sm">account_balance</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#1c2438]">Payout Bank Account</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Registered details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Bank Name
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {kycDocs.bank_name}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Account Number
                  </span>
                  <span className="text-sm font-semibold text-primary font-mono tracking-wider">
                    {maskAccountNo(kycDocs.bank_account_no || "")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    IFSC Code
                  </span>
                  <span className="text-sm font-semibold text-primary font-mono">
                    {kycDocs.bank_ifsc}
                  </span>
                </div>
              </div>
            </div>

            {/* Lock / Note card */}
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">lock</span>
              <div>
                <p className="text-xs font-bold text-amber-800">Locked Bank Account Information</p>
                <p className="text-[11px] text-amber-700/80 font-medium mt-1 leading-relaxed">
                  To prevent unauthorized changes and protect your payouts, bank details cannot be edited online. Please contact the administrator to request updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <PartnerBottomNav />
    </div>
  );
}
