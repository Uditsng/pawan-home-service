import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all active services
  const { data: services } = await supabase
    .from('services')
    .select('id, title, category, icon')
    .eq('is_active', true)
    .order('category', { ascending: true });

  const getServiceIcon = (category: string, iconStr: string | null) => {
    if (iconStr) return <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-2xl mb-2">{iconStr}</span>;
    switch (category) {
      case 'cleaning': return <span className="text-2xl mb-2 block">🧹</span>;
      case 'plumbing': return <span className="text-2xl mb-2 block">🔧</span>;
      case 'electrician': return <span className="text-2xl mb-2 block">⚡</span>;
      case 'pest_control': return <span className="text-2xl mb-2 block">🐛</span>;
      default: return <span className="material-symbols-outlined text-[#059669] drop-shadow-sm text-2xl mb-2">home_repair_service</span>;
    }
  };

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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {services?.map((service) => (
                <label key={service.id} className="cursor-pointer group">
                  <input type="checkbox" name="services" value={service.id} className="peer sr-only" />
                  <div className="p-4 border-2 border-outline-variant/30 rounded-2xl bg-surface-container-lowest peer-checked:border-secondary peer-checked:bg-secondary/10 peer-checked:shadow-[0_8px_20px_rgba(42,245,152,0.15)] transition-all duration-300 hover:border-secondary/50 hover:bg-surface-container-low flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {getServiceIcon(service.category, service.icon)}
                    </div>
                    <span className="font-bold text-sm text-on-surface leading-tight">
                      {service.title}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-headline font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">location_on</span>
              Which areas do you serve?
            </h3>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant/50 group-focus-within:text-secondary transition-colors">pin_drop</span>
              </div>
              <input
                type="text"
                placeholder="Enter pincodes separated by comma: 226001, 226002"
                name="service_pincodes"
                className="w-full pl-11 pr-4 py-4 bg-surface-container-lowest rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border-2 border-outline-variant/30 focus:border-secondary/50 shadow-sm placeholder:text-[#94a3b8]"
                required
              />
            </div>
            <p className="text-xs text-on-surface-variant font-medium pl-1">
              Example: 226001, 226002, 226010. You will only be assigned jobs in these areas.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-center text-sm font-bold rounded-xl border border-red-200 shadow-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-outline-variant/20 flex gap-4">
            <Link href="/login" className="px-6 py-4 rounded-xl border-2 border-outline-variant/30 font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">
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
