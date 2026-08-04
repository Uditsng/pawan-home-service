"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image"
import { createClient } from "@/utils/supabase/client";
import LogoutButton from "./LogoutButton";
import { getDashboardForRole } from "@/utils/supabase/roles";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function Header() {
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

  const dashboardHref = getDashboardForRole(userRole);

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

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {loading ? (
            <div className="w-20 h-9 animate-pulse bg-surface-container-highest rounded-xl"></div>
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className="inline-block bg-primary text-white px-3 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all text-xs"
              >
                Dashboard
              </Link>
              <LogoutButton
                variant="button"
                className="bg-surface-container text-primary hover:bg-surface-container px-3 py-2 text-xs"
              />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-block bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all text-xs"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
