import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ScheduleClient from "./ScheduleClient";

export default async function CheckoutSchedulePage({ searchParams }: { searchParams: Promise<{ serviceId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const serviceId = resolvedSearchParams.serviceId;

  if (!serviceId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: serviceData, error } = await supabase
    .from("services")
    .select("id, title, category")
    .eq("id", serviceId)
    .single();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: savedAddresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  if (error) {
    console.error("Supabase Error Details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }

  interface Service {
    id: string;
    title: string;
    category: string;
    duration_minutes?: number;
  }

  if (!serviceData) {
    redirect('/dashboard');
  }

  // Inject duration_minutes manually since it might be missing from the DB
  const service = {
    ...serviceData,
    duration_minutes: (serviceData as Service).duration_minutes || 60
  };

  return (
    <ScheduleClient 
      service={service as { id: string; duration_minutes: number }} 
      initialAddresses={savedAddresses || []} 
    />
  );
}
