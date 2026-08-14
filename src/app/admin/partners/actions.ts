"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normaliseIndianPhone } from "@/lib/twilio";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Convert a database error into a user-friendly, structured failure message.
 * Never throws for expected database failures — Next.js would otherwise redact
 * the message and show the generic "Server Components render" error banner.
 */
function toActionError(error: { message?: string; code?: string } | null | undefined): ActionResult {
  const message = error?.message || "An unknown database error occurred.";
  console.error("Database operation failed:", error);

  if (message.includes("column") || error?.code === "42703") {
    return {
      success: false,
      error:
        "Database schema is missing Fleet Control columns ('service_tier', 'kyc_status', 'kyc_rejection_reason', 'kyc_documents') on the 'profiles' table. " +
        "Please run the pending migrations in your Supabase SQL Editor.",
    };
  }

  return { success: false, error: message };
}

/**
 * Update Partner Real-time / Operational Status
 */
export async function updatePartnerStatusAction(
  partnerId: string,
  status: 'active' | 'offline' | 'busy' | 'suspended'
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', partnerId);

  if (error) {
    return toActionError(error);
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
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ service_tier: tier })
    .eq('id', partnerId);

  // service_tier is an optional Fleet Control column. If it does not exist on
  // the live DB, treat the update as a no-op instead of failing hard.
  if (error && error.code !== '42703' && !error.message?.includes('column')) {
    return toActionError(error);
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
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    kyc_status: status,
    kyc_rejection_reason: status === 'rejected' ? (reason || null) : null
  };

  // When approving KYC, route the partner to onboarding if they haven't
  // completed it yet (no assigned services). This ensures admin-onboarded
  // partners move to the setup step instead of the dashboard, without
  // affecting partners who already completed onboarding.
  if (status === 'approved') {
    const { count: servicesCount } = await supabase
      .from('partner_services')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partnerId);

    if (servicesCount === 0) {
      updateData.status = 'pending';
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', partnerId);

  if (error) {
    return toActionError(error);
  }

  revalidatePath('/admin/partners');
  return { success: true };
}

