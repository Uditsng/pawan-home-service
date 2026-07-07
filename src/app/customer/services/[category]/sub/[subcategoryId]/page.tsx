import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import AddToCartButton from "@/components/AddToCartButton";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  description: string;
  base_price: number;
  original_price?: number | null;
  is_active: boolean;
  subcategory_id: string;
  category?: string;
  pricing_model?: string | null;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function SubcategoryServiceListingPage({
  params,
}: {
  params: Promise<{ category: string; subcategoryId: string }>;
}) {
  const resolvedParams = await params;
  const { category: categorySlug, subcategoryId } = resolvedParams;

  const supabase = await createClient();

  // Fetch the subcategory details to resolve title and icon
  const { data: subcategory } = await supabase
    .from("subcategories")
    .select(`
      subcategory_name,
      icon_name,
      categories (
        category_name
      )
    `)
    .eq("id", subcategoryId)
    .single();

  // Fetch services belonging to this subcategory
  const { data: displayServices } = await supabase
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
    .eq("subcategory_id", subcategoryId)
    .eq("is_active", true)
    .order("title", { ascending: true }) as { data: ServiceWithSubcategory[] | null };

  const subcategoryTitle = subcategory?.subcategory_name || "Services";

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Subcategory Title Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-2">
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          {/* Back button points back to Subcategories list page */}
          <Link href={`/customer/services/${categorySlug}`} className="text-on-surface hover:opacity-80 transition-all">
            <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-primary font-black text-lg md:text-xl tracking-tight font-headline">
            {subcategoryTitle}
          </h1>
        </div>
        <p className="text-on-surface-variant text-xs md:text-sm pl-9">
          {(displayServices || []).length} service{(displayServices || []).length !== 1 ? "s" : ""} available
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-40">
        {/* Services Grid (keeping same layout style as original dashboard) */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {(displayServices || []).map((service) => {
            const iconName = service.subcategories?.icon_name || "sparkles";

            return (
              <div
                key={service.id}
                className="relative group bg-surface-container-low p-3 md:p-4 rounded-xl flex flex-col items-center justify-between text-center border border-outline-variant/10 shadow-xs transition-all aspect-[2/3] w-full"
              >
                {/* z-0 absolute Link covering the card */}
                <Link
                  href={`/customer/services/${categorySlug}/${service.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                />

                {/* z-10 pointer-events-none Card Content */}
                <div className="z-10 pointer-events-none flex flex-col items-center justify-between h-full w-full py-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <ServiceIconComponent iconName={iconName} className="w-5 h-5 text-emerald-600 drop-shadow-sm" />
                  </div>
                  <span className="font-headline font-bold text-sm md:text-base text-on-surface line-clamp-2 leading-tight grow flex items-center justify-center px-1">
                    {service.title}
                  </span>
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <span className="text-[15px] md:text-[17px] text-primary font-black tracking-tight leading-none">
                      ₹{service.base_price}
                    </span>
                    {service.original_price && (
                      <span className="text-[11px] md:text-xs text-on-surface-variant/60 line-through font-medium">
                        ₹{service.original_price}
                      </span>
                    )}
                  </div>
                </div>

                {/* z-20 clickable Add to Cart button */}
                <div className="absolute top-1.5 right-1.5 z-20">
                  <AddToCartButton
                    item={{
                      serviceId: service.id,
                      title: service.title,
                      iconName: iconName,
                      basePrice: service.base_price,
                      subcategoryName: service.subcategories?.subcategory_name || "Service",
                      categorySlug: categorySlug,
                    }}
                    compact={true}
                  />
                </div>
              </div>
            );
          })}

          {(displayServices || []).length === 0 && (
            <div className="col-span-3 md:col-span-4 lg:col-span-5 text-center py-8 text-on-surface-variant text-sm">
              No active services available in this subcategory right now.
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
