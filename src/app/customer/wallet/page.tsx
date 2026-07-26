import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import WalletClient from "./WalletClient";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export const metadata: Metadata = {
  title: "My Wallet | PHS Cleaning Company",
  description: "View your wallet balance and transaction history.",
};

interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  source: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, txResult, platformSettings] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user.id).single(),
    supabase
      .from("wallet_transactions")
      .select("id, type, source, amount, balance_after, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    fetchPlatformSettings(supabase),
  ]);

  const walletBalance = Number(profileResult.data?.wallet_balance ?? 0);
  const transactions = (txResult.data ?? []) as WalletTransaction[];
  const referralReward = String(platformSettings.referralRewardReferrer);

  return (
    <WalletClient
      initialBalance={walletBalance}
      initialTransactions={transactions}
      referralReward={referralReward}
      userId={user.id}
    />
  );
}
