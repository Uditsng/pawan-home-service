/**
 * GST Engine — Single Responsibility Engine for Platform Tax (GST)
 * Handles global enable/disable checks, rate calculations, and invoice breakdowns.
 */
import type { GstBreakdown, GstInput } from "./types";

/**
 * Calculates GST amount and breakdown based on subtotal and admin settings.
 * If gstEnabled is false OR serviceGstApplicable is false, gstAmount is strictly 0.
 */
export function calculateGstBreakdown(input: GstInput): GstBreakdown {
  const subtotal = Math.max(0, Number(input.subtotal || 0));
  const isGlobalEnabled = input.gstEnabled !== false;
  const isServiceApplicable = input.serviceGstApplicable !== false;
  const isGstApplied = isGlobalEnabled && isServiceApplicable;
  const taxRatePercent = isGstApplied ? Math.max(0, Number(input.taxRatePercent || 0)) : 0;

  const gstAmount = isGstApplied ? Math.round(subtotal * (taxRatePercent / 100)) : 0;
  const totalWithGst = subtotal + gstAmount;

  const displayLabel = isGstApplied
    ? `Taxes & GST (${taxRatePercent}%)`
    : `Taxes & GST (Exempt)`;

  return {
    subtotal,
    gstAmount,
    taxRatePercent,
    isGstApplied,
    totalWithGst,
    displayLabel,
  };
}
