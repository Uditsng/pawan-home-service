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
    <div className="flex items-center justify-center min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary overflow-x-hidden">

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 relative overflow-hidden">

        {/* Outer Premium double-glass container */}
        <div className="w-full max-w-md p-1 border rounded-3xl">
          <div className="bg-white/65 backdrop-blur-2xl border border-white/40 rounded-[23px] p-8 sm:p-10 space-y-8">

            {/* Header / Logo */}
            <div className="flex flex-col items-center">
              <Link href="/" className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 p-1 hover:scale-105 transition-transform duration-300 animate-bounce">
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
                  className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Signing in…
                    </span>
                  ) : "Login"}
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