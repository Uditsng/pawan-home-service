import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { createClient } from "@/utils/supabase/server";
import { cancelReferralAction, rewardReferralAction } from "../actions";

export const dynamic = "force-dynamic";

interface ReferralDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ReferralEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface WalletTx {
  id: string;
  source: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface ReferralDetailRow {
  id: string;
  status: string;
  source: string;
  reward_model: string;
  referrer_reward: number;
  referred_discount: number;
  reward_config_snapshot: Record<string, unknown> | null;
  reversal: Record<string, unknown> | null;
  created_at: string;
  qualified_at: string | null;
  completed_at: string | null;
  rewarded_at: string | null;
  referrer: { full_name: string | null; phone: string | null; email: string | null } | Array<{ full_name: string | null; phone: string | null; email: string | null }>;
  referred: { full_name: string | null; phone: string | null; email: string | null; referral_code_used: string | null } | Array<{ full_name: string | null; phone: string | null; email: string | null; referral_code_used: string | null }>;
}

function first<T>(entity: T | T[] | null | undefined): T | null {
  if (!entity) return null;
  return Array.isArray(entity) ? (entity[0] ?? null) : entity;
}

const statusVariant: Record<string, "warning" | "success" | "danger"> = {
  pending:   "warning",
  rewarded:  "success",
  completed: "success",
  cancelled: "danger",
  rejected:  "danger",
  reversed:  "danger",
};

const statusLabel: Record<string, string> = {
  pending:   "Pending",
  rewarded:  "Rewarded",
  completed: "Rewarded",
  cancelled: "Cancelled",
  rejected:  "Rejected",
  reversed:  "Reversed",
};

const eventLabel: Record<string, string> = {
  created:   "Referral created",
  rewarded:  "Wallet reward issued",
  completed: "Legacy reward issued",
  cancelled: "Cancelled",
  rejected:  "Rejected",
  reversed:  "Reversed",
  retry:     "Reward retry",
};

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export default async function ReferralDetailPage({ params }: ReferralDetailPageProps) {
  await requireAdmin();
  const supabase = await createClient();
  const { id } = await params;

  const [referralResult, eventsResult, txResult] = await Promise.all([
    supabase
      .from("referrals")
      .select(`
        id,
        status,
        source,
        reward_model,
        referrer_reward,
        referred_discount,
        reward_config_snapshot,
        reversal,
        created_at,
        qualified_at,
        completed_at,
        rewarded_at,
        referrer:profiles!referrer_id(full_name, phone, email),
        referred:profiles!referred_id(full_name, phone, email, referral_code_used)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("referral_events")
      .select("id, event_type, actor_id, actor_role, reason, metadata, created_at")
      .eq("referral_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transactions")
      .select("id, source, amount, balance_after, description, created_at")
      .eq("reference_id", id)
      .in("source", ["referral_reward", "referral_bonus"])
      .order("created_at", { ascending: true }),
  ]);

  if (referralResult.error || !referralResult.data) {
    notFound();
  }

  const referral = referralResult.data as unknown as ReferralDetailRow;
  const events = (eventsResult.data ?? []) as unknown as ReferralEvent[];
  const transactions = (txResult.data ?? []) as unknown as WalletTx[];

  const referrer = first(referral.referrer);
  const referred = first(referral.referred);
  const referralId = referral.id;
  const config = referral.reward_config_snapshot;
  const reversal = referral.reversal;
  const rReferrerReward = Number(referral.referrer_reward ?? 0);
  const rReferredBonus = Number(referral.referred_discount ?? 0);
  const rewardModel = referral.reward_model ?? "legacy";
  const status = referral.status ?? "pending";
  const source = referral.source ?? "code";
  const species = status === "rewarded" || status === "completed";

  const canReward = status === "pending" && rewardModel === "wallet_v1";
  const canCancel = status === "pending";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/referrals">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-primary font-headline">Referral Details</h1>
            <p className="text-xs text-on-surface-variant/60 font-medium">Attribution, reward issuance, and audit timeline.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="surface" className="text-[10px] lowercase py-1 font-mono">
            ID: {referralId.slice(0, 8)}
          </Badge>
          <Badge variant={statusVariant[status] ?? "warning"} className="text-[10px] py-1">
            {statusLabel[status] ?? status}
          </Badge>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Reward Model", value: rewardModel === "wallet_v1" ? "Wallet v2" : "Legacy", icon: "account_balance_wallet", color: "text-primary", bg: "bg-primary/5" },
          { label: "Source", value: source === "link" ? "Deep Link" : "Referral Code", icon: "link", color: "text-primary", bg: "bg-primary/5" },
          { label: "Referrer Reward", value: `₹${rReferrerReward}`, icon: "savings", color: "text-[#059669]", bg: "bg-green-500/5" },
          { label: "Referred Bonus", value: `₹${rReferredBonus}`, icon: "card_giftcard", color: "text-[#059669]", bg: "bg-green-500/5" },
        ].map((m) => (
          <Card key={m.label} className="p-5!">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">{m.label}</p>
            <div className="flex items-end justify-between">
              <h2 className={`text-2xl font-bold font-headline tracking-tighter ${m.color}`}>{m.value}</h2>
              <div className={`w-9 h-9 ${m.bg} rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-[20px] ${m.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Referrer</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{referrer?.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{referrer?.email ?? "—"} · {referrer?.phone ?? "—"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Referred User</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{referred?.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{referred?.email ?? "—"} · {referred?.phone ?? "—"}</p>
              {referred?.referral_code_used && (
                <span className="inline-block mt-1 text-[9px] font-black text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md font-mono tracking-widest uppercase">
                  {referred.referral_code_used}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline / Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">history</span> Audit Timeline
          </p>
          {events.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 font-medium py-2">No events recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface">{eventLabel[e.event_type] ?? e.event_type}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
                      {formatWhen(e.created_at)} · by {e.actor_role || "system"}
                    </p>
                    {e.reason && <p className="text-[10px] text-on-surface-variant mt-0.5">{e.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">payments</span> Wallet Transactions
          </p>
          {transactions.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 font-medium py-2">No wallet credits issued yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      {tx.source === "referral_reward" ? "Referrer Reward" : "Referred Bonus"}
                    </p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{formatWhen(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#059669]">+₹{Number(tx.amount)}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50">Bal: ₹{Number(tx.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-outline-variant/10 text-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Created</p>
              <p className="text-[9px] font-bold text-on-surface">{formatWhen(referral.created_at)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Qualified</p>
              <p className="text-[9px] font-bold text-on-surface">{formatWhen(referral.qualified_at)}</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Rewarded</p>
              <p className="text-[9px] font-bold text-on-surface">{formatWhen(referral.rewarded_at)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reward snapshot + reversal */}
      {(config || reversal) && (
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Program Snapshot</p>
          {config && (
            <pre className="text-[10px] text-on-surface-variant bg-surface-dim/60 p-4 rounded-xl overflow-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(config, null, 2)}
            </pre>
          )}
          {reversal && (
            <div className="mt-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-600/70 mb-1">Reversal Data</p>
              <pre className="text-[10px] text-red-700 bg-red-50/60 p-4 rounded-xl overflow-auto font-mono whitespace-pre-wrap">
                {JSON.stringify(reversal, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      {(canReward || canCancel) && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">
              {rewardModel === "wallet_v1" ? "Referral is pending reward" : "Legacy referral awaiting first completed booking"}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              {rewardModel === "wallet_v1"
                ? "Rewarding issues ₹ to both wallets atomically. The operation is idempotent and safe to retry."
                : "Legacy rows settle automatically on the referred user's first completed booking."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canCancel && (
              <form action={cancelReferralAction}>
                <input type="hidden" name="referral_id" value={referralId} />
                <Button type="submit" variant="slate" size="sm">Cancel Referral</Button>
              </form>
            )}
            {canReward && (
              <form action={rewardReferralAction}>
                <input type="hidden" name="referral_id" value={referralId} />
                <Button type="submit" variant="primary" size="sm">
                  <span className="material-symbols-outlined text-[14px] mr-1">account_balance_wallet</span>
                  Reward Now
                </Button>
              </form>
            )}
          </div>
        </Card>
      )}

      {species && (
        <p className="text-[10px] text-on-surface-variant/60 font-medium">
          Referral settled {status === "rewarded" ? "under the wallet reward model" : "under the legacy first-booking model"}. No further action required.
        </p>
      )}
    </div>
  );
}