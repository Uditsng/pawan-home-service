import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaymentFormClient from "./PaymentFormClient";

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    serviceId?: string;
    date?: string;
    time?: string;
    addressId?: string;
    duration?: string;
    meetingLocation?: string;
    destination?: string;
    expectedBags?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const { serviceId, date, time, addressId, duration, meetingLocation, destination, expectedBags } = resolvedParams;

  if (!serviceId || !date || !time || !addressId) {
    redirect("/customer/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [addressResult, serviceResult, settingsResult, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    supabase.from("services").select("id, title, base_price, category, pricing_model").eq("id", serviceId).single(),
    supabase.from("platform_settings").select("key, value").in("key", ["tax_rate", "referral_reward_referred"]),
    supabase.from("profiles").select("referred_by, wallet_balance").eq("id", user.id).single(),
    supabase.from("bookings").select("id", { count: "exact" }).eq("customer_id", user.id).eq("status", "completed"),
  ]);

  const addressObj = addressResult.data;
  const service = serviceResult.data;

  if (!addressObj || !service) {
    redirect("/customer/dashboard");
  }

  // Parse platform settings
  const settingsMap = (settingsResult.data || []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = typeof row.value === "string" ? row.value : String(row.value);
    return acc;
  }, {});

  let taxRatePercent = 18;
  try {
    const rawTax = settingsMap["tax_rate"]?.replace(/%/g, "").trim();
    const parsed = parseFloat(rawTax || "18");
    if (!isNaN(parsed)) taxRatePercent = parsed;
  } catch {
    /* use default */
  }

  const isReferred = !!profileResult.data?.referred_by;
  const hasCompletedBookings = (completedBookingsResult.count ?? 0) > 0;
  let referralDiscount = 0;
  if (isReferred && !hasCompletedBookings) {
    const rawDiscount = parseFloat(settingsMap["referral_reward_referred"] || "50");
    if (!isNaN(rawDiscount) && rawDiscount > 0) referralDiscount = rawDiscount;
  }

  const walletBalance = Number(profileResult.data?.wallet_balance || 0);

  let finalBasePrice = Number(service.base_price);
  let parsedDuration: number | undefined = undefined;

  if (service.pricing_model === "hourly") {
    parsedDuration = duration ? parseInt(duration, 10) : 60;
    const { data: pricingData } = await supabase
      .from("service_duration_pricing")
      .select("price")
      .eq("service_id", service.id)
      .eq("duration_minutes", parsedDuration)
      .single();

    if (pricingData) {
      finalBasePrice = Number(pricingData.price);
    }
  }

  const enrichedService = {
    ...service,
    base_price: finalBasePrice,
  };

  return (
    <PaymentFormClient
      service={enrichedService}
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
      walletBalance={walletBalance}
      duration={parsedDuration}
      meetingLocation={meetingLocation}
      destination={destination}
      expectedBags={expectedBags}
    />
  );
}
