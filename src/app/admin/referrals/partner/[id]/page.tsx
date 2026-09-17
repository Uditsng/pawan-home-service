import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { createClient } from "@/utils/supabase/server";
import {
  markPartnerReferralStatusAction,
  rewardPartnerReferralAction,
  reversePartnerReferralAction,
} from "../actions";

export const dynamic = "force-dynamic";

interface PartnerReferralDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface PartnerReferralEvent {
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
  description: string | null;
  created_at: string;
}

interface PartnerReferralDetailRow {
  id: string;
  status: string;
  partner_reward: number;
  customer_reward: number;
  reward_config_snapshot: Record<string, unknown> | null;
  reversal: Record<string, unknown> | null;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  partner: { full_name: string | null; phone: string | null; email: string | null } | Array<{ full_name: string | null; phone: string | null; email: string | null }>;
  referred: { full_name: string | null; phone: string | null; email: string | null } | Array<{ full_name: string | null; phone: string | null; email: string | null }>;
}

function first<T>(entity: T | T[] | null | undefined): T | null {
  if (!entity) return null;
  return Array.isArray(entity) ? (entity[0] ?? null) : entity;
}

const statusVariant: Record<string, "warning" | "success" | "danger" | "surface"> = {
  attributed: "surface",
  eligible: "warning",
  rewarded: "success",
  invalid: "danger",
  duplicate: "danger",
  fraud_review: "warning",
  rejected: "danger",
  reversed: "danger",
};

const statusLabel: Record<string, string> = {
  attributed: "Attributed",
  eligible: "Eligible",
  rewarded: "Rewarded",
  invalid: "Invalid",
  duplicate: "Duplicate",
  fraud_review: "Fraud Review",
  rejected: "Rejected",
  reversed: "Reversed",
};

const eventLabel: Record<string, string> = {
  created: "Referral created",
  eligible: "Qualified for reward",
  rewarded: "Wallet reward issued",
  booked: "First booking recorded",
  invalid: "Marked invalid",
  duplicate: "Marked duplicate",
  fraud_review: "Flagged for fraud review",
  rejected: "Rejected",
  reversed: "Reversed",
  retry: "Reward retry",
};

