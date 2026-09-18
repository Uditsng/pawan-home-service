import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { CategoryAdminClient } from "./CategoryAdminClient";
import {
  assignServicesAction,
  createCategoryAction,
  createSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  updateCategoryAction,
  updateSubcategoryAction,
} from "./actions";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [categoriesRes, servicesRes] = await Promise.all([
    supabase
      .from("categories")
      .select(`
        id,
        category_name,
        image_url,
        subcategories (
          id,
          subcategory_name,
          icon_name,
          image_url,
          category_id
        )
      `)
      .order("category_name", { ascending: true }),
    supabase
      .from("services")
      .select("id, title, subcategory_id")
      .order("title", { ascending: true }),
  ]);

  const categories = categoriesRes.data ?? [];
  const services = servicesRes.data ?? [];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-primary font-headline">Categories</h1>
          <p className="text-on-surface-variant font-medium mt-0.5 opacity-60 text-xs">
            Manage categories, sub-categories, their visuals, and service assignments.
          </p>
        </div>
      </div>

      <CategoryAdminClient
        initialCategories={categories}
        initialServices={services}
        createCategoryAction={createCategoryAction}
        updateCategoryAction={updateCategoryAction}
        deleteCategoryAction={deleteCategoryAction}
        createSubcategoryAction={createSubcategoryAction}
        updateSubcategoryAction={updateSubcategoryAction}
        deleteSubcategoryAction={deleteSubcategoryAction}
        assignServicesAction={assignServicesAction}
      />
    </div>
  );
}