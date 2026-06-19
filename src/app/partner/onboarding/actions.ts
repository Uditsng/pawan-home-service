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
  const serviceAreasStr = formData.get("service_areas") as string;

  if (serviceIds.length === 0) {
    redirect("/partner/onboarding?error=Please select at least one service.");
  }

  let serviceAreas: {pincode: string, locality: string, city: string}[] = [];
  if (serviceAreasStr) {
    try {
      serviceAreas = JSON.parse(serviceAreasStr);
    } catch (e) {
      console.error(e);
    }
  }

  if (serviceAreas.length === 0) {
    redirect("/partner/onboarding?error=Please select at least one service area.");
  }

  // 1. Insert into partner_services
  // Try to delete existing first (in case of re-onboarding), ignore error if RLS blocks delete
  await supabase.from('partner_services').delete().eq('partner_id', user.id);
  
  const partnerServices = serviceIds.map(service_id => ({
    partner_id: user.id,
    service_id
  }));

  const { error: psError } = await supabase
    .from('partner_services')
    .upsert(partnerServices, { onConflict: 'partner_id, service_id', ignoreDuplicates: true });

  if (psError) {
    console.error('PS Error:', psError);
    redirect("/partner/onboarding?error=Failed to save services.");
  }

  // 2. Insert into partner_service_areas
  await supabase.from('partner_service_areas').delete().eq('partner_id', user.id);
  
  const partnerAreas = serviceAreas.map(area => ({
    partner_id: user.id,
    pincode: area.pincode,
    city: area.locality // Saving locality to city column to display it correctly later
  }));

  const { error: paError } = await supabase
    .from('partner_service_areas')
    .upsert(partnerAreas, { onConflict: 'partner_id, pincode, city', ignoreDuplicates: true });

  if (paError) {
    console.error('PA Error:', paError);
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
