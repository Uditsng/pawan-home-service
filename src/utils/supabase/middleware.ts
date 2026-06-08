import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Centralized role → dashboard mapping ─────────────────────
const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin/dashboard',
  partner: '/partner/dashboard',
  customer: '/dashboard',
}

function getDashboardForRole(role: string | undefined): string {
  return ROLE_DASHBOARDS[role ?? 'customer'] ?? '/dashboard'
}

// ─── Route classification helpers ─────────────────────────────

/** Routes that require authentication AND are scoped to specific roles */
function getRequiredRole(pathname: string): string | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/partner')) return 'partner'
  // Customer-scoped routes under the (customer) route group
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/wallet') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/delete-account') ||
    pathname.startsWith('/support')
  ) {
    return 'customer'
  }
  // /services/[category]/[serviceId] — customer booking flow (has 2+ path segments)
  const serviceSegments = pathname.replace('/services/', '').split('/').filter(Boolean)
  if (pathname.startsWith('/services/') && serviceSegments.length >= 1) {
    return 'customer'
  }
  return null
}

/** Public pages that don't require auth and are accessible to everyone */
function isPublicPage(pathname: string): boolean {
  // Top-level /services showcase (no sub-segments) is public
  if (pathname === '/services') return true
  // Static informational pages
  if (
    pathname.startsWith('/about') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms-conditions')
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
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

    // Fetch profile for role verification
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

    const userRole = profile?.role ?? 'customer'

    // Partner onboarding enforcement: pending partners go to onboarding
    if (
      userRole === 'partner' &&
      profile?.status === 'pending' &&
      !pathname.startsWith('/partner/onboarding')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/partner/onboarding'
      return NextResponse.redirect(url)
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
