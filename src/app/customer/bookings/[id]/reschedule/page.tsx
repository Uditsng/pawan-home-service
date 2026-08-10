import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isReschedulableStatus } from "@/utils/bookingPolicy";
import { getCachedPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import RescheduleClient from "./RescheduleClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reschedule Booking | PHS Cleaning Company",
    description: "Move your booking to a new date and time slot.",
  };
}

export interface RescheduleServiceInfo {
  title: string;
  icon_name: string | null;
}

export interface RescheduleBookingInfo {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  total_amount: number;
  services: RescheduleServiceInfo | null;
}

interface ReschedulePageProps {
  params: Promise<{ id: string }>;
}

export default async function ReschedulePage({ params }: ReschedulePageProps) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_date, created_at, total_amount, services(title, subcategories(icon_name))"
    )
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single();

  const booking = bookingData as unknown as RescheduleBookingInfo | null;

  if (!booking) {
    redirect("/customer/bookings");
  }

  if (!isReschedulableStatus(booking.status)) {
    redirect(`/customer/bookings/${bookingId}/tracking`);
  }

  const settings = await getCachedPlatformSettings();

  return (
    <RescheduleClient
      initialBooking={booking}
      cancellationWindowMinutes={settings.freeCancellationWindowMinutes}
    />
  );
}