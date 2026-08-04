"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  sendPasswordResetOtp,
  verifyOtpAndResetPassword,
} from "@/app/auth.actions";

// ─── OTP Input Component ─────────────────────────────────────

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
    onChange(arr.join(""));
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
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
        if (prev <= 1) { clearInterval(interval); onExpire(); return 0; }
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

// ─── Main Page ────────────────────────────────────────────────

type Step = "phone" | "otp" | "password" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const [info, setInfo] = useState("");

  const handleSendOtp = useCallback(async () => {
    setError("");
    if (!phone || phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const result = await sendPasswordResetOtp(phone);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to send OTP.");
    } else {
      setOtp("");
      setCanResend(false);
      setCountdownKey((k) => k + 1);
      setStep("otp");
    }
  }, [phone]);

  const handleResend = useCallback(async () => {
    setError("");
    setCanResend(false);
    setOtp("");
    setLoading(true);
    const result = await sendPasswordResetOtp(phone);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to resend OTP.");
    } else {
      setCountdownKey((k) => k + 1);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setError("");
    setStep("password");
  }, [otp]);

  const handleResetPassword = useCallback(async () => {
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await verifyOtpAndResetPassword(phone, otp, newPassword);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to reset password.");
      // If OTP related error, go back to OTP step
      if (result.error?.toLowerCase().includes("otp") || result.error?.toLowerCase().includes("expired")) {
        setStep("otp");
      }
    } else {
      // Check if it returned info message (email fallback)
      if (result.error) {
        setInfo(result.error);
      }
      setStep("success");
    }
  }, [phone, otp, newPassword, confirmPassword]);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-surface-dim selection:bg-secondary/30 selection:text-primary overflow-x-hidden relative">

        {/* Right — Form Container with Glassmorphism Depth & Lighting */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 relative z-10">

          {/* Outer Floating Double-Glass Card Halo */}
          <div className="w-full max-w-md p-[1.5px] bg-linear-to-br from-white/80 via-white/20 to-secondary/40 rounded-4xl shadow-[0_25px_60px_-15px_rgba(0,34,97,0.12)] hover:shadow-[0_35px_70px_-15px_rgba(0,34,97,0.18)] hover:-translate-y-1 relative z-10 transition-all duration-500 group">

            {/* Glass Card Body */}
            <div className="bg-white/65 backdrop-blur-3xl border rounded-[28px] p-8 sm:p-10 space-y-7 relative overflow-hidden shadow-2xl animate-in fade-in duration-300">

              {/* Glossy Top Edge Light Reflection */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-linear-to-r from-transparent via-white/90 to-transparent opacity-90" />

              {/* Subtle Ambient Refraction Spots */}
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-secondary/15 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

              {/* Top Navigation & Progress bar inside header */}
              <div className="flex items-center justify-between pb-2 relative z-10">
                {/* Progress indicator */}
                <div className="flex items-center gap-1.5">
                  {(["phone", "otp", "password"] as Step[]).map((s, i) => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s || (step === "success" && i < 3)
                      ? "bg-secondary w-6"
                      : ["phone", "otp", "password", "success"].indexOf(step) > i
                        ? "bg-success w-2"
                        : "bg-outline-variant/40 w-2"
                      }`} />
                  ))}
                </div>

                {/* Back button */}
                <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Login
                </Link>
              </div>

              {/* ── STEP 1: Phone ── */}
              {step === "phone" && (
                <>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary">Forgot password?</h2>
                    <p className="text-on-surface-variant text-sm font-medium mt-1">Enter your registered mobile number to receive a verification code.</p>
                  </div>
                  <div className="space-y-5 relative z-10">
                    <div className="space-y-1.5 group/field">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-3.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/80 shadow-xs text-sm font-bold text-primary shrink-0">
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

                    {error && (
                      <div className="flex items-center gap-2.5 p-4 bg-error/10 backdrop-blur-md text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                        <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                        <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                  className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Sending…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">send</span>Send OTP
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === "otp" && (
                <>
                  <div className="relative z-10 space-y-2">
                    <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>Change number
                    </button>
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary">Enter OTP</h2>
                    <p className="text-on-surface-variant text-sm font-medium">Sent to <span className="font-bold text-primary">+91 {phone}</span></p>
                  </div>
                  <div className="space-y-6 relative z-10">
                    <OtpInput value={otp} onChange={setOtp} />

                    <div className="text-center text-xs font-semibold">
                      {canResend ? (
                        <button type="button" onClick={handleResend} disabled={loading} className="text-success font-extrabold hover:underline disabled:opacity-60 cursor-pointer">Resend OTP</button>
                      ) : (
                        <Countdown key={countdownKey} seconds={60} onExpire={() => setCanResend(true)} />
                      )}
                    </div>

                    {error && (
                      <div className="flex items-center gap-2.5 p-4 bg-error/10 backdrop-blur-md text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                        <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                        <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otp.length !== 6}
                  className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">verified</span>Verify OTP
                      </span>
                    </Button>
                  </div>
                </>
              )}

              {/* ── STEP 3: New Password ── */}
              {step === "password" && (
                <>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">lock_reset</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary">New password</h2>
                    <p className="text-on-surface-variant text-sm font-medium mt-1">OTP verified. Set your new password.</p>
                  </div>
                  <div className="space-y-5 relative z-10">
                    <div className="space-y-1.5 group/field">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">New Password</label>
                      <PasswordInput
                        value={newPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        minLength={8}
                        showLockIcon={true}
                      />
                    </div>
                    <div className="space-y-1.5 group/field">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within/field:text-primary transition-colors">Confirm Password</label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        showLockIcon={true}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2.5 p-4 bg-error/10 backdrop-blur-md text-error text-sm font-bold rounded-xl border border-error/20 shadow-xs animate-in fade-in duration-200">
                        <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                        <span className="grow text-left leading-normal font-semibold text-xs">{error}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={loading}
                  className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Resetting…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>Reset Password
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* ── STEP 4: Success ── */}
              {step === "success" && (
                <div className="text-center space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[#059669] text-5xl drop-shadow-sm">check_circle</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary">Password reset!</h2>
                    {info ? (
                      <p className="text-on-surface-variant font-medium mt-2">{info}</p>
                    ) : (
                      <p className="text-on-surface-variant font-medium mt-2">Your password has been updated successfully.</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">login</span>Sign In Now
                    </span>
                  </Button>
                </div>
              )}

              <p className="text-center text-sm font-medium text-on-surface-variant relative z-10">
                Remember your password?{" "}
                <Link href="/login" className="text-success font-extrabold hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
