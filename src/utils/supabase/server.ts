import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

function requireEnv(value: string | undefined, name: string): asserts value is string {
  if (!value) {
    throw new Error(`Missing critical environment variable: ${name}. The application cannot start without it.`);
  }
}

export const createClient = cache(async () => {
  const cookieStore = await cookies()
  const nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const nextAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  requireEnv(nextUrl, "NEXT_PUBLIC_SUPABASE_URL");
  requireEnv(nextAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(nextUrl, nextAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    global: {
      fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
    },
  })
})
