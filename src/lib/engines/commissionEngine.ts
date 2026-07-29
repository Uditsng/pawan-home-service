/**
 * Commission Engine — Single Responsibility Engine for Platform Commission & Partner Share
 * Handles dynamic payout calculations, platform revenue splits, and UI badge formatting.
 */

export interface CommissionBreakdown {
  totalAmount: number;
  commissionPercent: number;     // e.g. 20 (%)
  partnerSharePercent: number;   // e.g. 80 (%)
  platformCommissionAmount: number; // e.g. 200 (₹)
  partnerPayoutAmount: number;    // e.g. 800 (₹)
}

/**
 * Calculates platform commission and partner payout amounts based on dynamic platform commission setting.
 */
export function calculateCommissionBreakdown(
  totalAmount: number,
  commissionPercent: number = 20
): CommissionBreakdown {
  const validTotal = Math.max(0, Number(totalAmount || 0));
  const validCommission = Math.max(0, Math.min(100, Number(commissionPercent ?? 20)));
  const partnerSharePercent = Math.max(0, 100 - validCommission);

  const platformCommissionAmount = Math.round(validTotal * (validCommission / 100));
  const partnerPayoutAmount = Math.round(validTotal * (partnerSharePercent / 100));

  return {
    totalAmount: validTotal,
    commissionPercent: validCommission,
    partnerSharePercent,
    platformCommissionAmount,
    partnerPayoutAmount,
  };
}

/**
 * Formats partner share badge text for header badges.
 * Example: 20% commission => "80% Partner Share"
 */
export function formatPartnerShareBadge(commissionPercent: number = 20): string {
  const partnerShare = Math.max(0, 100 - Number(commissionPercent || 20));
  return `${partnerShare}% Partner Share`;
}

export interface PartnerEarningsBreakdown {
  totalAmount: number;
  gstAmount: number;
  serviceRevenue: number;
  commissionPercent: number;
  platformCommissionAmount: number;
  partnerPayoutAmount: number;
}

export function calculatePartnerEarningsBreakdown(
  totalAmount: number,
  gstAmount: number = 0,
  commissionPercent: number = 20
): PartnerEarningsBreakdown {
  const validTotal = Math.max(0, Number(totalAmount || 0));
  const validGst = Math.max(0, Number(gstAmount || 0));
  const validCommission = Math.max(0, Math.min(100, Number(commissionPercent ?? 20)));
  const serviceRevenue = Math.max(0, validTotal - validGst);

  return {
    totalAmount: validTotal,
    gstAmount: validGst,
    serviceRevenue,
    commissionPercent: validCommission,
    platformCommissionAmount: Math.round(serviceRevenue * (validCommission / 100)),
    partnerPayoutAmount: Math.round(serviceRevenue * ((100 - validCommission) / 100)),
  };
}
