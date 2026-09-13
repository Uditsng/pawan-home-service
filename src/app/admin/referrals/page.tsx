import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Referrals | Admin — PHS Cleaning Company",
};

interface ReferralRecord {
  id: string;
  status: string;
  source: string;
  reward_model: string;
  referrer_reward: number;
  referred_discount: number;
  created_at: string;
  completed_at: string | null;
  qualified_at: string | null;
  rewarded_at: string | null;
  referrer: { full_name: string | null; phone: string | null } | null;
  referred: { full_name: string | null; phone: string | null; referral_code_used: string | null } | null;
}

export default async function AdminReferralsPage() {
  const supabase = await createClient();

  // Parallel fetch: stats + full list
  // Note: Since the referrals table has multiple foreign keys pointing to profiles,
  // we must explicitly specify the relationship using target_table!foreign_key_column.
  const [allResult, rewardedResult, completedResult, pendingResult] = await Promise.all([
    supabase
      .from("referrals")
      .select(`
        id,
        status,
        source,
        reward_model,
        referrer_reward,
        referred_discount,
        created_at,
        completed_at,
        qualified_at,
        rewarded_at,
        referrer:profiles!referrer_id(full_name, phone),
        referred:profiles!referred_id(full_name, phone, referral_code_used)
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("referrals").select("id", { count: "exact" }).eq("status", "rewarded"),
    supabase.from("referrals").select("id", { count: "exact" }).eq("status", "completed"),
    supabase.from("referrals").select("id", { count: "exact" }).eq("status", "pending"),
  ]);

  if (allResult.error || rewardedResult.error || completedResult.error || pendingResult.error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200">
        <h2 className="text-lg font-bold mb-2">Database Fetch Errors:</h2>
        <pre className="text-xs overflow-auto bg-white p-4 rounded-xl border border-red-100 font-mono">
          {JSON.stringify({
            allResultError: allResult.error,
            rewardedResultError: rewardedResult.error,
            completedResultError: completedResult.error,
            pendingResultError: pendingResult.error
          }, null, 2)}
        </pre>
      </div>
    );
  }

  const referrals = (allResult.data ?? []) as unknown as ReferralRecord[];
  const totalReferrals = referrals.length;
  const rewardedCount = rewardedResult.count ?? 0;
  const completedCount = completedResult.count ?? 0;
  const pendingCount = pendingResult.count ?? 0;
  const settledCount = rewardedCount + completedCount;
  const totalRewardsPaid = referrals
    .filter((r) => r.status === "rewarded" || r.status === "completed")
    .reduce((sum, r) => sum + Number(r.referrer_reward), 0);
  const conversionRate = totalReferrals > 0 ? ((settledCount / totalReferrals) * 100).toFixed(1) : "0.0";

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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Referrals</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
          Track referral program performance, wallet reward payouts, and settlement status.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Referrals",  value: totalReferrals,  icon: "group_add",            color: "text-primary",  bg: "bg-primary/5" },
          { label: "Rewarded",         value: rewardedCount,   icon: "verified",             color: "text-[#059669]",bg: "bg-green-500/5" },
          { label: "Pending",          value: pendingCount,    icon: "hourglass_empty",       color: "text-amber-700",bg: "bg-amber-500/5" },
          { label: "Rewards Paid",     value: `₹${totalRewardsPaid.toLocaleString("en-IN")}`, icon: "payments", color: "text-primary", bg: "bg-primary/5" },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">{m.label}</p>
            <div className="flex items-end justify-between">
              <h2 className={`text-2xl font-bold font-headline tracking-tighter ${m.color}`}>{m.value}</h2>
              <div className={`w-9 h-9 ${m.bg} rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-[20px] ${m.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
              </div>
            </div>
            {m.label === "Rewarded" && (
              <p className="text-[9px] font-bold text-on-surface-variant/40 mt-2 uppercase tracking-wider">{conversionRate}% settled {completedCount > 0 ? `· ${completedCount} legacy` : ""}</p>
            )}
          </div>
        ))}
      </div>

      {/* Referral Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">All Referrals</h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
              {totalReferrals} total records
            </p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                {["Referrer", "Referred User", "Code Used", "Reward", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No referrals recorded yet.
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => {
                  const referrerName = (ref.referrer as { full_name: string | null } | null)?.full_name ?? "Unknown";
                  const referredName = (ref.referred as { full_name: string | null } | null)?.full_name ?? "Unknown";
                  const codeUsed = (ref.referred as { referral_code_used: string | null } | null)?.referral_code_used;
                  return (
                    <tr key={ref.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{referrerName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{referredName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {codeUsed ? (
                          <span className="text-[10px] font-black text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg font-mono tracking-widest uppercase">
                            {codeUsed}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className={`text-xs font-bold ${ref.status === "rewarded" || ref.status === "completed" ? "text-[#059669]" : "text-on-surface-variant/50"}`}>
                          {ref.status === "rewarded" || ref.status === "completed" ? `₹${ref.referrer_reward}` : "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusVariant[ref.status] ?? "warning"}>
                          {statusLabel[ref.status] ?? ref.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                          {format(new Date(ref.created_at), "dd MMM yyyy")}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/referrals/${ref.id}`} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
                          View
                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-outline-variant/10">
          {referrals.length === 0 ? (
            <div className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
              No referrals recorded yet.
            </div>
          ) : (
            referrals.map((ref) => {
              const referrerName = (ref.referrer as { full_name: string | null } | null)?.full_name ?? "Unknown";
              const referredName = (ref.referred as { full_name: string | null } | null)?.full_name ?? "Unknown";
              const settled = ref.status === "rewarded" || ref.status === "completed";
              return (
                <Link key={ref.id} href={`/admin/referrals/${ref.id}`} className="block">
                  <div className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      settled ? "bg-secondary/10 text-secondary" : "bg-primary/5 text-primary"
                    }`}>
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {settled ? "verified" : "hourglass_empty"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-primary truncate uppercase">{referrerName} → {referredName}</p>
                      <p className="text-[9px] font-bold text-on-surface-variant/50 truncate">
                        {format(new Date(ref.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {settled && (
                        <p className="text-xs font-bold text-[#059669]">₹{ref.referrer_reward}</p>
                      )}
                      <Badge variant={statusVariant[ref.status] ?? "warning"}>{statusLabel[ref.status] ?? ref.status}</Badge>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
