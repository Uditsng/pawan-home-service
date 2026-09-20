import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import Link from "next/link";
import { BannersTable } from "./BannersTable";
import { BannerRow } from "./BannerForm";

export default async function AdminBannersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("home_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows: BannerRow[] = (data || []).map((raw) => ({
    id: raw.id,
    title: raw.title,
    image_url: raw.image_url,
    link_url: raw.link_url,
    is_active: raw.is_active,
    sort_order: raw.sort_order,
    created_at: raw.created_at,
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">Home Banners</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
            Build and manage the promotional carousel shown at the top of every customer dashboard.
          </p>
        </div>
        <Link
          href="/admin/banners/create"
          className="px-6 py-3.5 bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create New Banner
        </Link>
      </div>

      <BannersTable banners={rows} />
    </div>
  );
}