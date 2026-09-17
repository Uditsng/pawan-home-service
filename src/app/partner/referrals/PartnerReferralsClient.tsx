"use client";

import Link from "next/link";
import PartnerReferralShareClient from "@/components/PartnerReferralShareClient";

export interface PartnerReferralHistoryRow {
  id: string;
  status: string;
  partner_reward: number;
  customer_reward: number;
  created_at: string;
  rewarded_at: string | null;
  referredName: string | null;
}

export interface PartnerReferralsClientProps {
  code: string;
  partnerActive: boolean;
  stats: {
    total_referrals: number;
    pending_referrals: number;
    rewarded_referrals: number;
    reversed_referrals: number;
    total_earned: number;
    awaiting_reward: number;
  };
  history: PartnerReferralHistoryRow[];
  settings: {
    enabled: boolean;
    partnerReward: number;
    customerReward: number;
    trigger: "registration" | "first_booking" | "admin";
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  attributed:  { label: "Invited",     className: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
  eligible:    { label: "Qualified",   className: "bg-secondary/10 text-on-secondary border border-secondary/20" },
  rewarded:    { label: "Rewarded",    className: "bg-secondary/10 text-on-secondary border border-secondary/20" },
  invalid:     { label: "Invalid",     className: "bg-red-500/10 text-red-600 border border-red-200" },
  duplicate:   { label: "Duplicate",   className: "bg-red-500/10 text-red-600 border border-red-200" },
  fraud_review:{ label: "Fraud Review",className: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
  rejected:    { label: "Rejected",    className: "bg-red-500/10 text-red-600 border border-red-200" },
  reversed:    { label: "Reversed",    className: "bg-red-500/10 text-red-600 border border-red-200" },
};

export default function PartnerReferralsClient({
  code,
  partnerActive,
  stats,
  history,
  settings,
}: PartnerReferralsClientProps) {
  const isEnabled = settings.enabled;
  const reward = settings.partnerReward;
  const bonus = settings.customerReward;
  const trigger = settings.trigger;

  const howItWorks =
    trigger === "registration"
      ? [
          { step: "1", icon: "share", title: "Share your code", desc: "Send your personal referral code to customers, family, and friends via WhatsApp or any platform." },
          { step: "2", icon: "app_registration", title: "They sign up", desc: `Your customer registers on PHS using your code and ₹${bonus} lands in their wallet instantly.` },
          { step: "3", icon: "account_balance_wallet", title: "You earn", desc: `The moment they join, ₹${reward} is credited to your wallet — no waiting for a booking.` },
        ]
      : [
          { step: "1", icon: "share", title: "Share your code", desc: "Send your personal referral code to customers, family, and friends via WhatsApp or any platform." },
          { step: "2", icon: "app_registration", title: "They sign up", desc: `Your customer registers on PHS using your code and gets a ₹${bonus} joining bonus in their wallet.` },
          { step: "3", icon: "verified", title: "You both earn", desc: `After their first completed booking, ₹${reward} is credited to your wallet automatically — no extra steps.` },
        ];

  return (
    <div className="bg-[#f5f6f8] text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">
        {/* ── HERO BANNER ─────────────────────────────────────── */}
        <div className="bg-primary rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <Link href="/partner/profile" className="inline-flex items-center gap-1 text-white/60 text-xs font-semibold mb-4 hover:text-white/90 transition-colors">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to Profile
          </Link>

          {!isEnabled && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 mb-4 text-amber-200 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">pause_circle</span>
              The partner referral program is currently paused by the administrator. New rewards are disabled.
            </div>
          )}

          {!partnerActive && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-4 text-white/80 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">engineering</span>
              Your referral code activates once your professional profile is approved.
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-secondary/20 border border-secondary/30 rounded-full px-3 py-1 text-[10px] font-extrabold text-secondary uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Referral Program
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-tight mb-1">
                Earn <span className="text-secondary">₹{reward}</span><br />per referral!
              </h1>
              <p className="text-white/60 text-sm font-medium">
                Your customer gets <span className="text-white font-bold">₹{bonus} wallet credit</span>{" "}
                {trigger === "registration" ? "the moment they sign up." : "after their first booking."}
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

          {code ? (
            <PartnerReferralShareClient code={code} referredBonus={bonus} rewardTiming={trigger} />
          ) : (
            <div className="text-center py-4 text-on-surface-variant text-sm font-medium">
              {partnerActive ? "Generating your code..." : "Your code appears here once your profile is activated."}
            </div>
          )}
        </div>

        {/* ── STATS ROW ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Referrals", value: stats.total_referrals, icon: "group_add", color: "text-primary" },
            { label: "Rewarded", value: stats.rewarded_referrals, icon: "verified", color: "text-[#059669]" },
            { label: "Total Earned", value: `₹${stats.total_earned.toLocaleString("en-IN")}`, icon: "account_balance_wallet", color: "text-secondary" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm p-3.5 flex flex-col items-center text-center gap-1.5">
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
            {howItWorks.map((item) => (
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
            {history.length > 0 && (
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">{history.length} total</span>
            )}
          </div>

          {history.length === 0 ? (
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
              {history.map((ref) => {
                const cfg = statusConfig[ref.status] ?? statusConfig.attributed;
                const name = ref.referredName;
                const maskedName = name
                  ? `${name.split(" ")[0]} ${"•".repeat(Math.max(3, (name.split(" ")[1]?.length ?? 3)))}`
                  : "Anonymous";
                const date = new Date(ref.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                const isRewarded = ref.status === "rewarded";
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
                      {isRewarded ? (
                        <span className="text-[11px] font-black text-[#059669]">+₹{ref.partner_reward}</span>
                      ) : null}
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
          {trigger === "registration"
            ? "Rewards are credited instantly to both wallets when your customer signs up with your code."
            : "Rewards are credited to both wallets automatically after your customer's first completed booking."}{" "}
          One reward per referred customer. PHS reserves the right to modify or discontinue the program at any time.
        </p>
      </main>
    </div>
  );
}