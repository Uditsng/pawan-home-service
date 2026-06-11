import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CartClearer from "./CartClearer";

interface ProfilePartner {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating_avg: number | null;
}

interface Service {
  id: string;
  title: string;
  category: string;
  icon_name?: string;
  subcategories?: {
    icon_name: string;
  };
}

interface BookingRow {
  id: string;
  status: string;
  total_amount: number;
  address: string;
  city: string;
  pincode: string;
  scheduled_date: string;
  partner_id: string | null;
  services: Service | null;
  partner?: ProfilePartner | null;
}

export default async function CheckoutSuccessPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ bookingId?: string, orderId?: string }> 
}) {
  const resolvedParams = await searchParams;
  const { bookingId, orderId } = resolvedParams;

  if (!bookingId && !orderId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let isOrder = false;
  let displayDate = "";
  let displayTime = "";
  let overallAmount = 0;
  let bookingsList: BookingRow[] = [];

  if (orderId) {
    isOrder = true;
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!orderData) redirect('/dashboard');

    overallAmount = orderData.total_amount;
    const scheduledDate = orderData.scheduled_date ? new Date(orderData.scheduled_date) : new Date();
    displayDate = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    displayTime = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Fetch all child bookings in order with services and partner profile relations
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          title,
          category,
          subcategories (
            icon_name
          )
        ),
        partner:partner_id (
          full_name,
          avatar_url,
          phone,
          rating_avg
        )
      `)
      .eq('order_id', orderId);

    bookingsList = (bookingsData || []) as unknown as BookingRow[];
  } else if (bookingId) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          title,
          category,
          subcategories (
            icon_name
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (!bookingData) redirect('/dashboard');

    overallAmount = bookingData.total_amount;
    const scheduledDate = bookingData.scheduled_date ? new Date(bookingData.scheduled_date) : new Date();
    displayDate = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    displayTime = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    let partnerInfo: ProfilePartner | null = null;
    if (bookingData.partner_id) {
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, phone, rating_avg')
        .eq('id', bookingData.partner_id)
        .single();
      partnerInfo = partnerData as ProfilePartner | null;
    }

    bookingsList = [{
      ...bookingData,
      partner: partnerInfo
    }] as unknown as BookingRow[];
  }

  if (bookingsList.length === 0) {
    redirect('/dashboard');
  }

  // Check if any booking is confirmed
  const anyConfirmed = bookingsList.some(b => b.status === 'confirmed' && b.partner);

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col relative">
      {/* Clear the cart on mount if checking out an order */}
      {isOrder && <CartClearer />}

      <main className="grow flex flex-col items-center justify-center px-4 md:px-6 py-8 md:py-12 max-w-2xl mx-auto w-full z-10">

        {/* Hero Status Section */}
        <div className="text-center mb-8 md:mb-12 flex flex-col items-center">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-primary-fixed rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_12px_32px_rgba(0,34,97,0.15)]">
            <span className="material-symbols-outlined text-primary text-4xl md:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-background tracking-tight mb-2 md:mb-3">
            {anyConfirmed ? 'Booking Confirmed!' : 'Booking Received!'}
          </h1>
          <p className="text-on-surface-variant font-medium max-w-md mx-auto leading-relaxed text-sm md:text-base">
            {isOrder ? (
              <>
                Your order of <span className="text-on-surface font-bold">{bookingsList.length} services</span> has been placed for <span className="text-on-surface font-bold">{displayDate}</span> at <span className="text-on-surface font-bold">{displayTime}</span>.
              </>
            ) : (
              <>
                {anyConfirmed ? (
                  <>
                    <span className="text-on-surface font-bold">{bookingsList[0].partner?.full_name}</span> has been assigned to your booking on <span className="text-on-surface font-bold">{displayDate}</span> at <span className="text-on-surface font-bold">{displayTime}</span>.
                  </>
                ) : (
                  <>
                    Your booking is being processed. A technician will be assigned shortly for <span className="text-on-surface font-bold">{displayDate}</span> at <span className="text-on-surface font-bold">{displayTime}</span>.
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Details Canvas */}
        <div className="w-full space-y-5">
          {/* Main Info Box */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-tactile border border-outline-variant/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start border-b border-outline-variant/10 pb-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                  {isOrder ? 'Order Reference' : 'Booking Reference'}
                </p>
                <h2 className="font-headline text-base md:text-lg font-bold text-on-surface">
                  {isOrder ? `#ORD-${orderId?.substring(0, 6).toUpperCase()}` : `#BK-${bookingId?.substring(0, 6).toUpperCase()}`}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Total Paid (COD)</p>
                <p className="font-headline text-base md:text-lg font-black text-primary">₹{overallAmount}</p>
              </div>
            </div>

            {/* List all items (services) */}
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Service Details</p>
              {bookingsList.map((booking) => {
                const service = booking.services;
                const iconName = service?.subcategories?.icon_name || 'home_repair_service';
                const isConfirmed = booking.status === 'confirmed' && booking.partner;

                return (
                  <div key={booking.id} className="p-4 bg-surface rounded-2xl border border-outline-variant/10 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#059669] text-xl">{iconName}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-on-surface leading-tight">{service?.title || "Home Service"}</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Booking Ref: BK-{booking.id.substring(0, 6).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0
                        ${isConfirmed ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        {booking.status}
                      </div>
                    </div>

                    {/* Assigned Partner snapshot inside this service card */}
                    {isConfirmed ? (
                      <div className="pt-3 border-t border-outline-variant/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-[#059669] shrink-0 border border-green-500/10 overflow-hidden relative">
                          {booking.partner?.avatar_url ? (
                            <Image
                              src={booking.partner.avatar_url}
                              alt={booking.partner.full_name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-base">person</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{booking.partner?.full_name}</p>
                          {booking.partner?.rating_avg && (
                            <p className="text-[10px] text-on-surface-variant flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-amber-500 text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              {booking.partner.rating_avg.toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 bg-green-500/10 text-[#059669] px-2 py-0.5 rounded-full shrink-0 border border-green-500/20 text-[9px] font-bold uppercase tracking-wider">
                          Technician Assigned
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-outline-variant/10 flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-base animate-pulse">person_search</span>
                        <span className="text-[10px] font-medium">Matching professional shortly...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Shared Schedule details */}
            <div className="mt-6 pt-5 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">calendar_today</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Schedule</p>
                  <p className="text-xs font-bold text-on-surface mt-0.5">{displayDate}</p>
                  <p className="text-[10px] text-on-surface-variant">{displayTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">location_on</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Address</p>
                  <p className="text-xs font-bold text-on-surface mt-0.5 truncate max-w-[200px]">{bookingsList[0].address}</p>
                  <p className="text-[10px] text-on-surface-variant">{bookingsList[0].city}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="w-full mt-10 md:mt-12 space-y-3 md:space-y-4 max-w-md mx-auto">
          <Link href="/dashboard" className="w-full text-center block py-4 bg-primary text-white font-headline font-extrabold rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all text-sm md:text-base border-none">
            Back to Home
          </Link>
          <Link href="/bookings" className="w-full text-center block py-3 bg-transparent text-primary font-headline font-bold rounded-2xl hover:bg-surface-container-low transition-colors active:scale-[0.98] text-sm md:text-base">
            View My Bookings
          </Link>
        </div>

      </main>

      {/* Visual background textures */}
      <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-primary-fixed/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[5%] right-[-10%] w-[50%] h-[50%] bg-secondary-fixed/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
