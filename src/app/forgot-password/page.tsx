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
    setRemaining(seconds);
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

      <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary">

        {/* Left — Brand Panel */}
        <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
          <div
            className="w-full h-full rounded-4xl bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1614854262318-831574f15f1f?auto=format&fit=crop&q=80')" }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-primary/80 via-primary/60 to-secondary/30 mix-blend-multiply" />
            <div className="absolute top-[20%] right-[15%] text-7xl animate-float-1 z-10 opacity-90">🔑</div>
            <div className="absolute top-[45%] left-[10%] text-6xl animate-float-2 z-10 opacity-80" style={{ animationDelay: "1.5s" }}>🛡️</div>
            <div className="absolute bottom-[35%] right-[20%] text-5xl animate-float-1 z-10 opacity-90" style={{ animationDelay: "2.5s" }}>📱</div>
            <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] z-20">
              <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                Secure Reset
              </div>
              <h1 className="text-4xl xl:text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-md leading-tight">
                Reset your<br />password safely.
              </h1>
              <p className="text-base xl:text-lg text-white/80 max-w-md font-medium">
                Verify your mobile number to regain access to your PHS account.
              </p>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden">

          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,#a6ce37_0%,transparent_70%)] blur-2xl opacity-20 animate-spin-slow pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-2xl opacity-20 animate-[spin-slow_25s_linear_infinite_reverse] pointer-events-none" />

          {/* Back button */}
          <Link href="/login" className="absolute top-8 right-8 text-xs font-extrabold uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all flex items-center gap-2 z-20 border border-transparent hover:border-primary/10">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Login
          </Link>

          {/* Progress indicator */}
          <div className="absolute top-8 left-8 flex items-center gap-2 z-20">
            {(["phone", "otp", "password"] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === s || (step === "success" && i < 3)
                  ? "bg-secondary w-6"
                  : ["phone", "otp", "password", "success"].indexOf(step) > i
                  ? "bg-success"
                  : "bg-outline-variant"
              }`} />
            ))}
          </div>

          <div className="w-full max-w-sm space-y-7 relative z-10 p-8 sm:p-10">

            {/* ── STEP 1: Phone ── */}
            {step === "phone" && (
              <>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Forgot password?</h2>
                  <p className="text-on-surface-variant font-medium mt-2">Enter your registered mobile number to receive a verification code.</p>
                </div>
                <div className="space-y-5">
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

                  {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200">{error}</div>}

                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] transition-all duration-300 border-none disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Sending…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
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
                <div>
                  <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-4">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>Change number
                  </button>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Enter OTP</h2>
                  <p className="text-on-surface-variant font-medium mt-2">Sent to <span className="font-bold text-primary">+91 {phone}</span></p>
                </div>
                <div className="space-y-6">
                  <OtpInput value={otp} onChange={setOtp} />

                  <div className="text-center text-xs font-semibold">
                    {canResend ? (
                      <button type="button" onClick={handleResend} disabled={loading} className="text-success font-bold hover:underline disabled:opacity-60">Resend OTP</button>
                    ) : (
                      <Countdown key={countdownKey} seconds={60} onExpire={() => setCanResend(true)} />
                    )}
                  </div>

                  {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200">{error}</div>}

                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] transition-all duration-300 border-none disabled:opacity-50 disabled:scale-100"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">verified</span>Verify OTP
                    </span>
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === "password" && (
              <>
                <div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">lock_reset</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">New password</h2>
                  <p className="text-on-surface-variant font-medium mt-2">OTP verified. Set your new password.</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">New Password</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Confirm Password</label>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                    />
                  </div>

                  {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200">{error}</div>}

                  <Button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading}
                    variant="gradient"
                    className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] transition-all duration-300 border-none disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Resetting…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>Reset Password
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 4: Success ── */}
            {step === "success" && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[#059669] text-5xl drop-shadow-sm">check_circle</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-primary">Password reset!</h2>
                  {info ? (
                    <p className="text-on-surface-variant font-medium mt-2">{info}</p>
                  ) : (
                    <p className="text-on-surface-variant font-medium mt-2">Your password has been updated successfully.</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => router.push("/login")}
                  variant="gradient"
                  className="w-full py-4 bg-linear-to-br from-secondary to-success text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] transition-all duration-300 border-none"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">login</span>Sign In Now
                  </span>
                </Button>
              </div>
            )}

            <p className="text-center text-sm font-medium text-on-surface-variant">
              Remember your password?{" "}
              <Link href="/login" className="text-success font-extrabold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
