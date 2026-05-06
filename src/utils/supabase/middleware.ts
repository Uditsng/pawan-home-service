import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const pathname = request.nextUrl.pathname;

  // Protect designated routes
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/partner') || pathname.startsWith('/admin') || pathname.startsWith('/checkout')
  const isAuthPath = pathname.startsWith('/login') || pathname === '/register'

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based protection
  if (user) {
    // We only want to check profile for protected routes to avoid DB hits on every public page
    if (isProtectedPath || isAuthPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (isProtectedPath) {
        if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url))
        }
        if (pathname.startsWith('/partner') && profile?.role !== 'partner') {
          return NextResponse.redirect(new URL('/', request.url))
        }
        // Customer dashboard protection (only customer or admin can access)
        if (pathname.startsWith('/dashboard') && profile?.role === 'partner') {
          return NextResponse.redirect(new URL('/partner/dashboard', request.url))
        }
      }

      if (isAuthPath) {
        const url = request.nextUrl.clone()
        if (profile?.role === 'admin') url.pathname = '/admin/dashboard'
        else if (profile?.role === 'partner') url.pathname = '/partner/dashboard'
        else url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
