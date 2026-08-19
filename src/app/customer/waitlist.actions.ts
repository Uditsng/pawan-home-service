"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Toggles the current user's waitlist entry for an upcoming service.
 * Relies on RLS (user_id = auth.uid()) to scope reads/writes to the caller.
 */
export async function toggleServiceWaitlist(
  serviceId: string
): Promise<{ waitlisted: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { waitlisted: false, error: "You need to sign in to join the waitlist." };
  }

  const { data: existing, error: findError } = await supabase
    .from("service_waitlist")
    .select("id")
    .eq("service_id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    return { waitlisted: false, error: findError.message };
  }

  if (existing) {
    const { error: delError } = await supabase
      .from("service_waitlist")
      .delete()
      .eq("id", existing.id);
    if (delError) {
      return { waitlisted: false, error: delError.message };
    }
    return { waitlisted: false };
  }

  const { error: insError } = await supabase
    .from("service_waitlist")
    .insert({ service_id: serviceId, user_id: user.id });
  if (insError) {
    return { waitlisted: false, error: insError.message };
  }
  return { waitlisted: true };
}