import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ServiceDataGrid } from "./ServiceDataGrid";

export default async function AdminServicesPage() {
  const supabase = await createClient();

  // Fetch categories with subcategories
  const { data: categories } = await supabase
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

  // Fetch services with related subcategory and category info
  const { data: services } = await supabase
    .from('services')
    .select(`
      *,
      subcategories (
        subcategory_name,
        icon_name,
        categories (
          category_name
        )
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Top Section (Header & Actions) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Services</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Manage and edit your active services.</p>
        </div>
        <Link 
          href="/admin/services/create"
          className="px-8 py-4 bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span> Add New Service
        </Link>
      </div>

      <ServiceDataGrid services={services || []} categories={categories || []} />
    </div>
  );
}
