"use client";

import { useCart } from "@/lib/cart/CartContext";
import type { CartItem } from "@/lib/types";

interface AddToCartButtonProps {
  item: CartItem;
  /** If true, renders a compact icon-only style suitable for service cards */
  compact?: boolean;
  className?: string;
}

export default function AddToCartButton({
  item,
  compact = false,
  className = "",
}: AddToCartButtonProps) {
  const { addItem, isInCart, openDrawer } = useCart();
  const inCart = isInCart(item.serviceId);

  const handleClick = () => {
    if (inCart) {
      openDrawer();
    } else {
      addItem(item);
    }
  };

  if (compact) {
    return (
      <button
        id={`cart-btn-${item.serviceId}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }}
        aria-label={inCart ? "View in cart" : "Add to cart"}
        className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 border shadow-[0_4px_10px_rgba(15,23,42,0.08)] ${
          inCart
            ? "bg-emerald-600 border-emerald-600 text-white shadow-[0_4px_10px_rgba(5,150,105,0.2)]"
            : "bg-surface-container-lowest border-outline-variant/15 text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-600/30"
        } ${className}`}
      >
        <span className="material-symbols-outlined text-[20px] md:text-[22px] font-bold">
          {inCart ? "done" : "add"}
        </span>
      </button>
    );
  }

  return (
    <button
      id={`cart-btn-${item.serviceId}`}
      onClick={handleClick}
      aria-label={inCart ? "View in cart" : "Add to cart"}
      className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
        inCart
          ? "bg-primary/10 text-primary border border-primary/30 font-bold"
          : "bg-surface-container-low text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container hover:text-primary hover:border-primary/30"
      } ${className}`}
    >
      <span className="material-symbols-outlined text-sm">
        {inCart ? "shopping_cart_checkout" : "add_shopping_cart"}
      </span>
      {inCart ? "In Cart" : "Add to Cart"}
    </button>
  );
}

/** Standalone remove-from-cart button for use inside CartDrawer or detail pages */
export function RemoveFromCartButton({
  serviceId,
  title,
}: {
  serviceId: string;
  title: string;
}) {
  const { removeItem, isInCart } = useCart();
  if (!isInCart(serviceId)) return null;

  return (
    <button
      onClick={() => removeItem(serviceId)}
      className="text-xs text-red-500 font-bold flex items-center gap-1 hover:text-red-600 transition-colors"
      aria-label={`Remove ${title} from cart`}
    >
      <span className="material-symbols-outlined text-sm">remove_shopping_cart</span>
      Remove from cart
    </button>
  );
}
