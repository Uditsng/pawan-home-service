import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service_role key.
 * This client bypasses RLS and can be used on the server for admin tasks
 * or tasks that require elevated privileges (e.g. rate-limiting checks).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
