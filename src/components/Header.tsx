"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image"
import { createClient } from "@/utils/supabase/client";
import LogoutButton from "./LogoutButton";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Centralized role → dashboard mapping (must match proxy.ts)
const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin/dashboard',
  partner: '/partner/dashboard',
  customer: '/customer/dashboard',
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userRole, setUserRole] = useState<string>('customer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUserAndRole() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!active) return;

      if (authUser) {
        setUser(authUser);
        // Fetch actual role from profiles table (never rely on user_metadata)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();
        if (active && profile?.role) {
          setUserRole(profile.role);
        }
      } else {
        setUser(null);
      }
      if (active) setLoading(false);
    }

    loadUserAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          // Re-fetch role on auth state change
          const response = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          const profile = response.data as { role: string } | null;
          if (active && profile?.role) {
            setUserRole(profile.role);
          }
        } else {
          setUser(null);
          setUserRole('customer');
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const dashboardHref = ROLE_DASHBOARDS[userRole] ?? '/customer/dashboard';

  return (
    <header className="sticky top-0 w-full z-50 bg-surface/95 backdrop-blur-md shadow-sm pt-safe">
      <nav className="flex justify-between items-center px-4 md:px-6 lg:px-8 py-3 md:py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/PHS.png"
            alt="PHS Cleaning Company Logo"
            className="h-12 md:h-14 w-auto"
            width={40}
            height={40}
          />

          <div className="text-lg md:text-xl font-bold tracking-tighter text-primary font-headline hidden sm:block">
            PHS Cleaning Company
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {/* <Link
            href="/services"
            className="text-primary font-bold border-b-2 border-secondary font-headline tracking-tight text-sm hover:text-secondary transition-colors"
          >
            Services
          </Link> */}
          <Link
            href="/contact-us"
            className="text-on-surface-variant font-medium font-headline tracking-tight text-sm hover:text-secondary transition-colors"
          >
            Contact Us
          </Link>
          <div className="flex items-center gap-3 lg:gap-4 ml-2 lg:ml-4">
            {loading ? (
              <div className="w-24 h-10 animate-pulse bg-surface-container-highest rounded-xl"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link href={dashboardHref} className="inline-block bg-primary text-white px-5 lg:px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all text-sm">
                  Dashboard
                </Link>
                <LogoutButton variant="button" className="bg-surface-container text-primary! hover:bg-surface-container" />
              </div>
            ) : (
              <>
                <Link href="/login" className="text-primary font-medium px-4 py-2 hover:bg-surface-container-low rounded-xl transition-colors text-sm">
                  Login
                </Link>
                <Link href="/register" className="inline-block bg-primary text-white px-5 lg:px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all text-sm">
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
        <div className="md:hidden absolute top-full left-0 w-full bg-surface-container-lowest/98 backdrop-blur-xl shadow-xl border-t border-outline-variant/50 animate-[slideDown_0.2s_ease-out]">
          <div className="flex flex-col px-6 py-6 gap-1 max-w-7xl mx-auto">
            {/* <Link
              href="/services"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 py-3.5 px-4 rounded-xl text-primary font-bold text-[15px] hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
              Services
            </Link> */}
            <Link
              href="/contact-us"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 py-3.5 px-4 rounded-xl text-primary font-bold text-[15px] hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">support_agent</span>
              Contact Us
            </Link>
            <hr className="my-3 border-outline-variant/50" />
            <div className="flex flex-col gap-3 pt-2">
              {loading ? null : user ? (
                <div className="flex flex-col gap-3">
                  <Link
                    href={dashboardHref}
                    onClick={() => setMenuOpen(false)}
                    className="text-center py-3 px-6 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-primary/90 transition-colors"
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
                    className="text-center py-3 px-6 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-primary/90 transition-colors"
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
