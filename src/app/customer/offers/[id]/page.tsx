import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { isOfferCurrentlyActive } from "@/lib/offers/format";
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

  const [offerRes, myEntitlementRes, profileRes, eligibleRes] = await Promise.all([
    supabase.from("offers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("offer_entitlements")
      .select("*")
      .eq("offer_id", id)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("offer_eligible_services")
      .select("service_id, services ( id, title )")
      .eq("offer_id", id),
  ]);

  const offer = offerRes.data as Offer | null;
  if (!offer) notFound();

  const myEntitlement = myEntitlementRes.data as OfferEntitlement | null;
  const profileRole = (profileRes.data as { role?: string } | null)?.role;

  const eligibleServices = ((eligibleRes.data || []) as { service_id: string; services: { id: string; title: string } | { id: string; title: string }[] | null }[])
    .map((r) => {
      const svc = Array.isArray(r.services) ? (r.services[0] ?? null) : r.services;
      return { id: svc?.id ?? r.service_id, title: svc?.title ?? "Unknown service" };
    })
    .filter((s) => Boolean(s.id && s.title));

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
          purchasable={purchasable}
          userId={user.id}
          eligibleServices={eligibleServices}
        />
      </main>
      <BottomNav />
    </div>
  );
}