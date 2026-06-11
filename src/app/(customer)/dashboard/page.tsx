import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import DashboardCarousel from "./DashboardCarousel";
import CustomerHeader from "@/components/CustomerHeader";

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
      category_name: string;
    };
  } | null;
}

interface BookingWithService {
  id: string;
  status: string;
  created_at: string;
  city: string;
  total_amount: number;
  arrival_otp?: string | null;
  arrival_otp_verified?: boolean;
  completion_otp?: string | null;
  completion_otp_verified?: boolean;
  services: {
    title: string;
    category?: string;
  } | null;
}

export default async function CustomerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallelize independent queries for ~400ms savings
  const [servicesResult, bookingsResult] = await Promise.all([
    // Fetch services with only needed columns (no page_content JSONB)
    supabase
      .from('services')
      .select(`
        id, title, base_price, original_price, subcategory_id,
        subcategories (
          subcategory_name,
          icon_name,
          categories (
            category_name
          )
        )
      `)
      .eq('is_active', true)
      .order('title', { ascending: true }),
    // Fetch recent bookings (only if user is authenticated)
    user
      ? supabase
        .from('bookings')
        .select('id, status, created_at, city, total_amount, arrival_otp, arrival_otp_verified, completion_otp, completion_otp_verified, services:service_id(title, category)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      : Promise.resolve({ data: null }),
  ]);

  const availableServices = (servicesResult.data || []) as unknown as ServiceWithSubcategory[];
  const activeBookings = (bookingsResult.data || []) as unknown as BookingWithService[];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">

        {/* Promotional Carousel Banner */}
        <DashboardCarousel />

        {/* Service Categories Bento Grid */}
        <section className="mb-8 md:mb-12">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {availableServices.map((service) => {
              // Use the dynamic icon_name from the DB subcategory relation
              const iconName = service.subcategories?.icon_name || "handyman";
              // Build category slug from relational data
              const catSlug = (service.subcategories?.categories?.category_name || service.category || "services")
                .toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");

              return (
                <Link href={`/services/${catSlug}/${service.id}`} key={service.id} className="bg-surface-container-low p-3 md:p-5 rounded-xl flex flex-col items-center justify-center text-center hover:bg-surface-container-high transition-colors group cursor-pointer border border-outline-variant/10 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 mb-2 md:mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{iconName}</span>
                  </div>
                  <span className="font-headline font-bold text-xs md:text-sm text-on-surface line-clamp-2 leading-tight">{service.title}</span>
                  <div className="flex items-center gap-1.5 mt-1 md:mt-1.5">
                    {service.original_price && (
                      <span className="text-[9px] md:text-[10px] text-on-surface-variant/50 line-through">₹{service.original_price}</span>
                    )}
                    <span className="text-[10px] md:text-[11px] text-primary font-bold tracking-tight">₹{service.base_price}</span>
                  </div>
                </Link>
              );
            })}

            {availableServices.length === 0 && (
              <div className="col-span-3 text-center py-8 text-on-surface-variant text-sm">
                No active services available right now.
              </div>
            )}
          </div>
        </section>

        {/* Active/Recent Bookings Block */}
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-4 md:mb-6">
            <div>
              <h3 className="font-headline text-lg md:text-xl font-extrabold text-on-surface">Your Recent Bookings</h3>
              <p className="text-on-surface-variant text-xs md:text-sm">Track your live services</p>
            </div>
            {activeBookings.length > 0 && <Link href="/bookings" className="text-primary text-xs md:text-sm font-bold">View History</Link>}
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
            {activeBookings.length === 0 ? (
              <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-xl text-center border border-outline-variant/10 shadow-sm">
                <span className="material-symbols-outlined text-3xl md:text-4xl text-outline-variant mb-2">event_busy</span>
                <p className="text-on-surface-variant font-medium text-xs md:text-sm">You have no recent bookings.</p>
                <Link href="/services" className="text-xs text-primary mt-2 font-bold cursor-pointer hover:underline inline-block">Explore Services</Link>
              </div>
            ) : (
              activeBookings.map((b) => (
                <div key={b.id} className="min-w-[250px] md:min-w-[280px] bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] border border-outline-variant/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-2.5 py-1 rounded-md ${b.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                      b.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                      {b.status}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant">
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-headline font-bold text-base md:text-lg text-on-surface leading-tight mb-1">{b.services?.title}</h4>
                  <p className="text-[10px] md:text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] md:text-[13px]">location_city</span>
                    {b.city}
                  </p>

                  {/* Active OTP Display */}
                  {b.status === 'otp_pending' && (
                    <div className="mb-3 p-2.5 bg-[#059669]/10 border border-[#059669]/25 rounded-[12px] flex flex-col items-center justify-center">
                      <p className="text-[9px] font-bold text-[#059669] uppercase tracking-wider leading-none">
                        {!b.arrival_otp_verified ? "Arrival OTP to Start" : "Completion OTP to Close"}
                      </p>
                      <p className="text-base font-extrabold tracking-widest text-[#059669] mt-1">
                        {!b.arrival_otp_verified ? b.arrival_otp : b.completion_otp}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-surface-variant/30">
                    <span className="font-black text-base md:text-lg text-primary">₹{b.total_amount}</span>
                    <Link href={`/bookings/${b.id}/tracking`} className="text-[10px] md:text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                      Details <span className="material-symbols-outlined text-[12px] md:text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
