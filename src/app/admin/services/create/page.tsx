import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CreateServiceForm } from "./CreateServiceForm";
import { requireAdmin } from "@/utils/supabase/auth-checks";

export default async function AdminCreateServicePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  // ── Server action: create a new category ──────────────────────────────────
  async function addCategoryAction(name: string) {
    "use server";
    await requireAdmin();
    const db = await createClient();
    const { data, error } = await db
      .from("categories")
      .insert({ category_name: name })
      .select("id, category_name")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/admin/services/create");
    return { id: data.id, category_name: data.category_name };
  }

  // ── Server action: create a new subcategory ───────────────────────────────
  async function addSubcategoryAction(categoryId: string, name: string, iconName: string) {
    "use server";
    await requireAdmin();
    const db = await createClient();
    const { data, error } = await db
      .from("subcategories")
      .insert({ category_id: categoryId, subcategory_name: name, icon_name: iconName })
      .select("id, subcategory_name, icon_name, category_id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/admin/services/create");
    return { id: data.id, subcategory_name: data.subcategory_name, icon_name: data.icon_name, category_id: data.category_id };
  }

  // Fetch categories and subcategories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select(`
      id,
      category_name,
      subcategories (
        id,
        subcategory_name,
        icon_name
      )
    `);

  type FormActionState = {
    type: "success" | "error" | null;
    message: string | null;
  };

  async function createServiceAction(prevState: FormActionState, formData: FormData): Promise<FormActionState> {
    "use server";
    await requireAdmin();
    const db = await createClient();

    // Core details
    const title = formData.get("title") as string;
    const subcategory_id = formData.get("subcategory_id") as string;
    const base_price = parseFloat(formData.get("base_price") as string);
    const original_price_raw = formData.get("original_price") as string;
    const original_price = original_price_raw ? parseFloat(original_price_raw) : null;
    const price_breakdown = formData.get("price_breakdown") as string;
    const description = formData.get("description") as string;
    const image_url = formData.get("image_url") as string || null;
    const pricing_model = (formData.get("pricing_model") as string) || "fixed";
    const duration_rates_raw = formData.get("duration_rates_json") as string;

    const pricing_config_json = formData.get("pricing_config_json") as string;
    const form_fields_json = formData.get("form_fields_json") as string;
    const gst_applicable = formData.get("gst_applicable") === "true";

    let pricing_config = {};
    try {
      if (pricing_config_json) pricing_config = JSON.parse(pricing_config_json);
    } catch (e) {
      console.error("Failed to parse pricing_config", e);
    }

    let form_fields = [];
    try {
      if (form_fields_json) form_fields = JSON.parse(form_fields_json);
    } catch (e) {
      console.error("Failed to parse form_fields", e);
    }

    // Arrays separated by newline
    const includedRaw = formData.get("included_features") as string;
    const excludedRaw = formData.get("excluded_features") as string;
    const included_features = includedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const excluded_features = excludedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    // Dynamic FAQs
    const faqsRaw = formData.get("faqs_json") as string;
    let faqs = [];
    try {
      if (faqsRaw) faqs = JSON.parse(faqsRaw);
    } catch (e) {
      console.error("Failed to parse faqs", e);
    }

    const page_content = {
      about_text: description, // we can use description or separate field if needed
      included_features,
      excluded_features,
      faqs,
      why_choose_us: [
        { icon: "verified_user", title: "Verified Professionals", desc: "Background-checked and certified experts." },
        { icon: "timer", title: "On-Time Service", desc: "We respect your schedule." }
      ],
      how_to_book_steps: [
        { step: 1, title: "Choose Service", desc: "Select and confirm your location" },
        { step: 2, title: "Pick Schedule", desc: "Select a date and time" },
        { step: 3, title: "Service Done", desc: "Professional arrives to complete the job" }
      ]
    };

    const { data: newService, error } = await db.from("services").insert({
      title,
      subcategory_id,
      base_price,
      original_price,
      price_breakdown,
      description,
      is_active: true,
      page_content,
      image_url,
      pricing_model,
      pricing_config,
      form_fields,
      gst_applicable,
    }).select("id").single();

    if (error) {
      console.error(error);
      return { type: "error", message: error.message };
    }

    if (pricing_model === "hourly" && newService?.id && duration_rates_raw) {
      try {
        const rates = JSON.parse(duration_rates_raw) as { duration: number; price: number }[];
        const rows = rates.map(r => ({
          service_id: newService.id,
          duration_minutes: r.duration,
          price: r.price
        }));
        if (rows.length > 0) {
          const { error: ratesErr } = await db.from("service_duration_pricing").insert(rows);
          if (ratesErr) {
            console.error("Failed to insert duration rates:", ratesErr);
          }
        }
      } catch (e) {
        console.error("Failed to parse duration rates:", e);
      }
    }

    revalidatePath('/admin/services');
    revalidatePath('/');
    redirect('/admin/services');
  }

  return (
    <div className="p-4 max-w-6xl mx-auto pb-8">
      <div className="mb-4">
        <Link href="/admin/services" className="text-on-surface-variant hover:text-primary flex items-center gap-1 mb-4 font-bold text-sm">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Services
        </Link>
        <h1 className="text-3xl font-bold font-headline text-primary">Add New Service</h1>
      </div>

      <CreateServiceForm
        categories={categoriesData || []}
        action={createServiceAction}
        addCategoryAction={addCategoryAction}
        addSubcategoryAction={addSubcategoryAction}
      />
    </div>
  );
}
