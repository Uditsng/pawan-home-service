"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { loginWithPhone } from "@/app/auth.actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState("");

  // When server action redirects back to /login?error=..., the component state
  // is preserved (same-route navigation), so we must explicitly reset loading.
  useEffect(() => {
    if (errorParam) setLoading(false);
  }, [errorParam]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    if (!phone || phone.length !== 10) {
      setClientError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setClientError("Password is required.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("phone", phone);
    fd.set("password", password);
    try {
      await loginWithPhone(fd);
    } catch (err) {
      // Next.js redirect() throws a special redirect error — re-throw it so
      // the router can handle the navigation (both success and error redirects).
      if (isRedirectError(err)) throw err;
      // Any unexpected network / runtime failure: reset state & show message.
      setClientError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const displayError = clientError || errorParam;

  return (
    <>
      <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary overflow-x-hidden">

        {/* Left — 3D Brand Panel */}
        <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
          <div
            className="w-full h-full rounded-4xl bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80')" }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-primary/80 via-primary/60 to-secondary/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-90" />
            <div className="absolute top-[20%] right-[15%] text-7xl animate-float-1 z-10 opacity-90">🔐</div>
            <div className="absolute top-[40%] left-[10%] text-6xl animate-float-2 z-10 opacity-80" style={{ animationDelay: "1s" }}>🛡️</div>
            <div className="absolute bottom-[40%] right-[20%] text-5xl animate-float-1 z-10 opacity-90" style={{ animationDelay: "2s" }}>✨</div>
            <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transform-3d group-hover:rotate-y-2 group-hover:-rotate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out will-change-transform z-20">
              <div className="transform translate-z-[30px]">
                <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Secure Portal
                </div>
                <h1 className="text-4xl xl:text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-md leading-tight">
                  Your home,<br />perfectly managed.
                </h1>
                <p className="text-base xl:text-lg text-white/80 max-w-md font-medium">
                  Access premium home services, manage your properties, or join our network of elite service professionals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden">

          {/* Animated orbs */}
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,#a6ce37_0%,transparent_70%)] blur-2xl opacity-20 animate-spin-slow pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-2xl opacity-20 animate-[spin-slow_25s_linear_infinite_reverse] pointer-events-none" />

          {/* Mobile floating emojis */}
          <div className="lg:hidden absolute top-[15%] right-[10%] text-4xl animate-float-1 z-0 opacity-60 pointer-events-none">🔐</div>
          <div className="lg:hidden absolute top-[40%] left-[5%] text-3xl animate-float-2 z-0 opacity-50 pointer-events-none" style={{ animationDelay: "1s" }}>🛡️</div>

          <div className="w-full max-w-sm space-y-8 relative z-10 p-8 sm:p-10 transition-all duration-500">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Welcome back</h2>
              <p className="text-on-surface-variant font-medium mt-2">Sign in with your mobile number.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mobile Number */}
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 py-3.5 bg-white/50 rounded-xl border border-white shadow-sm text-sm font-bold text-on-surface-variant shrink-0">
                    🇮🇳 +91
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 group">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[10px] text-success font-bold hover:underline">
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error */}
              {displayError && (
                <div className="p-4 bg-red-50 text-red-600 text-center text-sm font-bold rounded-xl border border-red-200 shadow-sm">
                  {displayError}
                </div>
              )}

              {messageParam && (
                <div className="p-4 bg-white/80 text-primary text-center text-sm font-bold rounded-xl border border-white shadow-sm">
                  {messageParam}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradient"
                  className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] hover:shadow-[0_15px_30px_rgba(42,245,152,0.4)] transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Signing in…
                    </span>
                  ) : "Sign In to Dashboard"}
                </Button>
              </div>
            </form>

            <p className="text-center text-sm font-medium text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-success font-extrabold hover:underline">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}