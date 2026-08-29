"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/app/actions/payment";
import { validateCouponAction, listAvailableCoupons, type AvailableCoupon } from "@/app/actions/coupon.actions";
import { CouponSelector } from "./CouponSelector";
import { Coupon, CartItem } from "@/lib/types";
import { formatDuration } from "@/lib/pricing";
import { calculateCart } from "@/lib/pricing/payableEngine";
import { computeCartLineItems } from "@/lib/pricing/cartCatalog";
import type { CartCatalog } from "@/lib/pricing/cartCatalog";
import type { PricingBreakdown } from "@/lib/pricing/types";
import { Card } from "@/components/ui/Card";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import type { ServiceDisplayLine } from "./page";

interface Address {
  formatted_address: string;
  city: string;
  area?: string | null;
  pincode: string;
  label: string;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CustomWindow {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
}

interface Props {
  services: ServiceDisplayLine[];
  catalog: CartCatalog;
  items: CartItem[];
  droppedCount?: number;
  addressObj: Address;
  addressId: string;
  date: string;
  time: string;
  scheduleDate: string;
  pincode: string;
  taxRatePercent: number;
  referralDiscount: number;
  walletBalance: number;
  couponCode: string | null;
  couponObj: Coupon | null;
  // Authoritative pricing summary from server-side coupon validation
  // When present, these values override client-side computation for display
  pricingSummary?: {
    originalSubtotal: number;
    discountAmount: number;
    taxAmount: number;
    finalPayable: number;
  };
  appliedCouponCode: string | null;
}

export default function CheckoutPaymentClient({
  services,
  catalog,
  items,
  droppedCount = 0,
  addressObj,
  addressId,
  date,
  time,
  scheduleDate,
  pincode,
  taxRatePercent,
  referralDiscount,
  walletBalance,
  couponObj,
  pricingSummary,
  appliedCouponCode,
}: Props) {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [bookAsBusiness, setBookAsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessGstin, setBusinessGstin] = useState("");

  // Coupon state. `appliedCoupon` holds the authoritative server-validated
  // pricing summary. It is initialised from the server props (which validate a
  // deep-link ?couponCode=…), then updated live when the user applies/removes a
  // code in this screen. The server re-validates at payment time for authority.
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, startCouponTransition] = useTransition();
  const [showCoupons, setShowCoupons] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    pricingSummary: {
      originalSubtotal: number;
      discountAmount: number;
      taxAmount: number;
      finalPayable: number;
    };
    couponObj: Coupon | null;
  } | null>(() => {
    if (appliedCouponCode && pricingSummary) {
      return {
        code: appliedCouponCode,
        pricingSummary: {
          originalSubtotal: pricingSummary.originalSubtotal,
          discountAmount: pricingSummary.discountAmount,
          taxAmount: pricingSummary.taxAmount,
          finalPayable: pricingSummary.finalPayable,
        },
        couponObj,
      };
    }
    return null;
  });

  // Prices are computed entirely client-side through the shared pricing engine.
  // The server recomputes the same engine at payment time (authority) — no
  // server pricing calls happen while this screen is open or the wallet toggles.
  const lineItems = useMemo(
    () =>
      computeCartLineItems(items, catalog, {
        scheduledDate: scheduleDate,
        pincode,
        coupon: couponObj,
      }),
    [items, catalog, scheduleDate, pincode, couponObj]
  );

  const cartResult = useMemo(
    () =>
      calculateCart({
        lineItems,
        walletBalanceToUse: useWallet ? walletBalance : 0,
        referralDiscount,
      }),
    [lineItems, useWallet, walletBalance, referralDiscount]
  );

  // Authoritative pricing summary from server-side coupon validation.
  // When available, these values are used for display (they are immutable snapshots
  // for the Razorpay order lifecycle per approved decision #11).
  // The client-side cartResult is still used for the actual payment flow,
  // since the server revalidates at payment time.
  const authoritativePricing = useMemo(() => {
    if (appliedCoupon) {
      return {
        originalSubtotal: appliedCoupon.pricingSummary.originalSubtotal,
        discountAmount: appliedCoupon.pricingSummary.discountAmount,
        taxAmount: appliedCoupon.pricingSummary.taxAmount,
        finalPayable: appliedCoupon.pricingSummary.finalPayable,
        useAuthoritative: true,
      };
    }
    return {
      originalSubtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      finalPayable: 0,
      useAuthoritative: false,
    };
  }, [appliedCoupon]);

  const useAuthoritative = authoritativePricing.useAuthoritative;

  const totalPriceWithoutGst = cartResult.subtotal;
  const totalGst = cartResult.gstTotal;
  const totalCouponDiscount = cartResult.couponDiscountTotal;
  const walletApplied = cartResult.walletApplied;
  const finalPrice = cartResult.finalPayable;

  // Display values prefer the server-authoritative pricing summary (when a
  // coupon has been validated) and fall back to the client-side cart result.
  // In authoritative mode the server returns a post-tax pre-coupon subtotal, so
  // we split out GST to keep the line structure consistent with the client.
  const displaySubtotal = useAuthoritative
    ? authoritativePricing.originalSubtotal - authoritativePricing.taxAmount
    : totalPriceWithoutGst;
  const displayTax = useAuthoritative ? authoritativePricing.taxAmount : totalGst;
  const displayDiscount = useAuthoritative ? authoritativePricing.discountAmount : totalCouponDiscount;
  const displayTotal = useAuthoritative
    ? Math.max(0, authoritativePricing.finalPayable - walletApplied)
    : finalPrice;

  // Calculate overall savings from all applied discounts
  const totalSavings = displayDiscount + referralDiscount + walletApplied;

  // GSTIN format validation (15-character Indian GSTIN pattern)
  const isGstinValid = useMemo(() => {
    if (!businessGstin) return false;
    return businessGstin.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(businessGstin);
  }, [businessGstin]);

  const breakdownByService = useMemo(() => {
    const map: Record<string, PricingBreakdown> = {};
    for (const l of lineItems) map[l.serviceId] = l.breakdown;
    return map;
  }, [lineItems]);

  const checkoutServices = items.map((item) => ({
    serviceId: item.serviceId,
    variantId: item.variantId ?? null,
    addons: item.addons ?? null,
    duration: item.selectedDuration ?? null,
    areaSqft: item.areaSqft ?? null,
    quantity: item.quantity ?? null,
    distanceKm: item.distanceKm ?? null,
    selectedPackages: item.selectedPackages ?? null,
    meetingLocation: item.meetingLocation ?? null,
    destination: item.destination ?? null,
    expectedBags: item.expectedBags ?? null,
    formAnswers: item.formAnswers ?? null,
  }));

  // Shared apply logic used by both the manual input and the coupon picker.
  const applyCouponCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setCouponError(null);
    startCouponTransition(async () => {
      try {
        const res = await validateCouponAction(code, checkoutServices, date, time, addressId);
        if (res.success) {
          setAppliedCoupon({
            code: res.couponCode,
            pricingSummary: {
              originalSubtotal: res.originalSubtotal,
              discountAmount: res.discountAmount,
              taxAmount: res.taxAmount,
              finalPayable: res.finalPayable,
            },
            couponObj: null,
          });
          setCouponInput("");
          setShowCoupons(false);
        } else {
          setCouponError(res.error || "This coupon is not valid.");
          setAppliedCoupon(null);
        }
      } catch (e) {
        setCouponError((e as Error).message || "Failed to validate coupon.");
      }
    });
  };

  const onApplyCoupon = () => applyCouponCode(couponInput);

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const serviceIds = items.map((i) => i.serviceId);
      const res = await listAvailableCoupons(serviceIds);
      setAvailableCoupons(res);
    } catch {
      setAvailableCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const openCouponList = () => {
    setShowCoupons(true);
    if (availableCoupons.length === 0) void loadCoupons();
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  const formattedDisplayDate = useMemo(() => {
    const dateObj = new Date(`${date}T12:00:00`);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }, [date]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed || isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const rzOrder = await createRazorpayOrderAction({
          services: checkoutServices,
          addressId,
          date,
          time,
          walletAmountToUse: walletApplied,
          couponCode: appliedCoupon?.code ?? undefined,
          referralDiscount,
        });

        if (rzOrder.freeOrder) {
          const verifyRes = await verifyRazorpayPaymentAction({
            isFree: true,
            services: checkoutServices,
            addressId, date, time,
            walletAmountToUse: walletApplied,
            couponCode: appliedCoupon?.code ?? undefined,
            referralDiscount,
            businessName: bookAsBusiness ? businessName : undefined,
            businessGstin: bookAsBusiness ? businessGstin : undefined,
          });

          if (verifyRes.success) {
            router.push(`/customer/checkout/success?orderId=${verifyRes.orderId}`);
          } else {
            setErrorMessage(verifyRes.error || "Failed to confirm booking.");
          }
          return;
        }

        if (Math.abs(rzOrder.amount - displayTotal) > 1) {
          setErrorMessage(`Price updated by server (was ₹${displayTotal}, now ₹${rzOrder.amount}). Please refresh and try again.`);
          return;
        }

        const customWindow = window as unknown as CustomWindow;
        if (!customWindow.Razorpay) {
          setErrorMessage("Payment gateway failed to load. Please refresh and try again.");
          return;
        }

        const desc = services.length > 1
          ? `Booking for ${services.length} Services`
          : `Booking for ${services[0].title}`;

        const isNativeApp = Capacitor.isNativePlatform();

        const options = {
          key: rzOrder.keyId,
          ...(isNativeApp ? { webview_intent: true } : {}),
          amount: rzOrder.amount,
          currency: rzOrder.currency,
          name: "PHS Cleaning Company",
          description: desc,
          order_id: rzOrder.orderId,
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
            try {
              const verifyRes = await verifyRazorpayPaymentAction({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                services: checkoutServices,
                addressId, date, time,
                walletAmountToUse: walletApplied,
                couponCode: appliedCoupon?.code ?? undefined,
                referralDiscount,
                businessName: bookAsBusiness ? businessName : undefined,
                businessGstin: bookAsBusiness ? businessGstin : undefined,
              });

              if (verifyRes.success) {
                router.push(`/customer/checkout/success?orderId=${verifyRes.orderId}`);
              } else {
                setErrorMessage(verifyRes.error || "Payment verification failed.");
              }
            } catch (verifyErr) {
              console.error("Verification error:", verifyErr);
              setErrorMessage("An error occurred during payment verification.");
            }
          },
          modal: {
            ondismiss: function () {
              setErrorMessage("Payment cancelled by user.");
            },
          },
        };

        const rzp = new customWindow.Razorpay(options as unknown as Record<string, unknown>);
        rzp.open();
      } catch (err) {
        console.error("Payment init error:", err);
        setErrorMessage((err as Error).message || "Failed to initiate payment. Please try again.");
      }
    });
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 md:pb-16">
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">shield</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-background">Secure Checkout</h2>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Review booking summary and complete payment</p>
            </div>
          </div>
        </div>

        {droppedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 text-amber-800 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-amber-600 shrink-0 mt-0.5">warning</span>
            <div className="text-xs font-semibold leading-relaxed">
              {droppedCount} {droppedCount === 1 ? "service was" : "services were"} no longer
              available and {droppedCount === 1 ? "has" : "have"} been removed from this order.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-3 text-red-800 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-red-600 shrink-0 mt-0.5">error</span>
            <div className="text-xs font-semibold leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: ORDER DETAILS, SCHEDULE, WALLET, COUPON, GST */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            {/* ORDER SUMMARY */}
            <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                <span className="material-symbols-outlined text-primary font-bold">receipt_long</span>
                <h3 className="font-headline text-base font-bold text-on-surface">
                  {services.length > 1 ? "Order Summary" : "Booking Summary"}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Services list */}
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    {services.length > 1 ? "Services Selected" : "Service"}
                  </p>
                  <div className="space-y-2.5">
                    {services.map((svc) => {
                      const breakdown = breakdownByService[svc.serviceId];
                      const itemPrice = breakdown ? breakdown.total_price - breakdown.gst_amount : 0;
                      return (
                        <div key={svc.serviceId} className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                <ServiceIconComponent iconName={svc.iconName} width={24} height={24} className="w-6 h-6 text-emerald-600 drop-shadow-sm" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-on-surface truncate leading-tight">{svc.title}</p>
                                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{svc.subcategoryName}</p>
                                
                                {/* Item configurations & option pills */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {svc.pricingModel === "hourly" && svc.config.duration && (
                                    <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md border border-primary/10">
                                      Duration: {formatDuration(svc.config.duration)}
                                    </span>
                                  )}
                                  {svc.config.areaSqft && (
                                    <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md border border-primary/10">
                                      Area: {svc.config.areaSqft} sqft
                                    </span>
                                  )}
                                  {svc.config.quantity && (
                                    <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md border border-primary/10">
                                      Qty: {svc.config.quantity}
                                    </span>
                                  )}
                                  {svc.config.distanceKm && (
                                    <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md border border-primary/10">
                                      Distance: {svc.config.distanceKm} km
                                    </span>
                                  )}
                                  {svc.config.variantId && (
                                    <span className="px-2 py-0.5 bg-secondary/10 text-primary text-[10px] font-bold rounded-md border border-secondary/20">
                                      Variant Selected
                                    </span>
                                  )}
                                  {svc.config.addons && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-500/20">
                                      + Addons Included
                                    </span>
                                  )}
                                  {svc.config.selectedPackages && (
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-700 text-[10px] font-bold rounded-md border border-blue-500/20">
                                      Package Deal
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-sm text-primary shrink-0 ml-2">
                              ₹{itemPrice}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Schedule</p>
                    <p className="font-bold text-sm text-on-surface leading-tight mt-0.5">
                      {formattedDisplayDate} · <span className="text-primary">{time}</span>
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Service Location</p>
                    <p className="font-bold text-sm text-on-surface truncate leading-tight mt-0.5">{addressObj.formatted_address}</p>
                    <p className="text-xs text-on-surface-variant opacity-80 mt-0.5">{addressObj.city} · {addressObj.pincode}</p>
                  </div>
                </div>

                {/* Cancellation policy */}
                <div className="flex items-start gap-3 p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                  <span className="material-symbols-outlined text-warning text-[20px] shrink-0 mt-0.5">info</span>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Cancellation & Refund Policy</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                      Free cancellation is allowed within <span className="font-bold text-on-surface">15 minutes</span> of booking. Cancellations made after this 15-minute window may incur a platform convenience fee.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* WALLET */}
            <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-on-surface uppercase tracking-wider">PHS Wallet</p>
                    <p className="text-sm font-bold text-on-surface-variant mt-0.5">Available Balance: <span className="text-primary font-black">₹{walletBalance}</span></p>
                  </div>
                </div>
                {walletBalance > 0 ? (
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} disabled={isPending} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                  </label>
                ) : (
                  <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-wider">Empty</span>
                )}
              </div>
              {useWallet && walletApplied > 0 && (
                <p className="text-xs font-semibold text-[#059669] bg-green-500/10 p-2.5 rounded-xl border border-secondary/20">
                  Applied <span className="font-extrabold">₹{walletApplied}</span> from PHS Wallet.
                </p>
              )}
            </div>

            {/* COUPON */}
            <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary font-bold text-xl">confirmation_number</span>
                  <h3 className="font-headline text-base font-bold text-on-surface">Coupons & Offers</h3>
                </div>
                <button
                  type="button"
                  onClick={openCouponList}
                  disabled={isPending}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-600 text-lg font-bold">check_circle</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-on-surface truncate font-mono tracking-wider">{appliedCoupon.code}</p>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Applied</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        You saved ₹{displayDiscount} with this code
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative flex items-center bg-surface-container-low rounded-2xl border border-outline-variant/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all p-1.5">
                    <span className="material-symbols-outlined text-on-surface-variant/60 ml-2.5 text-lg shrink-0">sell</span>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      disabled={isPending || isValidatingCoupon}
                      className="w-full bg-transparent px-2.5 py-2 text-xs font-bold text-primary uppercase placeholder:normal-case placeholder:font-normal placeholder:text-on-surface-variant/50 outline-none"
                    />
                    <button
                      type="button"
                      onClick={onApplyCoupon}
                      disabled={isPending || isValidatingCoupon || !couponInput.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-wider disabled:opacity-40 hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      {isValidatingCoupon ? "Applying…" : "Apply"}
                    </button>
                  </div>

                  {couponError && (
                    <div className="flex items-center gap-1.5 text-error px-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <p className="text-[11px] font-semibold">{couponError}</p>
                    </div>
                  )}
                </div>
              )}

              {showCoupons && (
                <CouponSelector
                  coupons={availableCoupons}
                  loading={loadingCoupons}
                  onSelect={(c) => applyCouponCode(c.code)}
                  onClose={() => setShowCoupons(false)}
                />
              )}
            </div>

            {/* BUSINESS GST BILLING */}
            <Card variant="solid" className="p-5 md:p-6 border border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-xl">domain</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-sm font-bold text-on-surface">Book as Business (GST Invoice)</h3>
                    <p className="text-[11px] text-on-surface-variant font-medium">Claim up to 18% Input Tax Credit (ITC)</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" checked={bookAsBusiness} onChange={(e) => setBookAsBusiness(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                </label>
              </div>

              {bookAsBusiness && (
                <div className="space-y-3 pt-3 border-t border-dashed border-outline-variant/30 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Registered Business Name</label>
                    <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp Private Limited" className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">GSTIN Number (15 Digits)</label>
                    <input type="text" required value={businessGstin} onChange={(e) => setBusinessGstin(e.target.value.toUpperCase())} placeholder="e.g. 05AAACP9876M1ZX" maxLength={15} className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 uppercase font-mono tracking-wider" />
                    {businessGstin.length > 0 && (
                      <div className="pt-1">
                        {isGstinValid ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Valid GSTIN format
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">info</span> Enter 15-digit GSTIN (e.g. 07AAAAA0000A1Z5)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN: SAVINGS BANNER, BILLING DETAILS, TERMS & DESKTOP CTA */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* TOTAL SAVINGS BANNER */}
            {totalSavings > 0 && (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-700">
                  <span className="material-symbols-outlined text-2xl font-bold">savings</span>
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">Total Savings on this Order</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">
                    You are saving ₹{totalSavings}!
                  </p>
                </div>
              </div>
            )}

            {/* BILLING SUMMARY */}
            <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                <span className="material-symbols-outlined text-primary font-bold">receipt</span>
                <h3 className="font-headline text-base font-bold text-on-surface">Billing Details</h3>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant text-sm">
                <span>Subtotal ({services.length} {services.length === 1 ? "service" : "services"})</span>
                <span className="font-bold text-on-surface">₹{displaySubtotal}</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant text-sm">
                <span>GST ({taxRatePercent}%)</span>
                <span className="font-bold text-on-surface">₹{displayTax}</span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-green-600">
                  <span>Coupon Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}</span>
                  <span>-₹{displayDiscount}</span>
                </div>
              )}

              {referralDiscount > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-green-600">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                    Referral Discount
                  </span>
                  <span>-₹{referralDiscount}</span>
                </div>
              )}

              {useWallet && walletApplied > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-green-600">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                    Paid from Wallet
                  </span>
                  <span>-₹{walletApplied}</span>
                </div>
              )}

              <hr className="border-t border-dashed border-outline-variant/30 my-3" />

              <div className="flex justify-between items-center">
                <p className="font-extrabold text-base text-on-surface">Total Payable</p>
                <p className="text-2xl font-black text-on-surface tracking-tight">
                  ₹{displayTotal}
                </p>
              </div>
            </div>

            {/* TERMS CHECKBOX */}
            <div className="px-2 py-1">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div className="relative shrink-0 mt-0.5">
                  <input id="terms-confirm" type="checkbox" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} disabled={isPending} className="sr-only peer" />
                  <div className="w-5 h-5 rounded border-2 border-outline-variant group-hover:border-primary peer-checked:border-secondary peer-checked:bg-secondary flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-white text-sm font-bold scale-0 peer-checked:scale-100 transition-transform">check</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed">
                  By proceeding, you agree to our <span className="text-primary font-bold">cancellation, refund, and service terms</span>.
                </span>
              </label>
            </div>

            {/* DESKTOP PAY CTA BUTTON (Shown on Desktop Grid) */}
            <div className="hidden lg:block pt-2">
              <button
                type="submit"
                disabled={!isAgreed || isPending}
                className={`w-full py-4 px-8 rounded-2xl font-headline font-extrabold tracking-tight text-lg text-center flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer
                  ${!isAgreed || isPending
                    ? "bg-surface-container text-on-surface/30 cursor-not-allowed border border-outline-variant/10"
                    : "bg-secondary text-white shadow-[0_12px_32px_rgba(166,206,55,0.3)] hover:opacity-95"
                  }`}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Processing...
                  </>
                ) : (
                  <>
                    {displayTotal === 0 ? "Book for FREE with Wallet" : `Pay ₹${displayTotal} & Book`}
                    <span className="material-symbols-outlined text-[24px]">payments</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STICKY BOTTOM FOOTER (Mobile / Tablet screen sizes) */}
          <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#f7f9fb]/95 backdrop-blur-2xl border-t border-outline-variant/10 p-3 md:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden flex items-center">
            <div className="max-w-xl mx-auto flex gap-3 md:gap-4 items-center w-full">
              <div className="flex-1">
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Payable</p>
                <p className="text-xl md:text-2xl font-black text-on-background">₹{displayTotal}</p>
              </div>
              <button
                type="submit"
                disabled={!isAgreed || isPending}
                className={`flex-1 py-3.5 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl font-headline font-extrabold tracking-tight text-base md:text-lg text-center flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer
                  ${!isAgreed || isPending
                    ? "bg-surface-container text-on-surface/30 cursor-not-allowed border border-outline-variant/10"
                    : "bg-secondary text-white shadow-[0_12px_32px_rgba(166,206,55,0.3)] hover:opacity-95"
                  }`}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Processing...
                  </>
                ) : (
                  <>
                    {displayTotal === 0 ? "Book with Wallet" : `Pay ₹${displayTotal}`}
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">payments</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
}

