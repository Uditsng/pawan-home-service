import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicSubcategoriesList from "./PublicSubcategoriesList";
import { getCachedCategories } from "@/utils/supabase/cachedCategoryQueries";
import { getCachedAllSubcategories } from "@/utils/supabase/cachedSubcategoryQueries";

export default async function PublicCategorySubcategoryListingPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams.category;

  // Fetch subcategories with their parent categories
  const allSubcategories = await getCachedAllSubcategories();

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
  const categories = await getCachedCategories();

  const matchedCategory = (categories || []).find(
    (c) => normalizeSlug(c.category_name) === targetSlug
  );

  const categoryTitle =
    matchedCategory?.category_name ||
    (displaySubcategories.length > 0
      ? (displaySubcategories[0].categories?.category_name || "")
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
