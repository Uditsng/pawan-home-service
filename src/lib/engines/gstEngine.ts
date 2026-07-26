/**
 * GST Engine — Single Responsibility Engine for Platform Tax (GST)
 * Handles global enable/disable checks, rate calculations, and invoice breakdowns.
 */

export interface GstInput {
  subtotal: number;
  taxRatePercent: number; // e.g. 18
  gstEnabled?: boolean;   // global admin toggle (default: true)
  serviceGstApplicable?: boolean; // individual service flag (default: true)
}

export interface GstBreakdown {
  subtotal: number;
  gstAmount: number;
  taxRatePercent: number;
  isGstApplied: boolean;
  totalWithGst: number;
  displayLabel: string;
}

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

/**
 * Quick helper to format tax percentage for UI display.
 */
export function formatGstRate(rate: number): string {
  return `${rate}%`;
}
