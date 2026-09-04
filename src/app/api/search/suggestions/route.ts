import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseSearchTokens, calculateRelevanceScore } from "@/utils/searchEngine";

export interface SuggestionSubcategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  category_name: string;
  category_slug: string;
  score: number;
}

export interface SuggestionService {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  image_url?: string | null;
  status?: string;
  icon_name: string;
  category_name: string;
  category_slug: string;
  subcategory_name: string;
  subcategory_id: string;
  score: number;
}

interface RawSubcategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  categories: {
    category_name: string;
  } | null;
}

interface RawService {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  image_url?: string | null;
  poster_url?: string | null;
  status?: string;
  subcategory_id: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    } | null;
  } | null;
}

const getSlug = (name: string) =>
  name.toLowerCase().replace(/[,\s]+/g, "-").replace(/&/g, "and");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ subcategories: [], services: [] });
  }

  const supabase = await createClient();
  const parsed = parseSearchTokens(q);
  const { normalizedQuery, shortTokens, longTokens, expandedTerms } = parsed;

  // Build targeted search filters
  const serviceFilterParts: string[] = [
    `title.ilike.%${normalizedQuery}%`,
    `title.ilike.${normalizedQuery}%`,
  ];

  const subcategoryFilterParts: string[] = [
    `subcategory_name.ilike.%${normalizedQuery}%`,
    `subcategory_name.ilike.${normalizedQuery}%`,
  ];

  // Acronym & Short Token Filters (word-level matching only)
  for (const st of shortTokens) {
    serviceFilterParts.push(`title.ilike.${st}%`);
    serviceFilterParts.push(`title.ilike.% ${st}%`);
    subcategoryFilterParts.push(`subcategory_name.ilike.${st}%`);
    subcategoryFilterParts.push(`subcategory_name.ilike.% ${st}%`);
  }

  // Long Tokens & Synonyms
  for (const lt of longTokens) {
    serviceFilterParts.push(`title.ilike.%${lt}%`);
    subcategoryFilterParts.push(`subcategory_name.ilike.%${lt}%`);
  }

  for (const term of expandedTerms.slice(0, 5)) {
    if (term.length > 3) {
      serviceFilterParts.push(`title.ilike.%${term}%`);
      subcategoryFilterParts.push(`subcategory_name.ilike.%${term}%`);
    }
  }

  const serviceOrFilter = Array.from(new Set(serviceFilterParts)).join(",");
  const subcategoryOrFilter = Array.from(new Set(subcategoryFilterParts)).join(",");

  try {
    const [subcategoriesRes, servicesRes] = await Promise.all([
      supabase
        .from("subcategories")
        .select(`
          id,
          subcategory_name,
          icon_name,
          categories (
            category_name
          )
        `)
        .or(subcategoryOrFilter)
        .limit(15),

      supabase
        .from("services")
        .select(`
          id,
          title,
          description,
          base_price,
          original_price,
          image_url,
          poster_url,
          status,
          subcategory_id,
          subcategories (
            subcategory_name,
            icon_name,
            categories (
              category_name
            )
          )
        `)
        .eq("is_active", true)
        .in("status", ["published", "upcoming"])
        .or(serviceOrFilter)
        .limit(40),
    ]);

    // Rank Subcategories
    const rawSubcategories = (subcategoriesRes.data || []) as unknown as RawSubcategory[];
    const rankedSubcategories: SuggestionSubcategory[] = rawSubcategories
      .map((sub) => {
        const catName = sub.categories?.category_name || "Services";
        const score = calculateRelevanceScore(
          {
            title: sub.subcategory_name,
            subcategoryName: sub.subcategory_name,
            categoryName: catName,
          },
          parsed
        );

        return {
          id: sub.id,
          subcategory_name: sub.subcategory_name,
          icon_name: sub.icon_name || "sparkles",
          category_name: catName,
          category_slug: getSlug(catName),
          score,
        };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Rank Services
    const rawServices = (servicesRes.data || []) as unknown as RawService[];
    const rankedServices: SuggestionService[] = rawServices
      .map((srv) => {
        const catName = srv.subcategories?.categories?.category_name || "Services";
        const subName = srv.subcategories?.subcategory_name || "";
        const score = calculateRelevanceScore(
          {
            title: srv.title,
            description: srv.description,
            subcategoryName: subName,
            categoryName: catName,
          },
          parsed
        );

        return {
          id: srv.id,
          title: srv.title,
          base_price: srv.base_price,
          original_price: srv.original_price,
          image_url: srv.image_url || srv.poster_url,
          status: srv.status,
          icon_name: srv.subcategories?.icon_name || "sparkles",
          category_name: catName,
          category_slug: getSlug(catName),
          subcategory_name: subName,
          subcategory_id: srv.subcategory_id,
          score,
        };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return NextResponse.json({
      subcategories: rankedSubcategories,
      services: rankedServices,
    });
  } catch (error) {
    console.error("Search suggestions API error:", error);
    return NextResponse.json({ subcategories: [], services: [] }, { status: 500 });
  }
}
