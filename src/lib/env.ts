import { z } from "zod";

/**
 * Startup environment validation.
 *
 * Validates required environment variables once at module load and fails fast
 * with descriptive messages if any are missing. Optional variables keep their
 * existing names and fall back to sane defaults. No application logic is changed
 * and no external services are contacted during validation.
 */

const envSchema = z.object({
  // Required — Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required (Supabase project URL)"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required (Supabase anon key)"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required (server-only)"),

  // Required — Twilio Verify (OTP)
  TWILIO_ACCOUNT_SID: z
    .string()
    .min(1, "TWILIO_ACCOUNT_SID is required (OTP service)"),
  TWILIO_AUTH_TOKEN: z
    .string()
    .min(1, "TWILIO_AUTH_TOKEN is required (OTP service)"),
  TWILIO_VERIFY_SERVICE_SID: z
    .string()
    .min(1, "TWILIO_VERIFY_SERVICE_SID is required (OTP service)"),

  // Optional — Razorpay
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Optional — Firebase Admin (FCM push). Degrades gracefully if absent.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Optional — App metadata / CORS
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/** Validated environment. Throws on first access if validation fails. */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(
      "\n❌ Invalid environment configuration. Missing or empty variables:\n" +
        issues +
        "\n\nPlease copy .env.example to .env.local and provide the required values.\n"
    );
    process.exit(1);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** Run validation eagerly at import time (fail-fast on boot). */
getEnv();
