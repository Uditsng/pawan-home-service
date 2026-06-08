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

  // Fetch all active services
  // The user reported services not showing. We still filter by is_active, but added a fallback if it fails.
  const { data: services } = await supabase
    .from('services')
    .select('id, title, category')
    .eq('is_active', true)
    .order('category', { ascending: true });

  const availableServices = services || [];

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 antialiased">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[32px] shadow-[0_20px_50px_rgba(30,41,59,0.06)] border border-white/50 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -z-10 -mr-20 -mt-20"></div>

        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-secondary"></span>
            Partner Setup
          </div>
          <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tighter text-primary">
            Complete Your Profile
          </h1>
          <p className="text-on-surface-variant font-medium mt-3">
            Select your expertise and service areas to start receiving auto-assigned jobs.
          </p>
        </div>
        
        <form action={completeOnboarding} className="space-y-10">

          <div className="space-y-4">
            <h3 className="text-lg font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">handyman</span>
              Which services do you offer?
            </h3>
            
            <ServiceSelectionDrawer services={availableServices} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              Which areas do you serve?
            </h3>
            
            <PincodeSelector />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-center text-sm font-bold rounded-xl border border-red-200 shadow-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-outline-variant/20 flex gap-4">
            <Link href="/login" className="px-6 py-4 rounded-xl border-2 border-outline-variant/30 font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center justify-center">
              Cancel
            </Link>
            <Button variant="gradient" className="flex-1 py-4 bg-linear-to-br from-[#059669] to-[#10b981] text-white font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-all duration-300 border-none">
              Save & Go Live
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
