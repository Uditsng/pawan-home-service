"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { loginWithPhone } from "@/app/auth.actions";

const normalizePhone = (v: string) =>
  v.replace(/\D/g, "").replace(/^(?:91|0)/, "").slice(0, 10);

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");
  const nextParam = searchParams.get("next");

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
    if (nextParam) fd.set("next", nextParam);

    try {
      await loginWithPhone(fd);
    } catch (err) {
      setLoading(false);
      if (isRedirectError(err)) throw err;
      setClientError("Something went wrong. Please try again.");
    }
  };

  const displayError = clientError || errorParam;

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-surface selection:bg-secondary/30 selection:text-primary overflow-x-hidden pt-8 pb-10 sm:py-12 px-4">
      <div className="w-full max-w-md p-1 border border-outline-variant/40 rounded-3xl">
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[23px] p-6 sm:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col items-center">
            <Link
              href="/"
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 p-1 shadow-xs hover:scale-105 active:scale-95 transition-transform duration-200"
              aria-label="PHS Homepage"
            >
              <Image
                src="/PHS.png"
                alt="PHS Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary text-center">
              Welcome back
            </h1>
            <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-1 text-center">
              Sign in with your mobile number.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {nextParam && <input type="hidden" name="next" value={nextParam} />}

            {/* Mobile Number */}
            <div className="space-y-1.5 group">
              <label
                htmlFor="login-phone"
                className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors"
              >
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 px-3 py-3 bg-white/60 backdrop-blur-md rounded-xl border border-white shadow-xs text-sm font-bold text-primary shrink-0">
                  <span className="text-xs text-on-surface-variant/80 font-bold">+91</span>
                </div>
                <input
                  id="login-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-xs placeholder:text-on-surface-variant/40"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="login-password"
                  className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors"
                >
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-success font-bold hover:underline">
                  Forgot?
                </Link>
              </div>
              <PasswordInput
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                showLockIcon
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div role="alert" className="flex items-center gap-2.5 p-3.5 bg-error/5 text-error text-xs sm:text-sm font-bold rounded-xl border border-error/20 shadow-xs">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span className="grow text-left leading-normal font-semibold">{displayError}</span>
              </div>
            )}

            {/* Success/Redirect Message */}
            {messageParam && (
              <div className="flex items-center gap-2.5 p-3.5 bg-success/5 text-success text-xs sm:text-sm font-bold rounded-xl border border-success/20 shadow-xs">
                <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                <span className="grow text-left leading-normal font-semibold">{messageParam}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.01] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Signing in…
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm font-medium text-on-surface-variant pt-1">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-success font-extrabold hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <LoginForm />
    </Suspense>
  );
}