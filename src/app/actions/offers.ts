"use server";

import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyCustomer } from "@/lib/notifications";

export interface OfferPurchaseOrderResult {
  success: boolean;
  orderId?: string;
  purchaseId?: string;
  amount?: number;
  keyId?: string;
  currency?: string;
  error?: string;
}

export interface OfferPurchaseVerifyResult {
  success: boolean;
  alreadyActivated?: boolean;
  entitlementId?: string;
  error?: string;
}

export interface OfferPurchaseStateResult {
  success: boolean;
  error?: string;
}

interface OfferRow {
  title: string;
  purchase_price: number;
  status: string;
}

interface PurchaseRow {
  id: string;
  offer_id: string;
  customer_id: string;
  amount: number;
  status: string;
}

/**
 * Normalizes rupee amounts to 2 decimals (gateway uses paise).
 */
function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Creates a Razorpay order for an offer purchase and stores a pending
 * `offer_purchases` ledger row. The customer only ever receives the entitlement
 * later via `verifyOfferPurchaseAction` (or the webhook) — never here.
 */
export async function createOfferPurchaseAction(
  offerId: string
): Promise<OfferPurchaseOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in to purchase an offer." };

  if (!offerId) return { success: false, error: "Please choose an offer." };

  // 1. Fetch the offer, confirm it is purchasable right now.
  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select("title, purchase_price, status")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offerData) {
    return { success: false, error: "This offer could not be found." };
  }

  const offer = offerData as unknown as OfferRow;
  if (offer.status !== "active") {
    return { success: false, error: "This offer is not currently available." };
  }

  const amount = normalizeAmount(Number(offer.purchase_price) || 0);
  if (amount <= 0) {
    return { success: false, error: "This offer is free — claim it instead of paying." };
  }

  // 2. Gateway credentials.
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return { success: false, error: "Payment gateway is not configured on the server." };
  }

  // 3. Create the Razorpay order.
  let orderId: string;
  try {
    const authHeader =
      "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `ofr_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          purpose: "offer_purchase",
          offer_id: offerId,
          user_id: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[Razorpay] Offer purchase order creation error:", errBody);
      return { success: false, error: "Could not start the payment. Please try again." };
    }

    const orderData = (await response.json()) as { id: string; amount: number; currency: string };
    orderId = orderData.id;

    // 4. Persist the pending offer purchase ledger row (RLS enforces
    //    own-row + status 'created').
    const { data: inserted, error: insertError } = await supabase
      .from("offer_purchases")
      .insert({
        offer_id: offerId,
        customer_id: user.id,
        amount,
        status: "created",
        razorpay_order_id: orderId,
        metadata: { currency: orderData.currency || "INR" },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[Razorpay] Offer purchase ledger insert failed:", insertError?.message);
      return { success: false, error: "Could not record the purchase. Please try again." };
    }

    return {
      success: true,
      orderId,
      purchaseId: inserted.id,
      amount: orderData.amount / 100,
      currency: orderData.currency || "INR",
      keyId,
    };
  } catch (err) {
    console.error("[Razorpay] Offer purchase order exception:", (err as Error).message);
    return { success: false, error: "Payment could not be initiated. Please try again." };
  }
}

/**
 * Verifies a completed Razorpay payment server-side (HMAC signature +
 * authoritative gateway order fetch + amount match) and, only then, calls the
 * atomic service-role-only `complete_offer_purchase` RPC which creates the
 * customer's entitlement. Idempotent: already-success purchases are reported
 * as already activated.
 */
