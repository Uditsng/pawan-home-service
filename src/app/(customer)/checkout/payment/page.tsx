import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaymentFormClient from "./PaymentFormClient";

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

    // 2. Auto-assign a partner via round-robin RPC
    const { data: partnerId } = await db.rpc('auto_assign_partner', {
      p_service_id: service!.id,
      p_city: addr.city,
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
          amount: totalPrice,
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
          amount: totalPrice,
          auto_assign_result: 'no_partner_available'
        },
      });
    }

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
