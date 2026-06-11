import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import ServicesShowcaseClient from "./ServicesShowcaseClient";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata = {
  title: "All Services | PHS Cleaning Company",
  description: "Browse our complete catalog of professional home services — cleaning, repairs, pest control, plumbing, and more. Book trusted professionals at transparent prices.",
};

interface SubcategoryWithServices {
  id: string;
  subcategory_name: string;
  icon_name: string;
  category_id: string;
}

interface CategoryWithSubcategories {
  id: string;
  category_name: string;
  subcategories: SubcategoryWithServices[];
}

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  is_active: boolean;
  subcategory_id: string;
  duration_minutes?: number;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function PublicServicesShowcasePage() {
  const supabase = await createClient();

  // Fetch all categories with their subcategories
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id,
      category_name,
      subcategories (
        id,
        subcategory_name,
        icon_name,
        category_id
      )
    `)
    .order("category_name") as { data: CategoryWithSubcategories[] | null };

  // Fetch all active services with subcategory + category joins
  const { data: services } = await supabase
    .from("services")
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
    .eq("is_active", true)
    .order("title", { ascending: true }) as { data: ServiceRow[] | null };

  const allServices = services || [];
  const allCategories = categories || [];

  return (
    <>
      <Header />
      <ServicesShowcaseClient categories={allCategories} services={allServices} />
      <Footer />
    </>
  );
}

