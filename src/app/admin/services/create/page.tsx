import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CreateServiceForm } from "./CreateServiceForm";

export default async function AdminCreateServicePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

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

  async function createServiceAction(prevState: any, formData: FormData) {
    "use server";
    const db = await createClient();

    // Core details
    const title = formData.get("title") as string;
    const subcategory_id = formData.get("subcategory_id") as string;
    const base_price = parseFloat(formData.get("base_price") as string);
    const price_breakdown = formData.get("price_breakdown") as string;
    const description = formData.get("description") as string;

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

    const { error } = await db.from("services").insert({
      title,
      subcategory_id,
      base_price,
      price_breakdown,
      description,
      is_active: true,
      page_content,
    });

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
        <h1 className="text-3xl font-bold font-headline text-primary">Add New Service</h1>
      </div>

      <CreateServiceForm categories={categoriesData || []} action={createServiceAction} />
    </div>
  );
}
