"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartContext";

export default function CartClearer() {
  const { clearCart } = useCart();
  
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
