"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image"
import { createClient } from "@/utils/supabase/client";
import LogoutButton from "./LogoutButton";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { role?: string } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 w-full z-50 bg-surface/95 backdrop-blur-md shadow-sm pt-safe">
      <nav className="flex justify-between items-center px-4 md:px-6 lg:px-8 py-3 md:py-4 max-w-7xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/PHS.png"
            alt="PHS Company Logo"
            className="h-12 md:h-14 w-auto"
            width={40}
            height={40}
          />

          <div className="text-lg md:text-xl font-bold tracking-tighter text-primary font-headline hidden sm:block">
            PHS Company
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <Link
            href="/services"
            className="text-primary font-bold border-b-2 border-secondary font-headline tracking-tight text-sm hover:text-secondary transition-colors"
          >
            Services
          </Link>
          <Link
            href="/help"
            className="text-on-surface-variant font-medium font-headline tracking-tight text-sm hover:text-secondary transition-colors"
          >
            Help
          </Link>
          <div className="flex items-center gap-3 lg:gap-4 ml-2 lg:ml-4">
            {loading ? (
              <div className="w-24 h-10 animate-pulse bg-slate-200 rounded-xl"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link href={user.user_metadata?.role === 'admin' ? '/admin/dashboard' : user.user_metadata?.role === 'partner' ? '/partner/dashboard' : '/dashboard'} className="inline-block bg-primary text-white px-5 lg:px-6 py-2.5 rounded-xl font-bold hover:bg-[#0F172A] transition-all text-sm">
                  Dashboard
                </Link>
                <LogoutButton variant="button" className="!bg-surface-container-low !text-primary hover:!bg-surface-container-high" />
              </div>
            ) : (
              <>
                <Link href="/login" className="text-primary font-medium px-4 py-2 hover:bg-surface-container-low rounded-xl transition-colors text-sm">
                  Login
                </Link>
                <Link href="/register" className="inline-block bg-primary text-white px-5 lg:px-6 py-2.5 rounded-xl font-bold hover:bg-[#0F172A] transition-all text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-primary p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-[28px]">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/98 backdrop-blur-xl shadow-xl border-t border-[#DEE2E6]/50 animate-[slideDown_0.2s_ease-out]">
          <div className="flex flex-col px-6 py-6 gap-1 max-w-7xl mx-auto">
            <Link
              href="/services"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 py-3.5 px-4 rounded-xl text-primary font-bold text-[15px] hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
              Services
            </Link>
            <Link
              href="#"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 py-3.5 px-4 rounded-xl text-primary font-bold text-[15px] hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">help</span>
              Help
            </Link>
            <hr className="my-3 border-[#DEE2E6]/50" />
            <div className="flex flex-col gap-3 pt-2">
              {loading ? null : user ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href={user.user_metadata?.role === 'admin' ? '/admin/dashboard' : user.user_metadata?.role === 'partner' ? '/partner/dashboard' : '/dashboard'}
                    onClick={() => setMenuOpen(false)}
                    className="text-center py-3 px-6 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-[#0F172A] transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  <LogoutButton className="w-full py-3" />
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-center py-3 px-6 rounded-xl border-2 border-primary text-primary font-bold text-[15px] hover:bg-surface-container-low transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="text-center py-3 px-6 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-[#0F172A] transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
