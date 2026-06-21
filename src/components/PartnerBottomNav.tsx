"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PartnerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/partner/dashboard", icon: "home" },
    { label: "Jobs", href: "/partner/jobs", icon: "work" },
    { label: "Earnings", href: "/partner/earnings", icon: "payments" },
    { label: "Performance", href: "/partner/performance", icon: "leaderboard" },
    { label: "Profile", href: "/partner/profile", icon: "person" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white/80 backdrop-blur-[20px] shadow-[0_-12px_32px_rgba(15,23,42,0.06)] rounded-t-2xl border-t border-outline-variant/10">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/partner/dashboard" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch={false}
            className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-1.5 transition-colors duration-300 hover:text-emerald-600 ${isActive
              ? "text-emerald-600 bg-emerald-500/10 rounded-2xl px-4 py-1.5"
              : "text-on-surface-variant/70"
              }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-headline text-[10px] font-bold tracking-normal mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
