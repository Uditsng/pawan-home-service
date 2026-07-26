/**
 * Referral Engine — Single Responsibility Engine for Referral Rewards & Discounts
 * Handles 50-50 referral rewards, checkout discount calculations, and system enable/disable state.
 */

export interface ReferralConfig {
  referrerReward: number; // e.g. 50 (₹)
  referredDiscount: number; // e.g. 50 (₹)
  isEnabled: boolean;     // global admin toggle
}

export interface ReferralDiscountResult {
  discountAmount: number;
  isApplied: boolean;
  message?: string;
}

/**
 * Calculates referral discount to apply at checkout based on user status and admin settings.
 */
export function calculateReferralDiscount(
  isReferredUser: boolean,
  referralConfig: ReferralConfig
): ReferralDiscountResult {
  if (!referralConfig.isEnabled) {
    return {
      discountAmount: 0,
      isApplied: false,
      message: "Referral program is currently disabled.",
    };
  }

  if (!isReferredUser) {
    return {
      discountAmount: 0,
      isApplied: false,
    };
  }

  const discountAmount = Math.max(0, Number(referralConfig.referredDiscount || 50));
  return {
    discountAmount,
    isApplied: discountAmount > 0,
    message: `First booking referral discount (₹${discountAmount}) applied!`,
  };
}

/**
 * Returns safe referral reward configuration with defaults.
 */
export function getReferralRewardConfig(config: Partial<ReferralConfig> = {}): ReferralConfig {
  return {
    referrerReward: config.referrerReward ?? 50,
    referredDiscount: config.referredDiscount ?? 50,
    isEnabled: config.isEnabled ?? true,
  };
}
