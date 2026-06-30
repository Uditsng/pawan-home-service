import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface MiddlewareProfile {
  role: string | null;
  status: string | null;
  kyc_status?: string | null;
}

// ─── Centralized role → dashboard mapping ─────────────────────
const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin/dashboard',
  partner: '/partner/dashboard',
  customer: '/customer/dashboard',
}

function getDashboardForRole(role: string | undefined): string {
  return ROLE_DASHBOARDS[role ?? 'customer'] ?? '/customer/dashboard'
}

// ─── Route classification helpers ─────────────────────────────

/** Routes that require authentication AND are scoped to specific roles */
function getRequiredRole(pathname: string): string | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/partner')) return 'partner'
  if (pathname.startsWith('/customer')) return 'customer'
  return null
}

/** Public pages that don't require auth and are accessible to everyone */
function isPublicPage(pathname: string): boolean {
  // Top-level /services showcase (no sub-segments) is public
  if (pathname === '/services') return true
  // Static informational pages
  if (
    pathname.startsWith('/about-us') ||
    pathname.startsWith('/contact-us') ||
    pathname.startsWith('/terms-conditions') ||
    pathname.startsWith('/privacy-policy') ||
    pathname.startsWith('/refund-policy') ||
    pathname.startsWith('/cancellation-policy') ||
    pathname.startsWith('/shipping-policy')
  ) {
    return true
  }
  return false
}

/** Auth pages: login, register, forgot-password */
function isAuthPage(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname === '/register' ||
    pathname.startsWith('/forgot-password')
  )
}

// ─── Main session handler ─────────────────────────────────────

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
      },
    }
  )

  // Guard against Supabase being temporarily unreachable.
  // Without this, a ConnectTimeoutError hangs every request for ~10s,
  // causing cascading slowdowns across the entire app.
  let user: { id: string } | null = null
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const result = await supabase.auth.getUser()
    clearTimeout(timeoutId)
    user = result.data.user
  } catch (err) {
    const isNetworkError =
      err instanceof Error &&
      (err.message.includes('fetch failed') ||
        err.message.includes('ConnectTimeout') ||
        err.message.includes('ECONNREFUSED') ||
        (err as NodeJS.ErrnoException).code === 'UND_ERR_CONNECT_TIMEOUT')
    if (isNetworkError) {
      // Fail open: let the request through rather than hanging the app.
      // The individual page's server-side data fetch will handle auth errors.
      console.warn('[middleware] Supabase unreachable, failing open for:', request.nextUrl.pathname)
      return supabaseResponse
    }
    throw err
  }

  if (!user) {
    supabaseResponse.cookies.delete('phs-role-cache');
  }

  const pathname = request.nextUrl.pathname

  // ─── 1. Public pages: allow everyone through ────────────────
  if (isPublicPage(pathname)) {
    return supabaseResponse
  }

  // ─── 2. Auth pages: redirect logged-in users to dashboard ───
  if (isAuthPage(pathname)) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()

      // Handle suspended/blocked accounts
      if (profile?.status === 'suspended' || profile?.status === 'blocked') {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'AccountSuspended')
        return NextResponse.redirect(url)
      }

      const url = request.nextUrl.clone()
      url.pathname = getDashboardForRole(profile?.role)
      return NextResponse.redirect(url)
    }
    // Guest on auth page — allow
    return supabaseResponse
  }

  // ─── 3. Landing page: redirect logged-in users ──────────────
  if (pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()

      // Suspended/blocked: sign out and stay on landing (they'll go to login)
      if (profile?.status === 'suspended' || profile?.status === 'blocked') {
        await supabase.auth.signOut()
        return supabaseResponse
      }

      const url = request.nextUrl.clone()
      url.pathname = getDashboardForRole(profile?.role)
      return NextResponse.redirect(url)
    }
    // Guest on landing — allow
    return supabaseResponse
  }

  // ─── 4. Protected routes: require auth + correct role ───────
  const requiredRole = getRequiredRole(pathname)

  if (requiredRole) {
    // Not authenticated → redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Fetch profile for role verification (cached in cookie for performance and bound to user.id)
    const cookieName = 'phs-role-cache';
    const cachedCookie = request.cookies.get(cookieName)?.value;
    let profile: MiddlewareProfile | null = null;

    if (cachedCookie) {
      try {
        const parsed = JSON.parse(cachedCookie);
        if (parsed && parsed.userId === user.id) {
          profile = parsed.profile as MiddlewareProfile;
        }
      } catch {
        // ignore JSON errors
      }
    }

    if (!profile) {
      const { data: rawProfile } = await supabase
        .from('profiles')
        .select('role, status, kyc_status')
        .eq('id', user.id)
        .single();
      
      if (rawProfile) {
        profile = rawProfile as MiddlewareProfile;
        supabaseResponse.cookies.set(cookieName, JSON.stringify({ userId: user.id, profile }), {
          maxAge: 600, // 10 minutes cache
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }

    // Handle suspended/blocked accounts
    if (profile?.status === 'suspended' || profile?.status === 'blocked') {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'AccountSuspended')
      return NextResponse.redirect(url)
    }

    const userRole = profile?.role ?? 'customer'

    // Partner KYC and Onboarding gateways
    if (userRole === 'partner') {
      const kycStatus = profile?.kyc_status;
      const partnerStatus = profile?.status;

      if (kycStatus !== 'approved') {
        // Must go to pending page, block all other partner pages
        if (!pathname.startsWith('/partner/pending')) {
          const url = request.nextUrl.clone();
          url.pathname = '/partner/pending';
          return NextResponse.redirect(url);
        }
      } else if (partnerStatus === 'pending') {
        // KYC is approved, but onboarding not done. Redirect to onboarding.
        if (!pathname.startsWith('/partner/onboarding')) {
          const url = request.nextUrl.clone();
          url.pathname = '/partner/onboarding';
          return NextResponse.redirect(url);
        }
      } else {
        // Active partner. Block access to pending/onboarding pages.
        if (pathname.startsWith('/partner/pending') || pathname.startsWith('/partner/onboarding')) {
          const url = request.nextUrl.clone();
          url.pathname = '/partner/dashboard';
          return NextResponse.redirect(url);
        }
      }
    }

    // Strict role check: if user's role doesn't match, redirect to their own dashboard
    if (userRole !== requiredRole) {
      const url = request.nextUrl.clone()
      url.pathname = getDashboardForRole(userRole)
      return NextResponse.redirect(url)
    }

    // Role matches — allow through
    return supabaseResponse
  }

  // ─── 5. All other routes: pass through ──────────────────────
  return supabaseResponse
}
