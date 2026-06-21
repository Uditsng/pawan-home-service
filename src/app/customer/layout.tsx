import "@/app/brand-theme.css";
import { CartProvider } from "@/lib/cart/CartContext";
import CartDrawer from "@/components/CartDrawer";

import CustomerHeader from "@/components/CustomerHeader";
import HeaderVisibilityWrapper from "./HeaderVisibilityWrapper";

export default function CustomerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <HeaderVisibilityWrapper header={<CustomerHeader />}>
        {children}
        <CartDrawer />
      </HeaderVisibilityWrapper>
    </CartProvider>
  );
}
