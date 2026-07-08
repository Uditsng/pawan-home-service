import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import DashboardCarousel from "./DashboardCarousel";
import DashboardGridClient from "./DashboardGridClient";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  category?: string;
  subcategory_id: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      id: string;
      category_name: string;
    } | null;
  } | null;
}

interface Category {
  id: string;
  category_name: string;
}

export default async function CustomerDashboard() {
  const supabase = await createClient();

  // Parallelize independent queries for ~400ms savings
  const [servicesResult, categoriesResult] = await Promise.all([
    // Fetch services with only needed columns (no page_content JSONB)
    supabase
      .from('services')
      .select(`
        id, title, base_price, original_price, subcategory_id,
        subcategories (
          subcategory_name,
          icon_name,
          categories (
            id,
            category_name
          )
        )
      `)
      .eq('is_active', true)
      .eq('status', 'published')
      .order('title', { ascending: true }),
    // Fetch all categories
    supabase
      .from('categories')
      .select('id, category_name')
      .order('category_name', { ascending: true }),
  ]);

  const availableServices = (servicesResult.data || []) as unknown as ServiceWithSubcategory[];
  const categories = (categoriesResult.data || []) as Category[];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">

        {/* Promotional Carousel Banner */}
        <DashboardCarousel />

        {/* Service Categories Bento Grid Client Component */}
        <DashboardGridClient categories={categories} availableServices={availableServices} />

        {/* Reliable & Trustworthy Section */}
        <section className="mb-8 md:mb-12 px-1">
          <div className="mb-6">
            <h3 className="font-headline text-lg md:text-xl font-bold text-on-surface">
              Reliable & Trustworthy
            </h3>
            <p className="text-on-surface-variant text-xs md:text-sm mt-0.5">
              Ensuring integrity through verified standards
            </p>
          </div>

          {/* 3 Columns of Pros */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/assets/img_pro_worker_1773412996892.png"
                alt="Verified Professionals"
                width={300}
                height={300}
                className="w-full aspect-square object-cover rounded-2xl shadow-xs"
              />
              <p className="text-[11px] md:text-sm font-semibold text-on-surface mt-2.5 max-w-[150px] md:max-w-[180px] leading-tight">
                Verified Professionals You Can Trust
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Image
                src="/assets/img_guarantee_1773412978355.png"
                alt="Well Trained"
                width={300}
                height={300}
                className="w-full aspect-square object-cover rounded-2xl shadow-xs"
              />
              <p className="text-[11px] md:text-sm font-semibold text-on-surface mt-2.5 max-w-[150px] md:max-w-[180px] leading-tight">
                Well Trained to deliver great service
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Image
                src="/assets/img_support_1773413014535.png"
                alt="Safe & Reliable"
                width={300}
                height={300}
                className="w-full aspect-square object-cover rounded-2xl shadow-xs"
              />
              <p className="text-[11px] md:text-sm font-semibold text-on-surface mt-2.5 max-w-[150px] md:max-w-[180px] leading-tight">
                Safe, reliable, and consistent every single time
              </p>
            </div>
          </div>

          {/* Clean Home, Zero Stress Tagline */}
          <div className="my-12 md:my-16 flex flex-col items-center text-center">
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="text-[#059669]">Clean Home.</span>
              <br />
              <span className="text-on-surface">Zero Stress.</span>
            </h2>
            <h1 className="font-headline text-4xl md:text-6xl font-black text-[#059669] mt-8 tracking-tight leading-none">
              PHS
            </h1>
            <p className="text-on-surface-variant text-xs md:text-sm font-semibold mt-2">
              Trusted by 450k+ families
            </p>
          </div>

          {/* Footer Pills Container */}
          <div className="flex items-center justify-center gap-4 bg-surface-container-low/75 border border-outline-variant/10 py-3 px-5 rounded-2xl max-w-xs md:max-w-sm mx-auto shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <svg className="w-4 h-4 text-[#059669]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 11L11 13L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified
            </div>
            <div className="h-4 w-px bg-outline-variant/30" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <svg className="w-4 h-4 text-[#059669]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 18V5a2 2 0 014 0v13" fill="currentColor" fillOpacity="0.2" />
                <path d="M6 18v-7a2 2 0 014 0v7" />
                <path d="M14 18v-9a2 2 0 014 0v9" />
                <path d="M18 18v-5a2 2 0 014 0v5" />
                <path d="M2 18H22a2 2 0 01-2 2H4a2 2 0 01-2-2Z" />
              </svg>
              Trained
            </div>
            <div className="h-4 w-px bg-outline-variant/30" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <svg className="w-4 h-4 text-[#059669]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
                <path d="M12 6V12L15 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Reliable
            </div>
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}

