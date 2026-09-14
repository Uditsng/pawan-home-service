import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import Link from "next/link";
import { OfferTable, type OfferRow } from "./OfferTable";

interface OfferWithRelations extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  title: string;
  offer_type: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "SERVICE_CREDIT";
  purchase_price: number;
  benefit_value: number;
  max_discount: number | null;
  min_booking_amount: number;
  validity_model: "fixed_dates" | "relative_days";
  valid_from: string | null;
  valid_until: string | null;
  valid_days: number | null;
  status: "draft" | "active" | "paused" | "expired" | "archived";
  created_at: string;
  offer_eligible_services: { service_id: string }[] | null;
  offer_purchases: { id: string }[] | null;
  offer_entitlements: { id: string }[] | null;
}

export default async function AdminOffersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("offers")
    .select(
      `*,
      offer_eligible_services ( service_id ),
      offer_purchases ( id ),
      offer_entitlements ( id )`
    )
    .order("created_at", { ascending: false });

  const rows: OfferRow[] = (data || []).map((raw) => {
    const o = raw as OfferWithRelations;
    return {
      id: o.id,
      code: o.code,
      name: o.name,
      title: o.title,
      offer_type: o.offer_type,
      purchase_price: Number(o.purchase_price),
      benefit_value: Number(o.benefit_value),
      max_discount: o.max_discount === null ? null : Number(o.max_discount),
      min_booking_amount: Number(o.min_booking_amount),
      validity_model: o.validity_model,
      valid_from: o.valid_from,
      valid_until: o.valid_until,
      valid_days: o.valid_days,
      status: o.status,
      created_at: o.created_at,
      serviceCount: o.offer_eligible_services?.length ?? 0,
      totalPurchases: o.offer_purchases?.length ?? 0,
      totalEntitlements: o.offer_entitlements?.length ?? 0,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">Offer Cards</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
            Create and manage promotional offers customers purchase with wallet, Razorpay, or claim free.
          </p>
        </div>
        <Link
          href="/admin/offers/create"
          className="px-6 py-3.5 bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create New Offer
        </Link>
      </div>

      <OfferTable offers={rows} />
    </div>
  );
}