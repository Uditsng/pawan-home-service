"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/login?error=Could not authenticate user");
  }

  // Fetch role and status from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  // Block pending partners from logging in to the main app
  if (profile.role === 'partner' && profile.status === 'pending') {
    redirect('/partner/pending');
  }

  // Route by role — no user selection needed
  const routes: Record<string, string> = { 
    admin: '/admin/dashboard', 
    partner: '/partner/dashboard', 
    customer: '/dashboard' 
  };
  redirect(routes[profile.role] || '/dashboard');
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string || "customer";

  // NEVER allow admin via signup form
  if (role === 'admin') {
    return redirect("/register?error=Invalid account type");
  }

  const status = role === 'partner' ? 'pending' : 'active';

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role
      }
    }
  });

  if (error) {
    return redirect(`/register?error=${error.message}`);
  }

  // If email confirmation is required, session will be null
  if (!data?.session && !data?.user) {
    return redirect(`/register?error=Check your email to confirm your account.`);
  }

  if (data?.user) {
    // Store role + status in profiles table
    await supabase.from('profiles').upsert({
      id: data.user.id,
      role,
      status,
    });
  }

  if (role === 'partner') {
    redirect('/partner/onboarding');
  } else {
    redirect('/dashboard');
  }
}