const triggerLabel: Record<string, string> = {
  registration: "Registration",
  first_booking: "First Booking",
  admin: "Manual",
};

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export default async function PartnerReferralDetailPage({ params }: PartnerReferralDetailPageProps) {
  await requireAdmin();
  const supabase = await createClient();
  const { id } = await params;

  const [referralResult, eventsResult, txResult] = await Promise.all([
    supabase
      .from("partner_referrals")
      .select(`
        id,
        status,
        partner_reward,
        customer_reward,
        reward_config_snapshot,
        reversal,
        created_at,
        qualified_at,
        rewarded_at,
        partner:profiles!partner_id(full_name, phone, email),
        referred:profiles!referred_id(full_name, phone, email)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("partner_referral_events")
      .select("id, event_type, actor_id, actor_role, reason, metadata, created_at")
      .eq("referral_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transactions")
      .select("id, source, amount, description, created_at")
      .eq("reference_id", id)
      .in("source", ["partner_referral_reward", "partner_referral_bonus"])
      .order("created_at", { ascending: true }),
  ]);

  if (referralResult.error || !referralResult.data) {
    notFound();
  }

  const referral = referralResult.data as unknown as PartnerReferralDetailRow;
  const events = (eventsResult.data ?? []) as unknown as PartnerReferralEvent[];
  const transactions = (txResult.data ?? []) as unknown as WalletTx[];

  const partner = first(referral.partner);
  const referred = first(referral.referred);
  const referralId = referral.id;
  const config = referral.reward_config_snapshot;
  const reversal = referral.reversal;
  const partnerReward = Number(referral.partner_reward ?? 0);
  const customerReward = Number(referral.customer_reward ?? 0);
  const status = referral.status ?? "attributed";
  const trigger = (referral.reward_config_snapshot?.trigger as string) ?? "first_booking";

  const canReward = status === "eligible" || (status === "attributed" && trigger === "registration");
  const canMark = !["rewarded", "reversed"].includes(status);
  const canReverse = status === "rewarded";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/referrals/partner">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-primary font-headline">Partner Referral Details</h1>
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
          { label: "Trigger", value: triggerLabel[trigger] ?? trigger, icon: "bolt", color: "text-primary", bg: "bg-primary/5" },
          { label: "Partner Reward", value: `₹${partnerReward}`, icon: "savings", color: "text-[#059669]", bg: "bg-green-500/5" },
          { label: "Customer Bonus", value: `₹${customerReward}`, icon: "card_giftcard", color: "text-[#059669]", bg: "bg-green-500/5" },
          { label: "Wallet Type", value: "Bonus", icon: "account_balance_wallet", color: "text-primary", bg: "bg-primary/5" },
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
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Professional (Referrer)</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{partner?.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{partner?.email ?? "—"} · {partner?.phone ?? "—"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Referred Customer</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{referred?.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{referred?.email ?? "—"} · {referred?.phone ?? "—"}</p>
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
                      {tx.source === "partner_referral_reward" ? "Professional Reward" : "Customer Bonus"}
                    </p>
                    <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{formatWhen(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#059669]">+₹{Number(tx.amount)}</p>
                    {tx.description && <p className="text-[9px] font-bold text-on-surface-variant/50 max-w-[180px] text-right">{tx.description}</p>}
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
      {canReward && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">
              {trigger === "registration"
                ? "Referral is rewarded at registration"
                : "Referral qualified — reward pending settlement"}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Rewarding issues ₹{partnerReward} to the professional and ₹{customerReward} to the customer (bonus wallet).
              The operation is idempotent and safe to retry.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <form action={rewardPartnerReferralAction}>
              <input type="hidden" name="referral_id" value={referralId} />
              <Button type="submit" variant="primary" size="sm">
                <span className="material-symbols-outlined text-[14px] mr-1">account_balance_wallet</span>
                Reward Now
              </Button>
            </form>
          </div>
        </Card>
      )}

      {canReverse && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-on-surface">Referral rewarded — reversal available if needed</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Reversing debits both wallets (bonus, never negative) and records an audit event. A reason is required.
            </p>
            <form action={reversePartnerReferralAction} className="flex flex-col sm:flex-row gap-2 mt-3">
              <input type="hidden" name="referral_id" value={referralId} />
              <input
                name="reason"
                required
                placeholder="Reversal reason (required)"
                className="flex-1 bg-surface-container-low rounded-xl px-3 py-2 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20"
              />
              <Button type="submit" variant="slate" size="sm">
                <span className="material-symbols-outlined text-[14px] mr-1">undo</span>
                Reverse &amp; Debit
              </Button>
            </form>
          </div>
        </Card>
      )}

      {canMark && (
        <Card>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Manual Status</p>
          <form action={markPartnerReferralStatusAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input type="hidden" name="referral_id" value={referralId} />
            <select
              name="status"
              className="bg-surface-container-low rounded-xl px-3 py-2 text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20"
              defaultValue=""
              required
            >
              <option value="" disabled>Select status…</option>
              <option value="invalid">Invalid</option>
              <option value="duplicate">Duplicate</option>
              <option value="fraud_review">Fraud Review</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              name="reason"
              placeholder="Reason (optional)"
              className="flex-1 bg-surface-container-low rounded-xl px-3 py-2 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20"
            />
            <Button type="submit" variant="slate" size="sm">Apply Status</Button>
          </form>
          <p className="text-[9px] text-on-surface-variant/50 font-medium mt-2">
            Use for referral forensics. Rewarded referrals cannot be re-marked — use reversal instead.
          </p>
        </Card>
      )}

      {status === "rewarded" && !canReverse && (
        <p className="text-[10px] text-on-surface-variant/60 font-medium">
          Referral settled. Rewards are booked as bonus wallet credits (₹{partnerReward} + ₹{customerReward}).
        </p>
      )}
    </div>
  );
}