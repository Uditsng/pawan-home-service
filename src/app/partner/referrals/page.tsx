import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import PartnerReferralsClient from "./PartnerReferralsClient";

export const dynamic = "force-dynamic";

interface PartnerReferralStats {
  code: string;
  total_referrals: number;
  pending_referrals: number;
  rewarded_referrals: number;
  reversed_referrals: number;
  total_earned: number;
  awaiting_reward: number;
}

function firstReferred(
  entity: { full_name: string | null } | Array<{ full_name: string | null }> | null
): { full_name: string | null } | null {
  if (!entity) return null;
  if (Array.isArray(entity)) return (entity[0] ?? null);
  return entity;
}

const emptyStats: PartnerReferralStats = {
  code: "",
  total_referrals: 0,
  pending_referrals: 0,
  rewarded_referrals: 0,
  reversed_referrals: 0,
  total_earned: 0,
  awaiting_reward: 0,
};

export default async function PartnerReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, statsResult, historyResult, platformSettings] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("get_partner_referral_stats", { p_partner_id: user.id }),
    supabase
      .from("partner_referrals")
      .select(
        "id, status, referral_code, source, partner_reward, customer_reward, created_at, qualified_at, rewarded_at, referred:profiles!referred_id(full_name)"
      )
      .eq("partner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    fetchPlatformSettings(supabase),
  ]);

  const profile = profileResult.data as { role: string; status: string } | null;
  if (!profile || profile.role !== "partner") redirect("/login");

  const partnerActive = profile.status === "active";

  let stats = (statsResult.data ?? null) as PartnerReferralStats | null;

  // Backfill covers existing active professionals; this is the safety net for
  // partners activated after deploy (e.g. right after onboarding approval).
  if (partnerActive && (!stats || !stats.code)) {
    const ensured = await supabase.rpc("ensure_partner_referral_code", {
      p_partner_id: user.id,
    });
    if (!ensured.error && ensured.data) {
      const ensuredPayload = ensured.data as { code?: string };
      stats = {
        ...(stats ?? emptyStats),
        code: ensuredPayload.code ?? "",
      };
    }
  }

  const historyRaw = (historyResult.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    partner_reward: number;
    customer_reward: number;
    created_at: string;
    rewarded_at: string | null;
    referred: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  }>;

  return (
    <PartnerReferralsClient
      code={stats?.code ?? ""}
      partnerActive={partnerActive}
      stats={{
        total_referrals: stats?.total_referrals ?? 0,
        pending_referrals: stats?.pending_referrals ?? 0,
        rewarded_referrals: stats?.rewarded_referrals ?? 0,
        reversed_referrals: stats?.reversed_referrals ?? 0,
        total_earned: stats?.total_earned ?? 0,
        awaiting_reward: stats?.awaiting_reward ?? 0,
      }}
      history={historyRaw.map((r) => ({
        id: r.id,
        status: r.status,
        partner_reward: Number(r.partner_reward ?? 0),
        customer_reward: Number(r.customer_reward ?? 0),
        created_at: r.created_at,
        rewarded_at: r.rewarded_at,
        referredName: firstReferred(r.referred)?.full_name ?? null,
      }))}
      settings={{
        enabled: platformSettings.partnerReferralEnabled,
        partnerReward: platformSettings.partnerReferralRewardPartner,
        customerReward: platformSettings.partnerReferralRewardCustomer,
        trigger: platformSettings.partnerReferralRewardTrigger,
      }}
    />
  );
}