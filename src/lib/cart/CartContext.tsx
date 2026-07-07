"use client";

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import type { CartItem } from "@/lib/types";

// ─── State & Actions ─────────────────────────────────────────

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; serviceId: string }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "LOAD_CART"; items: CartItem[] };

// ─── Reducer ─────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.items.some(i => i.serviceId === action.item.serviceId);
      if (exists) return state;
      return { ...state, items: [...state.items, action.item], isOpen: true };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter(i => i.serviceId !== action.serviceId) };
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    case "LOAD_CART":
      return { ...state, items: action.items };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  subtotal: number;
  isOpen: boolean;
  isDrawerOpen: boolean;
  isInCart: (serviceId: string) => boolean;
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "phs_cart_v1";

// ─── Provider ────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const isLoaded = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) {
          dispatch({ type: "LOAD_CART", items: parsed });
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      isLoaded.current = true;
    }
  }, []);

  // Persist to localStorage on every change (only after initial load has finished)
  useEffect(() => {
    if (!isLoaded.current) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Ignore storage errors
    }
  }, [state.items]);

  const totalPrice = state.items.reduce((sum, item) => sum + item.basePrice, 0);
  const itemCount = state.items.length;

  const isInCart = useCallback((serviceId: string) => {
    return state.items.some(i => i.serviceId === serviceId);
  }, [state.items]);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", item });
  }, []);

  const removeItem = useCallback((serviceId: string) => {
    dispatch({ type: "REMOVE_ITEM", serviceId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const openCart = useCallback(() => dispatch({ type: "OPEN_CART" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE_CART" }), []);

  return (
    <CartContext.Provider value={{
      items: state.items,
      itemCount,
      totalPrice,
      subtotal: totalPrice,
      isOpen: state.isOpen,
      isDrawerOpen: state.isOpen,
      isInCart,
      addItem,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      openDrawer: openCart,
      closeDrawer: closeCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
