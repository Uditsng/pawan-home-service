import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import KycDetailsClient from "./KycDetailsClient";
import type { KycDocumentsData } from "@/lib/types";

export default async function PartnerKycPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, kyc_status, kyc_rejection_reason, kyc_documents")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "partner") {
    redirect("/login");
  }

  const kycDocs = (profile.kyc_documents as KycDocumentsData | null) || null;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-12 flex flex-col font-body">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/partner/profile"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-headline font-black text-on-surface">
            KYC & Verification
          </h1>
        </div>

        <KycDetailsClient
          kycStatus={profile.kyc_status || "draft"}
          kycRejectionReason={profile.kyc_rejection_reason || null}
          kycDocuments={kycDocs}
          userId={profile.id}
        />
      </main>
    </div>
  );
}
