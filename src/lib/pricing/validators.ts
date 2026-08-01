/**
 * Validators — consistency & integrity checks for the pricing engine.
 * Used by the server payment authority to never trust client-supplied totals.
 */
import type { PricingBreakdown } from "./types";

export interface PriceValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Asserts two monetary values agree within a small tolerance (₹1).
 */
export function validatePriceConsistency(
  expected: number,
  actual: number,
  tolerance = 1
): PriceValidationResult {
  const diff = Math.abs(Number(expected) - Number(actual));
  if (diff <= tolerance) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: [`Price mismatch: expected ₹${expected}, got ₹${actual}`],
  };
}

/**
 * Sanity-checks a computed breakdown before it is persisted or charged.
 */
export function validateBreakdownIntegrity(breakdown: PricingBreakdown): PriceValidationResult {
  const errors: string[] = [];

  const nonNegative: Array<[string, unknown]> = [
    ["total_price", breakdown.total_price],
    ["base_price", breakdown.base_price],
    ["gst_amount", breakdown.gst_amount],
    ["addons_total", breakdown.addons_total],
    ["wallet_discount", breakdown.wallet_discount],
  ];

  for (const [field, value] of nonNegative) {
    const num = Number(value || 0);
    if (!Number.isFinite(num) || num < 0) {
      errors.push(`${field} is invalid (${String(value)})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
