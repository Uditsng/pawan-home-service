import { createClient } from "./server";

/**
 * Ensures the currently authenticated user is an administrator.
 * Throws an error if they are not authenticated or do not have the admin role.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  
  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("UNAUTHENTICATED: Authentication required.");
  }

  // 2. Query user profile to check role
  const { data: profile, error: dbError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbError || !profile) {
    throw new Error("UNAUTHORIZED: User profile not found.");
  }

  if (profile.role !== "admin") {
    throw new Error("FORBIDDEN: Administrative access required.");
  }

  return user;
}

export interface CurrentProfile {
  user: import("@supabase/supabase-js").User;
  profile: Record<string, unknown> | null;
}

/**
 * Fetches the authenticated user and their profile row without enforcing a role.
 * Returns null when the request is unauthenticated. Reuses the request-scoped
 * server client so it is safe to call from Server Components and Server Actions.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: dbError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (dbError) {
    return { user, profile: null };
  }

  return { user, profile };
}