/**
 * Onboard a New Partner Profile directly.
 *
 * Uses Supabase's official Admin Auth API (service role) to create the auth
 * user safely, then upserts the profiles row with partner metadata. Returns a
 * structured error object instead of throwing, so failures surface as clean
 * inline messages instead of the redacted Next.js production error banner.
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
}): Promise<ActionResult & { partnerId?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const generatedPassword = data.password || "PavanStaff123!";

  let e164Phone: string;
  try {
    e164Phone = normaliseIndianPhone(data.phone);
  } catch {
    return { success: false, error: "Invalid mobile number. Must be a 10-digit Indian mobile number." };
  }

  // 1. Create the auth user via the official Admin Auth API.
  //    Safe against duplicates: createUser returns an error we translate below.
  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: generatedPassword,
    phone: e164Phone,
    email_confirm: true,
    user_metadata: { role: 'partner', full_name: data.full_name },
  });

  if (createError) {
    console.error("createUser failed:", createError);
    const message = createError.message?.toLowerCase() || "";
    if (message.includes("already registered") || message.includes("already been registered")) {
      return {
        success: false,
        error: "An account with this email or mobile number already exists.",
      };
    }
    return { success: false, error: `Failed to create account: ${createError.message}` };
  }

  if (!createdUser?.user?.id) {
    return { success: false, error: "Failed to create account: no user returned from auth service." };
  }

  const partnerId = createdUser.user.id;

  // 2. Upsert the profiles row with core partner fields.
  //    status='pending' so the middleware routes the partner to onboarding
  //    (services/pincodes setup) after login. The optional Fleet Control
  //    columns (service_tier, kyc_status, is_available) are applied as
  //    best-effort so onboarding never breaks when the live DB lacks them.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: partnerId,
    email: data.email,
    phone: e164Phone,
    full_name: data.full_name,
    role: 'partner',
    status: 'pending',
  }, { onConflict: 'id' });

  if (profileError) {
    return toActionError(profileError);
  }

  // 2b. Best-effort: KYC is assumed approved when the admin adds a partner
  //     directly (no documents needed). Skipped silently if the column is
  //     missing so onboarding never breaks on an outdated schema.
  const { error: kycError } = await admin
    .from('profiles')
    .update({ kyc_status: 'approved' })
    .eq('id', partnerId);
  if (kycError && kycError.code !== '42703' && !kycError.message?.includes('column')) {
    return toActionError(kycError);
  }

  // 2c. Best-effort: set city when the column exists. Never blocks onboarding.
  const { error: cityError } = await admin
    .from('profiles')
    .update({ city: data.city })
    .eq('id', partnerId);
  if (cityError && cityError.code !== '42703' && !cityError.message?.includes('column')) {
    return toActionError(cityError);
  }

  // 3. Insert assigned services
  if (data.services.length > 0) {
    const partnerServices = data.services.map(service_id => ({
      partner_id: partnerId,
      service_id
    }));
    const { error: psError } = await admin
      .from('partner_services')
      .insert(partnerServices);
    if (psError) return toActionError(psError);
  }

  // 4. Insert assigned pincodes
  if (data.pincodes.length > 0) {
    const partnerAreas = data.pincodes.map(pincode => ({
      partner_id: partnerId,
      pincode,
      city: data.city
    }));
    const { error: paError } = await admin
      .from('partner_service_areas')
      .insert(partnerAreas);
    if (paError) return toActionError(paError);
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
  status: 'pending' | 'active' | 'offline' | 'busy' | 'suspended';
  is_available: boolean;
  services: string[];
  pincodes: string[];
}): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  // Update auth user via the official Admin Auth API
  const updateUserInput: {
    email: string;
    phone: string;
    password?: string;
    user_metadata: { full_name: string };
  } = {
    email: data.email,
    phone: data.phone,
    user_metadata: { full_name: data.full_name },
  };
  if (data.password && data.password.trim().length > 0) {
    updateUserInput.password = data.password;
  }

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(data.id, updateUserInput);

  if (authUpdateError) {
    console.error("updateUserById failed:", authUpdateError);
    const message = authUpdateError.message?.toLowerCase() || "";
    if (message.includes("already registered") || message.includes("already been registered")) {
      return {
        success: false,
        error: "An account with this email or mobile number already exists.",
      };
    }
    return toActionError(authUpdateError);
  }

  // Update partner profile core fields. Fleet Control columns (service_tier,
  // is_available) are optional and may not exist on the live DB, so they are
  // only applied when available — never blocking the edit.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      status: data.status,
      full_name: data.full_name,
    })
    .eq('id', data.id);

  if (profileError) {
    return toActionError(profileError);
  }

  // Best-effort: apply optional columns (city, service_tier, is_available)
  // when the schema supports them.
  const { error: optionalError } = await admin
    .from('profiles')
    .update({
      city: data.city,
      service_tier: data.service_tier,
      is_available: data.is_available,
    })
    .eq('id', data.id);
  if (optionalError && optionalError.code !== '42703' && !optionalError.message?.includes('column')) {
    return toActionError(optionalError);
  }

  // Update services
  await admin.from('partner_services').delete().eq('partner_id', data.id);
  if (data.services.length > 0) {
    const partnerServices = data.services.map(service_id => ({
      partner_id: data.id,
      service_id
    }));
    const { error: psError } = await admin
      .from('partner_services')
      .insert(partnerServices);
    if (psError) return toActionError(psError);
  }

  // Update pincodes
  await admin.from('partner_service_areas').delete().eq('partner_id', data.id);
  if (data.pincodes.length > 0) {
    const partnerAreas = data.pincodes.map(pincode => ({
      partner_id: data.id,
      pincode,
      city: data.city
    }));
    const { error: paError } = await admin
      .from('partner_service_areas')
      .insert(partnerAreas);
    if (paError) return toActionError(paError);
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
): Promise<ActionResult> {
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
    return toActionError(error);
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
