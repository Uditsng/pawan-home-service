"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
      setLoading(false);
      // Next.js redirect() throws a special redirect error — re-throw it so
      // the router can handle the navigation (both success and error redirects).
      if (isRedirectError(err)) throw err;
      // Any unexpected network / runtime failure: reset state & show message.
      setClientError("Something went wrong. Please try again.");
    }
  };

  const displayError = clientError || errorParam;

  return (
    <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary overflow-x-hidden">
      
      {/* Left — 3D Brand Panel */}
      <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
        <div
          className="w-full h-full rounded-4xl bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80')" }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/90 via-primary/75 to-secondary/35 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-95" />
          
          {/* Left panel floating glass badges */}
          <div className="absolute top-[20%] right-[15%] p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-3xl animate-float-1 z-10 select-none hover:scale-110 transition-transform duration-300">🔐</div>
          <div className="absolute top-[40%] left-[10%] p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-2xl animate-float-2 z-10 select-none hover:scale-110 transition-transform duration-300" style={{ animationDelay: "1s" }}>🛡️</div>
          <div className="absolute bottom-[40%] right-[20%] p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-3xl animate-float-1 z-10 select-none hover:scale-110 transition-transform duration-300" style={{ animationDelay: "2s" }}>✨</div>

          <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transform-3d group-hover:rotate-y-2 group-hover:-rotate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out will-change-transform z-20">
            <div className="transform translate-z-8">
              <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                Secure Portal
              </div>
              <h1 className="text-4xl xl:text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-md leading-tight">
                Your home,<br />perfectly managed.
              </h1>
              <p className="text-base xl:text-lg text-white/80 max-w-md font-medium">
                Access premium home services, manage your bookings, and connect with India&apos;s elite service professionals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 relative overflow-hidden">

        {/* Animated background orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-80 h-80 rounded-full bg-radial from-secondary/15 to-transparent blur-3xl opacity-40 animate-orb-float-1 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-radial from-primary/10 to-transparent blur-3xl opacity-30 animate-orb-float-2 pointer-events-none" />

        {/* Mobile floating emojis in glass badges */}
        <div className="lg:hidden absolute top-[12%] right-[8%] p-3.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg text-2xl animate-float-1 z-0 pointer-events-none select-none rotate-12">🔐</div>
        <div className="lg:hidden absolute bottom-[18%] left-[8%] p-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg text-2xl animate-float-2 z-0 pointer-events-none select-none -rotate-12" style={{ animationDelay: "1s" }}>🛡️</div>

        {/* Outer Premium double-glass container */}
        <div className="w-full max-w-md p-1 bg-linear-to-br from-white/60 via-white/20 to-secondary/35 rounded-3xl shadow-[0_20px_50px_rgba(30,41,59,0.06)] hover:shadow-ambient-hover hover:-translate-y-1 relative z-10 transition-all duration-500">
          <div className="bg-white/65 backdrop-blur-2xl border border-white/40 rounded-[23px] p-8 sm:p-10 space-y-8">
            
            {/* Header / Logo */}
            <div className="flex flex-col items-center">
              <Link href="/" className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-outline-variant/30 shadow-md mb-4 p-1 hover:scale-105 transition-transform duration-300">
                <Image
                  src="/PHS.png"
                  alt="PHS Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </Link>
              <h2 className="text-3xl font-extrabold tracking-tight text-primary text-center">Welcome back</h2>
              <p className="text-on-surface-variant text-sm font-medium mt-1 text-center">Sign in with your mobile number.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mobile Number */}
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-3.5 bg-white/60 rounded-xl border border-white shadow-sm text-sm font-bold text-primary shrink-0 backdrop-blur-md">
                    <span>🇮🇳</span>
                    <span className="text-xs text-on-surface-variant/80 font-bold">+91</span>
                  </div>
                  <div className="relative w-full">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      className="w-full pl-10 pr-4 py-3.5 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-on-surface-variant/40"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 group">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
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
                  showLockIcon={true}
                />
              </div>

              {/* Error */}
              {displayError && (
                <div className="flex items-center gap-2.5 p-4 bg-error/5 text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                  <span className="grow text-left leading-normal font-semibold text-xs">{displayError}</span>
                </div>
              )}

              {messageParam && (
                <div className="flex items-center gap-2.5 p-4 bg-success/5 text-success text-sm font-bold rounded-xl border border-success/20 shadow-xs animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[20px] shrink-0">check_circle</span>
                  <span className="grow text-left leading-normal font-semibold text-xs">{messageParam}</span>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradient"
                  className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}