import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ bookingId?: string }> }) {
  const resolvedParams = await searchParams;
  const bookingId = resolvedParams.bookingId;

  if (!bookingId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, services(*)')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    redirect('/dashboard');
  }

  // Fetch assigned partner info if available
  interface AssignedPartner {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    rating_avg: number | null;
    jobs_accepted_count: number | null;
  }

  let assignedPartner: AssignedPartner | null = null;
  if (booking.partner_id) {
    const { data: partnerData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone, rating_avg, jobs_accepted_count')
      .eq('id', booking.partner_id)
      .single();
    assignedPartner = partnerData as AssignedPartner | null;
  }

  const service = booking.services;

  // Format Date uniquely
  const scheduledDate = booking.scheduled_date ? new Date(booking.scheduled_date) : new Date();
  const displayDate = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const displayTime = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Generate a mock booking reference
  const renderRef = `BK-${bookingId.substring(0, 6).toUpperCase()}`;

  const isConfirmed = booking.status === 'confirmed' && assignedPartner;

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col relative">
      <main className="grow flex flex-col items-center justify-center px-4 md:px-6 py-8 md:py-12 max-w-2xl mx-auto w-full z-10">

        {/* Hero Status Section */}
        <div className="text-center mb-8 md:mb-12 flex flex-col items-center">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-primary-fixed rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_12px_32px_rgba(13,148,136,0.15)]">
            <span className="material-symbols-outlined text-primary text-4xl md:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-background tracking-tight mb-2 md:mb-3">
            {isConfirmed ? 'Booking Confirmed!' : 'Booking Received!'}
          </h1>
          <p className="text-on-surface-variant font-medium max-w-xs mx-auto leading-relaxed text-sm md:text-base">
            {isConfirmed ? (
              <>
                <span className="text-on-surface font-bold">{assignedPartner?.full_name}</span> has been assigned to your booking on <span className="text-on-surface font-bold">{displayDate}</span> at <span className="text-on-surface font-bold">{displayTime}</span>.
              </>
            ) : (
              <>
                Your booking is being processed. A Technician will be assigned shortly for <span className="text-on-surface font-bold">{displayDate}</span> at <span className="text-on-surface font-bold">{displayTime}</span>.
              </>
            )}
          </p>
        </div>

        {/* Asymmetric Details Canvas */}
        <div className="w-full space-y-4 md:space-y-6">
          {/* Primary Details Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-tactile relative overflow-hidden group">
            {/* Quiet Decorative Accent */}
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-primary-fixed/20 rounded-full -mr-12 md:-mr-16 -mt-12 md:-mt-16 transition-transform group-hover:scale-110"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8 md:mb-10">
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Booking Reference</p>
                  <h2 className="font-headline text-base md:text-lg font-bold text-on-surface">#{renderRef}</h2>
                </div>
                <div className={`px-2.5 md:px-3 py-0.5 md:py-1 rounded-full ${isConfirmed
                    ? 'bg-green-500/10'
                    : 'bg-surface-container-low'
                  }`}>
                  <span className={`text-[9px] md:text-[10px] font-bold ${isConfirmed ? 'text-green-600' : 'text-primary'
                    }`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:gap-8">
                {/* Service Info */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px] md:text-[24px]">{service.category === 'cleaning' ? 'home_work' : 'bolt'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] font-semibold text-outline-variant mb-0.5">Service Type</p>
                    <p className="text-on-surface font-bold font-headline text-sm md:text-base">{service.title}</p>
                    <p className="text-on-surface-variant text-xs md:text-sm">₹{booking.total_amount}</p>
                  </div>
                </div>

                {/* Location Info */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px] md:text-[24px]">location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] font-semibold text-outline-variant mb-0.5">Location</p>
                    <p className="text-on-surface font-bold font-headline text-sm md:text-base">{booking.address || "Local Delivery Area"}</p>
                    <p className="text-on-surface-variant text-xs md:text-sm">{booking.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Snapshot */}
          {isConfirmed ? (
            /* Assigned Partner Card — Premium look */
            <div className="bg-surface-container-lowest rounded-xl p-5 md:p-6 border border-green-500/10 shadow-sm">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500/10 flex items-center justify-center text-[#059669] shrink-0 border-2 border-green-500/20">
                  {assignedPartner?.avatar_url ? (
                    <Image
                      src={assignedPartner.avatar_url}
                      alt={assignedPartner.full_name}
                      width={56}
                      height={56}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-headline font-bold text-on-surface text-sm md:text-base">{assignedPartner?.full_name}</p>
                    <span className="material-symbols-outlined text-[#059669] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {assignedPartner?.rating_avg && (
                      <div className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-amber-500 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="font-bold">{assignedPartner.rating_avg.toFixed(1)}</span>
                      </div>
                    )}
                    {assignedPartner?.jobs_accepted_count != null && assignedPartner.jobs_accepted_count > 0 && (
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {assignedPartner.jobs_accepted_count} jobs done
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Assigned</span>
                </div>
              </div>
            </div>
          ) : (
            /* Pending state — looking for a partner */
            <div className="bg-surface-container-low/50 backdrop-blur-md rounded-xl p-4 md:p-6 flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">person_search</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-on-surface text-sm md:text-base">Assigning Technician</p>
                  <p className="text-[10px] md:text-xs text-on-surface-variant">Our team will assign a technician shortly</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="w-full mt-10 md:mt-16 space-y-3 md:space-y-4 max-w-md mx-auto">
          <Link href="/dashboard" className="w-full text-center block py-4 md:py-5 bg-transparent text-on-surface-variant font-headline font-bold rounded-lg hover:bg-surface-container-low transition-colors active:scale-[0.98] text-sm md:text-base">
            Back to Home
          </Link>
        </div>

      </main>

      {/* Visual Texture Elements */}
      <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-primary-fixed/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[5%] right-[-10%] w-[50%] h-[50%] bg-secondary-fixed/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
