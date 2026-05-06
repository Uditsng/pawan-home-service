"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: "home", label: "Home" },
    { href: "/bookings", icon: "calendar_today", label: "Bookings" },
    { href: "/search", icon: "search", label: "Search" },
    { href: "/wallet", icon: "account_balance_wallet", label: "Wallet" },
    { href: "/profile", icon: "person", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-white/80  backdrop-blur-[20px] shadow-[0_-12px_32px_rgba(15,23,42,0.06)] rounded-t-2xl border-t border-outline-variant/10">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 transition-colors duration-300 hover:text-[#059669] dark:hover:text-[#059669] ${isActive
              ? "text-[#059669] bg-[#059669]/20 rounded-2xl px-4 py-1.5"
              : "text-slate-400"
              }`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-manrope text-[10px] font-semibold tracking-normal mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
