"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  normaliseIndianPhone,
  validateIndianPhone,
  sendVerificationOtp,
  verifyOtp,
} from "@/lib/twilio";
import { otpSendLimiter, otpVerifyLimiter } from "@/lib/rate-limit";

// ─── Shared helpers ───────────────────────────────────────────

function buildError(path: string, message: string): never {
  return redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ─── REGISTRATION FLOW ────────────────────────────────────────

/**
 * Step 1: Validate phone + check duplicate + send OTP.
 * Called from the Register page "Send OTP" button.
 * Returns an object (not a redirect) so the client can show the OTP step.
 */
export async function sendRegistrationOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  // Validate format
  if (!validateIndianPhone(phone)) {
    return { success: false, error: "Enter a valid 10-digit Indian mobile number." };
  }

  let e164: string;
  try {
    e164 = normaliseIndianPhone(phone);
  } catch {
    return { success: false, error: "Invalid phone number format." };
  }

  // Rate limit per phone
  const sendLimit = await otpSendLimiter.check(e164);
  if (!sendLimit.allowed) {
    return {
      success: false,
      error: `Too many OTP requests. Please wait ${sendLimit.retryAfter} seconds before trying again.`,
    };
  }

  // Check if phone already registered
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", e164)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "This mobile number is already registered. Please login instead." };
  }

  // Send OTP via Twilio
  try {
    await sendVerificationOtp(e164);
    return { success: true };
  } catch (err) {
    const message = (err as Error).message;
    return { success: false, error: `Failed to send OTP: ${message}` };
  }
}

/**
 * Step 2: Verify OTP, then create Supabase user + profile, then auto-login.
 * Called from the Register page "Complete Registration" button.
 */
export async function verifyOtpAndRegister(formData: FormData): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  const phone = formData.get("phone") as string;
  const otp = formData.get("otp") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = (formData.get("role") as string) || "customer";

  // Sanity checks
  if (!phone || !otp || !email || !password || !fullName) {
    return { success: false, error: "All fields are required." };
  }
  if (role === "admin") {
    return { success: false, error: "Invalid account type. Admin registrations are not allowed." };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  let e164: string;
  try {
    e164 = normaliseIndianPhone(phone);
  } catch {
    return { success: false, error: "Invalid phone number." };
  }

  // Rate limit OTP verify attempts
  const verifyLimit = await otpVerifyLimiter.check(e164);
  if (!verifyLimit.allowed) {
    return {
      success: false,
      error: `Too many verification attempts. Please wait ${verifyLimit.retryAfter} seconds.`,
    };
  }

  // Verify OTP with Twilio (server-side, never trust client)
  let isValid: boolean;
  try {
    isValid = await verifyOtp(e164, otp.trim());
  } catch (err) {
    return { success: false, error: `OTP verification failed: ${(err as Error).message}` };
  }

  if (!isValid) {
    return { success: false, error: "Invalid or expired OTP. Please request a new one." };
  }

  const supabase = await createClient();
  const status = role === "partner" ? "pending" : "active";

  // Create Supabase Auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data?.user) {
    return { success: false, error: "Account creation failed. Please try again." };
  }

  // Upsert profile with all required fields
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    phone: e164,
    role,
    status,
  });

  if (profileError) {
    // If profile upsert fails (e.g. duplicate email), we should inform user
    return { success: false, error: profileError.message };
  }

  // Generate a unique referral code for this new user (fire-and-forget, never blocks)
  try { await supabase.rpc("generate_referral_code", { p_user_id: data.user.id }); } catch { /* silent */ }

  // Apply referral code if provided — silently ignore errors (referral is a bonus, not a blocker)
  const referralCode = formData.get("referral_code") as string | null;
  if (referralCode && referralCode.trim().length > 0) {
    try {
      await supabase.rpc("apply_referral_code", {
        p_new_user_id: data.user.id,
        p_code: referralCode.trim().toUpperCase(),
      });
    } catch { /* silent */ }
  }

  // Auto-login: if email confirmation is disabled, session is available immediately
  if (!data?.session) {
    // Email confirmation enabled — user needs to confirm first
    return {
      success: false,
      error: "Account created! Please check your email to confirm before logging in.",
    };
  }

  const redirectTo = role === "partner" ? "/partner/pending" : "/dashboard";
  return { success: true, redirectTo };
}

// ─── LOGIN FLOW ───────────────────────────────────────────────

/**
 * Login using mobile number + password.
 * Looks up the email from profiles table, then calls signInWithPassword.
 */
