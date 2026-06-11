"use client";

import { useCart } from "@/lib/cart/CartContext";
import type { CartItem } from "@/lib/types";

interface AddToCartButtonProps {
  item: CartItem;
  /** If true, renders a compact icon-only style suitable for service cards */
  compact?: boolean;
}

export default function AddToCartButton({
  item,
  compact = false,
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart, openDrawer } = useCart();
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
        onClick={handleClick}
        aria-label={inCart ? "View in cart" : "Add to cart"}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
          inCart
            ? "bg-primary text-white shadow-md shadow-primary/20"
            : "bg-surface-container-low border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-primary hover:border-primary/30"
        }`}
      >
        <span className="material-symbols-outlined text-lg">
          {inCart ? "shopping_cart_checkout" : "add_shopping_cart"}
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
      }`}
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
