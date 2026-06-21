import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import ReferralCodeCopyClient from "@/components/ReferralCodeCopyClient";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "referral_reward_referrer")
    .maybeSingle();
  
  let reward = "100";
  if (data) {
    try {
      reward = typeof data.value === 'string' ? JSON.parse(data.value) : String(data.value);
    } catch {
      reward = String(data.value);
    }
  }

  return {
    title: "Refer & Earn | PHS Cleaning Company",
    description: `Share your unique referral code. Earn ₹${reward} when a friend completes their first booking.`,
  };
}

interface ReferralStats {
  code: string;
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_earned: number;
  wallet_balance: number;
}

interface ReferralRow {
  id: string;
  referred_id: string;
  status: string;
  referrer_reward: number;
  created_at: string;
  completed_at: string | null;
  referred: { full_name: string | null } | null;
}

export default async function ReferralPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch stats, history, and referral settings in parallel
  const [statsResult, historyResult, settingsResult] = await Promise.all([
    supabase.rpc("get_referral_stats", { p_user_id: user.id }),
    supabase
      .from("referrals")
      .select("id, referred_id, status, referrer_reward, created_at, completed_at, referred:referred_id(full_name)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("platform_settings").select("*").in("key", ["referral_reward_referrer", "referral_reward_referred"])
  ]);

  const stats: ReferralStats = statsResult.data ?? {
    code: "",
    total_referrals: 0,
    completed_referrals: 0,
    pending_referrals: 0,
    total_earned: 0,
    wallet_balance: 0,
  };

  const referralHistory = (historyResult.data ?? []) as unknown as ReferralRow[];

  const settingsMap = (settingsResult.data || []).reduce<Record<string, string>>((acc, row) => {
    try {
      acc[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : String(row.value);
    } catch {
      acc[row.key] = String(row.value);
    }
    return acc;
  }, {});

  const referrerReward = settingsMap["referral_reward_referrer"] || "100";
  const referredDiscount = settingsMap["referral_reward_referred"] || "50";

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending:   { label: "Pending",   className: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
    completed: { label: "Rewarded",  className: "bg-secondary/10 text-on-secondary border border-secondary/20" },
    cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border border-red-200" },
  };

  return (
    <div className="bg-[#f5f6f8] text-on-surface antialiased min-h-screen pb-24 font-body">

      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">

        {/* ── HERO BANNER ─────────────────────────────────────── */}
        <div className="bg-primary rounded-[24px] p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <Link href="/customer/profile" className="inline-flex items-center gap-1 text-white/60 text-xs font-semibold mb-4 hover:text-white/90 transition-colors">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to Profile
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-secondary/20 border border-secondary/30 rounded-full px-3 py-1 text-[10px] font-extrabold text-secondary uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Referral Program
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-tight mb-1">
                Earn <span className="text-secondary">₹{referrerReward}</span><br />per friend!
              </h1>
              <p className="text-white/60 text-sm font-medium">
                Your friend gets <span className="text-white font-bold">₹{referredDiscount} off</span> their first booking.
              </p>
            </div>
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0 relative z-10">
              <span className="material-symbols-outlined text-4xl text-secondary drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
            </div>
          </div>
        </div>

        {/* ── REFERRAL CODE CARD ───────────────────────────────── */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-[18px]">qr_code</span>
            <h2 className="font-bold text-[14px] text-primary tracking-tight">Your Referral Code</h2>
          </div>

          {stats.code ? (
            <ReferralCodeCopyClient code={stats.code} />
          ) : (
            <div className="text-center py-4 text-on-surface-variant text-sm font-medium">
              Generating your code...
            </div>
          )}
        </div>

        {/* ── STATS ROW ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Referrals",  value: stats.total_referrals,    icon: "group_add",   color: "text-primary" },
            { label: "Successful",       value: stats.completed_referrals, icon: "verified",    color: "text-[#059669]" },
            { label: "Total Earned",     value: `₹${stats.total_earned}`, icon: "account_balance_wallet", color: "text-secondary" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-[16px] shadow-sm p-3.5 flex flex-col items-center text-center gap-1.5">
              <span className={`material-symbols-outlined text-[22px] ${stat.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <span className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.value}</span>
              <span className="text-[9px] font-extrabold text-on-surface-variant/60 uppercase tracking-widest leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-[18px]">help</span>
            <h2 className="font-bold text-[14px] text-primary tracking-tight">How It Works</h2>
          </div>
          <div className="space-y-3">
            {[
              { step: "1", icon: "share", title: "Share your code", desc: "Send your unique referral code to friends & family via WhatsApp or any platform." },
              { step: "2", icon: "app_registration", title: "Friend signs up", desc: `They register on PHS using your code and get ₹${referredDiscount} off their first booking automatically.` },
              { step: "3", icon: "account_balance_wallet", title: "You both earn", desc: `Once their first service is completed, ₹${referrerReward} is credited to your wallet instantly.` },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Step {item.step}</span>
                  </div>
                  <p className="text-[13px] font-bold text-on-surface">{item.title}</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── REFERRAL HISTORY ─────────────────────────────────── */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
            <h2 className="font-bold text-[14px] text-primary tracking-tight">Referral History</h2>
            {referralHistory.length > 0 && (
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">{referralHistory.length} total</span>
            )}
          </div>

          {referralHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[#059669] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>group_add</span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">No referrals yet</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Share your code and start earning!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {referralHistory.map((ref) => {
                const cfg = statusConfig[ref.status] ?? statusConfig.pending;
                const name = (ref.referred as { full_name: string | null } | null)?.full_name;
                const maskedName = name
                  ? `${name.split(" ")[0]} ${"•".repeat(Math.max(3, (name.split(" ")[1]?.length ?? 3)))}`
                  : "Anonymous";
                const date = new Date(ref.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <div key={ref.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-on-surface truncate">{maskedName}</p>
                        <p className="text-[10px] text-on-surface-variant">{date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ref.status === "completed" && (
                        <span className="text-[11px] font-black text-[#059669]">+₹{ref.referrer_reward}</span>
                      )}
                      <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── T&C FOOTNOTE ─────────────────────────────────────── */}
        <p className="text-[10px] text-on-surface-variant/50 text-center font-medium px-4 leading-relaxed">
          Rewards are credited after your friend&apos;s first booking is fully completed. One reward per referred user. PHS reserves the right to modify or discontinue the program at any time.
        </p>

      </main>

      <BottomNav />
    </div>
  );
}
