import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BankClient from "./BankClient";
import type { KycDocumentsData } from "@/lib/types";

export default async function PartnerBankDetailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, kyc_documents")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const kycDocs = (profile.kyc_documents as KycDocumentsData | null) || null;
  const hasBankDetails = kycDocs?.bank_name && kycDocs?.bank_account_no && kycDocs?.bank_ifsc;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-12 flex flex-col font-body">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/partner/profile" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-headline font-black text-on-surface">Bank & Payments</h1>
        </div>

        <BankClient
          hasBankDetails={Boolean(hasBankDetails)}
          bankName={kycDocs?.bank_name || null}
          accountNo={kycDocs?.bank_account_no || null}
          ifsc={kycDocs?.bank_ifsc || null}
          upiId={kycDocs?.upi_id || null}
          upiNumber={kycDocs?.upi_number || null}
          upiQrUrl={kycDocs?.upi_qr_url || null}
          userId={user.id}
        />
      </main>
    </div>
  );
}
