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

  const { data: addressObj } = await supabase
    .from('user_addresses')
    .select('formatted_address, city, pincode, label')
    .eq('id', addressId)
    .eq('user_id', user.id)
    .single();

  if (!addressObj) redirect('/dashboard');

  const { data: service } = await supabase
    .from('services')
    .select('id, title, base_price, category')
    .eq('id', serviceId)
    .single();

  if (!service) redirect('/dashboard');

  // 3. Fetch tax rate from platform_settings
  const { data: settingsData } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'tax_rate')
    .maybeSingle();

  // Parse tax rate safely (default to 18)
  let taxRatePercent = 18;
  if (settingsData?.value) {
    try {
      const parsedVal = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
      const parsedNum = parseFloat(String(parsedVal).replace(/%/g, '').trim());
      if (!isNaN(parsedNum)) {
        taxRatePercent = parsedNum;
      }
    } catch (e) {
      console.error("Error parsing tax rate setting:", e);
    }
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

    // Fetch tax rate dynamically for database insert as well
    const { data: settingsDataAction } = await db
      .from('platform_settings')
      .select('value')
      .eq('key', 'tax_rate')
      .maybeSingle();

    let taxRatePercentAction = 18;
    if (settingsDataAction?.value) {
      try {
        const parsedVal = typeof settingsDataAction.value === 'string' ? JSON.parse(settingsDataAction.value) : settingsDataAction.value;
        const parsedNum = parseFloat(String(parsedVal).replace(/%/g, '').trim());
        if (!isNaN(parsedNum)) {
          taxRatePercentAction = parsedNum;
        }
      } catch (e) {
        console.error("Error parsing tax rate in server action:", e);
      }
    }

    const basePrice = service!.base_price;
    const gstTax = Math.round(basePrice * (taxRatePercentAction / 100));
    const totalPrice = basePrice + gstTax;

    // Parse timestamp (roughly)
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
      scheduled_date: timestamp.toISOString()
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
      confirmBookingAction={confirmBookingAction}
    />
  );
}
