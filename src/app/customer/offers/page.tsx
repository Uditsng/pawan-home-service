import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { OfferCard } from "@/components/Offers/OfferCard";
import { isOfferCurrentlyActive } from "@/lib/offers/format";
import type { Offer, OfferEntitlement } from "@/lib/types";

export const metadata = {
  title: "Offers | PHS Cleaning Company",
  description: "Browse and buy premium offer cards for your home services.",
};

export default async function CustomerOffersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();
  const [offersRes, entitlementsRes] = await Promise.all([
    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }),
    supabase
      .from("offer_entitlements")
      .select("*, offers ( title, code, offer_type, benefit_value, artwork_url, validity_model, valid_days )")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const offers = ((offersRes.data || []) as Offer[]).filter(
    (o) =>
      isOfferCurrentlyActive(o) &&
      (!o.valid_from || o.valid_from <= now) &&
      (!o.valid_until || o.valid_until >= now)
  );

  const myOffers = (entitlementsRes.data || []) as (OfferEntitlement & {
    offers: Pick<Offer, "title" | "code" | "offer_type" | "benefit_value" | "artwork_url" | "validity_model" | "valid_days"> | null;
  })[];

  const claimableIds = new Set(myOffers.map((e) => e.offer_id));

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary tracking-tight">Offers for You</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Buy a deal, then apply it at booking checkout.
            </p>
          </div>
          <Link
            href="/customer/offers/my"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/15 text-xs font-bold tracking-wide hover:bg-primary/15 transition-colors"
          >
            <span className="material-symbols-outlined text-base">local_activity</span>
            My Offers
            {myOffers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-secondary text-primary text-[10px] font-black flex items-center justify-center">
                {myOffers.length}
              </span>
            )}
          </Link>
        </div>

        {offers.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 py-14 px-6 text-center space-y-3">
            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl text-secondary drop-shadow-sm">local_activity</span>
            </div>
            <p className="font-bold text-primary font-headline">No offers right now</p>
            <p className="text-xs text-on-surface-variant max-w-60 mx-auto">
              New offers drop regularly. Check back soon for a fresh deal on your home services.
            </p>
            <Link
              href="/customer/dashboard"
              className="inline-block mt-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const alreadyClaimed = claimableIds.has(offer.id);
              const isFree = offer.purchase_price <= 0;
              return (
                <Link key={offer.id} href={`/customer/offers/${offer.id}`} className="block group">
                  <OfferCard
                    offer={offer}
                    size="lg"
                    footer={
                      <div className="flex items-center justify-between mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                          {alreadyClaimed ? (
                            <>In My Offers · {isFree ? "Claimed" : "Owned"}</>
                          ) : isFree ? (
                            <>
                              Claim free
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </>
                          ) : (
                            <>
                              Get for ₹{offer.purchase_price}
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </>
                          )}
                        </span>
                      </div>
                    }
                  />
                </Link>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 p-5 space-y-3">
          <h2 className="text-sm font-bold text-primary font-headline">How offer cards work</h2>
          <ol className="space-y-2">
            {[
              ["Buy once", "Pay with wallet, card/UPI, or claim it free."],
              ["It's yours", "The deal lands in My Offers with its own validity window."],
              ["Apply at checkout", "Pick it on your next booking to unlock the discount automatically."],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary/15 text-primary text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-on-surface">{title}</p>
                  <p className="text-[11px] text-on-surface-variant">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}