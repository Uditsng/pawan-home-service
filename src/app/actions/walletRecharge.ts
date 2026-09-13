"use server";

import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { notifyCustomer } from "@/lib/notifications";

export interface WalletRechargeOrderResult {
  success: boolean;
  orderId?: string;
  rechargeId?: string;
  amount?: number;
  keyId?: string;
  currency?: string;
  error?: string;
}

export interface WalletRechargeVerifyResult {
  success: boolean;
  alreadyCredited?: boolean;
  newBalance?: number;
  error?: string;
}

export interface WalletRechargeStateResult {
  success: boolean;
  error?: string;
}

interface RechargeRow {
  id: string;
  user_id: string;
  amount: number;
  status: string;
}

/**
 * Registers wallet balance bookkeeping invariants. The gateway amount flows in
 * paise; the recharge amount is rounded to paise before comparison.
 */
function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Creates a Razorpay order for a wallet recharge and stores a pending
 * `wallet_recharges` ledger row. The customer is only ever credited later by
 * `verifyWalletRechargeAction` (or the webhook) — never here.
 */
export async function createWalletRechargeAction(
  amount: number
): Promise<WalletRechargeOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You need to sign in to recharge your wallet." };
  }

  // 1. Server-side amount validation (0 / negative / NaN / Infinity / huge).
  if (!Number.isFinite(amount) || Number.isNaN(amount)) {
    return { success: false, error: "Please enter a valid amount." };
  }
  const normalized = normalizeAmount(amount);
  if (normalized <= 0) {
    return { success: false, error: "Recharge amount must be more than ₹0." };
  }

  // 2. Enforce configured limits (source of truth is platform_settings).
  const settings = await fetchPlatformSettings(supabase);
  const min = settings.walletRechargeMin > 0 ? settings.walletRechargeMin : 20;
  const max = settings.walletRechargeMax > 0 ? settings.walletRechargeMax : 100000;

  if (normalized < min) {
    return { success: false, error: `Minimum recharge amount is ₹${min}.` };
  }
  if (normalized > max) {
    return { success: false, error: `Maximum recharge amount is ₹${max}.` };
  }

  // 3. Gateway credentials.
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { success: false, error: "Payment gateway is not configured on the server." };
  }

  // 4. Create the Razorpay order.
  let orderId: string;
  try {
    const authHeader =
      "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        amount: Math.round(normalized * 100),
        currency: "INR",
        receipt: `wr_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          purpose: "wallet_recharge",
          user_id: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[Razorpay] Wallet recharge order creation error:", errBody);
      return { success: false, error: "Could not start the payment. Please try again." };
    }

    const orderData = (await response.json()) as { id: string; amount: number; currency: string };
    orderId = orderData.id;

    // 5. Persist the pending recharge ledger row (RLS enforces own-row + status 'created').
    const { data: inserted, error: insertError } = await supabase
      .from("wallet_recharges")
      .insert({
        user_id: user.id,
        amount: normalized,
        status: "created",
        razorpay_order_id: orderId,
        metadata: { currency: orderData.currency || "INR" },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[Razorpay] Wallet recharge ledger insert failed:", insertError?.message);
      return { success: false, error: "Could not record the recharge. Please try again." };
    }

    return {
      success: true,
      orderId,
      rechargeId: inserted.id,
      amount: orderData.amount / 100,
      currency: orderData.currency || "INR",
      keyId,
    };
  } catch (err) {
    console.error("[Razorpay] Wallet recharge order exception:", (err as Error).message);
    return { success: false, error: "Payment could not be initiated. Please try again." };
  }
}

/**
 * Verifies a completed Razorpay payment server-side (HMAC signature +
 * authoritative gateway order fetch + amount match) and, only then, calls the
 * atomic `complete_wallet_recharge` RPC which credits CASH. Idempotent: a
 * recharge that already shows as success is reported as already credited.
 */
export async function verifyWalletRechargeAction(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}): Promise<WalletRechargeVerifyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You need to sign in to confirm your recharge." };
  }

  if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
    return { success: false, error: "Missing payment credentials." };
  }

  // 1. Load the recharge order for THIS user.
  const { data: recharge } = await supabase
    .from("wallet_recharges")
    .select("id, user_id, amount, status")
    .eq("razorpay_order_id", payload.razorpay_order_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!recharge) {
    return { success: false, error: "No wallet recharge found for this payment." };
  }

  const typedRecharge = recharge as unknown as RechargeRow;

  // 2. Idempotency: already settled → nothing to do.
  if (typedRecharge.status === "success") {
    return { success: true, alreadyCredited: true };
  }
  if (typedRecharge.status !== "created" && typedRecharge.status !== "pending") {
    return { success: false, error: "This recharge can no longer be credited." };
  }

  // 3. HMAC signature verification.
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { success: false, error: "Razorpay credentials missing on server." };
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== payload.razorpay_signature) {
    console.error("[Razorpay] Invalid signature on wallet recharge. Possible tampering attempt.");
    return { success: false, error: "Payment verification failed (signature mismatch)." };
  }

  // 4. Fetch the authoritative gateway order to obtain the exact charged amount.
  let gatewayAmount = 0;
  try {
    const authHeader =
      "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
    const rzResponse = await fetch(
      `https://api.razorpay.com/v1/orders/${payload.razorpay_order_id}`,
      { headers: { Authorization: authHeader } }
    );

    if (!rzResponse.ok) {
      console.error("[Razorpay] Failed to fetch wallet recharge order from gateway.");
      return { success: false, error: "Unable to verify the order with the gateway." };
    }

    const rzOrder = (await rzResponse.json()) as { amount?: number };
    gatewayAmount = (rzOrder.amount || 0) / 100;
  } catch (err) {
    console.error("[Razorpay] Wallet recharge gateway fetch exception:", (err as Error).message);
    return { success: false, error: "Unable to verify the order with the gateway." };
  }

  // 5. Amount mismatch guard — the server decides what is credited.
  if (Math.abs(gatewayAmount - Number(typedRecharge.amount)) > 1) {
    console.error(
      `[Razorpay] Wallet recharge amount mismatch: gateway ₹${gatewayAmount}, expected ₹${typedRecharge.amount}.`
    );
    return {
      success: false,
      error: "Payment amount mismatch detected. Please contact support.",
    };
  }

  // 6. Atomic, idempotent credit via the service-role-only RPC.
  const adminClient = createAdminClient();
  const { data: creditResult, error: creditError } = await adminClient.rpc(
    "complete_wallet_recharge",
    {
      p_recharge_id: typedRecharge.id,
      p_razorpay_order_id: payload.razorpay_order_id,
      p_payment_id: payload.razorpay_payment_id,
      p_signature: payload.razorpay_signature,
      p_gateway_verified_amount: Number(typedRecharge.amount),
      p_method: null,
    }
  );

  if (creditError) {
    console.error("[Razorpay] Wallet recharge credit RPC error:", creditError.message);
    return { success: false, error: "Your payment was received but could not be added yet. We are resolving this — no double credit is possible." };
  }

  const result = (creditResult ?? {}) as {
    success?: boolean;
    already_credited?: boolean;
    error?: string;
    new_balance?: number;
    credited?: number;
  };

  if (!result.success) {
    console.error("[Razorpay] Wallet recharge credit refused:", result.error);
    return {
      success: false,
      error:
        result.error === "Payment already credited."
          ? "This payment has already been credited to your wallet."
          : result.error || "Your payment could not be added to the wallet.",
    };
  }

  // 7. Notify the customer (fire-and-forget).
  void notifyCustomer(
    user.id,
    "Wallet Recharged",
    `₹${Number(result.credited ?? typedRecharge.amount).toLocaleString("en-IN")} has been added to your wallet.`,
    "wallet_recharge",
    { recharge_id: typedRecharge.id }
  );

  return {
    success: true,
    alreadyCredited: !!result.already_credited,
    newBalance: result.new_balance != null ? Number(result.new_balance) : undefined,
  };
}

/**
 * Marks a user's own recharge as failed or cancelled (for display purposes
 * after the Razorpay modal is dismissed or errors out). Never credits: the
 * only credit path is `verifyWalletRechargeAction`/`complete_wallet_recharge`.
 */
export async function markWalletRechargeStateAction(
  rechargeId: string,
  status: "failed" | "cancelled"
): Promise<WalletRechargeStateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You need to sign in." };
  }

  const { data: result, error } = await supabase.rpc("update_wallet_recharge_status", {
    p_recharge_id: rechargeId,
    p_status: status,
  });

  if (error) {
    console.error("[Razorpay] Wallet recharge status update error:", error.message);
    return { success: false, error: "Could not update the recharge status." };
  }

  const res = (result ?? {}) as { success?: boolean; error?: string };
  if (!res.success) {
    return { success: false, error: res.error || "Could not update the recharge status." };
  }

  return { success: true };
}