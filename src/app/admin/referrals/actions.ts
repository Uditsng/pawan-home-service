"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";

function readReferralId(formData: FormData): string {
  const referralId = String(formData.get("referral_id") || "").trim();
  if (!referralId) {
    throw new Error("Missing referral id.");
  }
  return referralId;
}

/**
 * Manually trigger the atomic dual wallet credit for a pending wallet_v1 referral.
 * Idempotent — safe to retry; the RPC returns already_rewarded for completed rows.
 */
export async function rewardReferralAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const referralId = readReferralId(formData);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reward_customer_referral", {
    p_referral_id: referralId,
  });

  if (error) {
    console.error("Error rewarding referral:", error);
    throw new Error(error.message);
  }

  const result = (data ?? {}) as Record<string, unknown>;

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "referrals",
    recordId: referralId,
    recordTitle: "Manually rewarded referral (wallet_v1)",
    newData: { result },
  });

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/referrals/${referralId}`);
}

/**
 * Cancel a pending referral. Audits the action and records a referral_event.
 */
export async function cancelReferralAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const referralId = readReferralId(formData);
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("referrals")
    .update({ status: "cancelled" })
    .eq("id", referralId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Error cancelling referral:", updateError);
    throw new Error(updateError.message);
  }

  await supabase.from("referral_events").insert({
    referral_id: referralId,
    event_type: "cancelled",
    actor_role: "admin",
    reason: "Cancelled by administrator",
  });

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "referrals",
    recordId: referralId,
    recordTitle: "Referral cancelled by admin",
    newData: { status: "cancelled" },
  });

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/referrals/${referralId}`);
}