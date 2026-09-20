import Link from "next/link";
import { BannerForm } from "../BannerForm";
import { createBannerAction } from "../actions";
import { requireAdmin } from "@/utils/supabase/auth-checks";

export default async function AdminCreateBannerPage() {
  await requireAdmin();

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-headline">Create Banner</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
          Upload a 16:9 carousel image and choose where it should take customers.
        </p>
      </div>

      <BannerForm action={createBannerAction} />
    </div>
  );
}