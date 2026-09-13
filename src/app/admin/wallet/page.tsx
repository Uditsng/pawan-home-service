import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import WalletAdminClient from "./WalletAdminClient";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import type { AdminWalletCustomer } from "./WalletAdminClient";

export const metadata: Metadata = {
  title: "Wallet | Admin — PHS Cleaning Company",
};

interface RechargeRecord {
  id: string;
  amount: number;
  status: "created" | "pending" | "success" | "failed" | "cancelled" | "refunded";
  razorpay_payment_id: string | null;
  payment_method: string | null;
  failure_reason: string | null;
  created_at: string;
  profile: { full_name: string | null; phone: string | null } | null;
}

interface TxRecord {
  id: string;
  type: string;
  source: string;
  amount: number;
  balance_after: number;
  balance_type: string | null;
  description: string | null;
  created_at: string;
  profile: { full_name: string | null; phone: string | null } | null;
}

const rechargeStatusVariant: Record<string, "warning" | "success" | "danger"> = {
  created:   "warning",
  pending:   "warning",
  success:   "success",
  failed:    "danger",
  cancelled: "danger",
  refunded:  "danger",
};

export default async function AdminWalletPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [profilesRes, rechargeCountRes, txCountRes, rechargesRes, txRes, customerRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("wallet_balance, wallet_cash_balance, wallet_bonus_balance")
        .eq("role", "customer")
        .limit(10000),
      supabase.from("wallet_recharges").select("id", { count: "exact" }),
      supabase.from("wallet_transactions").select("id", { count: "exact" }),
      supabase
        .from("wallet_recharges")
        .select(
          "id, amount, status, razorpay_payment_id, payment_method, failure_reason, created_at, profile:profiles!wallet_recharges_user_id_fkey(full_name, phone)"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("wallet_transactions")
        .select(
          "id, type, source, amount, balance_after, balance_type, description, created_at, profile:profiles!wallet_transactions_user_id_fkey(full_name, phone)"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("id, full_name, phone, wallet_balance, wallet_cash_balance, wallet_bonus_balance")
        .eq("role", "customer")
        .order("wallet_balance", { ascending: false })
        .limit(300),
    ]);

  const allProfiles = (profilesRes.data ?? []) as {
    wallet_balance: number | null;
    wallet_cash_balance: number | null;
    wallet_bonus_balance: number | null;
  }[];
  const totalCash = allProfiles.reduce((s, p) => s + Number(p.wallet_cash_balance ?? 0), 0);
  const totalBonus = allProfiles.reduce((s, p) => s + Number(p.wallet_bonus_balance ?? 0), 0);
  const totalWallet = allProfiles.reduce((s, p) => s + Number(p.wallet_balance ?? 0), 0);
  const fundedUsers = allProfiles.filter((p) => Number(p.wallet_balance ?? 0) > 0).length;

  const recharges = (rechargesRes.data ?? []) as unknown as RechargeRecord[];
  const transactions = (txRes.data ?? []) as unknown as TxRecord[];
  const customers = ((customerRes.data ?? []) as unknown as {
    id: string;
    full_name: string | null;
    phone: string | null;
    wallet_balance: number | null;
    wallet_cash_balance: number | null;
    wallet_bonus_balance: number | null;
  }[]).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    wallet_cash: Number(c.wallet_cash_balance ?? 0),
    wallet_bonus: Number(c.wallet_bonus_balance ?? 0),
    wallet_total: Number(c.wallet_balance ?? 0),
  })) as AdminWalletCustomer[];

  const sourceLabels: Record<string, string> = {
    referral_reward:  "Referral Reward",
    referral_bonus:   "Referral Bonus",
    booking_discount: "Booking Discount",
    admin_adjustment: "Admin Adjustment",
    refund:           "Refund",
    recharge:         "Recharge",
    promo_credit:     "Promo Credit",
    reversal:         "Reversal",
  };

  const metricCards = [
    { label: "Total Wallet", value: `₹${totalWallet.toLocaleString("en-IN")}`, icon: "account_balance_wallet", color: "text-primary", bg: "bg-primary/5" },
    { label: "Cash Balance", value: `₹${totalCash.toLocaleString("en-IN")}`, icon: "payments", color: "text-[#059669]", bg: "bg-green-500/5" },
    { label: "Bonus Balance", value: `₹${totalBonus.toLocaleString("en-IN")}`, icon: "card_giftcard", color: "text-[#059669]", bg: "bg-green-500/5" },
    { label: "Funded Users", value: fundedUsers, icon: "group", color: "text-primary", bg: "bg-primary/5" },
    { label: "Top-ups", value: rechargeCountRes.count ?? 0, icon: "bolt", color: "text-primary", bg: "bg-primary/5" },
    { label: "Transactions", value: txCountRes.count ?? 0, icon: "receipt_long", color: "text-primary", bg: "bg-primary/5" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Wallet</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
          See customer balances and top-ups, and make manual adjustments.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">{m.label}</p>
            <div className="flex items-end justify-between">
              <h2 className={`text-xl font-bold font-headline tracking-tighter ${m.color}`}>{m.value}</h2>
              <div className={`w-9 h-9 ${m.bg} rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-[20px] ${m.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {m.icon}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recharges */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Recent Recharges</h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
              Top-ups. Only successful payments are added to the balance.
            </p>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                {["Customer", "Amount", "Status", "Method", "Payment ID", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {recharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No recharges yet.
                  </td>
                </tr>
              ) : (
                recharges.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{r.profile?.full_name ?? "Unknown"}</p>
                      {r.profile?.phone && <p className="text-[9px] text-on-surface-variant/50">+91 {r.profile.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-bold text-primary">₹{Number(r.amount).toLocaleString("en-IN")}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={rechargeStatusVariant[r.status] ?? "warning"}>{r.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase">{r.payment_method ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[9px] font-mono text-on-surface-variant/50">{r.razorpay_payment_id ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                        {format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="block md:hidden divide-y divide-outline-variant/10">
          {recharges.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.status === "success" ? "bg-secondary/10 text-secondary" : "bg-amber-500/10 text-amber-600"}`}>
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {r.status === "success" ? "payments" : "hourglass_empty"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-primary truncate uppercase">{r.profile?.full_name ?? "Unknown"}</p>
                <p className="text-[9px] text-on-surface-variant/50 truncate">
                  ₹{Number(r.amount).toLocaleString("en-IN")} · {format(new Date(r.created_at), "dd MMM, HH:mm")}
                </p>
              </div>
              <Badge variant={rechargeStatusVariant[r.status] ?? "warning"}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions + Adjustment */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Recent Transactions</h3>
            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
              Every balance change is logged here.
            </p>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                  {["Customer", "Type", "Source", "Amount", "Balance", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant/40 text-xs font-semibold">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight">{t.profile?.full_name ?? "Unknown"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${t.type === "credit" ? "text-[#059669]" : "text-red-600"}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg font-mono uppercase">
                          {sourceLabels[t.source] ?? t.source}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className={`text-xs font-bold ${t.type === "credit" ? "text-[#059669]" : "text-red-600"}`}>
                          {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[9px] font-bold text-on-surface-variant/60">
                          {Number(t.balance_after).toLocaleString("en-IN")}
                          <span className={`ml-1 ${t.balance_type === "bonus" ? "text-secondary" : "text-on-surface-variant/40"}`}>
                            {t.balance_type ?? "cash"}
                          </span>
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                          {format(new Date(t.created_at), "dd MMM, HH:mm")}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="block md:hidden divide-y divide-outline-variant/10">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === "credit" ? "bg-secondary/10" : "bg-red-500/5"}`}>
                  <span className={`material-symbols-outlined text-base ${t.type === "credit" ? "text-secondary" : "text-red-600"}`}>
                    {t.type === "credit" ? "add_circle" : "remove_circle"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-primary truncate uppercase">{sourceLabels[t.source] ?? t.source}</p>
                  <p className="text-[9px] text-on-surface-variant/50 truncate">{t.profile?.full_name ?? "Unknown"} · {format(new Date(t.created_at), "dd MMM, HH:mm")}</p>
                </div>
                <p className={`text-xs font-bold shrink-0 ${t.type === "credit" ? "text-[#059669]" : "text-red-600"}`}>
                  {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <WalletAdminClient customers={customers} />
      </div>
    </div>
  );
}