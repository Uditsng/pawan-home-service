"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/app/actions/payment";
import { BookingPricing, Coupon } from "@/lib/types";
import { formatDuration } from "@/utils/pricingEngine";
import { Card } from "@/components/ui/Card";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface ServiceBreakdownData {
  serviceId: string;
  title: string;
  iconName: string;
  subcategoryName: string;
  categorySlug: string;
  pricingModel: string;
  breakdown: Omit<BookingPricing, "id" | "booking_id" | "created_at">;
  config: {
    duration?: number | null;
    areaSqft?: number | null;
    quantity?: number | null;
    distanceKm?: number | null;
    variantId?: string | null;
    addons?: string | null;
    selectedPackages?: string | null;
    formAnswers?: string | null;
    meetingLocation?: string | null;
    destination?: string | null;
    expectedBags?: string | null;
  };
}

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
  services: ServiceBreakdownData[];
  addressObj: Address;
  addressId: string;
  date: string;
  time: string;
  taxRatePercent: number;
  referralDiscount: number;
  walletBalance: number;
  couponCode: string | null;
  couponObj: Coupon | null;
}

export default function CheckoutPaymentClient({
  services,
  addressObj,
  addressId,
  date,
  time,
  taxRatePercent,
  referralDiscount,
  walletBalance,
  couponCode,
  couponObj,
}: Props) {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [bookAsBusiness, setBookAsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessGstin, setBusinessGstin] = useState("");

  const totalPriceWithoutGst = useMemo(
    () => services.reduce((sum, s) => sum + (s.breakdown.total_price - s.breakdown.gst_amount), 0),
    [services]
  );
  const totalGst = useMemo(
    () => services.reduce((sum, s) => sum + s.breakdown.gst_amount, 0),
    [services]
  );
  const totalCouponDiscount = useMemo(
    () => services.reduce((sum, s) => sum + (s.breakdown.coupon_discount || 0), 0),
    [services]
  );
  const totalBeforeWallet = useMemo(
    () => services.reduce((sum, s) => sum + s.breakdown.total_price, 0),
    [services]
  );
  const walletApplied = useWallet ? Math.min(walletBalance, totalBeforeWallet) : 0;
  const finalPrice = Math.max(0, totalBeforeWallet - walletApplied);

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
        const checkoutServices = services.map(s => ({
          serviceId: s.serviceId,
          variantId: s.config.variantId ?? null,
          addons: s.config.addons ?? null,
          duration: s.config.duration ?? null,
          areaSqft: s.config.areaSqft ?? null,
          quantity: s.config.quantity ?? null,
          distanceKm: s.config.distanceKm ?? null,
          selectedPackages: s.config.selectedPackages ?? null,
          meetingLocation: s.config.meetingLocation ?? null,
          destination: s.config.destination ?? null,
          expectedBags: s.config.expectedBags ?? null,
          formAnswers: s.config.formAnswers ?? null,
        }));

        const rzOrder = await createRazorpayOrderAction({
          services: checkoutServices,
          addressId,
          date,
          time,
          walletAmountToUse: walletApplied,
          couponCode: couponCode ?? undefined,
          referralDiscount,
        });

        if (rzOrder.freeOrder) {
          const verifyRes = await verifyRazorpayPaymentAction({
            isFree: true,
            services: checkoutServices,
            addressId, date, time,
            walletAmountToUse: walletApplied,
            couponCode: couponCode ?? undefined,
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

        if (Math.abs(rzOrder.amount - finalPrice) > 1) {
          setErrorMessage(`Price updated by server (was ₹${finalPrice}, now ₹${rzOrder.amount}). Please refresh and try again.`);
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

        const options = {
          key: rzOrder.keyId,
          amount: rzOrder.amount,
          currency: rzOrder.currency,
          name: "PHS Cleaning Company",
          description: desc,
          order_id: rzOrder.orderId,
          theme: { color: "#002261" },
          method: { card: true, upi: true, netbanking: true, wallet: false, emi: false, paylater: false },
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
          handler: async function (response: RazorpaySuccessResponse) {
            try {
              const verifyRes = await verifyRazorpayPaymentAction({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                services: checkoutServices,
                addressId, date, time,
                walletAmountToUse: walletApplied,
                couponCode: couponCode ?? undefined,
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
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      <main className="max-w-xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl font-bold">shield</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-background">Secure Checkout</h2>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-3 text-red-800 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-red-600 shrink-0 mt-0.5">error</span>
            <div className="text-xs font-semibold leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handlePayment} className="space-y-6">
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
                  {services.map((svc) => (
                    <div key={svc.serviceId} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                          <ServiceIconComponent iconName={svc.iconName} width={24} height={24} className="w-6 h-6 text-emerald-600 drop-shadow-sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate leading-tight">{svc.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{svc.subcategoryName}</p>
                          {svc.pricingModel === "hourly" && svc.config.duration && (
                            <p className="text-[10px] text-secondary font-bold mt-0.5">Duration: {formatDuration(svc.config.duration)}</p>
                          )}
                          {svc.config.areaSqft && (
                            <p className="text-[10px] text-secondary font-bold mt-0.5">Area: {svc.config.areaSqft} sqft</p>
                          )}
                          {svc.config.quantity && (
                            <p className="text-[10px] text-secondary font-bold mt-0.5">Qty: {svc.config.quantity}</p>
                          )}
                          {svc.config.distanceKm && (
                            <p className="text-[10px] text-secondary font-bold mt-0.5">Distance: {svc.config.distanceKm} km</p>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-sm text-primary shrink-0 ml-2">
                        ₹{svc.breakdown.total_price - svc.breakdown.gst_amount}
                      </span>
                    </div>
                  ))}
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
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
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

          {/* BILLING */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">receipt</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Billing Details</h3>
            </div>

            <div className="space-y-2.5 font-medium text-sm">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Subtotal ({services.length} {services.length === 1 ? "service" : "services"})</span>
                <span className="font-bold text-on-surface">₹{totalPriceWithoutGst}</span>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant">
                <span>GST ({taxRatePercent}%)</span>
                <span className="font-bold text-on-surface">₹{totalGst}</span>
              </div>

              {totalCouponDiscount > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-green-600">
                  <span>Coupon Discount</span>
                  <span>-₹{totalCouponDiscount}</span>
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
                <p className="font-extrabold text-base text-on-surface">Total Payable (All taxes included)</p>
                <p className="text-2xl font-black text-on-surface tracking-tight">₹{finalPrice}</p>
              </div>
            </div>

            {/* Business Billing */}
            <Card variant="solid" className="p-4 border border-outline-variant/10 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={bookAsBusiness} onChange={(e) => setBookAsBusiness(e.target.checked)} className="w-4 h-4 rounded text-secondary border-outline-variant focus:ring-secondary/50" />
                <span className="text-xs font-black uppercase tracking-wider text-primary">Book as Business (GST Invoice)</span>
              </label>
              {bookAsBusiness && (
                <div className="space-y-3 pt-2 border-t border-dashed border-outline-variant/30 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Registered Business Name</label>
                    <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp Private Limited" className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">GSTIN Number</label>
                    <input type="text" required value={businessGstin} onChange={(e) => setBusinessGstin(e.target.value.toUpperCase())} placeholder="e.g. 05AAACP9876M1ZX" maxLength={15} className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50" />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* TERMS */}
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

          {/* STICKY BOTTOM */}
          <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#f7f9fb]/90 backdrop-blur-2xl border-t border-outline-variant/10 p-3 md:p-4 pb-2 flex items-center">
            <div className="max-w-xl mx-auto flex gap-3 md:gap-4 items-center w-full">
              <div className="flex-1">
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Payable</p>
                <p className="text-xl md:text-2xl font-black text-on-background">₹{finalPrice}</p>
              </div>
              <button
                type="submit"
                disabled={!isAgreed || isPending}
                className={`flex-1 py-3.5 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl font-headline font-extrabold tracking-tight text-base md:text-lg text-center flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                  ${!isAgreed || isPending
                    ? "bg-surface-container text-on-surface/30 cursor-not-allowed border border-outline-variant/10"
                    : "bg-secondary text-white shadow-[0_12px_32px_rgba(253,118,26,0.25)] hover:opacity-95"
                  }`}
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Processing...
                  </>
                ) : (
                  <>
                    {finalPrice === 0 ? "Book with Wallet" : "Pay & Book"}
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
