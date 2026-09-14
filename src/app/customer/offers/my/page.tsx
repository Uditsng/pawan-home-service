import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/Badge";
import { formatOfferBenefit, formatEntitlementValue } from "@/lib/offers/format";
import type { Offer, OfferEntitlement } from "@/lib/types";

export const metadata = {
  title: "My Offers | PHS Cleaning Company",
  description: "Your purchased and claimed offers.",
};

interface MyEntitlement extends OfferEntitlement {
  offers: Pick<Offer, "id" | "title" | "code" | "offer_type" | "benefit_value" | "artwork_url" | "validity_model" | "valid_days"> | null;
}

export default async function MyOffersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("offer_entitlements")
    .select("*, offers ( id, title, code, offer_type, benefit_value, artwork_url, validity_model, valid_days )")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const entitlements = (data || []) as unknown as MyEntitlement[];

  const active = entitlements.filter(
    (e) => e.status === "active" && (!e.expires_at || new Date(e.expires_at) > new Date())
  );
  const used = entitlements.filter((e) => e.status === "consumed");
  const expired = entitlements.filter(
    (e) => e.status === "expired" || (e.status === "active" && e.expires_at && new Date(e.expires_at) <= new Date())
  );

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary tracking-tight">My Offers</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">Every deal you own, and how much is left on it.</p>
          </div>
          <Link
            href="/customer/offers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/15 text-xs font-bold tracking-wide hover:bg-primary/15 transition-colors"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            Browse offers
          </Link>
        </div>

        {active.length === 0 && used.length === 0 && expired.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 py-14 px-6 text-center space-y-3">
            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl text-secondary drop-shadow-sm">confirmation_number</span>
            </div>
            <p className="font-bold text-primary font-headline">No offers yet</p>
            <p className="text-xs text-on-surface-variant max-w-60 mx-auto">
              Buy or claim an offer card to start saving on your next booking.
            </p>
            <Link
              href="/customer/offers"
              className="inline-block mt-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              View offers
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70">
                  Active · {active.length}
                </h2>
                {active.map((e) => (
                  <OffersRow key={e.id} entitlement={e} />
                ))}
              </section>
            )}

            {used.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70">
                  Used · {used.length}
                </h2>
                {used.map((e) => (
                  <OffersRow key={e.id} entitlement={e} />
                ))}
              </section>
            )}

            {expired.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70">
                  Expired · {expired.length}
                </h2>
                {expired.map((e) => (
                  <OffersRow key={e.id} entitlement={e} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function OffersRow({ entitlement }: { entitlement: MyEntitlement }) {
  const offer = entitlement.offers;
  const isActive = entitlement.status === "active";

  return (
    <Link
      href={offer ? `/customer/offers/${offer.id}` : "#"}
      className="block bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 items-center gap-4 shadow-xs hover:border-primary/30 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-2xl">local_activity</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-on-surface truncate">{offer?.title ?? "Offer"}</p>
          <Badge variant={isActive ? "success" : "outline"} className="text-[9px] px-2 py-0.5 shrink-0">
            {isActive ? "Active" : entitlement.status}
          </Badge>
        </div>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {offer ? formatOfferBenefit({ offer_type: entitlement.offer_type, benefit_value: offer.benefit_value, max_discount: null }) : "—"}
          <span className="mx-1 opacity-40">·</span>
          {formatEntitlementValue(entitlement)}
        </p>
        {entitlement.expires_at && (
          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
            Expires {new Date(entitlement.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
      <span className="material-symbols-outlined text-on-surface-variant/50 shrink-0">chevron_right</span>
    </Link>
  );
}