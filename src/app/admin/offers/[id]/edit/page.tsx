import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferForm, type OfferServiceOption } from "../../OfferForm";
import { updateOfferAction } from "../../actions";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import type { Offer } from "@/lib/types";

interface ServiceWithRelations {
  id: string;
  title: string;
  subcategories:
    | {
        subcategory_name: string;
        categories: { category_name: string } | { category_name: string }[] | null;
      }
    | {
        subcategory_name: string;
        categories: { category_name: string } | { category_name: string }[] | null;
      }[]
    | null;
}

export default async function AdminEditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: offer } = await supabase.from("offers").select("*").eq("id", id).single();
  if (!offer) notFound();

  const [servicesRes, eligibleRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, title, subcategories ( subcategory_name, categories ( category_name ) )")
      .eq("status", "published")
      .order("title", { ascending: true }),
    supabase.from("offer_eligible_services").select("service_id").eq("offer_id", id),
  ]);

  const services: OfferServiceOption[] = ((servicesRes.data || []) as ServiceWithRelations[])
    .map((s) => {
      const sub = Array.isArray(s.subcategories) ? (s.subcategories[0] ?? null) : s.subcategories;
      const cat = sub?.categories;
      const catName = Array.isArray(cat) ? (cat[0]?.category_name ?? null) : (cat?.category_name ?? null);
      return {
        id: s.id,
        title: s.title,
        subcategory_name: sub?.subcategory_name ?? null,
        category_name: catName,
      };
    })
    .filter((s): s is OfferServiceOption => Boolean(s.id && s.title));

  const initialServiceIds = (eligibleRes.data || []).map((r) => r.service_id as string);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-8">
      <div>
        <Link
          href="/admin/offers"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-3 font-bold text-xs uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Offers
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-headline">Edit Offer</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
          Update offer {offer.code} — code stays locked after creation.
        </p>
      </div>

      <OfferForm
        action={updateOfferAction}
        services={services}
        offer={offer as Offer}
        isEdit
        initialServiceIds={initialServiceIds}
      />
    </div>
  );
}