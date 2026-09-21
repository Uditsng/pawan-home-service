"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyAdmins } from "@/lib/notifications";

export type PayoutPaymentMethod = "BANK" | "UPI" | "QR" | "OTHER";

export type PayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled";

export interface PartnerPayoutEarning {
  id: string;
  booking_id: string;
  total_amount: number;
  gst_amount: number;
  service_revenue: number;
  commission_percent: number;
  platform_commission_amount: number;
  partner_earning_amount: number;
  status: "eligible" | "reserved" | "paid" | "reversed";
  completed_at: string | null;
}

export interface PartnerPayoutEntry {
  id: string;
  payout_number: string;
  requested_amount: number;
  status: PayoutStatus;
  payment_method: string | null;
  payment_reference: string | null;
  requested_at: string;
  approved_at: string | null;
  processed_at: string | null;
  paid_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  admin_note: string | null;
}

export interface PayoutSummary {
  partner_id: string;
  payouts_enabled: boolean;
  min_payout: number;
  total_earned: number;
  paid: number;
  processing: number;
  eligible: number;
  clawback_due: number;
  available: number;
  current_payout: PartnerPayoutEntry | null;
  earnings: PartnerPayoutEarning[];
  payouts: PartnerPayoutEntry[];
}

export interface PartnerPaymentDetail {
  id: string;
  partner_id: string;
  method: PayoutPaymentMethod;
  label: string;
  value: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KycBankInfo {
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
}

async function getAuthenticatedPartner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "partner") {
    return { supabase, user: null, error: "Unauthorized: Partner access required" };
  }

  return { supabase, user, error: null };
}

/**
 * Partner self-summary: balances, withdrawal history, earnings history.
 */
export async function getPartnerPayoutSummaryAction(): Promise<PayoutSummary | null> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return null;

  const { data, error: rpcError } = await supabase.rpc("get_partner_payout_summary", {
    p_partner_id: user.id,
  });

  if (rpcError || !data) {
    console.error("getPartnerPayoutSummary rpc error:", rpcError?.message);
    return null;
  }
  return data as PayoutSummary;
}

/** Partner's own payment receiving methods (for the withdrawals page). */
export async function getPartnerPaymentDetailsAction(): Promise<PartnerPaymentDetail[]> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return [];

  const { data } = await supabase
    .from("partner_payment_details")
    .select("*")
    .order("is_primary", { ascending: false });

  return (data || []) as PartnerPaymentDetail[];
}

/** Request a withdrawal of the entire available (clawback-adjusted) earnings. */
export async function requestPayoutAction(): Promise<{ success: boolean; error?: string; amount?: number; payoutNumber?: string }> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return { success: false, error: error || "Not authenticated" };

  const { data, error: rpcError } = await supabase.rpc("request_partner_payout", {
    p_partner_id: user.id,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  const payload = (data ?? {}) as { success?: boolean; error?: string; amount?: number; payout_number?: string };

  if (payload.success) {
    revalidatePath("/partner/payouts");
    revalidatePath("/partner/earnings");
    // Notify platform admins a payout has been requested for review.
    const label = "A payout request needs review";
    const body = `₹${Number(payload.amount ?? 0).toLocaleString("en-IN")} requested. Approve, reject, or process it from Admin → Payouts.`;
    void notifyAdmins(label, body, "payout_requested", {});
    return {
      success: true,
      amount: Number(payload.amount ?? 0),
      payoutNumber: payload.payout_number ?? "",
    };
  }

  return { success: false, error: payload.error || "Unable to request a payout." };
}

/** Cancel a requested/approved payout (releases the reserved earnings). */
export async function cancelPayoutRequestAction(payoutId: string): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return { success: false, error: error || "Not authenticated" };

  const { data, error: rpcError } = await supabase.rpc("cancel_partner_payout_request", {
    p_payout_id: payoutId,
    p_partner_id: user.id,
    p_reason: "Cancelled by the professional from Payouts",
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  const payload = (data ?? {}) as { success?: boolean; error?: string };
  if (payload.success) {
    revalidatePath("/partner/payouts");
    revalidatePath("/partner/earnings");
    return { success: true };
  }
  return { success: false, error: payload.error || "Unable to cancel the payout." };
}

const PAYMENT_METHODS: readonly PayoutPaymentMethod[] = ["BANK", "UPI", "QR", "OTHER"];

function validatePaymentDetail(method: PayoutPaymentMethod, label: string, value: string): string | null {
  if (!PAYMENT_METHODS.includes(method)) return "Invalid payment method.";
  if (!label.trim()) return "Add a short label (e.g. HDFC Account or GPay).";
  if (label.trim().length > 60) return "Label must be under 60 characters.";
  if (!value.trim()) return "Payment details cannot be empty.";
  if (value.trim().length > 500) return "Details must be under 500 characters.";
  return null;
}

/** Add or update a payment receiving method (own rows only). */
export async function savePaymentDetailAction(input: {
  id?: string;
  method: PayoutPaymentMethod;
  label: string;
  value: string;
  is_primary: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return { success: false, error: error || "Not authenticated" };

  const validationError = validatePaymentDetail(input.method, input.label, input.value);
  if (validationError) return { success: false, error: validationError };

  const payload = {
    method: input.method,
    label: input.label.trim(),
    value: input.value.trim(),
    is_primary: input.is_primary,
    is_active: true,
  };

  if (input.id) {
    // Owning row check via RLS (WHERE id = own id); update.
    const { error: updateError } = await supabase
      .from("partner_payment_details")
      .update(payload)
      .eq("id", input.id)
      .eq("partner_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase.from("partner_payment_details").insert({
      ...payload,
      partner_id: user.id,
    });
    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  // Single-primary invariant is enforced by the DB trigger
  // (ensure_single_primary_payment_detail), so no client-side unsetting needed.

  revalidatePath("/partner/payouts");
  return { success: true };
}

/** Mark a saved receiving method as primary. */
export async function setPrimaryPaymentDetailAction(id: string): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return { success: false, error: error || "Not authenticated" };

  await supabase
    .from("partner_payment_details")
    .update({ is_primary: false })
    .eq("partner_id", user.id);

  const { error: updateError } = await supabase
    .from("partner_payment_details")
    .update({ is_primary: true })
    .eq("id", id)
    .eq("partner_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/partner/payouts");
  return { success: true };
}

/** Remove a saved receiving method. */
export async function removePaymentDetailAction(id: string): Promise<{ success: boolean; error?: string }> {
  const { supabase, user, error } = await getAuthenticatedPartner();
  if (error || !user) return { success: false, error: error || "Not authenticated" };

  const { error: deleteError } = await supabase
    .from("partner_payment_details")
    .delete()
    .eq("id", id)
    .eq("partner_id", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/partner/payouts");
  return { success: true };
}