"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { sendRegistrationOtp, verifyOtpAndRegister } from "@/app/auth.actions";

// ─── Helpers & Styles ─────────────────────────────────────────

const normalizePhone = (v: string) =>
  v.replace(/\D/g, "").replace(/^(?:91|0)/, "").slice(0, 10);

const inputCls =
  "w-full py-3 bg-white/60 backdrop-blur-md rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-xs placeholder:text-on-surface-variant/40";

// ─── OTP Input ────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        inputs.current[idx - 1]?.focus();
      } else {
        const next = value.slice(0, idx) + value.slice(idx + 1);
        onChange(next);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = (value.padEnd(6, " ")).split("");
    arr[idx] = char || " ";
    onChange(arr.join("").trimEnd());
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center max-w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-${i + 1}`}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-bold text-primary bg-white/70 border border-white focus:border-secondary/60 focus:ring-4 focus:ring-secondary/20 rounded-xl outline-none transition-all shadow-xs disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ─── Main Register Page ───────────────────────────────────────

type Step = "details" | "otp" | "success";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkRef = searchParams.get("ref") ?? "";

  const [step, setStep] = useState<Step>("details");
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);

  const [referralCode, setReferralCode] = useState(() =>
    deepLinkRef.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
  );
  const [showReferral, setShowReferral] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState<string | null>(null);
  const [registeredInfo, setRegisteredInfo] = useState("");
  const [registeredInvite, setRegisteredInvite] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleSendOtp = async () => {
    setError("");
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
      setTimer(60);
      setStep("otp");
    }
  };

  const handleResend = async () => {
    setError("");
    setOtp("");
    setLoading(true);
    const result = await sendRegistrationOtp(phone, email);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to resend OTP.");
    } else {
      setTimer(60);
    }
  };

  const handleRegister = async () => {
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
    } else if (result.info) {
      setSuccessRedirect(result.redirectTo ?? (role === "partner" ? "/partner/dashboard" : "/customer/dashboard"));
      setRegisteredInfo(result.info);
      setStep("success");
    } else if (result.redirectTo) {
      router.push(result.redirectTo);
    }
    setRegisteredInvite(result.infoKind === "partner_invite");
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-surface selection:bg-secondary/30 selection:text-primary overflow-x-hidden pt-8 pb-10 sm:py-12 px-4">
      <div className="w-full max-w-md p-1 border border-outline-variant/40 rounded-3xl">
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[23px] p-6 sm:p-8 space-y-5">

          {/* Unified Header */}
          <div className="flex flex-col items-center">
            {step === "otp" && (
              <button
                type="button"
                onClick={() => { setStep("details"); setError(""); }}
                className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back
              </button>
            )}

            <Link
              href="/"
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 p-1 shadow-xs hover:scale-105 active:scale-95 transition-transform duration-200"
              aria-label="PHS Homepage"
            >
              <Image src="/PHS.png" alt="PHS Logo" width={48} height={48} className="object-contain" priority />
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary text-center">
              {step === "details" ? "Create account" : step === "otp" ? "Verify OTP" : "Account created!"}
            </h1>

            <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-1 text-center">
              {step === "details" && "Sign up with your mobile number."}
              {step === "otp" && (
                <>Enter the code sent to <span className="font-bold text-primary">+91 {phone}</span></>
              )}
            </p>
          </div>

          {/* ── STEP 1: Details Form ── */}
          {step === "details" && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              {/* Role Switcher */}
              <div className="relative grid grid-cols-2 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-xs">
                <div
                  aria-hidden="true"
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-xl shadow-xs transition-transform duration-300 ease-out ${
                    role === "customer" ? "translate-x-1" : "translate-x-[calc(100%+4px)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                    role === "customer" ? "text-white" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole("partner")}
                  className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                    role === "partner" ? "text-white" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">handyman</span>
                  Partner
                </button>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5 group">
                <label htmlFor="full-name" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </span>
                  <input
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5 group">
                <label htmlFor="mobile-number" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-3 py-3 bg-white/60 backdrop-blur-md rounded-xl border border-white shadow-xs text-sm font-bold text-primary shrink-0">
                    <span className="text-xs text-on-surface-variant/80 font-bold">+91</span>
                  </div>
                  <input
                    id="mobile-number"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => setPhone(normalizePhone(e.target.value))}
                    placeholder="9876543210"
                    className={`${inputCls} px-4`}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 group">
                <label htmlFor="email-address" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </span>
                  <input
                    id="email-address"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 group">
                <label htmlFor="password" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors">
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  showLockIcon
                />
              </div>

              {/* Referral Code */}
              <div className="space-y-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowReferral(!showReferral)}
                  className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
                >
                  <span className="material-symbols-outlined text-[14px]">redeem</span>
                  {showReferral ? "Hide referral code" : "Have a referral code?"}
                  <span className="material-symbols-outlined text-[14px]">{showReferral ? "expand_less" : "expand_more"}</span>
                </button>
                {showReferral && (
                  <div className="space-y-1.5 group animate-in fade-in duration-200">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/60 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">card_membership</span>
                      </span>
                      <input
                        id="referral-code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))}
                        placeholder="E.G. PHS100"
                        className={`${inputCls} pl-10 pr-4 py-2.5 tracking-widest uppercase font-bold`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2.5 p-3.5 bg-error/5 text-error text-xs sm:text-sm font-bold rounded-xl border border-error/20 shadow-xs">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span className="grow text-left leading-normal font-semibold">{error}</span>
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.01] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Sending OTP…
                    </span>
                  ) : "Send OTP"}
                </Button>
              </div>

              <p className="text-[11px] text-on-surface-variant text-center leading-relaxed pt-1">
                By registering, you agree to our{" "}
                <Link href="/terms-conditions" className="text-success font-bold hover:underline">Terms</Link>{" "}
                &{" "}
                <Link href="/privacy-policy" className="text-success font-bold hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          )}

          {/* ── STEP 2: Verify OTP Form ── */}
          {step === "otp" && (
            <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-5">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              <div className="text-center text-xs font-semibold">
                {timer > 0 ? (
                  <span className="text-on-surface-variant font-semibold">
                    Resend in <span className="font-bold text-primary">{timer}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-success font-extrabold hover:underline disabled:opacity-60 cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2.5 p-3.5 bg-error/5 text-error text-xs sm:text-sm font-bold rounded-xl border border-error/20 shadow-xs">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span className="grow text-left leading-normal font-semibold">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 sm:py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.01] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 border-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Verifying…
                  </span>
                ) : "Complete Registration"}
              </Button>
            </form>
          )}

          {/* ── STEP 3: Success Screen ── */}
          {step === "success" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[30px] text-success">verified</span>
                </div>

                {registeredInvite && (
                  <div className="mt-3 bg-success/10 border border-success/20 rounded-2xl p-3 text-left flex items-center gap-2.5 w-full">
                    <span className="material-symbols-outlined text-success text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                    <p className="text-xs text-on-surface font-medium leading-relaxed">
                      Referred by a Pro! Joining bonus reserved for your first booking.
                    </p>
                  </div>
                )}

                <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-2 text-center">
                  {registeredInfo || "Your profile has been created successfully."}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => router.push(successRedirect || (role === "partner" ? "/partner/dashboard" : "/customer/dashboard"))}
                className="w-full py-3.5 sm:py-4 bg-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.01] hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-secondary/20 hover:shadow-xl transition-all duration-300 border-none cursor-pointer"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Link to Login */}
          <p className="text-center text-sm font-medium text-on-surface-variant pt-1">
            Already have an account?{" "}
            <Link href="/login" className="text-success font-extrabold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
