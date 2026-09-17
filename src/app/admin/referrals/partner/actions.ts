"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";

const PARTNER_REFERRAL_STATUSES = ["invalid", "duplicate", "fraud_review", "rejected"] as const;

function readReferralId(formData: FormData): string {
  const referralId = String(formData.get("referral_id") || "").trim();
  if (!referralId) {
    throw new Error("Missing referral id.");
  }
  return referralId;
}

type PartnerReferralRpc = { success?: boolean; error?: string };

/**
 * Force-settle an eligible partner referral and atomically credit both wallets.
 * Idempotent — retry-safe; the RPC returns already_rewarded for settled rows.
 */
export async function rewardPartnerReferralAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const referralId = readReferralId(formData);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reward_partner_referral", {
    p_referral_id: referralId,
  });

  if (error) {
    console.error("Error rewarding partner referral:", error);
    throw new Error(error.message);
  }

  const result = (data ?? {}) as PartnerReferralRpc;

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "partner_referrals",
    recordId: referralId,
    recordTitle: "Manually rewarded partner referral",
    newData: { result },
  });

  revalidatePath("/admin/referrals/partner");
  revalidatePath(`/admin/referrals/partner/${referralId}`);
}

/**
 * Manually move a non-rewarded partner referral to an admin status
 * (invalid / duplicate / fraud_review / rejected).
 */
export async function markPartnerReferralStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const referralId = readReferralId(formData);
  const status = String(formData.get("status") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!PARTNER_REFERRAL_STATUSES.includes(status as (typeof PARTNER_REFERRAL_STATUSES)[number])) {
    throw new Error("Invalid target status for a partner referral.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("mark_partner_referral_status", {
    p_referral_id: referralId,
    p_status: status,
    p_reason: reason || null,
  });

  if (error) {
    console.error("Error changing partner referral status:", error);
    throw new Error(error.message);
  }

  const result = (data ?? {}) as PartnerReferralRpc;
  if (result.success === false) {
    throw new Error(result.error ?? "Failed to update status.");
  }

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "partner_referrals",
    recordId: referralId,
    recordTitle: `Partner referral marked ${status}`,
    newData: { result, reason },
  });

  revalidatePath("/admin/referrals/partner");
  revalidatePath(`/admin/referrals/partner/${referralId}`);
}

/**
 * Reverse a rewarded partner referral — debits both wallets (bonus, never negative)
 * and records an audit event. Requires a reason.
 */
export async function reversePartnerReferralAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const referralId = readReferralId(formData);
  const reason = String(formData.get("reason") || "").trim();

  if (!reason) {
    throw new Error("A reversal reason is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reverse_partner_referral", {
    p_referral_id: referralId,
    p_reason: reason,
  });

  if (error) {
    console.error("Error reversing partner referral:", error);
    throw new Error(error.message);
  }

  const result = (data ?? {}) as PartnerReferralRpc;
  if (result.success === false) {
    throw new Error(result.error ?? "Failed to reverse referral.");
  }

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "partner_referrals",
    recordId: referralId,
    recordTitle: "Partner referral reversed (wallet debited)",
    newData: { result, reason },
  });

  revalidatePath("/admin/referrals/partner");
  revalidatePath(`/admin/referrals/partner/${referralId}`);
}