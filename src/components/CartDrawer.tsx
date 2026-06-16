"use client";

import { useCart } from "@/lib/cart/CartContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, subtotal, itemCount } =
    useCart();
  const router = useRouter();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const handleProceed = () => {
    closeDrawer();
    router.push("/customer/checkout/schedule");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        id="cart-drawer"
        aria-label="Shopping Cart"
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-surface-container-lowest shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">
                shopping_cart
              </span>
            </div>
            <div>
              <h2 className="font-headline font-extrabold text-base text-on-surface">
                Your Cart
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium">
                {itemCount} {itemCount === 1 ? "service" : "services"} selected
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors"
            aria-label="Close cart"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center pb-16">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                  shopping_cart
                </span>
              </div>
              <p className="font-headline font-bold text-on-surface text-base mb-1">
                Your cart is empty
              </p>
              <p className="text-on-surface-variant text-sm mb-6">
                Add services to get started
              </p>
              <button
                onClick={closeDrawer}
                className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Browse Services
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.serviceId}
                className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 group hover:border-primary/20 transition-all"
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">
                    {item.iconName}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-sm text-on-surface truncate leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                    {item.subcategoryName}
                  </p>
                </div>

                {/* Price + Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-sm text-primary">
                    ₹{item.basePrice}
                  </span>
                  <button
                    onClick={() => removeItem(item.serviceId)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${item.title} from cart`}
                  >
                    <span className="material-symbols-outlined text-base">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — only visible when cart has items */}
        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-outline-variant/20 bg-surface-container-lowest space-y-3">
            {/* Price summary */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Subtotal ({itemCount} services)
                </p>
                <p className="font-black text-xl text-on-surface mt-0.5">
                  ₹{subtotal}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  + GST & Taxes
                </p>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Calculated at checkout
                </p>
              </div>
            </div>

            {/* Proceed CTA */}
            <button
              id="cart-proceed-btn"
              onClick={handleProceed}
              className="w-full py-4 bg-primary text-white font-headline font-extrabold text-base rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Proceed to Schedule
              <span className="material-symbols-outlined text-xl">
                arrow_forward
              </span>
            </button>

            {/* Or single service note */}
            <p className="text-center text-[11px] text-on-surface-variant">
              All services will be scheduled for the same date &amp; time
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