export async function verifyOfferPurchaseAction(payload: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}): Promise<OfferPurchaseVerifyResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You need to sign in to confirm your purchase." };
  }

  if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
    return { success: false, error: "Missing payment credentials." };
  }

  // 1. Load the purchase for THIS user.
  const { data: purchase } = await supabase
    .from("offer_purchases")
    .select("id, offer_id, customer_id, amount, status")
    .eq("razorpay_order_id", payload.razorpay_order_id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!purchase) {
    return { success: false, error: "No offer purchase found for this payment." };
  }

  const typedPurchase = purchase as unknown as PurchaseRow;

  // 2. Idempotency: already settled → nothing to do.
  if (typedPurchase.status === "success") {
    return { success: true, alreadyActivated: true };
  }
  if (typedPurchase.status !== "created" && typedPurchase.status !== "pending") {
    return { success: false, error: "This purchase can no longer be activated." };
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
    console.error("[Razorpay] Invalid signature on offer purchase. Possible tampering attempt.");
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
      console.error("[Razorpay] Failed to fetch offer purchase order from gateway.");
      return { success: false, error: "Unable to verify the order with the gateway." };
    }

    const rzOrder = (await rzResponse.json()) as { amount?: number };
    gatewayAmount = (rzOrder.amount || 0) / 100;
  } catch (err) {
    console.error("[Razorpay] Offer purchase gateway fetch exception:", (err as Error).message);
    return { success: false, error: "Unable to verify the order with the gateway." };
  }

  // 5. Amount mismatch guard — the server decides what is activated.
  if (Math.abs(gatewayAmount - Number(typedPurchase.amount)) > 1) {
    console.error(
      `[Razorpay] Offer purchase amount mismatch: gateway ₹${gatewayAmount}, expected ₹${typedPurchase.amount}.`
    );
    return {
      success: false,
      error: "Payment amount mismatch detected. Please contact support.",
    };
  }

  // 6. Atomic, idempotent entitlement creation via the service-role-only RPC.
  const adminClient = createAdminClient();
  const { data: creditResult, error: creditError } = await adminClient.rpc(
    "complete_offer_purchase",
    {
      p_purchase_id: typedPurchase.id,
      p_razorpay_order_id: payload.razorpay_order_id,
      p_payment_id: payload.razorpay_payment_id,
      p_signature: payload.razorpay_signature,
      p_gateway_verified_amount: Number(typedPurchase.amount),
      p_method: null,
    }
  );

  if (creditError) {
    console.error("[Razorpay] Offer purchase activation RPC error:", creditError.message);
    return { success: false, error: "Your payment was received but the offer could not be activated yet. We are resolving this — no double activation is possible." };
  }

  const result = (creditResult ?? {}) as {
    success?: boolean;
    already_completed?: boolean;
    error?: string;
    entitlement_id?: string;
    paid?: number;
  };

  if (!result.success) {
    console.error("[Razorpay] Offer purchase activation refused:", result.error);
    return {
      success: false,
      error:
        result.error ||
        "Your payment could not be converted into an offer. Please contact support.",
    };
  }

  // 7. Notify the customer (fire-and-forget).
  const { data: offerData } = await supabase
    .from("offers")
    .select("title")
    .eq("id", typedPurchase.offer_id)
    .maybeSingle();
  const offerTitle = (offerData as { title?: string } | null)?.title || "offer";

  void notifyCustomer(
    user.id,
    "Offer Activated",
    `Your ${offerTitle} offer is now active. Apply it at checkout.`,
    "offer_purchase",
    { entitlement_id: result.entitlement_id, offer_id: typedPurchase.offer_id }
  );

  return {
    success: true,
    alreadyActivated: !!result.already_completed,
    entitlementId: result.entitlement_id,
  };
}

/**
 * Marks a user's own offer purchase as failed or cancelled (for display
 * purposes after the Razorpay modal is dismissed or errors out). Never
 * activates an entitlement — the only activation paths are
 * `verifyOfferPurchaseAction`, `purchaseOfferWithWalletAction`,
 * `claimFreeOfferAction`, and the webhook.
 */
export async function markOfferPurchaseStateAction(
  purchaseId: string,
  status: "failed" | "cancelled"
): Promise<OfferPurchaseStateResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in." };

  const { data: result, error } = await supabase.rpc("update_offer_purchase_status", {
    p_purchase_id: purchaseId,
    p_status: status,
  });

  if (error) {
    console.error("[Razorpay] Offer purchase status update error:", error.message);
    return { success: false, error: "Could not update the purchase status." };
  }

  const res = (result ?? {}) as { success?: boolean; error?: string };
  if (!res.success) {
    return { success: false, error: res.error || "Could not update the purchase status." };
  }

  return { success: true };
}

/**
 * Purchases an offer entirely from the wallet (bonus-first, atomic RPC).
 * The entitlement is created in the same transaction as the wallet debit.
 */
export async function purchaseOfferWithWalletAction(
  offerId: string
): Promise<OfferPurchaseVerifyResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in to purchase an offer." };

  if (!offerId) return { success: false, error: "Please choose an offer." };

  const { data: result, error } = await supabase.rpc("purchase_offer_with_wallet", {
    p_offer_id: offerId,
    p_customer_id: user.id,
  });

  if (error) {
    console.error("[Razorpay] Offer wallet purchase error:", error.message);
    return { success: false, error: "Could not process the wallet purchase." };
  }

  const res = (result ?? {}) as {
    success?: boolean;
    error?: string;
    entitlement_id?: string;
  };

  if (!res.success) {
    return { success: false, error: res.error || "Could not purchase this offer with your wallet." };
  }

  void notifyCustomer(
    user.id,
    "Offer Activated",
    "Your offer was purchased using your wallet balance.",
    "offer_purchase",
    { entitlement_id: res.entitlement_id, offer_id: offerId }
  );

  return { success: true, entitlementId: res.entitlement_id };
}

/**
 * Claims a free offer (purchase_price = 0). Idempotent — a second claim for
 * the same offer is blocked by the unique (offer_id, customer_id) index.
 */
export async function claimFreeOfferAction(
  offerId: string
): Promise<OfferPurchaseVerifyResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in to claim this offer." };

  if (!offerId) return { success: false, error: "Please choose an offer." };

  const { data: result, error } = await supabase.rpc("claim_free_offer", {
    p_offer_id: offerId,
    p_customer_id: user.id,
  });

  if (error) {
    console.error("[Razorpay] Offer free claim error:", error.message);
    return { success: false, error: "Could not claim this offer." };
  }

  const res = (result ?? {}) as {
    success?: boolean;
    error?: string;
    entitlement_id?: string;
  };

  if (!res.success) {
    return { success: false, error: res.error || "Could not claim this offer." };
  }

  void notifyCustomer(
    user.id,
    "Offer Claimed",
    "Your free offer has been added to My Offers.",
    "offer_purchase",
    { entitlement_id: res.entitlement_id, offer_id: offerId }
  );

  return { success: true, entitlementId: res.entitlement_id };
}