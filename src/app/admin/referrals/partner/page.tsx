import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Partner Referrals | Admin — PHS Cleaning Company",
};

export const dynamic = "force-dynamic";

interface PartnerReferralRecord {
  id: string;
  partner_id: string;
  referred_id: string;
  status: string;
  partner_reward: number;
  customer_reward: number;
  reward_config_snapshot: Record<string, unknown> | null;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  partner: { full_name: string | null; phone: string | null } | null;
  referred: { full_name: string | null; phone: string | null } | null;
}

interface PartnerReferralCode {
  id: string;
  code: string;
  created_at: string;
  partner: { full_name: string | null; phone: string | null } | null;
}

/** Admin UI displays the marketing form: PHS-PAR-<compact-without-PS>. */
function marketingCode(code: string): string {
  const compact = code.startsWith("PS") ? code.slice(2) : code;
  return `PHS-PAR-${compact}`;
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

export default async function AdminPartnerReferralsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [codesResult, referralsResult] = await Promise.all([
    supabase
      .from("partner_referral_codes")
      .select(`id, code, created_at, partner:profiles!partner_id(full_name, phone)`)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("partner_referrals")
      .select(`
        id,
        partner_id,
        referred_id,
        status,
        partner_reward,
        customer_reward,
        reward_config_snapshot,
        created_at,
        qualified_at,
        rewarded_at,
        partner:profiles!partner_id(full_name, phone),
        referred:profiles!referred_id(full_name, phone)
      `)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (codesResult.error || referralsResult.error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200">
        <h2 className="text-lg font-bold mb-2">Database Fetch Errors:</h2>
        <pre className="text-xs overflow-auto bg-white p-4 rounded-xl border border-red-100 font-mono">
          {JSON.stringify({ codesResultError: codesResult.error, referralsResultError: referralsResult.error }, null, 2)}
        </pre>
      </div>
    );
  }

  const codes = (codesResult.data ?? []) as unknown as PartnerReferralCode[];
  const referrals = (referralsResult.data ?? []) as unknown as PartnerReferralRecord[];
  const activeCodes = codes.length;
  const rewarded = referrals.filter((r) => r.status === "rewarded");
  const pending = referrals.filter((r) => r.status === "attributed" || r.status === "eligible");
  const totalRewardsPaid = rewarded.reduce((sum, r) => sum + Number(r.partner_reward ?? 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Partner Referrals</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
          Professionals invite customers with personal codes. Rewards settle on the customer&apos;s first completed booking.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Referrals", value: referrals.length, icon: "group_add", color: "text-primary", bg: "bg-primary/5" },
          { label: "Rewarded", value: rewarded.length, icon: "verified", color: "text-[#059669]", bg: "bg-green-500/5" },
          { label: "Pending", value: pending.length, icon: "hourglass_empty", color: "text-amber-700", bg: "bg-amber-500/5" },
          { label: "Rewards Paid", value: `₹${totalRewardsPaid.toLocaleString("en-IN")}`, icon: "payments", color: "text-primary", bg: "bg-primary/5" },
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
              <p className="text-[9px] font-bold text-on-surface-variant/40 mt-2 uppercase tracking-wider">{activeCodes} active codes issued</p>
            )}
          </div>
        ))}
      </div>

      {/* Referral Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">All Partner Referrals</h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
              {referrals.length} total records
            </p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                {["Professional", "Referred Customer", "Reward", "Trigger", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No partner referrals yet — share codes are issued automatically to active professionals.
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => {
                  const partnerName = (ref.partner as { full_name: string | null } | null)?.full_name ?? "Unknown";
                  const referredName = (ref.referred as { full_name: string | null } | null)?.full_name ?? "Unknown";
                  const settled = ref.status === "rewarded";
                  const trigger = (ref.reward_config_snapshot?.trigger as string) ?? "first_booking";
                  return (
                    <tr key={ref.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{partnerName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{referredName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className={`text-xs font-bold ${settled ? "text-[#059669]" : "text-on-surface-variant/50"}`}>
                          {settled ? `₹${Number(ref.partner_reward)}` : "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
                          {trigger === "first_booking" ? "First Booking" : trigger === "registration" ? "Registration" : trigger}
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
                        <Link href={`/admin/referrals/partner/${ref.id}`} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
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
              No partner referrals yet.
            </div>
          ) : (
            referrals.map((ref) => {
              const partnerName = (ref.partner as { full_name: string | null } | null)?.full_name ?? "Unknown";
              const referredName = (ref.referred as { full_name: string | null } | null)?.full_name ?? "Unknown";
              const settled = ref.status === "rewarded";
              return (
                <Link key={ref.id} href={`/admin/referrals/partner/${ref.id}`} className="block">
                  <div className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      settled ? "bg-secondary/10 text-secondary" : "bg-primary/5 text-primary"
                    }`}>
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {settled ? "verified" : "hourglass_empty"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-primary truncate uppercase">{partnerName} → {referredName}</p>
                      <p className="text-[9px] font-bold text-on-surface-variant/50 truncate">
                        {format(new Date(ref.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {settled && (
                        <p className="text-xs font-bold text-[#059669]">₹{Number(ref.partner_reward)}</p>
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

      {/* Code Registry */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant/10">
          <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Referral Codes</h3>
          <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
            Auto-issued to active professionals
          </p>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                {["Professional", "Code", "Issued"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No codes generated yet.
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-tight">
                        {(code.partner as { full_name: string | null } | null)?.full_name ?? "Unknown"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-black text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg font-mono tracking-widest uppercase">
                        {marketingCode(code.code)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                        {format(new Date(code.created_at), "dd MMM yyyy")}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="block md:hidden divide-y divide-outline-variant/10">
          {codes.length === 0 ? (
            <div className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
              No codes generated yet.
            </div>
          ) : (
            codes.map((code) => (
              <div key={code.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-primary truncate uppercase">
                    {(code.partner as { full_name: string | null } | null)?.full_name ?? "Unknown"}
                  </p>
                  <p className="text-[9px] font-bold text-on-surface-variant/50 font-mono tracking-widest uppercase truncate">
                    {marketingCode(code.code)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}