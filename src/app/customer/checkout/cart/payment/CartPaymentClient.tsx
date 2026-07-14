"use client";

import { useState, useTransition, useEffect } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { useRouter } from "next/navigation";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/app/actions/payment";
import { formatDuration } from "@/utils/pricingEngine";
import { Card } from "@/components/ui/Card";
import { ServiceIconComponent } from "@/utils/serviceIcon";

interface Address {
  formatted_address: string;
  city: string;
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

interface CartPaymentClientProps {
  addressObj: Address;
  addressId: string;
  date: string;
  time: string;
  taxRatePercent: number;
  referralDiscount: number;
  walletBalance?: number;
}

export default function CartPaymentClient({
  addressObj,
  addressId,
  date,
  time,
  taxRatePercent,
  referralDiscount,
  walletBalance = 0,
}: CartPaymentClientProps) {
  const router = useRouter();
  const { items, itemCount, subtotal, clearCart } = useCart();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [bookAsBusiness, setBookAsBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessGstin, setBusinessGstin] = useState("");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // Redirect if cart is empty (but NOT after a successful payment clears the cart)
  useEffect(() => {
    if (items.length === 0 && !isPending && !paymentSubmitted) {
      router.push("/customer/dashboard");
    }
  }, [items, router, isPending, paymentSubmitted]);

  // Calculations
  const gstTax = Math.round(subtotal * (taxRatePercent / 100));
  const totalPrice = Math.max(0, subtotal + gstTax - referralDiscount);

  // Wallet Calculations
  const walletAmount = walletBalance;
  const walletApplied = useWallet ? Math.min(walletAmount, totalPrice) : 0;
  const finalPrice = Math.max(0, totalPrice - walletApplied);

  // Format Display Date
  const dateObj = new Date(`${date}T12:00:00`);
  const formattedDisplayDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    // Load Razorpay Script dynamically
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed || isPending || items.length === 0) return;

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const serviceIds = items.map((i) => i.serviceId);
        const mappedCartItems = items.map((i) => ({
          serviceId: i.serviceId,
          selectedDuration: i.selectedDuration,
        }));
        const cartItemPricesMap: Record<string, number> = {};
        for (const item of items) {
          cartItemPricesMap[item.serviceId] = item.basePrice;
        }

        // 1. Create Razorpay order on server
        const rzOrder = await createRazorpayOrderAction({
          serviceIds: serviceIds,
          cartItemPrices: cartItemPricesMap,
          addressId: addressId,
          date: date,
          time: time,
          walletAmountToUse: walletApplied,
          cartItems: mappedCartItems,
          referralDiscount: referralDiscount,
        });

        if (rzOrder.freeOrder) {
          // Free order bypasses Razorpay checkout
          const verifyRes = await verifyRazorpayPaymentAction({
            isFree: true,
            serviceIds: serviceIds,
            cartItemPrices: cartItemPricesMap,
            addressId: addressId,
            date: date,
            time: time,
            walletAmountToUse: walletApplied,
            cartItems: mappedCartItems,
            referralDiscount: referralDiscount,
            businessName: bookAsBusiness ? businessName : undefined,
            businessGstin: bookAsBusiness ? businessGstin : undefined,
          });

          if (verifyRes.success && verifyRes.orderId) {
            setPaymentSubmitted(true);
            clearCart();
            router.push(`/customer/checkout/success?orderId=${verifyRes.orderId}`);
          } else {
            setErrorMessage(verifyRes.error || "Failed to confirm booking.");
          }
          return;
        }

        if (Math.abs(rzOrder.amount - finalPrice) > 1) {
          setErrorMessage(
            `Price updated by server (was ₹${finalPrice}, now ₹${rzOrder.amount}). Please refresh and try again.`
          );
          return;
        }

        // Check if Razorpay script loaded
        const customWindow = window as unknown as CustomWindow;
        if (!customWindow.Razorpay) {
          setErrorMessage("Payment gateway failed to load. Please refresh and try again.");
          return;
        }

