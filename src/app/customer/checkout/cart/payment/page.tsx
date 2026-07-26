import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CartPaymentClient from "./CartPaymentClient";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { calculateReferralDiscount } from "@/lib/engines/referralEngine";

export default async function CartPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; addressId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { date, time, addressId } = resolvedParams;

  if (!date || !time || !addressId) {
    redirect("/customer/dashboard");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [addressResult, platformSettings, profileResult, completedBookingsResult] = await Promise.all([
    supabase.from("user_addresses").select("formatted_address, city, area, pincode, label").eq("id", addressId).eq("user_id", user.id).single(),
    fetchPlatformSettings(supabase),
    supabase.from("profiles").select("referred_by, wallet_balance").eq("id", user.id).single(),
    supabase.from("bookings").select("id", { count: "exact" }).eq("customer_id", user.id).eq("status", "completed"),
  ]);

  const addressObj = addressResult.data;
  if (!addressObj) redirect("/customer/dashboard");

  const isReferred = !!profileResult.data?.referred_by;
  const hasCompletedBookings = (completedBookingsResult.count ?? 0) > 0;

  const referralCalc = calculateReferralDiscount(isReferred && !hasCompletedBookings, {
    referrerReward: platformSettings.referralRewardReferrer,
    referredDiscount: platformSettings.referralRewardReferred,
    isEnabled: platformSettings.referralEnabled,
  });
  const referralDiscount = referralCalc.discountAmount;

  const walletBalance = Number(profileResult.data?.wallet_balance || 0);

  return (
    <CartPaymentClient
      addressObj={addressObj}
      addressId={addressId}
      date={date}
      time={time}
      taxRatePercent={platformSettings.taxRate}
      gstEnabled={platformSettings.gstEnabled}
      referralDiscount={referralDiscount}
      walletBalance={walletBalance}
    />
  );
}
