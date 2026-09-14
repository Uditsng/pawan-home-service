import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { isOfferCurrentlyActive, offerEligibilityLabel, offerTypeLabel, formatOfferBenefit } from "@/lib/offers/format";
import { OfferPurchaseClient } from "./OfferPurchaseClient";
import type { Offer, OfferEntitlement } from "@/lib/types";

export const metadata = {
  title: "Offer | PHS Cleaning Company",
};

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/customer/offers/${id}`);

  const [offerRes, myEntitlementRes, profileRes] = await Promise.all([
    supabase.from("offers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("offer_entitlements")
      .select("*")
      .eq("offer_id", id)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("wallet_balance, role").eq("id", user.id).single(),
  ]);

  const offer = offerRes.data as Offer | null;
  if (!offer) notFound();

  const myEntitlement = myEntitlementRes.data as OfferEntitlement | null;
  const walletBalance = Number(profileRes.data?.wallet_balance ?? 0);
  const profileRole = (profileRes.data as { role?: string } | null)?.role;

  const purchasable =
    offer.status === "active" &&
    isOfferCurrentlyActive(offer) &&
    profileRole === "customer" &&
    !myEntitlement;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-5 pb-8 space-y-6">
        <Link
          href="/customer/offers"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-xs font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          All offers
        </Link>

        <OfferPurchaseClient
          offer={offer}
          myEntitlement={myEntitlement}
          walletBalance={walletBalance}
          purchasable={purchasable}
          userId={user.id}
        />

        {/* Rules */}
        <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 p-5 space-y-3">
          <h2 className="text-sm font-bold text-primary font-headline">Offer details</h2>
          <dl className="text-xs space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Type</dt>
              <dd className="font-bold text-on-surface">{offerTypeLabel(offer.offer_type)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Benefit</dt>
              <dd className="font-bold text-secondary">{formatOfferBenefit(offer)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Minimum booking</dt>
              <dd className="font-bold text-on-surface">{offer.min_booking_amount > 0 ? `₹${offer.min_booking_amount}` : "None"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Who can buy</dt>
              <dd className="font-bold text-on-surface">{offerEligibilityLabel(offer.eligibility)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Once bought, stays valid</dt>
              <dd className="font-bold text-on-surface text-right">
                {offer.validity_model === "fixed_dates"
                  ? offer.valid_until
                    ? `Until ${new Date(offer.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "—"
                  : `${offer.valid_days} days from purchase`}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-on-surface-variant">Redemption</dt>
              <dd className="font-bold text-on-surface">
                {offer.usage_limit_type === "one_time" ? "One-time use" : `Up to ${offer.max_redemptions_per_customer} bookings`}
              </dd>
            </div>
          </dl>
          {offer.description && (
            <p className="text-[11px] text-on-surface-variant leading-relaxed border-t border-outline-variant/15 pt-3">{offer.description}</p>
          )}
          <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
            Offer value applies automatically at checkout when all the services in your cart are covered by this offer. Purchased offers are
            non-refundable once activated.
          </p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}