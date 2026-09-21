"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";
import { notifyPartner } from "@/lib/notifications";

export type AdminPayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled";

export type AdminPaymentMethod = "BANK_TRANSFER" | "UPI" | "CASH" | "OTHER";

export interface AdminPayout {
  id: string;
  payout_number: string;
  partner_id: string;
  requested_amount: number;
  status: AdminPayoutStatus;
  payment_method: string | null;
  payment_reference: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  processed_at: string | null;
  processed_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPayoutPartner {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  kyc_status: string | null;
  kyc_documents: unknown;
}

export interface AdminPaymentDetail {
  id: string;
  method: "BANK" | "UPI" | "QR" | "OTHER";
  label: string;
  value: string;
  is_primary: boolean;
  is_active: boolean;
}

export interface PayoutAdminRow {
  payout: AdminPayout;
  partner: AdminPayoutPartner;
  payment_details: AdminPaymentDetail[];
  allocations_count: number;
  event_count: number;
}

export interface PayoutReconciliation {
  rows: PayoutAdminRow[];
}

const PAYMENT_METHODS: readonly AdminPaymentMethod[] = ["BANK_TRANSFER", "UPI", "CASH", "OTHER"];

function requireReason(reason: string): string | null {
  if (!reason || !reason.trim()) return "A reason is required.";
  if (reason.trim().length > 500) return "Reason must be under 500 characters.";
  return null;
}

function validateMethod(method: string | null): string | null {
  if (method && !PAYMENT_METHODS.includes(method as AdminPaymentMethod)) {
    return "Invalid payment method.";
  }
  return null;
}

async function runPayoutAction(
  rpcName: string,
  rpcArgs: Record<string, unknown>,
  payoutNumber: string,
  partnerId: string | null,
  notification: { type: string; title: string; body: string; metadata: Record<string, unknown> } | null,
  audit: { action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE"; title?: string; newData?: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(rpcName, rpcArgs);
  if (error || !data) {
    return { success: false, error: error?.message ?? "Operation failed." };
  }

  const payload = (data as { success?: boolean; error?: string }) ?? {};
  if (!payload.success) {
    return { success: false, error: payload.error ?? "Operation failed." };
  }

  try {
    await logAdminAuditAction({
      action: audit.action,
      targetEntity: "payouts",
      recordId: (rpcArgs.p_payout_id as string | null) ?? null,
      recordTitle: payoutNumber || undefined,
      newData: audit.newData,
    });
  } catch {
    // audit failures are non-blocking
  }

  if (notification && partnerId) {
    void notifyPartner(
      partnerId,
      notification.title,
      notification.body,
      notification.type as never,
      notification.metadata
    );
  }

  revalidatePath("/admin/payouts");
  return { success: true };
}

/** Admin approves a requested payout. */
export async function approvePayoutAction(payoutId: string, payoutNumber: string, partnerId: string, partnerName: string | null) {
  const admin = await requireAdmin();
  return runPayoutAction(
    "approve_partner_payout",
    { p_payout_id: payoutId, p_admin_id: admin.id },
    payoutNumber,
    partnerId,
    {
      type: "payout_approved",
      title: "Payout approved",
      body: `Your payout ${payoutNumber} was approved. We are preparing your payment.`,
      metadata: { payout_id: payoutId, payout_number: payoutNumber },
    },
    { action: "STATUS_CHANGE", title: `Approved ${partnerName ?? ""} payout ${payoutNumber}`, newData: { status: "approved" } }
  );
}

/** Admin rejects a requested/approved payout with a reason. */
export async function rejectPayoutAction(payoutId: string, payoutNumber: string, partnerId: string, partnerName: string | null, reason: string) {
  const admin = await requireAdmin();
  const reasonError = requireReason(reason);
  if (reasonError) return { success: false, error: reasonError };

  return runPayoutAction(
    "reject_partner_payout",
    { p_payout_id: payoutId, p_admin_id: admin.id, p_reason: reason.trim() },
    payoutNumber,
    partnerId,
    {
      type: "payout_rejected",
      title: "Payout rejected",
      body: `Your payout ${payoutNumber} was not approved. ${reason.trim()}`,
      metadata: { payout_id: payoutId, payout_number: payoutNumber, reason: reason.trim() },
    },
    { action: "STATUS_CHANGE", title: `Rejected ${partnerName ?? ""} payout ${payoutNumber}`, newData: { status: "rejected", reason: reason.trim() } }
  );
}

/** Admin marks an approved payout as processing. */
export async function processPayoutAction(payoutId: string, payoutNumber: string, partnerId: string, partnerName: string | null, method: AdminPaymentMethod | "", reference: string) {
  const admin = await requireAdmin();
  const methodError = validateMethod(method || null);
  if (methodError) return { success: false, error: methodError };

  return runPayoutAction(
    "process_partner_payout",
    { p_payout_id: payoutId, p_admin_id: admin.id, p_method: method || null, p_reference: reference.trim() || null },
    payoutNumber,
    partnerId,
    {
      type: "payout_processing",
      title: "Payout being processed",
      body: `Payout ${payoutNumber} is being processed. It will reach you soon.`,
      metadata: { payout_id: payoutId, payout_number: payoutNumber },
    },
    { action: "STATUS_CHANGE", title: `Marked ${partnerName ?? ""} payout ${payoutNumber} as processing`, newData: { status: "processing", method: method || null, reference: reference.trim() || null } }
  );
}

/** Admin marks an approved/processing payout as paid. */
export async function markPaidAction(payoutId: string, payoutNumber: string, partnerId: string, partnerName: string | null, method: AdminPaymentMethod | "", reference: string) {
  const admin = await requireAdmin();
  const methodError = validateMethod(method || null);
  if (methodError) return { success: false, error: methodError };

  return runPayoutAction(
    "mark_partner_payout_paid",
    { p_payout_id: payoutId, p_admin_id: admin.id, p_method: method || null, p_reference: reference.trim() || null },
    payoutNumber,
    partnerId,
    {
      type: "payout_paid",
      title: "Payout paid 💸",
      body: `Your payout ${payoutNumber} has been paid. It should reflect in your account shortly.`,
      metadata: { payout_id: payoutId, payout_number: payoutNumber },
    },
    { action: "STATUS_CHANGE", title: `Marked ${partnerName ?? ""} payout ${payoutNumber} as paid`, newData: { status: "paid", method: method || null, reference: reference.trim() || null } }
  );
}

/** Admin cancels a requested/approved payout on behalf of a partner. */
export async function cancelPayoutAction(payoutId: string, payoutNumber: string, partnerId: string, partnerName: string | null, reason: string) {
  const reasonError = requireReason(reason);
  if (reasonError) return { success: false, error: reasonError };

  return runPayoutAction(
    "cancel_partner_payout_request",
    { p_payout_id: payoutId, p_partner_id: partnerId, p_reason: reason.trim() },
    payoutNumber,
    partnerId,
    {
      type: "payout_cancelled",
      title: "Payout cancelled",
      body: `Your payout ${payoutNumber} was cancelled. ${reason.trim()} Your earnings are back in your available balance.`,
      metadata: { payout_id: payoutId, payout_number: payoutNumber, reason: reason.trim() },
    },
    { action: "STATUS_CHANGE", title: `Cancelled ${partnerName ?? ""} payout ${payoutNumber}`, newData: { status: "cancelled", reason: reason.trim() } }
  );
}

/** Admin adds a clawback / restitution / correction adjustment to a partner's ledger. */
export async function addPayoutAdjustmentAction(input: {
  partnerId: string;
  partnerName: string | null;
  payoutId?: string | null;
  kind: "clawback" | "restitution" | "admin";
  amount: string;
  reason: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const kindError = !["clawback", "restitution", "admin"].includes(input.kind) ? "Invalid adjustment kind." : null;
  const reasonError = requireReason(input.reason);
  const amountNum = Number(input.amount);
  const amountError = !Number.isFinite(amountNum) || amountNum <= 0 ? "Enter a positive amount." : null;

  if (kindError || reasonError || amountError) {
    return { success: false, error: kindError || reasonError || amountError };
  }

  const { data, error } = await supabase.rpc("add_partner_payout_adjustment", {
    p_partner_id: input.partnerId,
    p_payout_id: input.payoutId || null,
    p_kind: input.kind,
    p_amount: amountNum,
    p_reason: input.reason.trim(),
  });
  if (error || !data) return { success: false, error: error?.message ?? "Unable to add adjustment." };

  const payload = (data ?? {}) as { success?: boolean; error?: string };
  if (!payload.success) return { success: false, error: payload.error ?? "Unable to add adjustment." };

  try {
    await logAdminAuditAction({
      action: "UPDATE",
      targetEntity: "payouts",
      recordId: input.payoutId || null,
      recordTitle: `${input.partnerName ?? ""} payout adjustment`,
      newData: { kind: input.kind, amount: amountNum, reason: input.reason.trim() },
    });
  } catch {
    // non-blocking
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/partners");
  return { success: true, amount: amountNum };
}