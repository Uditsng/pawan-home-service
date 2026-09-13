import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import WalletClient from "./WalletClient";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

export const metadata: Metadata = {
  title: "My Wallet | PHS Cleaning Company",
  description: "View your wallet balance, recharge your wallet, and browse transactions.",
};

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  source: string;
  amount: number;
  balance_after: number;
  description: string | null;
  balance_type: "cash" | "bonus" | null;
  created_at: string;
}

export interface WalletRechargeRow {
  id: string;
  amount: number;
  status: "created" | "pending" | "success" | "failed" | "cancelled" | "refunded";
  razorpay_payment_id: string | null;
  payment_method: string | null;
  failure_reason: string | null;
  created_at: string;
}

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, txResult, rechargeResult, platformSettings] = await Promise.all([
    supabase
      .from("profiles")
      .select("wallet_balance, wallet_cash_balance, wallet_bonus_balance")
      .eq("id", user.id)
      .single(),
    supabase
      .from("wallet_transactions")
      .select("id, type, source, amount, balance_after, description, balance_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("wallet_recharges")
      .select("id, amount, status, razorpay_payment_id, payment_method, failure_reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    fetchPlatformSettings(supabase),
  ]);

  const walletBalance = Number(profileResult.data?.wallet_balance ?? 0);
  const walletCash = Number(profileResult.data?.wallet_cash_balance ?? 0);
  const walletBonus = Number(profileResult.data?.wallet_bonus_balance ?? 0);
  const transactions = (txResult.data ?? []) as WalletTransaction[];
  const recharges = (rechargeResult.data ?? []) as WalletRechargeRow[];

  return (
    <WalletClient
      initialBalance={walletBalance}
      initialCash={walletCash}
      initialBonus={walletBonus}
      initialTransactions={transactions}
      initialRecharges={recharges}
      referralReward={String(platformSettings.referralRewardReferrer)}
      rechargeMin={platformSettings.walletRechargeMin}
      rechargeMax={platformSettings.walletRechargeMax}
      rechargePresets={platformSettings.walletRechargePresets}
      userId={user.id}
    />
  );
}