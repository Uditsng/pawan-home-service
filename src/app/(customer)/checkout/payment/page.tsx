import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaymentFormClient from "./PaymentFormClient";
import { notifyCustomer } from "@/lib/notifications";

export default async function CheckoutPaymentPage({ searchParams }: { searchParams: Promise<{ serviceId?: string, date?: string, time?: string, addressId?: string }> }) {
  const resolvedParams = await searchParams;
  const { serviceId, date, time, addressId } = resolvedParams;

  if (!serviceId || !date || !time || !addressId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if user lost session
  if (!user) redirect('/login');

  const [addressResult, serviceResult, settingsResult, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from('user_addresses').select('formatted_address, city, pincode, label').eq('id', addressId).eq('user_id', user.id).single(),
    supabase.from('services').select('id, title, base_price, category').eq('id', serviceId).single(),
    supabase.from('platform_settings').select('key, value').in('key', ['tax_rate', 'referral_reward_referred']),
    supabase.from('profiles').select('referred_by').eq('id', user.id).single(),
    supabase.from('bookings').select('id', { count: 'exact' }).eq('customer_id', user.id).eq('status', 'completed'),
  ]);

  const addressObj = addressResult.data;
  const service = serviceResult.data;

  if (!addressObj) redirect('/dashboard');
  if (!service) redirect('/dashboard');

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
  async function confirmBookingAction() {
    "use server";
    const db = await createClient();

    // Fetch confirmed address details inside action to ensure correct parameters
    const { data: addr } = await db
      .from('user_addresses')
      .select('formatted_address, city, pincode')
      .eq('id', addressId)
      .eq('user_id', user!.id)
      .single();

    if (!addr) {
      redirect('/dashboard?error=AddressNotFound');
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

    const basePrice = service!.base_price;
    const gstTax = Math.round(basePrice * (taxRatePercentAction / 100));
    const totalPrice = Math.max(0, basePrice + gstTax - referralDiscountAction);
    const timestamp = new Date(`${date} ${time}`);

    // 1. Create booking first (status: pending while we find a partner)
    const { data: inserted, error } = await db.from('bookings').insert({
      service_id: service!.id,
      customer_id: user!.id,
      status: 'pending',
      total_amount: totalPrice,
      city: addr.city,
      address: addr.formatted_address,
      pincode: addr.pincode,
      scheduled_date: timestamp.toISOString(),
      wallet_discount_applied: referralDiscountAction,
    }).select('id').single();

    if (error) {
      console.error(error);
      redirect('/dashboard?error=PaymentFailed');
    }

    // 2. Log booking creation event (Unassigned)
    await db.from('booking_events').insert({
      booking_id: inserted.id,
      event_type: 'BOOKING_CREATED',
      actor: 'USER',
      metadata: {
        customer_id: user!.id,
        service_id: service!.id,
        amount: totalPrice,
      },
    });

    // 3. Fire async notification — does not block redirect
    void notifyCustomer(
      user!.id,
      "Booking Received!",
      `Your booking for ${service!.title} on ${date} at ${time} has been placed. We're finding a professional for you.`,
      "booking_created",
      { booking_id: inserted.id, service_title: service!.title }
    );

    redirect(`/checkout/success?bookingId=${inserted.id}`);
  }

  return (
    <PaymentFormClient
      service={service}
      addressObj={addressObj}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
      confirmBookingAction={confirmBookingAction}
    />
  );
}
