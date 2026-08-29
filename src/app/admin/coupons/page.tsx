import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CouponTable, type CouponRow } from "./CouponTable";

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/");

  const { data } = await supabase
    .from("coupons")
    .select("*, services ( title )")
    .order("created_at", { ascending: false });

  const coupons = (data || []) as unknown as CouponRow[];

  async function deleteCouponAction(id: string) {
    "use server";
    await requireAdmin();
    const db = await createClient();
    const { error } = await db.from("coupons").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/coupons");
    return {};
  }

  async function toggleCouponActiveAction(id: string, isActive: boolean) {
    "use server";
    await requireAdmin();
    const db = await createClient();
    const { error } = await db
      .from("coupons")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/coupons");
    return {};
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Top Section (Header & Actions) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">
            Coupons & Discounts
          </h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
            Create and manage discount codes for customers to use at checkout.
          </p>
        </div>
        <Link
          href="/admin/coupons/create"
          className="px-6 py-3.5 bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create New Coupon
        </Link>
      </div>

      <CouponTable
        coupons={coupons}
        deleteCouponAction={deleteCouponAction}
        toggleCouponActiveAction={toggleCouponActiveAction}
      />
    </div>
  );
}
