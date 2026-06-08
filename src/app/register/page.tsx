"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  sendRegistrationOtp,
  verifyOtpAndRegister,
} from "@/app/auth.actions";

// ─── OTP Input (6-digit split boxes) ─────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !inputs.current[idx]?.value && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/, "").slice(-1);
    const arr = value.split("").concat(Array(6).fill("")).slice(0, 6);
    arr[idx] = char;
    const next = arr.join("");
    onChange(next);
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const lastIdx = Math.min(pasted.length, 5);
    inputs.current[lastIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 text-center text-xl font-black text-primary bg-white/60 border-2 border-white focus:border-secondary/60 focus:ring-4 focus:ring-secondary/20 rounded-xl outline-none transition-all shadow-sm"
        />
      ))}
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, onExpire]);

  return (
    <span className="text-on-surface-variant">
      Resend in <span className="font-bold text-primary">{remaining}s</span>
    </span>
  );
}

// ─── Main Register Page ───────────────────────────────────────

type Step = "details" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [role] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);

  const handleSendOtp = useCallback(async () => {
    setError("");
    // Basic client-side validation
    if (!fullName.trim()) return setError("Full name is required.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    const result = await sendRegistrationOtp(phone);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to send OTP.");
    } else {
      setOtp("");
      setCanResend(false);
      setCountdownKey((k) => k + 1);
      setStep("otp");
    }
  }, [fullName, email, password, phone]);

  const handleResend = useCallback(async () => {
    setError("");
    setCanResend(false);
    setOtp("");
    setLoading(true);
    const result = await sendRegistrationOtp(phone);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to resend OTP.");
    } else {
      setCountdownKey((k) => k + 1);
    }
  }, [phone]);

  const handleRegister = useCallback(async () => {
    if (otp.length !== 6) return setError("Please enter the 6-digit OTP.");
    setError("");
    setLoading(true);

    const fd = new FormData();
    fd.set("phone", phone);
    fd.set("otp", otp);
    fd.set("email", email);
    fd.set("password", password);
    fd.set("full_name", fullName);
    fd.set("role", role);

    const result = await verifyOtpAndRegister(fd);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Registration failed.");
      // If OTP was wrong/expired, allow going back
    } else if (result.redirectTo) {
      router.push(result.redirectTo);
    }
  }, [otp, phone, email, password, fullName, role, router]);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
        body { font-family: 'Bricolage Grotesque', sans-serif; background: #F8FAFC; color: #002261; overflow-x: hidden; }
        @keyframes float-3d-1 {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: drop-shadow(0 10px 25px rgba(0,0,0,0.3)); }
          50% { transform: translateY(-20px) rotate(8deg) scale(1.05); filter: drop-shadow(0 25px 35px rgba(0,0,0,0.4)); }
        }
        @keyframes float-3d-2 {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: drop-shadow(0 10px 25px rgba(0,0,0,0.2)); }
          50% { transform: translateY(15px) rotate(-6deg) scale(1.08); filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); }
        }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-float-1 { animation: float-3d-1 7s ease-in-out infinite; }
        .animate-float-2 { animation: float-3d-2 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}} />

      <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary flex-row-reverse">

        {/* Left — 3D Brand Panel */}
        <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
          <div
            className="w-full h-full rounded-4xl bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80')" }}
          >
            <div className="absolute inset-0 bg-linear-to-bl from-primary/80 via-primary/60 to-secondary/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-90" />
            <div className="absolute top-[20%] left-[15%] text-7xl animate-float-1 z-10 opacity-90">🚀</div>
            <div className="absolute top-[40%] right-[10%] text-6xl animate-float-2 z-10 opacity-80" style={{ animationDelay: "1s" }}>🤝</div>
            <div className="absolute bottom-[40%] left-[20%] text-5xl animate-float-1 z-10 opacity-90" style={{ animationDelay: "2s" }}>🌟</div>
            <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transform-3d group-hover:rotate-y-2 group-hover:rotate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out will-change-transform z-20">
              <div className="transform translate-z-[30px]">
                <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Verified Network
                </div>
                <h1 className="text-4xl xl:text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-md leading-tight">
                  Join PHS Cleaning<br />Company.
                </h1>
                <p className="text-base xl:text-lg text-white/80 max-w-md font-medium">
                  Verified professionals and trusted customers — building India&apos;s premier home services platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden">

          {/* Animated background orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,#a6ce37_0%,transparent_70%)] blur-2xl opacity-20 animate-spin-slow pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-2xl opacity-20 animate-[spin-slow_25s_linear_infinite_reverse] pointer-events-none" />

          {/* Mobile floating emojis */}
          <div className="lg:hidden absolute top-[15%] left-[10%] text-4xl animate-float-1 z-0 opacity-60 pointer-events-none">🚀</div>
          <div className="lg:hidden absolute top-[40%] right-[5%] text-3xl animate-float-2 z-0 opacity-50 pointer-events-none" style={{ animationDelay: "1s" }}>🤝</div>

          <div className="w-full max-w-sm space-y-7 relative z-10 p-8 sm:p-10 transition-all duration-500">

            {/* ── STEP 1: Details ── */}
            {step === "details" && (
              <>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Create account</h2>
                  <p className="text-on-surface-variant font-medium mt-2">Verified by your mobile number</p>
                </div>

                <div className="space-y-5">

                  {/* Full Name */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Full Name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ravi Kumar"
                      className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Mobile Number</label>
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
                        className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200 shadow-sm">
                      {error}
                    </div>
                  )}

                  {/* Send OTP Button */}
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] hover:shadow-[0_15px_30px_rgba(42,245,152,0.4)] transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Sending OTP…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        Send OTP to Mobile
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 2: Verify OTP ── */}
            {step === "otp" && (
              <>
                <div>
                  <button
                    type="button"
                    onClick={() => { setStep("details"); setError(""); }}
                    className="flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-4"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Change details
                  </button>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Verify OTP</h2>
                  <p className="text-on-surface-variant font-medium mt-2">
                    Sent to <span className="font-bold text-primary">+91 {phone}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  {/* 6-digit OTP */}
                  <OtpInput value={otp} onChange={setOtp} />

                  {/* Resend */}
                  <div className="text-center text-xs font-semibold">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="text-success font-bold hover:underline disabled:opacity-60"
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <Countdown key={countdownKey} seconds={60} onExpire={() => setCanResend(true)} />
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200 shadow-sm">
                      {error}
                    </div>
                  )}

                  {/* Complete Registration */}
                  <Button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || otp.length !== 6}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] hover:shadow-[0_15px_30px_rgba(42,245,152,0.4)] transition-all duration-300 border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Creating account…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                        Complete Registration
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}

            <p className="text-center text-sm font-medium text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-success font-extrabold hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
