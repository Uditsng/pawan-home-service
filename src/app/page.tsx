import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface ServiceWithSubcategory {
  id: string;
  title: string;
  base_price: number;
  duration_minutes: number;
  category?: string;
  subcategory_id: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    };
  } | null;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: popularServices } = await supabase
    .from('services')
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
    .eq('is_active', true)
    .limit(6) as { data: ServiceWithSubcategory[] | null };

  // Derive unique categories from relational data
  const categoryMap = new Map<string, { name: string; icon: string; slug: string }>();
  if (popularServices) {
    for (const s of popularServices) {
      const catName = s.subcategories?.categories?.category_name;
      if (catName && !categoryMap.has(catName)) {
        categoryMap.set(catName, {
          name: catName,
          icon: s.subcategories?.icon_name || 'home_repair_service',
          slug: catName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
        });
      }
    }
  }
  const uniqueCategories = Array.from(categoryMap.values());

  // Shared Glassmorphism styles
  const glassBg = "glass-panel";

  // 3D Hover Effect for Cards
  const card3DHover = "transition-all duration-500 hover:-translate-y-2 hover:shadow-ambient-hover hover:border-secondary/50 will-change-transform";

  return (
    <>      <Header />

      {/* Atmospheric Background Orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="animate-orb-float-1 absolute top-[-5%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
        <div className="animate-orb-float-2 absolute bottom-[10%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full bg-[radial-gradient(circle,#93c5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
      </div>

      <main className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl mx-auto flex flex-col gap-16 md:gap-24 pb-24 pt-6 md:pt-16 w-full overflow-hidden md:overflow-visible">

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

          {/* Interactive 3D Promo Banner */}
          <div className="flex-1 w-full hidden md:block relative perspective-[1000px]">
            <div className="relative rounded-[36px] overflow-hidden h-[360px] shadow-[0_20px_50px_rgba(30,41,59,0.15)] w-full group cursor-pointer transform-3d hover:rotate-y-2 hover:-rotate-x-2 transition-transform duration-700 ease-out">

              {/* Moving Background Gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-primary via-[#0f172a] to-[#0d3342] bg-size-[200%_200%] animate-[gradient_8s_ease_infinite]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(42,245,152,0.25)_0%,transparent_60%)]"></div>

              {/* Rotating 3D Rings */}
              <div className="absolute w-[350px] h-[350px] rounded-full border border-secondary/20 -right-20 -top-20 animate-spin-slow"></div>
              <div className="absolute w-[250px] h-[250px] rounded-full border-2 border-dashed border-secondary/10 right-0 -top-5 animate-[spin-slow_15s_linear_infinite_reverse]"></div>

              {/* Floating Element inside Card */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-90 animate-float-1 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">🏠</div>

              <div className="relative z-10 p-10 h-full flex flex-col justify-center items-start transform translate-z-[30px]">
                <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-5 shadow-[0_0_15px_rgba(42,245,152,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                  Limited Offer
                </div>
                <h3 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3 drop-shadow-md">First Clean<br />Free on Us</h3>
                <p className="text-white/70 text-sm font-medium mb-8 max-w-[200px]">New users get one deep clean at absolutely no charge.</p>
                <button className="bg-linear-to-r from-secondary to-[#08e07a] text-primary px-6 py-3 rounded-full text-sm font-extrabold hover:scale-105 shadow-[0_10px_20px_rgba(42,245,152,0.3)] active:scale-95 transition-all">
                  Claim Now →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Browse Services (Categories) */}
        {uniqueCategories.length > 0 && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">Browse Services</h2>
              <Link href="/services" className="text-xs sm:text-sm font-bold text-secondary hover:underline flex items-center gap-1">
                See all <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            {/* Snap Scrolling for Mobile */}
            <div className="flex gap-1 sm:gap-1 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 mx-1 px-2 sm:mx-0 sm:px-0">
              {uniqueCategories.map((cat, idx) => (
                <Link
                  key={idx}
                  href={`/services/${cat.slug}`}
                  className={`snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full group ${glassBg} hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_8px_20px_rgba(42,245,152,0.15)] transition-all`}
                >
                  <span className="material-symbols-outlined text-[#059669] group-hover:text-secondary group-hover:scale-110 transition-all text-sm sm:text-base">{cat.icon}</span>
                  <span className="text-[13px] sm:text-sm font-bold text-primary capitalize whitespace-nowrap">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Popular Services (3D Cards) */}
        {popularServices && popularServices.length > 0 && (
          <section className="w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary mb-4 md:mb-6">Popular Near You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {popularServices.map((service, idx) => {
                const iconName = service.subcategories?.icon_name || 'home_repair_service';
                const catSlug = (service.subcategories?.categories?.category_name || service.category || 'services')
                  .toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

                return (
                <Link
                  key={service.id}
                  href={`/services/${catSlug}/${service.id}`}
                  className={`relative p-5 sm:p-6 rounded-[24px] sm:rounded-[28px] overflow-hidden block ${glassBg} ${card3DHover} ${idx === 0 ? 'sm:col-span-2 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6' : 'flex flex-col'}`}
                >
                  {/* Subtle 3D Light Reflection */}
                  <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="absolute top-4 right-4 bg-secondary/15 border border-secondary/30 rounded-full px-2.5 py-1 text-[10px] font-bold text-success uppercase tracking-wider z-10 shadow-sm">
                    {idx === 0 ? '⭐ Top Pick' : 'Popular'}
                  </div>

                  <div className={`rounded-[20px] bg-green-500/10 border border-secondary/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 z-10 relative ${idx === 0 ? 'w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl' : 'w-14 h-14 mb-4 text-2xl'}`}>
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{iconName}</span>
                  </div>

                  <div className={`relative z-10 flex flex-col flex-1 w-full ${idx === 0 ? '' : 'mt-auto'}`}>
                    <h4 className={`font-bold text-primary mb-1 leading-tight ${idx === 0 ? 'text-lg sm:text-xl md:text-2xl' : 'text-[17px] sm:text-lg'}`}>
                      {service.title}
                    </h4>
                    <p className="text-[13px] text-on-surface-variant font-medium mb-4">
                      {service.duration_minutes} mins · Professional Service
                    </p>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] text-on-surface-variant font-semibold uppercase">at just</span>
                        <span className="text-lg sm:text-xl font-extrabold text-primary">₹{service.base_price}</span>
                      </div>
                      <button className="bg-primary text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold hover:bg-secondary hover:text-primary active:scale-95 shadow-md transition-all duration-200 flex items-center gap-1">
                        Book <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>
          </section>
        )}

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
              Earn with us as a <br className="hidden sm:block" /><span className="text-secondary drop-shadow-[0_0_15px_rgba(42,245,152,0.4)]">Service Partner</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-white/70 mb-6 sm:mb-8 max-w-md font-medium px-4">
              Access a steady stream of high-quality bookings, flexible schedules, and professional training.
            </p>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[15px] font-extrabold text-primary hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(42,245,152,0.5)] active:scale-95 transition-all w-full sm:w-auto">
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Join as Partner Now
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}