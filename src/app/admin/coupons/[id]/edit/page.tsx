import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponForm, type CouponFormState } from "../../CouponForm";
import { Coupon } from "@/lib/types";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const str = String(value).trim();
  if (str === "") return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

export default async function AdminEditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/");

  const { data: couponData } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (!couponData) notFound();
  const coupon = couponData as unknown as Coupon;

  const { data: servicesData } = await supabase
    .from("services")
    .select("id, title")
    .order("title", { ascending: true });

  const services = (servicesData || []).map((s) => ({
    id: s.id as string,
    title: s.title as string,
  }));

  async function updateCouponAction(
    _prev: CouponFormState,
    formData: FormData
  ): Promise<CouponFormState> {
    "use server";
    await requireAdmin();
    const db = await createClient();

    const couponId = String(formData.get("id") || "");
    if (!couponId) return { type: "error", message: "Missing coupon id." };

    const discountType = String(formData.get("discount_type") || "percentage");
    const discountValue = Number(formData.get("discount_value"));
    if (!["fixed", "percentage"].includes(discountType))
      return { type: "error", message: "Invalid discount type." };
    if (!Number.isFinite(discountValue) || discountValue <= 0)
      return { type: "error", message: "Discount value must be greater than 0." };

    const row = {
      discount_type: discountType,
      discount_value: discountValue,
      min_booking_amount: Number(formData.get("min_booking_amount") || 0),
      max_discount: parseOptionalNumber(formData.get("max_discount")),
      limit_per_user: Number(formData.get("limit_per_user") || 1),
      total_limit: parseOptionalNumber(formData.get("total_limit")),
      applicable_to_service_id: formData.get("applicable_to_service_id")
        ? String(formData.get("applicable_to_service_id"))
        : null,
      is_active: formData.get("is_active") === "on",
      expires_at: formData.get("expires_at")
        ? new Date(String(formData.get("expires_at"))).toISOString()
        : null,
    };

    const { error } = await db.from("coupons").update(row).eq("id", couponId);
    if (error) return { type: "error", message: error.message };

    revalidatePath("/admin/coupons");
    redirect("/admin/coupons");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-8">
      <div>
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-3 font-bold text-xs uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Coupons
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-headline">
          Edit Coupon
        </h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-70 text-sm">
          Change details for coupon{" "}
          <span className="font-mono font-bold text-primary uppercase">{coupon.code}</span>.
        </p>
      </div>

      <CouponForm
        action={updateCouponAction}
        services={services}
        coupon={coupon}
        isEdit
      />
    </div>
  );
}

