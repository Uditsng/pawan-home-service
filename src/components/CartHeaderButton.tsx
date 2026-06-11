"use client";

import { useCart } from "@/lib/cart/CartContext";

export default function CartHeaderButton() {
  const { itemCount, openDrawer } = useCart();

  return (
    <button
      id="header-cart-btn"
      onClick={openDrawer}
      aria-label={`Open cart — ${itemCount} items`}
      className="relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/20"
    >
      <span className="material-symbols-outlined text-on-surface-variant text-xl">
        shopping_cart
      </span>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-secondary text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-in zoom-in duration-200">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
