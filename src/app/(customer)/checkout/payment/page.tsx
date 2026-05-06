import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function CheckoutPaymentPage({ searchParams }: { searchParams: Promise<{ serviceId?: string, date?: string, time?: string }> }) {
  const resolvedParams = await searchParams;
  const { serviceId, date, time } = resolvedParams;

  if (!serviceId || !date || !time) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if user lost session
  if (!user) redirect('/login');

  const { data: service } = await supabase
    .from('services')
    .select('id, title, base_price')
    .eq('id', serviceId)
    .single();

  if (!service) redirect('/dashboard');

  // Next 16 compatible Server Action
  async function confirmBookingAction() {
    "use server";
    const db = await createClient();

    // Parse timestamp (roughly)
    const timestamp = new Date(`${date} ${time}`);

    // 1. Create booking first (status: pending while we find a partner)
    const { data: inserted, error } = await db.from('bookings').insert({
      service_id: service!.id,
      customer_id: user!.id,
      status: 'pending',
      total_amount: service!.base_price,
      city: 'Local Area',
      scheduled_date: timestamp.toISOString()
    }).select().single();

    if (error) {
      console.error(error);
      redirect('/dashboard?error=PaymentFailed');
    }

    // 2. Auto-assign a partner via round-robin RPC
    const { data: partnerId } = await db.rpc('auto_assign_partner', {
      p_service_id: service!.id,
      p_city: 'Local Area',
      p_scheduled_at: timestamp.toISOString(),
      p_exclude_partners: []
    });

    if (partnerId) {
      // Partner found! Update booking to confirmed with assigned partner
      await db.from('bookings').update({
        partner_id: partnerId,
        status: 'confirmed',
        accepted_at: new Date().toISOString()
      }).eq('id', inserted.id);

      // Log auto-assignment event
      await db.from('booking_events').insert({
        booking_id: inserted.id,
        event_type: 'PARTNER_AUTO_ASSIGNED',
        actor: 'SYSTEM',
        metadata: {
          partner_id: partnerId,
          customer_id: user!.id,
          service_id: service!.id,
          amount: service!.base_price,
          assignment_method: 'round_robin'
        },
      });

      // Update partner metrics
      const { data: partnerProfile } = await db
        .from('profiles')
        .select('jobs_offered_count, jobs_accepted_count')
        .eq('id', partnerId)
        .single();

      if (partnerProfile) {
        await db.from('profiles').update({
          jobs_offered_count: (partnerProfile.jobs_offered_count || 0) + 1,
          jobs_accepted_count: (partnerProfile.jobs_accepted_count || 0) + 1,
        }).eq('id', partnerId);
      }
    } else {
      // No partner available — booking stays as "pending" for admin to handle
      await db.from('booking_events').insert({
        booking_id: inserted.id,
        event_type: 'BOOKING_CREATED',
        actor: 'USER',
        metadata: {
          customer_id: user!.id,
          service_id: service!.id,
          amount: service!.base_price,
          auto_assign_result: 'no_partner_available'
        },
      });
    }

    redirect(`/checkout/success?bookingId=${inserted.id}`);
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-28 md:pb-32">
      <main className="max-w-xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 md:mb-8 text-on-background">Payment</h2>

        {/* Order Summary */}
        <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[28px] mb-6 md:mb-8 ring-2 ring-primary ring-offset-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="text-[10px] md:text-xs font-bold text-green-500 uppercase tracking-[0.15em] mb-4 md:mb-6">Order Summary</h3>

          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-3 md:gap-4">
              <div>
                <p className="font-extrabold text-lg md:text-[22px] tracking-tight text-on-surface leading-tight">{service.title}</p>
                <p className="text-[13px] md:text-[15px] font-medium text-on-surface-variant mt-1 md:mt-1.5">{date} at {time}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-green-500/10 text-[#059669] flex items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-[20px] md:text-[24px]">event_available</span>
              </div>
            </div>

            <hr className="my-4 md:my-6 border-t border-dashed border-outline-variant/30" />

            {/* Auto-assign info banner */}
            <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/10 rounded-xl p-3 mb-4">
              <span className="material-symbols-outlined text-[#059669] text-lg">bolt</span>
              <p className="text-xs font-medium text-on-surface-variant">
                A Professional will be <span className="font-bold text-on-surface">instantly assigned</span> to your booking upon confirmation.
              </p>
            </div>

            <div className="flex justify-between items-center">
              <p className="font-medium text-[15px] md:text-[17px] text-on-surface">Total Amount</p>
              <p className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">₹{service.base_price}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-xs md:text-sm font-bold text-on-surface-variant uppercase tracking-wider px-1 md:px-2">Payment Methods</h3>

          <div className="group relative bg-surface-container-lowest p-4 md:p-5 rounded-xl md:rounded-2xl ring-2 ring-primary ring-offset-2">
            <div className="flex justify-between items-start">
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl md:text-3xl">qr_code_2</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-on-surface text-sm md:text-base">UPI</p>
                    <span className="bg-primary/10 text-primary text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-tighter">Recommended</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-on-surface-variant mt-0.5 md:mt-1">Google Pay, PhonePe, Paytm</p>
                </div>
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-primary bg-primary flex items-center justify-center">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white"></div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 md:p-5 rounded-xl md:rounded-2xl opacity-60">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-xl md:text-2xl">credit_card</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm md:text-base">Credit / Debit Cards</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <form action={confirmBookingAction}>
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#f7f9fb]/90 backdrop-blur-2xl border-t border-outline-variant/10 p-3 md:p-4 pb-safe">
          <div className="max-w-xl mx-auto flex gap-3 md:gap-4 items-center">
            <div className="flex-1">
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Payable</p>
              <p className="text-xl md:text-2xl font-black text-on-background">₹{service.base_price}</p>
            </div>
            <button type="submit" className="flex-1 bg-secondary text-white py-3.5 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl font-bold tracking-tight text-base md:text-lg shadow-[0_12px_32px_rgba(253,118,26,0.25)] active:scale-[0.98] transition-transform text-center flex items-center justify-center gap-2">
              Pay & Book
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
