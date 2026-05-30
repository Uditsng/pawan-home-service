"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image"
import LogoutButton from "@/components/LogoutButton";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
    { name: "Bookings", href: "/admin/bookings", icon: "calendar_month" },
    { name: "Customers", href: "/admin/customers", icon: "group" },
    { name: "Partners", href: "/admin/partners", icon: "handshake" },
    { name: "Services", href: "/admin/services", icon: "handyman" },
    { name: "Finance", href: "/admin/finance", icon: "payments" },
    { name: "Disputes", href: "/admin/disputes", icon: "gavel" },
    { name: "Analytics", href: "/admin/analytics", icon: "monitoring" },
    { name: "Settings", href: "/admin/settings", icon: "settings" }
  ];

  return (
    <div className="bg-surface text-on-surface min-h-screen flex font-body selection:bg-secondary/30">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <aside className="fixed left-0 top-0 h-screen w-72 bg-surface flex flex-col py-8 px-6 z-70 shadow-2xl animate-[slideIn_0.3s_ease-out] border-r border-outline-variant/30">
            <div className="mb-12 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <Image
                  src="/PHS.png"
                  alt="PavanHome Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
                />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-primary leading-none">PavanHome</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mt-1">Admin Ops</p>
                </div>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold text-sm ${isActive
                      ? "bg-primary text-white shadow-xl shadow-primary/20"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      {link.icon}
                    </span>
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 bg-surface-container-lowest flex-col py-6 px-3 z-50 border-r border-outline-variant/30">
        <div className="mb-12">
          <Link href="/" className="flex items-center gap-4 group">
            <Image
              src="/PHS.png"
              alt="PavanHome Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-primary leading-none">PavanHome</h1>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant mt-1.5 opacity-60">Operations</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-3.5 rounded-xl transition-all font-bold text-[14px] ${isActive
                  ? "bg-primary text-white shadow-xl shadow-primary/20 pl-5 pr-1"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary pl-4 pr-2 px-3 hover:pl-4 hover:pr-2"
                  }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {link.icon}
                </span>
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Identity */}
        <div className="mt-10 pt-8 border-t border-outline-variant/20">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center font-black text-xs shadow-inner">AR</div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-primary truncate uppercase tracking-widest">Pavan</p>
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen min-w-0">
        {/* Modern Nav Header */}
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center h-16 md:h-20 px-6 md:px-10 border-b border-outline-variant/20">
          <div className="flex items-center gap-6">
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container text-on-surface"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-lg font-bold text-primary font-headline tracking-tight hidden sm:block">Control Center</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs font-black text-on-surface-variant uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> Platform Live
            </div>
            <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant hover:bg-secondary hover:text-primary transition-all relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-3 right-3 w-2 h-2 bg-secondary rounded-full border-2 border-surface"></span>
            </button>
            <LogoutButton variant="icon" />
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-3 md:p-10 bg-surface-dim/30 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
