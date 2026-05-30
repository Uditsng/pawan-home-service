"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Helper to check schema column exceptions and throw user-friendly instructions.
 */
function handleDatabaseError(error: any): never {
  console.error("Database operation failed:", error);
  if (error.message?.includes("column") || error.code === '42703') {
    throw new Error(
      "DATABASE_SCHEMA_ERROR: One or more Fleet Control columns ('service_tier', 'kyc_status', 'kyc_rejection_reason', 'kyc_documents') do not exist in the 'profiles' table. " +
      "Please execute this SQL in your Supabase Dashboard SQL Editor:\n\n" +
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_tier TEXT DEFAULT 'standard';\n" +
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';\n" +
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;\n" +
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_documents JSONB;"
    );
  }
  throw new Error(error.message || "An unknown database error occurred.");
}

/**
 * Update Partner Real-time / Operational Status
 */
export async function updatePartnerStatusAction(
  partnerId: string,
  status: 'active' | 'offline' | 'busy' | 'suspended'
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', partnerId);

  if (error) {
    return handleDatabaseError(error);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

/**
 * Update Partner Service Tier
 */
export async function updatePartnerTierAction(
  partnerId: string,
  tier: 'premium' | 'standard'
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ service_tier: tier })
    .eq('id', partnerId);

  if (error) {
    return handleDatabaseError(error);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

/**
 * Review and Update Partner KYC Compliance Verification
 */
export async function reviewKycAction(
  partnerId: string,
  status: 'approved' | 'rejected' | 'pending',
  reason?: string
) {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    kyc_status: status,
    kyc_rejection_reason: status === 'rejected' ? (reason || null) : null
  };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', partnerId);

  if (error) {
    return handleDatabaseError(error);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

/**
 * Onboard a New Partner Profile directly
 */
export async function onboardPartnerAction(data: {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  service_tier: 'premium' | 'standard';
}) {
  const supabase = await createClient();
  const partnerId = crypto.randomUUID();

  // Create a stub partner profile
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: partnerId,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      role: 'partner',
      status: 'offline', // Default offline until onboarding finished
      city: data.city,
      service_tier: data.service_tier,
      kyc_status: 'pending',
      rating_avg: 4.8,
      rating_count: 1,
      jobs_offered_count: 0,
      jobs_accepted_count: 0,
      jobs_cancelled_count: 0,
      acceptance_rate: 1.0,
      cancellation_rate: 0.0,
      is_available: true
    });

  if (error) {
    return handleDatabaseError(error);
  }

  revalidatePath('/admin/partners');
  return { success: true, partnerId };
}
