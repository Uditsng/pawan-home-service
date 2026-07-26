import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-12 flex flex-col font-body">

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/partner/profile" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-headline font-black text-on-surface">Registered Bank Account</h1>
        </div>

        {!hasBankDetails ? (
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-10 shadow-xs border border-outline-variant/15 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-error">account_balance_wallet</span>
            </div>
            <h2 className="text-lg font-headline font-black text-on-surface mb-2">No Bank Details Found</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mb-6 leading-relaxed max-w-md mx-auto">
              You haven&apos;t added any bank details yet. Complete your KYC document submission to register your payout bank account.
            </p>
            <Link
              href="/partner/pending"
              className="inline-flex items-center justify-center bg-primary text-on-primary font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl hover:bg-primary/95 transition-all shadow-xs"
            >
              Complete KYC Verification
            </Link>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-8 shadow-xs border border-outline-variant/15">
              <div className="flex items-center gap-3.5 border-b border-outline-variant/15 pb-4 mb-5">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-primary">account_balance</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface">Payout Bank Account</h3>
                  <p className="text-xs text-on-surface-variant font-medium">Registered Payout Account</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                    Bank Name
                  </span>
                  <span className="text-base font-bold text-primary font-headline">
                    {kycDocs.bank_name}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                    Account Number
                  </span>
                  <span className="text-base font-bold text-primary font-mono tracking-widest">
                    {maskAccountNo(kycDocs.bank_account_no || "")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                    IFSC Code
                  </span>
                  <span className="text-base font-bold text-primary font-mono tracking-wider">
                    {kycDocs.bank_ifsc}
                  </span>
                </div>
              </div>
            </div>

            {/* Lock / Note card */}
            <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-warning text-lg shrink-0 mt-0.5">lock</span>
              <div>
                <p className="text-xs font-bold text-on-surface">Locked Bank Information</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  To prevent unauthorized changes and protect your payouts, bank details cannot be edited online. Contact administration to request updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
