import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Database-backed rate limiter for server actions (OTP, login, etc.).
 * Queries public.check_rate_limit security-definer RPC function in transaction.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowSeconds: number;

  constructor({ maxRequests, windowMs }: { maxRequests: number; windowMs: number }) {
    this.maxRequests = maxRequests;
    this.windowSeconds = Math.ceil(windowMs / 1000);
  }

  /**
   * Checks the rate limit for a given key.
   * Returns an object indicating if allowed and retry wait seconds.
   */
  async check(key: string): Promise<{ allowed: boolean; retryAfter: number }> {
    try {
      const supabase = createAdminClient();
      
      const { data, error } = await supabase.rpc("check_rate_limit", {
        p_key: key,
        p_max_requests: this.maxRequests,
        p_window_seconds: this.windowSeconds
      });

      if (error || !data || data.length === 0) {
        console.error("Rate limiter RPC failed, allowing request by default:", error);
        return { allowed: true, retryAfter: 0 };
      }

      // data is returned as an array of rows
      const result = data[0] as { is_allowed: boolean; retry_after_seconds: number };
      return {
        allowed: result.is_allowed,
        retryAfter: result.retry_after_seconds
      };
    } catch (err) {
      console.error("Rate limiter error, allowing request by default:", err);
      return { allowed: true, retryAfter: 0 };
    }
  }
}

// Singletons
/** Max 3 OTP sends per phone number per 10 minutes */
export const otpSendLimiter = new RateLimiter({ maxRequests: 3, windowMs: 10 * 60 * 1000 });

/** Max 5 OTP verification attempts per phone number per 10 minutes */
export const otpVerifyLimiter = new RateLimiter({ maxRequests: 5, windowMs: 10 * 60 * 1000 });

/** Max 5 login attempts per phone number per minute (brute-force protection) */
export const loginLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60 * 1000 });

/** Max 3 password reset OTP sends per phone number per hour */
export const passwordResetLimiter = new RateLimiter({ maxRequests: 3, windowMs: 60 * 60 * 1000 });
