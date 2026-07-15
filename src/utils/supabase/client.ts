import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined;

function requireEnv(value: string | undefined, name: string): asserts value is string {
  if (!value) {
    throw new Error(`Missing critical environment variable: ${name}. The application cannot start without it.`);
  }
}

export function createClient() {
  const nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const nextAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  requireEnv(nextUrl, "NEXT_PUBLIC_SUPABASE_URL");
  requireEnv(nextAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (typeof window === "undefined") {
    return createBrowserClient(nextUrl, nextAnonKey);
  }

  if (!client) {
    client = createBrowserClient(nextUrl, nextAnonKey);
  }

  return client;
}
