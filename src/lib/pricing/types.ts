import type { BookingPricing, PricingModel } from "@/lib/types";

export type { PricingModel };

/**
 * Per-service pricing configuration, mirroring the `services.pricing_config`
 * JSONB column plus every selected parameter needed to compute a breakdown.
 */
export interface PricingInput {
  pricingModel: PricingModel;
  basePrice: number;
  pricingConfig: {
    // Area-based configs
    price_per_sqft?: number;
    min_area?: number;
    max_area?: number;
    area_slabs?: { min: number; max?: number; rate: number }[];
    area_pricing_mode?: "flat" | "progressive";

    // Quantity-based configs
    price_per_unit?: number;
    min_qty?: number;
    max_qty?: number;
    unit_name?: string;

    // Hourly configs
    price_per_hour?: number;
    min_hours?: number;
    max_hours?: number;
    extra_hour_price?: number;

    // Distance configs
    base_distance_fee?: number;
    price_per_km?: number;
    free_km?: number;

    // Inspection config
    inspection_fee?: number;

    // Hybrid configs
    hybrid_components?: {
      base_fee?: number;
      hourly_rate?: number;
      distance_rate?: number;
      quantity_rate?: number;
    };

    // General surcharges
    travel_fee?: number;
    platform_fee?: number;
  };

  // Selected parameters
  variantPrice?: number | null;
  durationMinutes?: number; // for hourly
  areaSqft?: number; // for area-based
  quantity?: number; // for quantity-based
  distanceKm?: number; // for distance-based
  addons?: { id: string; title: string; price: number; quantity: number }[];

  // Dynamic conditions (for surcharge evaluation)
  scheduledDate?: string | Date; // ISO string or Date
  pincode?: string;

  // Global discounts/offers
  surchargeRules?: {
    name: string;
    rule_type: "surcharge" | "discount";
    amount_type: "fixed" | "percentage";
    amount_value: number;
    is_active?: boolean;
    conditions?: {
      days_of_week?: number[]; // 0=Sunday, 6=Saturday
      hours_range?: [string, string]; // ["20:00", "06:00"]
      dates?: string[]; // ["2026-12-25"]
      pincodes?: string[];
    } | null;
  }[];

  coupon?: CouponInput | null;

  walletBalanceToUse?: number;
  gstRate?: number; // default 18
  gstEnabled?: boolean; // default true
  gstApplicable?: boolean; // default true
}

export interface CouponInput {
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_booking_amount?: number | null;
  max_discount?: number | null;
}

/**
 * Full computed breakdown for a single service. This is the exact shape
 * persisted into the `booking_pricing` table (minus the row metadata).
 */
export type PricingBreakdown = Omit<BookingPricing, "id" | "booking_id" | "created_at">;

// ─── GST / Tax ────────────────────────────────────────────────

export interface GstInput {
  subtotal: number;
  taxRatePercent: number; // e.g. 18
  gstEnabled?: boolean; // global admin toggle (default: true)
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

// ─── Referral / Discounts ─────────────────────────────────────

export interface ReferralConfig {
  referrerReward: number; // e.g. 50 (₹)
  referredDiscount: number; // e.g. 50 (₹)
  isEnabled: boolean; // global admin toggle
}

export interface ReferralDiscountResult {
  discountAmount: number;
  isApplied: boolean;
  message?: string;
}

// ─── Cart / Payable aggregation ───────────────────────────────

export interface CartLineItem {
  serviceId: string;
  breakdown: PricingBreakdown;
}

export interface FinalPayableInput {
  totalBeforeWallet: number; // sum of per-service breakdown.total_price (GST + coupon already applied)
  walletAmountToUse?: number;
  referralDiscount?: number;
}

export interface FinalPayableResult {
  walletApplied: number;
  referralDiscount: number;
  finalPayable: number;
}

export interface CartPricingResult {
  lineItems: CartLineItem[];
  subtotal: number; // pre-GST subtotal (sum of total_price − gst_amount)
  gstTotal: number;
  couponDiscountTotal: number;
  totalBeforeWallet: number;
  walletApplied: number;
  referralDiscount: number;
  finalPayable: number;
}
