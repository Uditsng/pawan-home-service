import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EditServiceForm } from "./EditServiceForm";
import { requireAdmin } from "@/utils/supabase/auth-checks";

export default async function AdminEditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  // Fetch initial service data
  const { data: serviceData } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (!serviceData) {
    redirect('/admin/services');
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
      why_choose_us: serviceData?.page_content?.why_choose_us || [
        { icon: "verified_user", title: "Verified Professionals", desc: "Background-checked and certified experts." },
        { icon: "timer", title: "On-Time Service", desc: "We respect your schedule." }
      ],
      how_to_book_steps: serviceData?.page_content?.how_to_book_steps || [
        { step: 1, title: "Choose Service", desc: "Select and confirm your location" },
        { step: 2, title: "Pick Schedule", desc: "Select a date and time" },
        { step: 3, title: "Service Done", desc: "Professional arrives to complete the job" }
      ]
    };

    const { error } = await db.from("services").update({
      title,
      subcategory_id,
      base_price,
      original_price,
      price_breakdown,
      description,
      page_content,
      image_url,
    }).eq("id", id);

    if (error) {
      console.error(error);
      return { type: "error", message: error.message };
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
        <h1 className="text-3xl font-bold font-headline text-primary">Edit Service</h1>
      </div>

      <EditServiceForm categories={categoriesData || []} initialData={serviceData} action={editServiceAction} />
    </div>
  );
}
