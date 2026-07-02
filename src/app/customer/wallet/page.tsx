import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import WalletClient from "./WalletClient";

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

  const [profileResult, txResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("wallet_balance").eq("id", user.id).single(),
    supabase
      .from("wallet_transactions")
      .select("id, type, source, amount, balance_after, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("platform_settings").select("value").eq("key", "referral_reward_referrer").maybeSingle()
  ]);

  const walletBalance = Number(profileResult.data?.wallet_balance ?? 0);
  const transactions = (txResult.data ?? []) as WalletTransaction[];

  let referralReward = "100";
  if (settingsResult.data) {
    const rawVal = settingsResult.data.value;
    try {
      referralReward = typeof rawVal === "string" ? JSON.parse(rawVal) : String(rawVal);
    } catch {
      referralReward = String(rawVal);
    }
  }

  return (
    <WalletClient
      initialBalance={walletBalance}
      initialTransactions={transactions}
      referralReward={referralReward}
      userId={user.id}
    />
  );
}
