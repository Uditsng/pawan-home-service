import "@/app/brand-theme.css";
import { CartProvider } from "@/lib/cart/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function CustomerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen w-full brand-identity bg-surface text-on-surface">
        {children}
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
