"use client";

import { usePathname } from "next/navigation";

interface PartnerVisibilityWrapperProps {
  header: React.ReactNode;
  bottomNav: React.ReactNode;
  children: React.ReactNode;
}

export default function PartnerVisibilityWrapper({
  header,
  bottomNav,
  children,
}: PartnerVisibilityWrapperProps) {
  const pathname = usePathname();

  const isOnboarding = pathname === "/partner/onboarding";
  const isPending = pathname === "/partner/pending";
  const isProfileHub = pathname === "/partner/profile";

  // Hide header on onboarding, pending, and the main profile hub (which has a custom profile header)
  const showHeader = !isOnboarding && !isPending && !isProfileHub;

  // Hide bottom nav on onboarding and pending
  const showBottomNav = !isOnboarding && !isPending;

  return (
    <div className="min-h-screen w-full brand-identity bg-surface text-on-surface">
      {showHeader && header}
      {children}
      {showBottomNav && bottomNav}
    </div>
  );
}