        // 2. Open Razorpay Checkout
        const options = {
          key: rzOrder.keyId,
          amount: rzOrder.amount,
          currency: rzOrder.currency,
          name: "PHS Cleaning Company",
          description: `Booking for ${itemCount} Services`,
          order_id: rzOrder.orderId,
          theme: {
            color: "#002261", // Premium Brand Navy/Dark Blue
          },
          method: {
            card: true,
            upi: true,
            netbanking: true,
            wallet: false,
            emi: false,
            paylater: false,
          },
          config: {
            display: {
              blocks: {
                preferred: {
                  name: "Payment Options",
                  instruments: [
                    { method: "card" },
                    { method: "upi" },
                    { method: "netbanking" },
                  ],
                },
              },
              sequence: ["block.preferred"],
              preferences: {
                show_default_blocks: false,
              },
            },
          },
          handler: async function (response: RazorpaySuccessResponse) {
            try {
              const verifyRes = await verifyRazorpayPaymentAction({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                serviceIds: serviceIds,
                cartItemPrices: cartItemPricesMap,
                addressId: addressId,
                date: date,
                time: time,
                walletAmountToUse: walletApplied,
                cartItems: mappedCartItems,
                referralDiscount: referralDiscount,
                businessName: bookAsBusiness ? businessName : undefined,
                businessGstin: bookAsBusiness ? businessGstin : undefined,
              });

              if (verifyRes.success && verifyRes.orderId) {
                setPaymentSubmitted(true);
                clearCart();
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

  if (items.length === 0 && !isPending) {
    return null;
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 font-body">
      {/* Top Header Bar */}
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-outline-variant/10 py-4 px-4 md:px-6">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-on-surface hover:opacity-80 transition-all cursor-pointer bg-transparent border-none"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-primary font-black text-lg font-headline tracking-tight">Checkout Payment</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl font-bold">shield</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-background">Secure Checkout</h2>
        </div>

        {/* Custom Error Badge */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-3 text-red-800 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-red-600 shrink-0 mt-0.5">error</span>
            <div className="text-xs font-semibold leading-relaxed">
              {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. ORDER SUMMARY CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">receipt_long</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Order Summary</h3>
            </div>

            <div className="space-y-4">
              {/* Selected Services list */}
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Services Selected</p>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={item.serviceId} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                          <ServiceIconComponent
                            iconName={item.iconName}
                            width={24}
                            height={24}
                            className="w-6 h-6 text-emerald-600 drop-shadow-sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-on-surface truncate leading-tight">{item.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.subcategoryName}</p>
                          {item.pricingModel === "hourly" && item.selectedDuration && (
                            <p className="text-[10px] text-secondary font-bold mt-0.5">
                              Duration: {formatDuration(item.selectedDuration)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-sm text-primary shrink-0 ml-2">₹{item.basePrice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date & Slot */}
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

              {/* Dynamic Service Address */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Service Location</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-extrabold text-on-surface bg-surface-container px-2 py-0.5 rounded-full uppercase tracking-wider scale-90 shrink-0">
                      {addressObj.label || "Home"}
                    </span>
                    <p className="font-bold text-sm text-on-surface truncate leading-tight">
                      {addressObj.formatted_address}
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-variant opacity-80 mt-0.5 leading-relaxed">
                    {addressObj.city} · {addressObj.pincode}
                  </p>
                </div>
              </div>

              {/* Cancellation Policy summary info */}
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

          {/* 2. PHS WALLET SELECTION CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-on-surface uppercase tracking-wider">PHS Wallet</p>
                  <p className="text-sm font-bold text-on-surface-variant mt-0.5">Available Balance: <span className="text-primary font-black">₹{walletAmount}</span></p>
                </div>
              </div>
              {walletAmount > 0 ? (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    disabled={isPending}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              ) : (
                <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-wider">Empty</span>
              )}
            </div>
            {useWallet && walletApplied > 0 && (
              <p className="text-xs font-semibold text-primary bg-secondary-container p-2.5 rounded-xl border border-secondary/20">
                Applied <span className="font-extrabold">₹{walletApplied}</span> from PHS Wallet.
              </p>
            )}
          </div>

          {/* 3. BILLING DETAILS CARD */}
          <div className="bg-white border border-outline-variant/10 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <span className="material-symbols-outlined text-primary font-bold">receipt</span>
              <h3 className="font-headline text-base font-bold text-on-surface">Billing Details</h3>
            </div>

            <div className="space-y-3 font-medium text-sm">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Subtotal ({itemCount} {itemCount === 1 ? "service" : "services"})</span>
                <span className="font-bold text-on-surface">₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>GST &amp; Taxes ({taxRatePercent}%)</span>
                <span className="font-bold text-on-surface">₹{gstTax}</span>
              </div>
              {referralDiscount > 0 && (
                <div className="flex justify-between items-center text-secondary bg-emerald-500/10 px-3 py-2 rounded-xl border border-secondary/20">
                  <span className="flex items-center gap-1 font-bold text-emerald-700 text-xs uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">redeem</span> Referral Reward
                  </span>
                  <span className="font-black text-emerald-700">-₹{referralDiscount}</span>
                </div>
              )}
              {useWallet && walletApplied > 0 && (
                <div className="flex justify-between items-center text-primary bg-secondary-container px-3 py-2 rounded-xl border border-secondary/20">
                  <span className="flex items-center gap-1 font-bold text-xs uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span> Paid from Wallet
                  </span>
                  <span className="font-black">-₹{walletApplied}</span>
                </div>
              )}
              <div className="border-t border-outline-variant/30 pt-3 flex justify-between items-center text-base md:text-lg">
                <span className="font-headline font-extrabold text-on-surface">Total Amount</span>
                <span className="font-headline font-black text-primary text-xl md:text-2xl">₹{finalPrice}</span>
              </div>
            </div>

            {/* Business Billing Fields */}
            <Card variant="solid" className="p-4 border border-outline-variant/10 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bookAsBusiness}
                  onChange={(e) => setBookAsBusiness(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary border-outline-variant focus:ring-secondary/50"
                />
                <span className="text-xs font-black uppercase tracking-wider text-primary">
                  Book as Business (GST Invoice)
                </span>
              </label>

              {bookAsBusiness && (
                <div className="space-y-3 pt-2 border-t border-dashed border-outline-variant/30 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Registered Business Name</label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Acme Corp Private Limited"
                      className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">GSTIN Number</label>
                    <input
                      type="text"
                      required
                      value={businessGstin}
                      onChange={(e) => setBusinessGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 05AAACP9876M1ZX"
                      maxLength={15}
                      className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 4. TERMS & CONFIRMATION CHECKBOX */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 select-none cursor-pointer">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-5 h-5 rounded-md border border-outline-variant text-primary focus:ring-primary focus:ring-offset-2 shrink-0 mt-0.5 accent-primary cursor-pointer"
              />
              <span className="text-xs text-on-surface-variant font-medium leading-normal">
                I agree to the PHS Cleaning Company <a href="/terms-conditions" target="_blank" className="text-primary font-bold hover:underline">Terms &amp; Conditions</a> and understand that I am making a secure payment of <span className="font-bold text-on-surface">₹{finalPrice}</span>.
              </span>
            </label>

            {/* Confirm CTA Button */}
            <button
              id="confirm-booking-btn"
              type="submit"
              disabled={!isAgreed || isPending || items.length === 0}
              className={`w-full py-4 rounded-2xl font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-2 transition-all duration-300
                ${(!isAgreed || isPending || items.length === 0)
                  ? "bg-surface-container text-on-surface/30 cursor-not-allowed border-none"
                  : "bg-primary text-white shadow-lg shadow-primary/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] border-none"
                }`}
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  {finalPrice === 0 ? "Book with Wallet" : "Pay & Confirm Booking"}
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">verified_user</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

