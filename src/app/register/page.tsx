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
    <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary flex-row-reverse overflow-x-hidden">

      {/* Left — 3D Brand Panel */}
      <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
        <div
          className="w-full h-full rounded-4xl bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80')" }}
        >
          <div className="absolute inset-0 bg-linear-to-bl from-primary/80 via-primary/60 to-secondary/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-90" />
          
          {/* Left panel floating glass badges */}
          <div className="absolute top-[20%] left-[15%] p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-3xl animate-float-1 z-10 select-none hover:scale-110 transition-transform duration-300">🚀</div>
          <div className="absolute top-[40%] right-[10%] p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-2xl animate-float-2 z-10 select-none hover:scale-110 transition-transform duration-300" style={{ animationDelay: "1s" }}>🤝</div>
          <div className="absolute bottom-[40%] left-[20%] p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl text-3xl animate-float-1 z-10 select-none hover:scale-110 transition-transform duration-300" style={{ animationDelay: "2s" }}>🌟</div>

          <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transform-3d group-hover:rotate-y-2 group-hover:rotate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out will-change-transform z-20">
            <div className="transform translate-z-8">
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 relative overflow-hidden">

        {/* Animated background orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full bg-radial from-secondary/15 to-transparent blur-3xl opacity-40 animate-orb-float-1 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-radial from-primary/10 to-transparent blur-3xl opacity-30 animate-orb-float-2 pointer-events-none" />

        {/* Mobile floating emojis in glass badges */}
        <div className="lg:hidden absolute top-[12%] left-[8%] p-3.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg text-2xl animate-float-1 z-0 pointer-events-none select-none rotate-12">🚀</div>
        <div className="lg:hidden absolute bottom-[18%] right-[8%] p-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg text-2xl animate-float-2 z-0 pointer-events-none select-none -rotate-12" style={{ animationDelay: "1s" }}>🤝</div>

        {/* Outer Premium double-glass container */}
        <div className="w-full max-w-md p-1 bg-linear-to-bl from-white/60 via-white/20 to-secondary/35 rounded-3xl shadow-[0_20px_50px_rgba(30,41,59,0.06)] hover:shadow-ambient-hover hover:-translate-y-1 relative z-10 transition-all duration-500">
          <div className="bg-white/65 backdrop-blur-2xl border border-white/40 rounded-[23px] p-8 sm:p-10 space-y-7 animate-in fade-in duration-300">

            {/* ── STEP 1: Details ── */}
            {step === "details" && (
              <>
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
                  <h2 className="text-3xl font-extrabold tracking-tight text-primary text-center">Create account</h2>
                  <p className="text-on-surface-variant text-sm font-medium mt-1 text-center font-headline">Verified by your mobile number</p>
                </div>

                {/* Role Switcher with sliding pill */}
                <div className="relative grid grid-cols-2 p-1 bg-surface-container rounded-2xl border border-outline-variant/15 gap-1 shadow-xs">
                  <div
                    className={`absolute top-1 bottom-1 bg-primary rounded-xl shadow-md transition-all duration-300 ease-out ${
                      role === "customer" ? "left-1 right-[calc(50%+2px)]" : "left-[calc(50%+2px)] right-1"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      role === "customer"
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
                    className={`relative z-10 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      role === "partner"
                        ? "text-white scale-[1.02]"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">handyman</span>
                    Partner
                  </button>
                </div>

                <div className="space-y-4">

                  {/* Full Name */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                      </span>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ravi Kumar"
                        className="w-full pl-10 pr-4 py-3.5 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-on-surface-variant/40"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">Mobile Number</label>
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
                          className="w-full pl-10 pr-4 py-3.5 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-on-surface-variant/40"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3.5 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-on-surface-variant/40"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">Password</label>
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
                      <div className="space-y-1.5 group animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">Referral Code (Optional)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                            <span className="material-symbols-outlined text-[18px]">card_membership</span>
                          </span>
                          <input
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                            placeholder="E.G. PHS100"
                            className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-md rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-on-surface-variant/40 tracking-widest uppercase"
                          />
                        </div>
                        <p className="text-[10px] text-on-surface-variant/75 font-semibold pl-1">Your friend gets credit when you complete your first booking.</p>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2.5 p-4 bg-error/5 text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
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
                      variant="gradient"
                      className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
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
                <div className="space-y-4">
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
                    <Link href="/" className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-outline-variant/30 shadow-md mb-4 p-1 hover:scale-105 transition-transform duration-300">
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

                <div className="space-y-6">
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
                    <div className="flex items-center gap-2.5 p-4 bg-error/5 text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                      <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                    </div>
                  )}

                  {/* Complete Registration Button */}
                  <Button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || otp.length !== 6}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/35 transition-all duration-300 border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer"
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

            <p className="text-center text-sm font-medium text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-success font-extrabold hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
