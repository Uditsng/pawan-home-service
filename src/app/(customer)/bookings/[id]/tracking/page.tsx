import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CustomerHeader from "@/components/CustomerHeader";
import BottomNav from "@/components/BottomNav";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Professional | PHS Company",
  description: "Track your assigned professional in real-time.",
};

interface SubcategoryInfo {
  subcategory_name: string;
  icon_name: string;
}

interface ServiceInfo {
  title: string;
  category: string;
  subcategories: SubcategoryInfo | null;
}

interface PartnerInfo {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating_avg: number | null;
  jobs_accepted_count: number | null;
}

interface BookingDetails {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  total_amount: number;
  address: string | null;
  city: string | null;
  services: ServiceInfo | null;
  partner: PartnerInfo | null;
}

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingTrackingPage({ params }: TrackingPageProps) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch booking with service + subcategory + partner details
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      created_at,
      total_amount,
      address,
      city,
      services (
        title,
        category,
        subcategories (
          subcategory_name,
          icon_name
        )
      ),
      partner:partner_id (
        full_name,
        avatar_url,
        phone,
        rating_avg,
        jobs_accepted_count
      )
    `)
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single();

  const booking = bookingData as unknown as BookingDetails | null;

  if (!booking) {
    redirect("/bookings");
  }

  const bookingRef = `BK-${booking.id.substring(0, 6).toUpperCase()}`;
  const scheduledDate = booking.scheduled_date ? new Date(booking.scheduled_date) : new Date();
  const displayDate = scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const displayTime = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const iconName = booking.services?.subcategories?.icon_name || 
    (booking.services?.category === "cleaning" ? "cleaning_services" : "home_repair_service");

  const isAssigned = !!booking.partner;
  const partnerName = booking.partner?.full_name || "Assigning soon...";
  const partnerAvatar = booking.partner?.avatar_url;
  const isPending = booking.status === "pending";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">
      {/* Dynamic keyframe animations for premium high-fidelity radar effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.6); opacity: 0.2; }
          50% { opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .radar-sweep-line {
          animation: radar-sweep 8s linear infinite;
          transform-origin: center;
        }
        .radar-ping-aura {
          animation: radar-pulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
      `}} />

      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Navigation & Header */}
        <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link 
              href="/bookings" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Bookings
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
                Track Professional
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-secondary-container text-on-secondary-container uppercase tracking-wide">
                {booking.status}
              </span>
            </div>
            <p className="text-on-surface-variant text-xs md:text-sm font-medium mt-1">
              Reference: <span className="font-bold">#{bookingRef}</span> &middot; Scheduled for {displayDate} at {displayTime}
            </p>
          </div>
        </section>

        {/* Dynamic Bento-Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column: Live Map Scanning Simulator */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* The Radar Tracking Canvas Container */}
            <div className="relative overflow-hidden bg-primary rounded-3xl min-h-[420px] md:min-h-[480px] flex items-center justify-center p-6 border border-outline-variant/10 shadow-tactile select-none">
              
              {/* Radar Radial Scanning Guides */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(166,206,55,0.1)_0%,transparent_70%)] pointer-events-none" />
              
              {/* Concentric Circles */}
              <div className="absolute w-24 h-24 border border-secondary/15 rounded-full pointer-events-none" />
              <div className="absolute w-48 h-48 border border-secondary/10 rounded-full pointer-events-none" />
              <div className="absolute w-72 h-72 border border-secondary/5 rounded-full pointer-events-none" />
              <div className="absolute w-[400px] h-[400px] border border-secondary/5 rounded-full pointer-events-none hidden md:block" />
              
              {/* Radar Crosshairs */}
              <div className="absolute w-full h-px bg-secondary/5 pointer-events-none" />
              <div className="absolute h-full w-px bg-secondary/5 pointer-events-none" />

              {/* Sweeping Scan Line */}
              <div className="absolute w-full h-full inset-0 flex items-center justify-center radar-sweep-line pointer-events-none">
                <div className="w-1/2 h-px bg-linear-to-r from-secondary/40 via-secondary/10 to-transparent origin-left absolute left-1/2" />
              </div>

              {/* Home Base (Customer Address Pin) - Static Center */}
              <div className="absolute z-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary border-2 border-secondary flex items-center justify-center text-secondary shadow-[0_0_20px_rgba(166,206,55,0.4)]">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                </div>
                <span className="text-[9px] font-black tracking-widest text-secondary mt-1 bg-primary/80 px-1.5 py-0.5 rounded-sm uppercase">You</span>
              </div>

              {/* Moving Pro Signal Node (Slightly Offset) */}
              {isAssigned && !isCompleted && !isCancelled && (
                <div className="absolute z-20 top-1/4 left-1/3 flex flex-col items-center justify-center">
                  <div className="radar-ping-aura absolute inset-0 w-8 h-8 rounded-full bg-secondary/40 -m-1 pointer-events-none" />
                  <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center shadow-[0_0_15px_rgba(166,206,55,0.6)]">
                    <span className="material-symbols-outlined text-base">motorcycle</span>
                  </div>
                  <span className="text-[9px] font-bold text-on-primary bg-primary/80 px-1.5 py-0.5 rounded-sm mt-1 uppercase whitespace-nowrap tracking-wide">
                    {booking.partner?.full_name ? booking.partner.full_name.split(" ")[0] : "Pro"}
                  </span>
                </div>
              )}

              {/* Coming Soon Glassmorphism Overlay */}
              <div className="relative z-30 max-w-md mx-auto glass-panel rounded-3xl p-6 md:p-8 text-center text-on-surface shadow-2xl">
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary/20">
                  <span className="material-symbols-outlined text-3xl text-secondary">explore</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-secondary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-on-secondary mb-3 uppercase tracking-wider">
                  Coming Soon
                </span>
                <h2 className="font-headline text-lg md:text-xl font-bold tracking-tight text-on-surface">
                  Real-time GPS Tracking
                </h2>
                <p className="text-on-surface-variant text-xs md:text-sm mt-2 leading-relaxed font-medium">
                  We are actively developing our advanced live tracking engine! Once completed, you will be able to watch your Professional's transit route live on this screen, get live traffic updates, and view a dynamic, minute-by-minute ETA.
                </p>
                <div className="mt-5 pt-4 border-t border-outline-variant/30 text-[10px] md:text-xs text-on-surface-variant/80 font-medium">
                  Status: <span className="text-green-600 font-bold">Booking Confirmed</span> &middot; Professional is notified
                </div>
              </div>

            </div>

          </div>

          {/* Sidebar Column: Professional details & status timeline */}
          <div className="flex flex-col gap-6">

            {/* Service & Booking Details Summary Card */}
            <div className="glass-panel rounded-3xl p-5 md:p-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                Booking Information
              </h3>
              <div className="flex gap-3 mb-4">
                {/* Emerald green actionable container standard as per rule 11-B & 8-H */}
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">{iconName}</span>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-on-surface leading-tight">
                    {booking.services?.title || "Service Appointment"}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Category: {booking.services?.category || "Home Repair"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant font-medium">
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="text-on-surface font-bold">#{bookingRef}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled Slot:</span>
                  <span className="text-on-surface font-bold text-right">{displayDate} &middot; {displayTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="text-primary font-bold">₹{booking.total_amount}</span>
                </div>
                <div className="flex flex-col pt-1">
                  <span>Address details:</span>
                  <span className="text-on-surface font-bold mt-0.5 leading-tight">
                    {booking.address || "Local Delivery Area"}, {booking.city || ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Snapshot */}
            <div className="glass-panel rounded-3xl p-5 md:p-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                Your Professional
              </h3>
              
              {isAssigned ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 shrink-0 relative">
                      {partnerAvatar ? (
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container text-on-surface font-black">
                          {partnerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-headline text-sm font-bold text-on-surface leading-tight">
                          {partnerName}
                        </p>
                        <span className="material-symbols-outlined text-[#059669] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {booking.partner?.rating_avg && (
                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-amber-500 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {booking.partner.rating_avg.toFixed(1)}
                          </div>
                        )}
                        {booking.partner?.jobs_accepted_count != null && booking.partner.jobs_accepted_count > 0 && (
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            &middot; {booking.partner.jobs_accepted_count} jobs completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex gap-2">
                    <button 
                      disabled 
                      className="flex-1 py-2 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center gap-1.5 opacity-65 cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm">phone</span>
                      Call (Active on dispatch)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/40 animate-pulse mb-2">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <h4 className="font-headline text-xs font-bold text-on-surface">Assigning Technician...</h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed mt-1 max-w-[200px]">
                    Our administration team is currently assigning the optimal, background-verified technician for your service.
                  </p>
                </div>
              )}
            </div>

            {/* Stepper Timeline Progress */}
            <div className="glass-panel rounded-3xl p-5 md:p-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                Service Checklist
              </h3>

              <div className="space-y-5 relative before:content-[''] before:absolute before:left-3 before:top-2.5 before:bottom-2 before:w-0.5 before:bg-outline-variant/40">
                
                {/* Step 1: Placed */}
                <div className="flex gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xs">done</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Booking Placed</h4>
                    <p className="text-[10px] text-on-surface-variant">Request registered and confirmed</p>
                  </div>
                </div>

                {/* Step 2: Assigned */}
                <div className="flex gap-3 relative z-10">
                  {isAssigned ? (
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xs">done</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 animate-pulse border border-secondary/20">
                      <span className="material-symbols-outlined text-xs">person_search</span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">
                      {isAssigned ? "Technician Assigned" : "Assigning Technician"}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant">
                      {isAssigned ? `${booking.partner?.full_name} is scheduled` : "Assigning optimal service technician"}
                    </p>
                  </div>
                </div>

                {/* Step 3: Transit */}
                <div className="flex gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xs">lock</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant">Professional Dispatched</h4>
                    <p className="text-[10px] text-outline">Real-time GPS dispatch state</p>
                  </div>
                </div>

                {/* Step 4: Started */}
                <div className="flex gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xs">lock</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant">Service Active</h4>
                    <p className="text-[10px] text-outline">Job verify & progress checking</p>
                  </div>
                </div>

                {/* Step 5: Completed */}
                <div className="flex gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xs">lock</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant">Appointment Concluded</h4>
                    <p className="text-[10px] text-outline">Invoicing & expert feedback</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Back CTA Button block */}
            <div className="flex flex-col gap-2">
              <Link 
                href="/bookings" 
                className="w-full text-center py-3 bg-primary text-on-primary font-bold rounded-xl font-headline transition-opacity hover:opacity-90 active:scale-98 text-xs md:text-sm shadow-sm"
              >
                Back to Bookings List
              </Link>
              <Link 
                href="/dashboard" 
                className="w-full text-center py-3 bg-surface-container text-on-surface font-bold rounded-xl font-headline transition-colors hover:bg-surface-container-high active:scale-98 text-xs md:text-sm"
              >
                Go to Home Dashboard
              </Link>
            </div>

          </div>

        </div>

      </main>

      <BottomNav />
    </div>
  );
}
