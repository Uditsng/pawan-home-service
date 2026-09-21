import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PayoutsClient } from "./PayoutsClient";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import type {
  PayoutSummary,
  PartnerPaymentDetail,
  KycBankInfo,
} from "./actions";

export default async function PartnerPayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [summaryResult, detailsResult, profileResult, platformSettings] = await Promise.all([
    supabase.rpc("get_partner_payout_summary", { p_partner_id: user.id }),
    supabase
      .from("partner_payment_details")
      .select("*")
      .order("is_primary", { ascending: false }),
    supabase
      .from("profiles")
      .select("kyc_status, kyc_documents")
      .eq("id", user.id)
      .single(),
    fetchPlatformSettings(supabase),
  ]);

  const summary = (summaryResult.data ?? null) as PayoutSummary | null;
  const paymentDetails = (detailsResult.data ?? []) as PartnerPaymentDetail[];
  const kycDocuments = ((profileResult.data?.kyc_documents ?? {}) as Record<string, unknown>) ?? {};
  const kycBank: KycBankInfo = {
    bank_name: typeof kycDocuments.bank_name === "string" ? kycDocuments.bank_name : null,
    bank_account_no: typeof kycDocuments.bank_account_no === "string" ? kycDocuments.bank_account_no : null,
    bank_ifsc: typeof kycDocuments.bank_ifsc === "string" ? kycDocuments.bank_ifsc : null,
  };

  const fallbackMin = platformSettings.partnerPayoutMin;

  return (
    <PayoutsClient
      summary={summary}
      paymentDetails={paymentDetails}
      kycStatus={profileResult.data?.kyc_status ?? null}
      kycBank={kycBank}
      fallbackMin={fallbackMin}
    />
  );
}