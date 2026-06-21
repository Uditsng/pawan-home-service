"use client";

import { usePathname } from "next/navigation";

interface HeaderVisibilityWrapperProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function HeaderVisibilityWrapper({
  header,
  children,
}: HeaderVisibilityWrapperProps) {
  const pathname = usePathname();
  const isCheckout = pathname?.includes("/customer/checkout");

  return (
    <div className="min-h-screen w-full brand-identity bg-surface text-on-surface">
      {!isCheckout && header}
      {children}
    </div>
  );
}
