import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import PublicSubcategoriesList from "./PublicSubcategoriesList";

interface SubcategoryWithCategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    id: string;
    category_name: string;
  } | null;
}

export default async function PublicCategorySubcategoryListingPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams.category;

  const supabase = await createClient();

  // Fetch subcategories with their parent categories
  const { data: allSubcategories } = await supabase
    .from("subcategories")
    .select(`
      id,
      subcategory_name,
      icon_name,
      categories (
        id,
        category_name
      )
    `)
    .order("subcategory_name", { ascending: true }) as { data: SubcategoryWithCategory[] | null };

  // Normalize slug comparing logic
  const normalizeSlug = (str: string) =>
    str
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[-_,\s]+/g, " ")
      .trim();
  const targetSlug = normalizeSlug(categorySlug);

  const displaySubcategories = (allSubcategories || []).filter((sub) => {
    const catName = sub.categories?.category_name || "";
    return normalizeSlug(catName) === targetSlug;
  });

  // Fetch all categories to find the correct display name
  const { data: categories } = await supabase
    .from("categories")
    .select("id, category_name");

  const matchedCategory = (categories || []).find(
    (c) => normalizeSlug(c.category_name) === targetSlug
  );

  const categoryTitle =
    matchedCategory?.category_name ||
    (displaySubcategories.length > 0
      ? displaySubcategories[0].categories?.category_name
      : categorySlug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()));

  return (
    <>
      <Header />
      <PublicSubcategoriesList
        subcategories={displaySubcategories}
        categoryTitle={categoryTitle}
        categorySlug={categorySlug}
      />
      <Footer />
    </>
  );
}
