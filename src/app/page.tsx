import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import HeroConversationalCard from "@/components/HeroConversationalCard";
import LandingGridClient from "./LandingGridClient";


export const revalidate = 300; // ISR: revalidate every 5 minutes

// Centralized role → dashboard mapping (must match proxy.ts)
const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin/dashboard',
  partner: '/partner/dashboard',
  customer: '/customer/dashboard',
};

interface ServiceWithSubcategory {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  duration_minutes?: number;
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

export default async function Home() {
  const supabase = await createClient();

  // Defense-in-depth: redirect authenticated users to their dashboard
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const target = ROLE_DASHBOARDS[profile?.role ?? 'customer'] ?? '/customer/dashboard';
    redirect(target);
  }

  // Parallelize independent queries for faster page loads
  const [servicesResult, categoriesResult] = await Promise.all([
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
      .order('title', { ascending: true }),
    supabase
      .from('categories')
      .select('id, category_name')
      .order('category_name', { ascending: true }),
  ]);

  const availableServices = (servicesResult.data || []) as unknown as ServiceWithSubcategory[];
  const categories = (categoriesResult.data || []) as Category[];

  // Shared Glassmorphism styles
  const glassBg = "glass-panel";

  return (
    <>

      <Header />

      {/* Atmospheric Background Orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="animate-orb-float-1 absolute top-[-5%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
        <div className="animate-orb-float-2 absolute bottom-[10%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full bg-[radial-gradient(circle,#93c5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
      </div>

      <main className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl mx-auto flex flex-col gap-8 md:gap-24 pb-16 pt-6 md:pt-16 w-full overflow-hidden md:overflow-visible">

        {/* Section 1: Hero */}
        <section className="relative text-center md:text-left flex flex-col md:flex-row items-center gap-10 lg:gap-16 w-full pt-4 md:pt-0">

          {/* Floating 3D Elements (Hidden on very small screens to avoid clutter) */}
          <div className="hidden sm:flex absolute -left-4 top-10 animate-float-1 text-[4rem] z-20">🧽</div>
          <div className="hidden sm:flex absolute right-1/2 top-4 animate-float-2 text-[3rem] z-20">✨</div>
          <div className="hidden lg:flex absolute left-1/3 bottom-0 animate-float-1 text-[3.5rem] z-20">🔧</div>

          <div className="flex-1 w-full relative z-30">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-full mb-6 shadow-sm mx-auto md:mx-0">
              <span className="flex h-2.5 w-2.5 rounded-full bg-secondary shadow-secondary animate-pulse"></span>
              <span className="text-[11px] sm:text-xs md:text-sm font-bold text-primary">50k+ Verified Pros • Active Now</span>
            </div>

            <h1 className="text-[2.5rem] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-primary mb-4 md:mb-6">
              Home Services,<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-secondary to-teal-500 drop-shadow-sm">Reimagined.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-on-surface-variant mb-8 max-w-xl mx-auto md:mx-0 font-medium leading-relaxed px-2 md:px-0">
              Experience the sanctuary of a perfectly managed home. From clinical deep cleaning to expert repairs, we bring the best to your space.
            </p>

          </div>

          {/* Interactive 3D Conversational Promo Banner */}
          <div className="flex-1 w-full hidden md:block relative perspective-[1000px]">
            <HeroConversationalCard />
          </div>
        </section>

        {/* Section 3: Popular Services Categories Client Component */}
        <LandingGridClient categories={categories} availableServices={availableServices} />

        {/* Section 4: How It Works (Interactive Steps) */}
        <section className="w-full">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary mb-4 md:mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {[
              { num: "1", title: "Pick a Service", desc: "Browse and choose what you need." },
              { num: "2", title: "Choose a Slot", desc: "Schedule at your convenience." },
              { num: "3", title: "We Show Up", desc: "Vetted pros arrive on time." },
            ].map((step, idx) => (
              <div key={idx} className={`flex items-center gap-4 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] group ${glassBg} hover:bg-white/90 hover:scale-[1.02] transition-all cursor-default`}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 bg-linear-to-br from-secondary to-[#08e07a] flex items-center justify-center text-base sm:text-lg font-extrabold text-primary shadow-[0_4px_10px_rgba(42,245,152,0.4)] group-hover:rotate-12 transition-transform">
                  {step.num}
                </div>
                <div>
                  <h4 className="text-[15px] sm:text-base font-bold text-primary">{step.title}</h4>
                  <p className="text-[12px] sm:text-xs text-[#64748B] font-medium mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Trust Stats Strip (Responsive Flow) */}
        <section className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 sm:gap-6 p-5 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] w-full ${glassBg} shadow-inner`}>
          <div className="text-center flex-1 min-w-[100px]">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">50<span className="text-secondary">k+</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Verified Pros</div>
          </div>
          <div className="w-px h-10 bg-primary/10 hidden sm:block"></div>
          <div className="text-center flex-1 min-w-[100px]">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">4.9<span className="text-secondary">★</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Avg Rating</div>
          </div>
          <div className="w-px h-10 bg-primary/10 hidden sm:block"></div>
          <div className="text-center flex-1 min-w-full sm:min-w-[100px] mt-2 sm:mt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">100<span className="text-secondary">%</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Pricing Clarity</div>
          </div>
        </section>

        {/* Section 7: Modern Glowing CTA */}
        <section className="relative rounded-[24px] sm:rounded-[36px] overflow-hidden p-8 sm:p-10 md:p-16 bg-primary text-center shadow-[0_20px_50px_rgba(30,41,59,0.3)] w-full perspective-1000">
          {/* Animated 3D Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(42,245,152,0.25)_0%,transparent_70%)] animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center transform-3d hover:translate-z-[10px] transition-transform duration-500">
            <div className="text-4xl sm:text-5xl mb-4 animate-float-1">✨</div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight tracking-tight">
              Trusted Home Services <br className="hidden sm:block" /><span className="text-secondary">At Your Doorstep</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-white/70 mb-6 sm:mb-8 max-w-md font-medium px-4">
              Book cleaning, pest control, repairs, maintenance, and more from verified professionals in just a few clicks.
            </p>
            <Link href="/services" className="inline-flex items-center justify-center gap-2 bg-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[15px] font-extrabold text-primary hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(42,245,152,0.5)] active:scale-95 transition-all w-full sm:w-auto">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              Book a Service Now
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}