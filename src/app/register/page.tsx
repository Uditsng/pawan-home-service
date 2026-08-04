"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
          className="w-11 h-13 text-center text-xl font-black text-primary bg-white/60 border border-white focus:border-secondary/60 focus:ring-4 focus:ring-secondary/20 rounded-xl outline-none transition-all hover:scale-[1.05] focus:scale-[1.08] shadow-xs"
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
    <span className="text-on-surface-variant font-semibold">
      Resend in <span className="font-bold text-primary">{remaining}s</span>
    </span>
  );
}

// ─── Main Register Page ───────────────────────────────────────

type Step = "details" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);

  const handleSendOtp = useCallback(async () => {
    setError("");
    // Basic client-side validation
    if (!fullName.trim()) return setError("Full name is required.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (phone.length !== 10) return setError("Enter a valid 10-digit mobile number.");

    setLoading(true);
    const result = await sendRegistrationOtp(phone, email);
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
    const result = await sendRegistrationOtp(phone, email);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to resend OTP.");
    } else {
      setCountdownKey((k) => k + 1);
    }
  }, [phone, email]);

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
    if (referralCode.trim()) fd.set("referral_code", referralCode.trim().toUpperCase());

    const result = await verifyOtpAndRegister(fd);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Registration failed.");
    } else if (result.redirectTo) {
      router.push(result.redirectTo);
    }
  }, [otp, phone, email, password, fullName, role, referralCode, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-dim selection:bg-secondary/30 selection:text-primary flex-row-reverse overflow-x-hidden relative">

      
      {/* Right — Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 relative z-10">

        {/* Outer Floating Double-Glass Card Halo */}
        <div className="w-full max-w-md p-[1.5px] bg-linear-to-bl from-white/80 via-white/20 to-secondary/40 rounded-4xl shadow-[0_25px_60px_-15px_rgba(0,34,97,0.12)] hover:shadow-[0_35px_70px_-15px_rgba(0,34,97,0.18)] hover:-translate-y-1 relative z-10 transition-all duration-500 group">

          {/* Glass Card Body */}
          <div className="bg-white/65 backdrop-blur-3xl border rounded-[28px] p-8 sm:p-10 space-y-7 relative overflow-hidden shadow-2xl animate-in fade-in duration-300">

            {/* Glossy Top Edge Light Reflection */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-linear-to-r from-transparent via-white/90 to-transparent opacity-90" />

            {/* Subtle Ambient Refraction Spots */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-secondary/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

            {/* ── STEP 1: Details ── */}
            {step === "details" && (
              <>
                {/* Header / Logo */}
                <div className="flex flex-col items-center relative z-10">
              <Link href="/" className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 p-1 hover:scale-105 transition-transform duration-300 animate-bounce">
                    <Image
                      src="/PHS.png"
                      alt="PHS Logo"
                      width={56}
                      height={56}
                      className="object-contain"
                    />
                  </Link>
                  <h2 className="text-3xl font-extrabold tracking-tight text-primary text-center">Create account</h2>
                  <p className="text-on-surface-variant text-sm font-medium mt-1 text-center font-headline">Verified by your mobile number</p>
                </div>

                {/* Role Switcher with sliding pill */}
                <div className="relative grid grid-cols-2 p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white/70 gap-1 shadow-xs z-10">
                  <div
                    className={`absolute top-1 bottom-1 bg-primary rounded-xl shadow-md transition-all duration-300 ease-out ${role === "customer" ? "left-1 right-[calc(50%+2px)]" : "left-[calc(50%+2px)] right-1"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${role === "customer"
                      ? "text-white scale-[1.02]"
                      : "text-on-surface-variant hover:text-primary"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("partner")}
                    className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${role === "partner"
                      ? "text-white scale-[1.02]"
                      : "text-on-surface-variant hover:text-primary"
                      }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">handyman</span>
                    Partner
                  </button>
                </div>

                <div className="space-y-4 relative z-10">

                  {/* Full Name */}
                  <div className="space-y-1.5 group/field">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                      </span>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Pavan Kumar"
                        className="w-full pl-10 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 focus:bg-white/90 transition-all border border-white/80 focus:border-secondary/60 shadow-xs placeholder:text-on-surface-variant/40"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5 group/field">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-3.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/80 shadow-xs text-sm font-bold text-primary shrink-0">
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
                          className="w-full pl-4 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 focus:bg-white/90 transition-all border border-white/80 focus:border-secondary/60 shadow-xs placeholder:text-on-surface-variant/40"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 group/field">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 focus:bg-white/90 transition-all border border-white/80 focus:border-secondary/60 shadow-xs placeholder:text-on-surface-variant/40"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5 group/field">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      showLockIcon={true}
                    />
                  </div>

                  {/* Referral Code */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowReferral(!showReferral)}
                      className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                      {showReferral ? "Hide referral code" : "Have a referral code?"}
                      <span className="material-symbols-outlined text-[14px]">{showReferral ? "expand_less" : "expand_more"}</span>
                    </button>
                    {showReferral && (
                      <div className="space-y-1.5 group/field animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Referral Code (Optional)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                            <span className="material-symbols-outlined text-[18px]">card_membership</span>
                          </span>
                          <input
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                            placeholder="E.G. PHS100"
                            className="w-full pl-10 pr-4 py-3 bg-white/70 backdrop-blur-md rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 focus:bg-white/90 transition-all border border-white/80 focus:border-secondary/60 shadow-xs placeholder:text-on-surface-variant/40 tracking-widest uppercase"
                          />
                        </div>
                        <p className="text-[10px] text-on-surface-variant/75 font-semibold pl-1">Your friend gets credit when you complete your first booking.</p>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2.5 p-4 bg-error/10 backdrop-blur-md text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                      <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                    </div>
                  )}

                  {/* Submit / Send OTP Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                          Sending OTP…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          Send OTP to Mobile
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Verify OTP ── */}
            {step === "otp" && (
              <>
                <div className="space-y-4 relative z-10">
                  <div className="text-left">
                    <button
                      type="button"
                      onClick={() => { setStep("details"); setError(""); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      Back to details
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <Link href="/" className="w-16 h-16 rounded-2xl flex items-center justify-center border  mb-4 p-1.5">
                      <Image
                        src="/PHS.png"
                        alt="PHS Logo"
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    </Link>
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary text-center">Verify OTP</h2>
                    <p className="text-on-surface-variant text-sm font-medium mt-1.5 text-center">
                      Sent 6-digit code to <span className="font-bold text-primary">+91 {phone}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  {/* 6-digit OTP Input */}
                  <OtpInput value={otp} onChange={setOtp} />

                  {/* Resend */}
                  <div className="text-center text-xs font-semibold py-1">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="text-success font-extrabold hover:underline disabled:opacity-60 cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <Countdown key={countdownKey} seconds={60} onExpire={() => setCanResend(true)} />
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2.5 p-4 bg-error/10 backdrop-blur-md text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                      <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                    </div>
                  )}

                  {/* Complete Registration Button */}
                  <Button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/40 transition-all duration-300 border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Creating account…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                        Complete Registration
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}

            <p className="text-center text-sm font-medium text-on-surface-variant relative z-10">
              Already have an account?{" "}
              <Link href="/login" className="text-success font-extrabold hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
