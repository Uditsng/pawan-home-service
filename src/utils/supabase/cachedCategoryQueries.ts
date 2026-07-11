import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/client";
import { TAG_CATEGORIES } from "./cacheTags";

export interface Category {
  id: string;
  category_name: string;
}

/**
 * Fetches all categories cached for 1 hour.
 * Invalidated by TAG_CATEGORIES when updates are made in the admin portal.
 */
export const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, category_name")
      .order("category_name", { ascending: true });

    if (error) {
      console.error("[cachedCategories] Database fetch failed:", error.message);
      throw error;
    }

    return (data || []) as Category[];
  },
  ["categories-list"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: [TAG_CATEGORIES],
  }
);
