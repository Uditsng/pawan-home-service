"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { OfferCard } from "@/components/Offers/OfferCard";
import {
  createOfferPurchaseAction,
  verifyOfferPurchaseAction,
  markOfferPurchaseStateAction,
  purchaseOfferWithWalletAction,
  claimFreeOfferAction,
} from "@/app/actions/offers";
import { invalidateCacheKeys } from "@/lib/cache/invalidation";
import type { Offer, OfferEntitlement } from "@/lib/types";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CustomWindow {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
}

interface OfferPurchaseClientProps {
  offer: Offer;
  myEntitlement: OfferEntitlement | null;
  walletBalance: number;
  purchasable: boolean;
  userId: string;
}

type MessageState = { type: "success" | "error" | "info"; text: string } | null;

function formatINR(amount: number): string {
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function OfferPurchaseClient({
  offer,
  myEntitlement,
  walletBalance,
  purchasable,
  userId,
}: OfferPurchaseClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const isFree = offer.purchase_price <= 0;
  const canAfford = walletBalance >= offer.purchase_price;

  const handleRazorpay = async () => {
    if (isProcessing) return;
    setMessage(null);
    setIsProcessing("razorpay");
    try {
      const order = await createOfferPurchaseAction(offer.id);
      if (!order.success || !order.orderId) {
        setMessage({ type: "error", text: order.error || "Could not start the payment." });
        return;
      }

      const customWindow = window as unknown as CustomWindow;
      if (!customWindow.Razorpay) {
        setMessage({ type: "error", text: "Payment window could not open. Please try again." });
        setIsProcessing(null);
        return;
      }

      const isNativeApp = Capacitor.isNativePlatform();
      const purchaseId = order.purchaseId;

      const options = {
        key: order.keyId,
        ...(isNativeApp ? { webview_intent: true } : {}),
        amount: order.amount,
        currency: order.currency ?? "INR",
        name: "PHS Cleaning Company",
        description: `${offer.title} — ${formatINR(order.amount ?? offer.purchase_price)}`,
        order_id: order.orderId,
        theme: { color: "#002261" },
        method: { card: true, upi: true, netbanking: true, wallet: false, emi: false, paylater: false },
        ...(isNativeApp
          ? {}
          : {
              config: {
                display: {
                  blocks: {
                    preferred: {
                      name: "Payment Options",
                      instruments: [{ method: "card" }, { method: "upi" }, { method: "netbanking" }],
                    },
                  },
                  sequence: ["block.preferred"],
                  preferences: { show_default_blocks: false },
                },
              },
            }),
        handler: async function (response: RazorpaySuccessResponse) {
          if (!response.razorpay_payment_id) {
            setMessage({ type: "error", text: "Payment not completed. No amount was charged." });
            setIsProcessing(null);
            return;
          }
          try {
            const verifyRes = await verifyOfferPurchaseAction({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.success) {
              invalidateCacheKeys(["wallet", "notifications", `partner_jobs_${userId}`]);
              setMessage({
                type: "success",
                text: verifyRes.alreadyActivated
                  ? "This offer was already activated for you."
                  : `${offer.title} is now in My Offers!`,
              });
              router.refresh();
            } else {
              setMessage({ type: "error", text: verifyRes.error || "Payment verification failed." });
            }
          } catch (err) {
            console.error("Offer purchase verification error:", err);
            setMessage({ type: "error", text: "We got your payment and are still confirming it. Check My Offers soon — you won't be charged twice." });
          } finally {
            setIsProcessing(null);
          }
        },
        modal: {
          ondismiss: function () {
            if (purchaseId) {
              void markOfferPurchaseStateAction(purchaseId, "cancelled");
            }
            setMessage({ type: "info", text: "Payment cancelled. No amount was charged." });
            setIsProcessing(null);
          },
        },
      };

      const rzp = new customWindow.Razorpay(options as unknown as Record<string, unknown>);
      rzp.open();
    } catch (err) {
      console.error("Offer purchase init error:", err);
      setMessage({ type: "error", text: (err as Error).message || "Failed to start the payment. Please try again." });
      setIsProcessing(null);
    }
  };

  const handleWallet = async () => {
    if (isProcessing) return;
    setMessage(null);
    setIsProcessing("wallet");
    const res = await purchaseOfferWithWalletAction(offer.id);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Could not purchase this offer." });
      setIsProcessing(null);
      return;
    }
    invalidateCacheKeys(["wallet", "notifications", `partner_jobs_${userId}`]);
    setMessage({ type: "success", text: `${offer.title} purchased from your wallet!` });
    router.refresh();
    setIsProcessing(null);
  };

  const handleFreeClaim = async () => {
    if (isProcessing) return;
    setMessage(null);
    setIsProcessing("free");
    const res = await claimFreeOfferAction(offer.id);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Could not claim this offer." });
      setIsProcessing(null);
      return;
    }
    invalidateCacheKeys(["notifications", `partner_jobs_${userId}`]);
    setMessage({ type: "success", text: `${offer.title} claimed — it's in My Offers!` });
    router.refresh();
    setIsProcessing(null);
  };

  if (!purchasable && !myEntitlement) {
    return (
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 p-8 text-center space-y-3">
        <OfferCard offer={offer} size="lg" className="opacity-70" />
        <p className="font-bold text-primary font-headline">This offer is no longer available</p>
        <p className="text-xs text-on-surface-variant max-w-70 mx-auto">
          It may have ended or sold out. Browse the latest offers to find a new deal.
        </p>
        <Link
          href="/customer/offers"
          className="inline-block mt-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          View offers
        </Link>
      </div>
    );
  }

  return (
    <>
      <OfferCard offer={offer} size="lg" />

      {message && (
        <div
          className={`px-4 py-3 rounded-2xl text-xs font-semibold border ${
            message.type === "success"
              ? "bg-secondary/10 border-secondary/30 text-emerald-700"
              : message.type === "error"
              ? "bg-red-500/5 border-red-500/20 text-red-600"
              : "bg-amber-500/10 border-amber-500/20 text-amber-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {myEntitlement ? (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-secondary drop-shadow-sm">verified</span>
          </div>
          <div>
            <p className="font-bold text-primary font-headline">
              {isFree ? "You've claimed this offer" : "You own this offer"}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Apply it at checkout on your next eligible booking. {myEntitlement.expires_at && `Valid till ${new Date(myEntitlement.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/customer/offers/my"
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              My Offers
            </Link>
            <Link
              href="/customer/dashboard"
              className="px-4 py-2.5 rounded-xl border border-primary/25 text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/5 transition-colors"
            >
              Book a service
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/70">Price</p>
              <p className="text-2xl font-black text-primary font-headline mt-0.5">
                {isFree ? "Free" : formatINR(offer.purchase_price)}
              </p>
            </div>
            {!isFree && (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">Wallet balance</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">{formatINR(walletBalance)}</p>
              </div>
            )}
          </div>

          {isFree ? (
            <button
              type="button"
              disabled={isProcessing !== null}
              onClick={handleFreeClaim}
              className="w-full py-3.5 rounded-xl bg-secondary text-primary font-black text-xs uppercase tracking-widest shadow-lg shadow-secondary/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing === "free" ? "Claiming…" : "Claim free offer"}
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isProcessing !== null}
                onClick={handleRazorpay}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing === "razorpay" ? "Opening payment…" : `Pay ${formatINR(offer.purchase_price)} with card / UPI`}
              </button>
              <button
                type="button"
                disabled={isProcessing !== null || !canAfford}
                onClick={handleWallet}
                className="w-full py-3.5 rounded-xl border-2 border-primary/25 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!canAfford
                  ? "Insufficient wallet balance"
                  : isProcessing === "wallet"
                  ? "Purchasing…"
                  : "Pay from wallet"}
              </button>
            </div>
          )}

          <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
            Powered by Razorpay. Purchased offers are non-refundable once activated and remain valid for their listed window.
          </p>
        </div>
      )}
    </>
  );
}