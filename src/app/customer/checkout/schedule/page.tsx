import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ScheduleClient from "./ScheduleClient";

export default async function CheckoutSchedulePage({ searchParams }: { searchParams: Promise<{ serviceId?: string; duration?: string; selectedPackages?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const serviceId = resolvedSearchParams.serviceId;
  const durationParam = resolvedSearchParams.duration;
  const selectedPackages = resolvedSearchParams.selectedPackages;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: savedAddresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  let service = null;

  if (serviceId) {
    const { data: serviceData, error } = await supabase
      .from("services")
      .select("id, title, category, pricing_model, page_content")
      .eq("id", serviceId)
      .single();

    if (error) {
      console.error("Supabase Error Details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    if (!serviceData) {
      redirect('/customer/dashboard');
    }

    interface Service {
      id: string;
      title: string;
      category: string;
      duration_minutes?: number;
      pricing_model?: 'fixed' | 'hourly';
      page_content?: any;
    }

    // Inject duration_minutes manually since it might be missing from the DB
    service = {
      ...serviceData,
      duration_minutes: (serviceData as Service).duration_minutes || 60
    };
  }

  const durationVal = durationParam ? parseInt(durationParam, 10) : undefined;

  return (
    <ScheduleClient 
      service={service} 
      initialAddresses={savedAddresses || []}
      duration={durationVal}
      selectedPackages={selectedPackages}
    />
  );
}
