import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CartPaymentClient from "./CartPaymentClient";
import { notifyCustomer } from "@/lib/notifications";
import { triggerDispatchBatch } from "@/app/actions/dispatch";

export default async function CartPaymentPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ date?: string, time?: string, addressId?: string }> 
}) {
  const resolvedParams = await searchParams;
  const { date, time, addressId } = resolvedParams;

  if (!date || !time || !addressId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if user lost session
  if (!user) redirect('/login');

  const [addressResult, settingsResult, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from('user_addresses').select('formatted_address, city, area, pincode, label').eq('id', addressId).eq('user_id', user.id).single(),
    supabase.from('platform_settings').select('key, value').in('key', ['tax_rate', 'referral_reward_referred']),
    supabase.from('profiles').select('referred_by').eq('id', user.id).single(),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('customer_id', user.id).eq('status', 'completed'),
  ]);

  const addressObj = addressResult.data;
  if (!addressObj) redirect('/dashboard');

  // Parse all settings from parallel fetch
  const settingsMap = (settingsResult.data || []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = typeof row.value === 'string' ? row.value : String(row.value);
    return acc;
  }, {});

  let taxRatePercent = 18;
  try {
    const rawTax = settingsMap['tax_rate']?.replace(/%/g, '').trim();
    const parsed = parseFloat(rawTax || '18');
    if (!isNaN(parsed)) taxRatePercent = parsed;
  } catch { /* use default */ }

  // Determine referral discount eligibility
  const isReferred = !!profileResult.data?.referred_by;
  const hasCompletedBookings = (completedBookingsResult.count ?? 0) > 0;
  let referralDiscount = 0;
  if (isReferred && !hasCompletedBookings) {
    const rawDiscount = parseFloat(settingsMap['referral_reward_referred'] || '50');
    if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscount = rawDiscount;
  }

  // Next 16 compatible Server Action
  async function confirmOrderAction(serviceIds: string[]) {
    "use server";
    if (!serviceIds || serviceIds.length === 0) {
      return { success: false, error: "No services selected." };
    }

    const db = await createClient();

    // Fetch confirmed address details inside action to ensure correct parameters
    const { data: addr } = await db
      .from('user_addresses')
      .select('formatted_address, city, area, pincode')
      .eq('id', addressId)
      .eq('user_id', user!.id)
      .single();

    if (!addr) {
      redirect('/dashboard?error=AddressNotFound');
    }

    // Fetch services details from DB to calculate safe pricing
    const { data: dbServices, error: fetchSvcError } = await db
      .from('services')
      .select('id, title, base_price')
      .in('id', serviceIds);

    if (fetchSvcError || !dbServices || dbServices.length === 0) {
      redirect('/dashboard?error=ServicesNotFound');
    }

    // Fetch tax rate + referral discount from platform_settings
    const { data: settingsActionData } = await db
      .from('platform_settings')
      .select('key, value')
      .in('key', ['tax_rate', 'referral_reward_referred']);

    const settingsActionMap = (settingsActionData || []).reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = typeof row.value === 'string' ? row.value : String(row.value);
      return acc;
    }, {});

    let taxRatePercentAction = 18;
    try {
      const rawTax = settingsActionMap['tax_rate']?.replace(/%/g, '').trim();
      const parsed = parseFloat(rawTax || '18');
      if (!isNaN(parsed)) taxRatePercentAction = parsed;
    } catch { /* use default */ }

    // Re-verify referral discount server-side (never trust client)
    let referralDiscountAction = 0;
    const { data: profileAction } = await db.from('profiles').select('referred_by').eq('id', user!.id).single();
    if (profileAction?.referred_by) {
      const { count: completedCount } = await db.from('bookings').select('id', { count: 'exact' }).eq('customer_id', user!.id).eq('status', 'completed');
      if ((completedCount ?? 0) === 0) {
        const rawDiscount = parseFloat(settingsActionMap['referral_reward_referred'] || '50');
        if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscountAction = rawDiscount;
      }
    }

    // Calculate item pricing pro-rated share of referral discount
    const subtotal = dbServices.reduce((sum, s) => sum + s.base_price, 0);
    const totalTax = Math.round(subtotal * (taxRatePercentAction / 100));
    const totalOrderAmount = Math.max(0, subtotal + totalTax - referralDiscountAction);
    const timestamp = new Date(`${date} ${time}`);

    // 1. Create order
    const { data: order, error: orderError } = await db.from('orders').insert({
      customer_id: user!.id,
      status: 'pending',
      total_amount: totalOrderAmount,
      city: addr.city,
      area: (addr as { formatted_address: string; city: string; area?: string; pincode: string }).area ?? null,
      address: addr.formatted_address,
      pincode: addr.pincode,
      scheduled_date: timestamp.toISOString(),
      item_count: dbServices.length,
    }).select('id').single();

    if (orderError || !order) {
      console.error('Order Insert Error:', orderError);
      redirect('/dashboard?error=OrderCreationFailed');
    }

    // Pro-rate the referral discount
    const discountPerItem = Math.round((referralDiscountAction / dbServices.length) * 100) / 100;

    // 2. Loop and create bookings (which triggers auto_assign_partner trigger)
    for (const service of dbServices) {
      const basePrice = service.base_price;
      const gstTax = Math.round(basePrice * (taxRatePercentAction / 100));
      const bookingPrice = Math.max(0, basePrice + gstTax - discountPerItem);

      const { data: booking, error: bookingError } = await db.from('bookings').insert({
        service_id: service.id,
        customer_id: user!.id,
        order_id: order.id,
        status: 'pending',
        total_amount: bookingPrice,
        city: addr.city,
        area: (addr as { formatted_address: string; city: string; area?: string; pincode: string }).area ?? null,
        address: addr.formatted_address,
        pincode: addr.pincode,
        scheduled_date: timestamp.toISOString(),
        wallet_discount_applied: discountPerItem,
      }).select('id').single();

      if (bookingError || !booking) {
        console.error('Booking Insert Error:', bookingError);
        continue;
      }

      // Log event for this booking
      await db.from('booking_events').insert({
        booking_id: booking.id,
        event_type: 'BOOKING_CREATED',
        actor: 'USER',
        metadata: {
          customer_id: user!.id,
          service_id: service.id,
          amount: bookingPrice,
          order_id: order.id,
        },
      });

      // Trigger dispatch: find top 10 eligible partners and notify them
      void triggerDispatchBatch(booking.id, 1);

      // Fire async notification to customer
      void notifyCustomer(
        user!.id,
        "Booking Received!",
        `Your booking for ${service.title} on ${date} at ${time} has been placed. Finding a professional for you.`,
        "booking_created",
        { booking_id: booking.id, service_title: service.title }
      );
    }

    // Redirect to success page with the master orderId
    redirect(`/checkout/success?orderId=${order.id}`);
  }

  return (
    <CartPaymentClient
      addressObj={addressObj}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
      confirmOrderAction={confirmOrderAction}
    />
  );
}
