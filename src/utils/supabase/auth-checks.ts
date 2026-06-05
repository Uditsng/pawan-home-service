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
