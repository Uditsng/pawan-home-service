import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import ServiceSelectionDrawer from "@/components/ServiceSelectionDrawer";
import PincodeSelector from "@/components/PincodeSelector";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all active services with subcategories and categories
  const { data: services } = await supabase
    .from('services')
    .select(`
      id,
      title,
      image_url,
      subcategory_id,
      subcategories (
        id,
        subcategory_name,
        icon_name,
        categories (
          id,
          category_name
        )
      )
    `)
    .eq('is_active', true)
    .eq('status', 'published');

  interface RawService {
    id: string;
    title: string;
    image_url: string | null;
    subcategories: {
      subcategory_name: string;
      icon_name: string;
      categories: {
        category_name: string;
      } | null;
    } | null;
  }

  const rawServices = (services || []) as unknown as RawService[];

  const availableServices = rawServices.map((s) => ({
    id: s.id,
    title: s.title,
    imageUrl: s.image_url,
    subcategoryName: s.subcategories?.subcategory_name || "General",
    categoryName: s.subcategories?.categories?.category_name || "Other",
    iconName: s.subcategories?.icon_name || "sparkles",
  }));

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 antialiased">
      <div className="w-full max-w-3xl bg-surface-container-lowest p-6 sm:p-10 lg:p-12 rounded-3xl shadow-xs border border-outline-variant/15 relative overflow-hidden my-6">

        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="mb-8 sm:mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/15 border border-secondary/30 rounded-full px-3 py-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Partner Onboarding Setup
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-black tracking-tight text-on-surface">
            Complete Your Partner Profile
          </h1>
          <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-2 max-w-lg mx-auto leading-relaxed">
            Select your service expertise and pincode coverage to activate auto-assignment on your profile.
          </p>
        </div>

        <form action={completeOnboarding} className="space-y-8">

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">handyman</span>
              Which services do you offer?
            </h3>

            <ServiceSelectionDrawer services={availableServices} />
          </div>

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              Which pincode areas do you serve?
            </h3>

            <PincodeSelector />
          </div>

          {error && (
            <div className="p-4 bg-error/10 text-error text-center text-xs sm:text-sm font-bold rounded-2xl border border-error/20">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-outline-variant/15 flex gap-4">
            <Link href="/login" className="px-6 py-3.5 rounded-2xl border border-outline-variant/20 font-bold text-xs sm:text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center justify-center">
              Cancel
            </Link>
            <Button variant="gradient" className="flex-1 py-3.5 bg-primary text-on-primary font-extrabold text-xs sm:text-sm rounded-2xl hover:bg-primary/95 shadow-sm transition-all border-none cursor-pointer">
              Save & Go Live
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
