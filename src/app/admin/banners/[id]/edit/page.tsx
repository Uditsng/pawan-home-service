import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BannerForm, BannerRow } from "../../BannerForm";
import { updateBannerAction } from "../../actions";
import { requireAdmin } from "@/utils/supabase/auth-checks";

export default async function AdminEditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: banner } = await supabase.from("home_banners").select("*").eq("id", id).single();
  if (!banner) notFound();

  const row: BannerRow = {
    id: banner.id,
    title: banner.title,
    image_url: banner.image_url,
    link_url: banner.link_url,
    is_active: banner.is_active,
    sort_order: banner.sort_order,
    created_at: banner.created_at,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-8">
      <div>
        <Link
          href="/admin/banners"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-3 font-bold text-xs uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Banners
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-headline">Edit Banner</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
          Update the image, link target, order, or visibility of this carousel slide.
        </p>
      </div>

      <BannerForm action={updateBannerAction} banner={row} isEdit />
    </div>
  );
}