export async function loginWithPhone(formData: FormData) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return redirect("/login?error=Mobile number and password are required.");
  }

  if (!validateIndianPhone(phone)) {
    return redirect("/login?error=Enter a valid 10-digit Indian mobile number.");
  }

  let e164: string;
  try {
    e164 = normaliseIndianPhone(phone);
  } catch {
    return redirect("/login?error=Invalid phone number format.");
  }

  const supabase = await createClient();

  // Look up email by phone number
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("email, role, status")
    .eq("phone", e164)
    .maybeSingle();

  if (lookupError || !profile) {
    return redirect("/login?error=No account found with this mobile number.");
  }

  if (profile.status === 'suspended' || profile.status === 'blocked') {
    return redirect("/login?error=Your account is suspended. Please contact support.");
  }

  if (!profile.email) {
    return redirect("/login?error=Account configuration error. Please contact support.");
  }

  // Authenticate via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (authError || !authData.user) {
    return redirect("/login?error=Incorrect password. Please try again.");
  }

  // Block pending partners
  if (profile.role === "partner" && profile.status === "pending") {
    redirect("/partner/pending");
  }

  // Role-based redirect
  const routes: Record<string, string> = {
    admin: "/admin/dashboard",
    partner: "/partner/dashboard",
    customer: "/dashboard",
  };
  redirect(routes[profile.role] || "/dashboard");
}

// ─── FORGOT PASSWORD FLOW ────────────────────────────────────

/**
 * Send OTP to phone for password reset.
 */
export async function sendPasswordResetOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  if (!validateIndianPhone(phone)) {
    return { success: false, error: "Enter a valid 10-digit Indian mobile number." };
  }

  let e164: string;
  try {
    e164 = normaliseIndianPhone(phone);
  } catch {
    return { success: false, error: "Invalid phone number format." };
  }

  // Rate limit
  const sendLimit = await otpSendLimiter.check(`reset:${e164}`);
  if (!sendLimit.allowed) {
    return {
      success: false,
      error: `Too many requests. Please wait ${sendLimit.retryAfter} seconds.`,
    };
  }

  // Check that phone is actually registered
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", e164)
    .maybeSingle();

  if (!profile) {
    // Don't reveal whether phone exists — return success to prevent enumeration
    return { success: true };
  }

  try {
    await sendVerificationOtp(e164);
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to send OTP: ${(err as Error).message}` };
  }
}

/**
 * Verify OTP and reset Supabase Auth password.
 */
export async function verifyOtpAndResetPassword(
  phone: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  let e164: string;
  try {
    e164 = normaliseIndianPhone(phone);
  } catch {
    return { success: false, error: "Invalid phone number." };
  }

  // Rate limit verify attempts
  const verifyLimit = await otpVerifyLimiter.check(`reset:${e164}`);
  if (!verifyLimit.allowed) {
    return { success: false, error: `Too many attempts. Wait ${verifyLimit.retryAfter} seconds.` };
  }

  // Verify OTP server-side
  let isValid: boolean;
  try {
    isValid = await verifyOtp(e164, otp.trim());
  } catch (err) {
    return { success: false, error: `Verification failed: ${(err as Error).message}` };
  }

  if (!isValid) {
    return { success: false, error: "Invalid or expired OTP. Please request a new one." };
  }

  // Look up the user
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("phone", e164)
    .maybeSingle();

  if (!profile?.email) {
    return { success: false, error: "Account not found." };
  }

  // Use service-role client for admin password update
  // We use the regular client's updateUser after signing in via OTP flow
  // Since we can't sign in without old password, we use the Supabase admin API via REST
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    // Fallback: send a Supabase magic link / password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${supabaseUrl}/reset-password`,
    });
    if (error) {
      return { success: false, error: "Failed to initiate password reset." };
    }
    return {
      success: true,
      error: "A password reset link has been sent to your registered email. Please check your inbox.",
    };
  }

  // Use service role key to update password directly
  const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!adminRes.ok) {
    const errData = await adminRes.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
    return { success: false, error: errData.message || "Failed to update password." };
  }

  return { success: true };
}

// ─── LEGACY (kept for backward compatibility) ────────────────

/**
 * @deprecated Use loginWithPhone instead.
 * Kept so existing code still compiles if referenced elsewhere.
 */
export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirect("/login?error=Could not authenticate user");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  if (!profile) redirect("/dashboard");
  if (profile.status === 'suspended' || profile.status === 'blocked') {
    return redirect("/login?error=Your account is suspended. Please contact support.");
  }
  if (profile.role === "partner" && profile.status === "pending") redirect("/partner/pending");
  const routes: Record<string, string> = { admin: "/admin/dashboard", partner: "/partner/dashboard", customer: "/dashboard" };
  redirect(routes[profile.role] || "/dashboard");
}

/**
 * @deprecated Use verifyOtpAndRegister instead.
 */
export async function signup() {
  buildError("/register", "Please use the new registration flow with phone verification.");
}
