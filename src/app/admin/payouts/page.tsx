import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { PayoutsConsole } from "./PayoutsConsole";
import type { PayoutReconciliation } from "./actions";

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [reconResult, platformSettings] = await Promise.all([
    supabase.rpc("get_payout_reconciliation"),
    fetchPlatformSettings(supabase),
  ]);

  const reconciliation = (reconResult.data ?? null) as PayoutReconciliation | null;

  return (
    <PayoutsConsole
      rows={reconciliation?.rows ?? []}
      minPayout={platformSettings.partnerPayoutMin}
      payoutsEnabled={platformSettings.partnerPayoutsEnabled}
    />
  );
}