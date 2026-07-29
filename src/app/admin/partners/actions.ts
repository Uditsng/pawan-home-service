"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Helper to check schema column exceptions and throw user-friendly instructions.
 */
function handleDatabaseError(error: { message?: string; code?: string }): never {
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
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
  password?: string;
  city: string;
  service_tier: 'premium' | 'standard';
  services: string[];
  pincodes: string[];
}) {
  await requireAdmin();
  const supabase = await createClient();

  const generatedPassword = data.password || "PavanStaff123!";

  // Create a stub partner profile and auth user via RPC
  const { data: partnerId, error: rpcError } = await supabase.rpc('create_staff_user', {
    p_email: data.email,
    p_password: generatedPassword,
    p_phone: data.phone,
    p_full_name: data.full_name,
    p_city: data.city,
    p_service_tier: data.service_tier
  });

  if (rpcError || !partnerId) {
    return handleDatabaseError(rpcError || new Error("Failed to generate staff user ID."));
  }

  // Insert assigned services
  if (data.services.length > 0) {
    const partnerServices = data.services.map(service_id => ({
      partner_id: partnerId,
      service_id
    }));
    const { error: psError } = await supabase
      .from('partner_services')
      .insert(partnerServices);
    if (psError) return handleDatabaseError(psError);
  }

  // Insert assigned pincodes
  if (data.pincodes.length > 0) {
    const partnerAreas = data.pincodes.map(pincode => ({
      partner_id: partnerId,
      pincode,
      city: data.city
    }));
    const { error: paError } = await supabase
      .from('partner_service_areas')
      .insert(partnerAreas);
    if (paError) return handleDatabaseError(paError);
  }

  revalidatePath('/admin/partners');
  return { success: true, partnerId };
}

/**
 * Edit a Partner Profile details, services and service areas
 */
export async function editPartnerAction(data: {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  city: string;
  service_tier: 'premium' | 'standard';
  status: 'active' | 'offline' | 'busy' | 'suspended';
  is_available: boolean;
  services: string[];
  pincodes: string[];
}) {
  await requireAdmin();
  const supabase = await createClient();

  // Call update_staff_user RPC
  const { error: rpcError } = await supabase.rpc('update_staff_user', {
    p_id: data.id,
    p_email: data.email,
    p_password: data.password || null,
    p_phone: data.phone,
    p_full_name: data.full_name
  });

  if (rpcError) {
    return handleDatabaseError(rpcError);
  }

  // Update other profile columns directly
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      city: data.city,
      service_tier: data.service_tier,
      status: data.status,
      is_available: data.is_available
    })
    .eq('id', data.id);

  if (profileError) {
    return handleDatabaseError(profileError);
  }

  // Update services
  await supabase.from('partner_services').delete().eq('partner_id', data.id);
  if (data.services.length > 0) {
    const partnerServices = data.services.map(service_id => ({
      partner_id: data.id,
      service_id
    }));
    const { error: psError } = await supabase
      .from('partner_services')
      .insert(partnerServices);
    if (psError) return handleDatabaseError(psError);
  }

  // Update pincodes
  await supabase.from('partner_service_areas').delete().eq('partner_id', data.id);
  if (data.pincodes.length > 0) {
    const partnerAreas = data.pincodes.map(pincode => ({
      partner_id: data.id,
      pincode,
      city: data.city
    }));
    const { error: paError } = await supabase
      .from('partner_service_areas')
      .insert(partnerAreas);
    if (paError) return handleDatabaseError(paError);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

/**
 * Save CRM Internal Note and Risk Trigger Reason for Partner
 */
export async function savePartnerNoteAction(
  partnerId: string, 
  noteText: string, 
  riskTrigger?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    internal_note: noteText
  };

  if (riskTrigger !== undefined) {
    updateData.risk_trigger = riskTrigger;
  }

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
 * Fetch Bookings for a specific Partner on-demand (used in Fleet details drawer)
 */
export async function getPartnerBookingsAction(partnerId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      total_amount,
      created_at,
      scheduled_date,
      pincode,
      city,
      services:services (
        title,
        category
      ),
      customer:profiles!bookings_customer_id_fkey (
        full_name
      )
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Fetch Reviews for a specific Partner on-demand (used in Fleet details drawer & reviews modal)
 */
export async function getPartnerReviewsAction(partnerId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      bookings:bookings!reviews_booking_id_fkey (
        services:services (
          title
        )
      ),
      customer:profiles!reviews_customer_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export interface PartnerEarningsSummary {
  totalEarnings: number;
  thisMonthEarnings: number;
  avgPerJob: number;
  totalCommission: number;
  totalServiceRevenue: number;
  totalGst: number;
  jobsCount: number;
  monthlyTrend: { month: string; payout: number; jobs: number }[];
}

export async function getPartnerEarningsAction(partnerId: string): Promise<PartnerEarningsSummary> {
  await requireAdmin();
  const supabase = await createClient();

  const [settingsResult, bookingsResult] = await Promise.all([
    supabase.from("platform_settings").select("value").eq("key", "platform_commission").single(),
    supabase
      .from("bookings")
      .select("id, total_amount, created_at")
      .eq("partner_id", partnerId)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
  ]);

  const commissionPercent = Number(settingsResult.data?.value ?? 20);
  const bookings = (bookingsResult.data || []) as { id: string; total_amount: number; created_at: string }[];

  const bookingIds = bookings.map((b) => b.id);
  let pricingMap = new Map<string, number>();
  if (bookingIds.length > 0) {
    const { data: pricingData } = await supabase
      .from("booking_pricing")
      .select("booking_id, gst_amount")
      .in("booking_id", bookingIds);
    pricingMap = new Map((pricingData || []).map((p: { booking_id: string; gst_amount: number }) => [p.booking_id, p.gst_amount]));
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalAmount = 0, totalGst = 0, monthAmount = 0, monthGst = 0;
  const monthGroups = new Map<string, { total: number; gst: number; count: number }>();

  for (const b of bookings) {
    const amt = Number(b.total_amount || 0);
    const gst = Number(pricingMap.get(b.id) || 0);
    totalAmount += amt;
    totalGst += gst;

    const d = new Date(b.created_at);
    if (d >= monthStart) {
      monthAmount += amt;
      monthGst += gst;
    }

    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!monthGroups.has(key)) monthGroups.set(key, { total: 0, gst: 0, count: 0 });
    const g = monthGroups.get(key)!;
    g.total += amt;
    g.gst += gst;
    g.count++;
  }

  const calc = (total: number, gst: number) => {
    const svcRev = Math.max(0, total) - Math.max(0, gst);
    const comm = Math.round(svcRev * (commissionPercent / 100));
    return { svcRev, comm, payout: Math.round(svcRev * ((100 - commissionPercent) / 100)) };
  };

  const lifetime = calc(totalAmount, totalGst);
  const month = calc(monthAmount, monthGst);
  const avg = bookings.length > 0 ? Math.round(lifetime.payout / bookings.length) : 0;

  const monthlyTrend = Array.from(monthGroups.entries()).reverse().slice(0, 12).map(([m, g]) => {
    const e = calc(g.total, g.gst);
    return { month: m, payout: e.payout, jobs: g.count };
  });

  return {
    totalEarnings: lifetime.payout,
    thisMonthEarnings: month.payout,
    avgPerJob: avg,
    totalCommission: lifetime.comm,
    totalServiceRevenue: lifetime.svcRev,
    totalGst: totalGst,
    jobsCount: bookings.length,
    monthlyTrend,
  };
}
