import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";

export default async function CategoryServiceListingPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const categoryTitle = resolvedParams.category ? resolvedParams.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase()) : "AC Repair & Service";

  const supabase = await createClient();
  
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("category", resolvedParams.category.toLowerCase())
    .eq("is_active", true);

  const { data: fallbackServices } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .limit(4);

  const displayServices = services && services.length > 0 ? services : fallbackServices || [];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-[#f7f9fb]/90 backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/" className="text-on-surface hover:opacity-80 transition-all">
              <span className="material-symbols-outlined text-[22px] md:text-[24px]">arrow_back</span>
            </Link>
            <h1 className="text-teal-800 font-black text-lg md:text-xl tracking-tight">{categoryTitle}</h1>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="material-symbols-outlined text-teal-600 text-[18px] md:text-[24px]">location_on</span>
            <span className="font-manrope text-xs md:text-sm font-bold tracking-tight text-teal-600">Roorkee, UK</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-40">
        {/* Filter Chips Section */}
        <section className="mb-6 md:mb-8 overflow-x-auto">
          <div className="flex gap-2 md:gap-3 pb-2 no-scrollbar">
            <button className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-surface-container-lowest rounded-full text-on-surface shadow-sm hover:bg-surface-container transition-colors font-medium border border-outline-variant/20 text-xs md:text-sm">
              <span className="material-symbols-outlined text-base md:text-lg">payments</span>
              Price
            </button>
            <button className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-surface-container-lowest rounded-full text-on-surface shadow-sm hover:bg-surface-container transition-colors font-medium border border-outline-variant/20 text-xs md:text-sm">
              <span className="material-symbols-outlined text-base md:text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              Rating
            </button>
            <button className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-surface-container-lowest rounded-full text-on-surface shadow-sm hover:bg-surface-container transition-colors font-medium border border-outline-variant/20 text-xs md:text-sm">
              <span className="material-symbols-outlined text-base md:text-lg">bolt</span>
              Fastest
            </button>
          </div>
        </section>

        {/* Dynamic Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {displayServices.map((service) => (
            <article key={service.id} className="group bg-surface-container-lowest rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-40 md:h-auto overflow-hidden bg-slate-100 flex items-center justify-center p-4 relative">
                 <span className="material-symbols-outlined text-5xl md:text-6xl text-slate-300">home_repair_service</span>
              </div>
              <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg md:text-xl font-bold font-headline text-on-surface tracking-tight">{service.title}</h2>
                    <span className="text-secondary font-bold text-lg md:text-xl">₹{service.base_price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs md:text-sm mb-3 md:mb-4">
                    <span className="material-symbols-outlined text-sm md:text-base">info</span>
                    Service Package
                  </div>
                  <div className="space-y-2 mb-4 md:mb-6">
                    <p className="text-xs md:text-[13px] font-medium text-on-surface-variant/80 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-3">
                  <Link href={`/services/${service.category}/${service.id}`} className="flex-1 text-center py-2.5 md:py-3 text-xs md:text-sm font-semibold text-primary border border-primary/20 rounded-lg md:rounded-xl hover:bg-primary/5 transition-colors">
                    View Details
                  </Link>
                  <button className="flex-1 py-2.5 md:py-3 text-xs md:text-sm font-semibold text-on-primary bg-primary-gradient rounded-lg md:rounded-xl shadow-lg shadow-primary/10 hover:opacity-90 transition-all">
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
          
          {displayServices.length === 0 && (
             <div className="col-span-full py-10 md:py-12 text-center text-slate-500">
                <span className="material-symbols-outlined text-3xl md:text-4xl mb-4 opacity-50">search_off</span>
                <p className="font-semibold text-sm md:text-base">No services found in this category.</p>
             </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
