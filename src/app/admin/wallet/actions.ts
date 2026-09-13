"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";

export interface AdminWalletAdjustResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

/**
 * Admin wallet adjustment via the `admin_wallet_adjustment` RPC (auth.uid()
 * based is_admin check + atomic ledger write). Never touches booking money.
 */
export async function adminAdjustWalletAction(formData: FormData): Promise<AdminWalletAdjustResult> {
  const user = await requireAdmin();

  const userId = String(formData.get("user_id") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const balanceType = String(formData.get("balance_type") || "cash").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!userId) {
    return { success: false, error: "Choose a customer." };
  }
  if (amountRaw === "" || !Number.isFinite(Number(amountRaw))) {
    return { success: false, error: "Enter a valid amount." };
  }
  if (balanceType !== "cash" && balanceType !== "bonus") {
    return { success: false, error: "Pick a valid type." };
  }
  if (reason.length > 500) {
    return { success: false, error: "Reason is too long." };
  }

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("admin_wallet_adjustment", {
    p_user_id: userId,
    p_amount: Number(amountRaw),
    p_balance_type: balanceType,
    p_reason: reason || "Admin adjustment",
  });

  if (error) {
    console.error("Error adjusting wallet:", error);
    return { success: false, error: error.message };
  }

  const res = (result ?? {}) as {
    success?: boolean;
    error?: string;
    new_balance?: number;
    before_cash?: number;
    after_cash?: number;
    before_bonus?: number;
    after_bonus?: number;
  };

  if (!res.success) {
    return { success: false, error: res.error || "This change could not be saved." };
  }

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "wallet_adjustments",
    recordId: userId,
    recordTitle: `Manual wallet adjustment (${balanceType}) — ₹${Number(amountRaw)}`,
    newData: {
      reason: reason || null,
      before_cash: res.before_cash,
      after_cash: res.after_cash,
      before_bonus: res.before_bonus,
      after_bonus: res.after_bonus,
    },
    actorUserId: user.id,
    actorEmail: user.email || undefined,
  });

  revalidatePath("/admin/wallet");
  revalidatePath("/admin/customers");

  return {
    success: true,
    newBalance: res.new_balance != null ? Number(res.new_balance) : undefined,
  };
}