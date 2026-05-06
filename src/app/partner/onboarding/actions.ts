"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Not authenticated");
  }

  const serviceIds = formData.getAll("services") as string[];
  const pincodesStr = formData.get("service_pincodes") as string;

  if (serviceIds.length === 0) {
    redirect("/partner/onboarding?error=Please select at least one service.");
  }

  if (!pincodesStr || pincodesStr.trim() === "") {
    redirect("/partner/onboarding?error=Please enter at least one pincode.");
  }

  const pincodes = pincodesStr
    .split(",")
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // 1. Insert into partner_services
  const partnerServices = serviceIds.map(service_id => ({
    partner_id: user.id,
    service_id
  }));

  const { error: psError } = await supabase
    .from('partner_services')
    .upsert(partnerServices, { onConflict: 'partner_id, service_id' });

  if (psError) {
    console.error(psError);
    redirect("/partner/onboarding?error=Failed to save services.");
  }

  // 2. Insert into partner_service_areas
  const partnerAreas = pincodes.map(pincode => ({
    partner_id: user.id,
    pincode,
    city: 'Lucknow' // Defaulting to Lucknow for now, or you could pass it in
  }));

  const { error: paError } = await supabase
    .from('partner_service_areas')
    .upsert(partnerAreas, { onConflict: 'partner_id, pincode' });

  if (paError) {
    console.error(paError);
    redirect("/partner/onboarding?error=Failed to save service areas.");
  }

  // 3. Update profile status to active
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', user.id);

  if (profileError) {
    console.error(profileError);
    redirect("/partner/onboarding?error=Failed to update profile status.");
  }

  redirect("/partner/dashboard");
}
