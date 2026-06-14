import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaymentFormClient from "./PaymentFormClient";

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; date?: string; time?: string; addressId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { serviceId, date, time, addressId } = resolvedParams;

  if (!serviceId || !date || !time || !addressId) {
    redirect("/customer/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [addressResult, serviceResult, settingsResult, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    supabase.from("services").select("id, title, base_price, category").eq("id", serviceId).single(),
    supabase.from("platform_settings").select("key, value").in("key", ["tax_rate", "referral_reward_referred"]),
    supabase.from("profiles").select("referred_by").eq("id", user.id).single(),
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

  return (
    <PaymentFormClient
      service={service}
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      taxRatePercent={taxRatePercent}
      referralDiscount={referralDiscount}
    />
  );
}
