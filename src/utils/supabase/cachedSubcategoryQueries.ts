import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/client";
import { TAG_SUBCATEGORIES } from "./cacheTags";

export interface SubcategoryWithCategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    id: string;
    category_name: string;
  } | null;
}

/**
 * Fetches all subcategories with parent categories, cached for 1 hour.
 * Invalidated by TAG_SUBCATEGORIES when subcategories are updated by admins.
 */
export const getCachedAllSubcategories = unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
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
      .order("subcategory_name", { ascending: true });

    if (error) {
      console.error("[cachedSubcategories] Database fetch failed:", error.message);
      throw error;
    }

    return (data || []) as SubcategoryWithCategory[];
  },
  ["subcategories-all-list"],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: [TAG_SUBCATEGORIES],
  }
);
