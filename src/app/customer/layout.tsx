import "@/app/brand-theme.css";
import { CartProvider } from "@/lib/cart/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { createClient } from "@/utils/supabase/server";

import Header from "@/components/Header";
import CustomerHeader from "@/components/CustomerHeader";
import HeaderVisibilityWrapper from "./HeaderVisibilityWrapper";

export default async function CustomerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <CartProvider>
      <HeaderVisibilityWrapper header={user ? <CustomerHeader /> : <Header />}>
        {children}
        <CartDrawer />
      </HeaderVisibilityWrapper>
    </CartProvider>
  );
}
