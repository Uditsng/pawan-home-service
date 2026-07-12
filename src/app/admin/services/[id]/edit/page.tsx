import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EditServiceForm } from "./EditServiceForm";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { ServiceVariant, ServiceAddon } from "@/lib/types";
import { revalidateServices } from "@/utils/supabase/cacheInvalidators";

export default async function AdminEditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  // Fetch initial service data, variants, and addons in parallel
  const [serviceRes, variantsRes, addonsRes] = await Promise.all([
    supabase.from('services').select('*').eq('id', id).single(),
    supabase.from("service_variants").select("*").eq("service_id", id).order("price", { ascending: true }),
    supabase.from("service_addons").select("*").eq("service_id", id).order("created_at", { ascending: true }),
  ]);

  const serviceData = serviceRes.data;
  if (!serviceData) {
    redirect('/admin/services');
  }

  const initialVariants = (variantsRes.data || []) as ServiceVariant[];
  const initialAddons = (addonsRes.data || []) as ServiceAddon[];

  // Fetch duration rates if it's an hourly service
  let durationRates: { duration: number; price: number }[] = [];
  if (serviceData.pricing_model === "hourly") {
    const { data: ratesData } = await supabase
      .from("service_duration_pricing")
      .select("duration_minutes, price")
      .eq("service_id", id);
    if (ratesData) {
      durationRates = ratesData.map(r => ({
        duration: r.duration_minutes,
        price: Number(r.price)
      }));
    }
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

  async function editServiceAction(prevState: FormActionState, formData: FormData): Promise<FormActionState> {
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

    const includedRaw = (formData.get("included_features") as string) || "";
    const excludedRaw = (formData.get("excluded_features") as string) || "";
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
      about_text: description,
      included_features,
      excluded_features,
      faqs,
      why_choose_us: serviceData.page_content?.why_choose_us || [
        { icon: "verified_user", title: "Verified Professionals", desc: "Background-checked and certified experts." },
        { icon: "timer", title: "On-Time Service", desc: "We respect your schedule." }
      ],
      how_to_book_steps: serviceData.page_content?.how_to_book_steps || [
        { step: 1, title: "Choose Service", desc: "Select and confirm your location" },
        { step: 2, title: "Pick Schedule", desc: "Select a date and time" },
        { step: 3, title: "Service Done", desc: "Professional arrives to complete the job" }
      ]
    };

    const status = (formData.get("status") as string) || serviceData.status || "published";

    const { error } = await db.from("services").update({
      title,
      subcategory_id,
      base_price,
      original_price,
      price_breakdown,
      description,
      page_content,
      image_url,
      pricing_model,
      pricing_config,
      form_fields,
      gst_applicable,
      status,
      is_active: true, // Reactivate on save/update
    }).eq("id", id);

    if (error) {
      console.error(error);
      return { type: "error", message: error.message };
    }

    // Update duration rates
    await db.from("service_duration_pricing").delete().eq("service_id", id);

    if (pricing_model === "hourly" && duration_rates_raw) {
      try {
        const rates = JSON.parse(duration_rates_raw) as { duration: number; price: number }[];
        const rows = rates.map(r => ({
          service_id: id,
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

    // Update variants
    await db.from("service_variants").delete().eq("service_id", id);
    const variants_raw = formData.get("variants_json") as string;
    if (variants_raw) {
      try {
        const variantsData = JSON.parse(variants_raw) as { title: string; description: string; price: number; original_price: number | null; duration_minutes: number | null }[];
        const variantRows = variantsData.map(v => ({
          service_id: id,
          title: v.title,
          description: v.description || null,
          price: Number(v.price),
          original_price: v.original_price ? Number(v.original_price) : null,
          duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null,
          is_active: true
        }));
        if (variantRows.length > 0) {
          await db.from("service_variants").insert(variantRows);
        }
      } catch (e) {
        console.error("Failed to insert variants:", e);
      }
    }

    // Update addons
    await db.from("service_addons").delete().eq("service_id", id);
    const addons_raw = formData.get("addons_json") as string;
    if (addons_raw) {
      try {
        const addonsData = JSON.parse(addons_raw) as { title: string; description: string; price: number; is_required: boolean; max_quantity: number }[];
        const addonRows = addonsData.map(a => ({
          service_id: id,
          title: a.title,
          description: a.description || null,
          price: Number(a.price),
          is_required: a.is_required === true,
          max_quantity: Number(a.max_quantity) || 1,
          is_active: true
        }));
        if (addonRows.length > 0) {
          await db.from("service_addons").insert(addonRows);
        }
      } catch (e) {
        console.error("Failed to insert addons:", e);
      }
    }

    revalidateServices(subcategory_id, id);
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
        <h1 className="text-3xl font-bold font-headline text-primary">Edit Service</h1>
      </div>

      <EditServiceForm
        categories={categoriesData || []}
        initialData={serviceData}
        initialDurationRates={durationRates}
        initialVariants={initialVariants}
        initialAddons={initialAddons}
        action={editServiceAction}
      />
    </div>
  );
}
