import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { OfferCard } from "@/components/Offers/OfferCard";
import {
  formatOfferBenefit,
  offerTypeLabel,
  offerEligibilityLabel,
  isOfferCurrentlyActive,
} from "@/lib/offers/format";
import { EntitlementVoidButton } from "./EntitlementVoidButton";
import type { Offer, OfferEntitlement } from "@/lib/types";

export default async function AdminOfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: offer } = await supabase.from("offers").select("*").eq("id", id).single();
  if (!offer) notFound();
  const offerRow = offer as Offer;

  const [eligibleRes, purchasesRes, entitlementsRes, redemptionsRes] = await Promise.all([
    supabase
      .from("offer_eligible_services")
      .select("service_id, services ( title )")
      .eq("offer_id", id),
    supabase.from("offer_purchases").select("*").eq("offer_id", id).order("created_at", { ascending: false }),
    supabase
      .from("offer_entitlements")
      .select("*, profiles ( full_name, email )")
      .eq("offer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("offer_redemptions").select("*").eq("offer_id", id).order("redeemed_at", { ascending: false }).limit(50),
  ]);

  const eligibleServices = (eligibleRes.data || []).map((r) => ({
    service_id: r.service_id as string,
    title: (r.services as { title?: string } | null)?.title ?? "Unknown service",
  }));

  const purchases = purchasesRes.data || [];
  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount), 0);
  const successfulPurchases = purchases.filter((p) => p.status === "success").length;

  const entitlements = (entitlementsRes.data || []).map((e) => ({
    ...e,
    customerName: (e.profiles as { full_name?: string | null; email?: string | null } | null)?.full_name ?? null,
    customerEmail: (e.profiles as { full_name?: string | null; email?: string | null } | null)?.email ?? null,
  })) as (OfferEntitlement & { customerName: string | null; customerEmail: string | null })[];

  const redemptions = redemptionsRes.data || [];

  const live = isOfferCurrentlyActive(offerRow);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div>
        <Link
          href="/admin/offers"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-3 font-bold text-xs uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Offers
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">{offerRow.title}</h1>
            <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
              <span className="font-mono font-bold uppercase tracking-wider">{offerRow.code}</span> · {offerTypeLabel(offerRow.offer_type)} ·{" "}
              {formatOfferBenefit(offerRow)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={offerRow.status === "active" ? (live ? "success" : "warning") : "outline"} className="text-[10px] px-3 py-1">
              {offerRow.status === "active" && !live ? "Active (expired)" : offerRow.status}
            </Badge>
            <Link
              href={`/admin/offers/${id}/edit`}
              className="px-4 py-2 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card variant="solid" className="p-6 rounded-[32px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Purchases</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{purchases.length}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-1">{successfulPurchases} successful</p>
        </Card>
        <Card variant="solid" className="p-6 rounded-[32px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Revenue</p>
          <p className="text-2xl font-bold text-secondary font-headline mt-1">₹{totalRevenue}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-1">Gross sale value</p>
        </Card>
        <Card variant="solid" className="p-6 rounded-[32px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Entitlements</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{entitlements.length}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-1">Issued from purchases & claims</p>
        </Card>
        <Card variant="solid" className="p-6 rounded-[32px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Redemptions</p>
          <p className="text-2xl font-bold text-primary font-headline mt-1">{redemptions.length}</p>
          <p className="text-[11px] text-on-surface-variant/70 mt-1">Applied at booking checkout</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card + details */}
        <div className="space-y-6 lg:col-span-1">
          <OfferCard offer={offerRow} size="lg" />
          <Card variant="solid" className="rounded-[28px]">
            <h3 className="text-sm font-bold text-primary font-headline mb-3">Rules</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Purchase price</dt>
                <dd className="font-bold text-on-surface">{offerRow.purchase_price > 0 ? `₹${offerRow.purchase_price}` : "Free claim"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Min booking</dt>
                <dd className="font-bold text-on-surface">{offerRow.min_booking_amount > 0 ? `₹${offerRow.min_booking_amount}` : "None"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Buyers</dt>
                <dd className="font-bold text-on-surface">{offerEligibilityLabel(offerRow.eligibility)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Usage</dt>
                <dd className="font-bold text-on-surface">
                  {offerRow.usage_limit_type === "one_time"
                    ? "One-time use"
                    : `${offerRow.max_redemptions_per_customer} redemptions / customer`}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Validity</dt>
                <dd className="font-bold text-on-surface text-right">
                  {offerRow.validity_model === "fixed_dates"
                    ? `${offerRow.valid_from ? new Date(offerRow.valid_from).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"} → ${
                        offerRow.valid_until ? new Date(offerRow.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"
                      }`
                    : `${offerRow.valid_days} days after purchase`}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-on-surface-variant">Max discount cap</dt>
                <dd className="font-bold text-on-surface">{offerRow.max_discount ? `₹${offerRow.max_discount}` : "—"}</dd>
              </div>
            </dl>
            {offerRow.description && (
              <p className="mt-4 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/15 pt-3">{offerRow.description}</p>
            )}
          </Card>

          <Card variant="solid" className="rounded-[28px]">
            <h3 className="text-sm font-bold text-primary font-headline mb-3">Eligible Services</h3>
            {eligibleServices.length === 0 ? (
              <p className="text-xs text-error font-semibold">No eligible services — offer cannot be activated.</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
                {eligibleServices.map((s) => (
                  <li key={s.service_id} className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[#059669] text-base">check_circle</span>
                    {s.title}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Entitlements + redemptions */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="solid" className="rounded-[28px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-primary font-headline">Active Entitlements</h3>
              <span className="text-[11px] text-on-surface-variant/70">{entitlements.filter((e) => e.status === "active").length} active</span>
            </div>
            {entitlements.length === 0 ? (
              <div className="py-10 text-center text-on-surface-variant">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 mx-auto mb-2">
                  <span className="material-symbols-outlined text-2xl">local_activity</span>
                </div>
                <p className="text-xs font-bold text-primary font-headline">No entitlements yet</p>
                <p className="text-xs opacity-60 mt-1">Customers who purchase or claim this offer will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/15 bg-surface-container-low/50">
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Customer</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Value Left</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Source</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Expires</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Status</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {entitlements.map((e) => (
                      <tr key={e.id} className="text-xs">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <p className="font-bold text-on-surface">{e.customerName || "Customer"}</p>
                          <p className="text-[10px] text-on-surface-variant/70 truncate max-w-40">{e.customerEmail || "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-on-surface">
                          {e.offer_type === "SERVICE_CREDIT" ? `₹${e.remaining_value}` : `${e.remaining_uses} use${e.remaining_uses === 1 ? "" : "s"}`}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-on-surface-variant">
                          {e.purchase_id ? (e.purchased_price > 0 ? `Paid ₹${e.purchased_price}` : "Claimed") : "Free claim"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-on-surface-variant">
                          {e.expires_at ? new Date(e.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge variant={e.status === "active" ? "success" : e.status === "cancelled" ? "danger" : "outline"} className="text-[9px] px-2 py-0.5">
                            {e.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          {e.status === "active" && (
                            <EntitlementVoidButton entitlementId={e.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card variant="solid" className="rounded-[28px]">
            <h3 className="text-sm font-bold text-primary font-headline mb-4">Redemptions</h3>
            {redemptions.length === 0 ? (
              <p className="py-8 text-center text-xs text-on-surface-variant/70">No redemptions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/15 bg-surface-container-low/50">
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Date</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Order</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Booking</th>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {redemptions.map((r) => (
                      <tr key={r.id} className="text-xs">
                        <td className="px-3 py-2.5 whitespace-nowrap text-on-surface-variant">
                          {new Date(r.redeemed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                          {r.order_id ? String(r.order_id).slice(0, 8) : "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                          {r.booking_id ? String(r.booking_id).slice(0, 8) : "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-bold text-secondary">₹{Number(r.amount_applied)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}