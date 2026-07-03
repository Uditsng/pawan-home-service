import { BookingPricing, PricingModel, MembershipPlan } from "@/lib/types";

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

  coupon?: {
    code: string;
    discount_type: "fixed" | "percentage";
    discount_value: number;
    min_booking_amount?: number | null;
    max_discount?: number | null;
  } | null;

  isMember?: boolean;
  memberBenefit?: MembershipPlan["benefits"] | null;

  walletBalanceToUse?: number;
  gstRate?: number; // default 18
  gstApplicable?: boolean; // default true
}

/**
 * Validates and calculates detailed pricing breakdown for bookings.
 */
export function calculatePricingBreakdown(input: PricingInput): Omit<BookingPricing, "id" | "booking_id" | "created_at"> {
  const config = input.pricingConfig || {};
  const isGstApplicable = input.gstApplicable !== false;
  const gstRatePercent = input.gstRate !== undefined ? input.gstRate : 18;

  let basePrice = Number(input.basePrice || 0);
  let hourlyPrice = 0;
  let areaPrice = 0;
  let quantityPrice = 0;
  let distancePrice = 0;
  let inspectionFee = 0;
  const travelFee = Number(config.travel_fee || 0);
  const platformFee = Number(config.platform_fee || 0);

  // If a variant is selected, its price overrides the main base price
  if (input.variantPrice !== undefined && input.variantPrice !== null) {
    basePrice = Number(input.variantPrice);
  }

  // 1. Calculate Core Price Component based on pricing model
  switch (input.pricingModel) {
    case "hourly": {
      const minutes = input.durationMinutes || 60;
      const blocks = minutes / 30;
      const rate30Min = basePrice || 0;
      hourlyPrice = blocks * rate30Min;
      basePrice = hourlyPrice; // base becomes the hourly total
      break;
    }
    case "area": {
      const area = input.areaSqft || 0;
      const minArea = config.min_area || 0;
      const maxArea = config.max_area || 100000;
      const clampedArea = Math.max(minArea, Math.min(maxArea, area));
      const pricingMode = config.area_pricing_mode || "flat";

      if (config.area_slabs && config.area_slabs.length > 0) {
        if (pricingMode === "progressive") {
          let remainingArea = clampedArea;
          let calculatedPrice = 0;
          for (const slab of config.area_slabs) {
            const slabMin = slab.min;
            const slabMax = slab.max || Infinity;
            const slabWidth = slabMax - slabMin;
            if (clampedArea > slabMin) {
              const areaInSlab = Math.min(remainingArea, slabWidth);
              calculatedPrice += areaInSlab * slab.rate;
              remainingArea -= areaInSlab;
              if (remainingArea <= 0) break;
            }
          }
          areaPrice = calculatedPrice;
        } else {
          // Flat rate of the highest matching slab
          const matchedSlab = [...config.area_slabs]
            .sort((a, b) => b.min - a.min)
            .find((s) => clampedArea >= s.min);
          const rate = matchedSlab ? matchedSlab.rate : config.price_per_sqft || 0;
          areaPrice = clampedArea * rate;
        }
      } else {
        const pricePerSqft = config.price_per_sqft || 0;
        areaPrice = clampedArea * pricePerSqft;
      }
      basePrice = areaPrice;
      break;
    }
    case "quantity": {
      const qty = input.quantity || 0;
      const minQty = config.min_qty || 0;
      const maxQty = config.max_qty || 1000;
      const clampedQty = Math.max(minQty, Math.min(maxQty, qty));
      const pricePerUnit = config.price_per_unit || basePrice || 0;
      quantityPrice = clampedQty * pricePerUnit;
      basePrice = quantityPrice;
      break;
    }
    case "distance": {
      const km = input.distanceKm || 0;
      const freeKm = config.free_km || 0;
      const baseFee = config.base_distance_fee || basePrice || 0;
      const pricePerKm = config.price_per_km || 0;
      const billableKm = Math.max(0, km - freeKm);
      distancePrice = baseFee + billableKm * pricePerKm;
      basePrice = distancePrice;
      break;
    }
    case "inspection": {
      inspectionFee = config.inspection_fee || basePrice || 0;
      basePrice = inspectionFee;
      break;
    }
    case "hybrid": {
      const hConfig = config.hybrid_components || {};
      const base = Number(hConfig.base_fee || basePrice || 0);
      
      const hr = Number(hConfig.hourly_rate || 0);
      const minVal = input.durationMinutes || 0;
      hourlyPrice = Math.ceil(minVal / 60) * hr;

      const distR = Number(hConfig.distance_rate || 0);
      const kmVal = input.distanceKm || 0;
      distancePrice = kmVal * distR;

      const qtyR = Number(hConfig.quantity_rate || 0);
      const qtyVal = input.quantity || 0;
      quantityPrice = qtyVal * qtyR;

      basePrice = base + hourlyPrice + distancePrice + quantityPrice;
      break;
    }
    case "fixed":
    default:
      // Fixed price uses the service base price or variant price
      break;
  }

  // 2. Add Add-ons pricing
  let addonsTotal = 0;
  const addonsBreakdown = (input.addons || []).map((addon) => {
    const total = Number(addon.price) * Number(addon.quantity);
    addonsTotal += total;
    return {
      addon_id: addon.id,
      title: addon.title,
      price: Number(addon.price),
      quantity: Number(addon.quantity),
    };
  });

  // Calculate pre-surcharge subtotal
  let subtotal = basePrice + addonsTotal + platformFee;

  // 3. Resolve Dynamic Surcharge Rules
  const surchargesList: { name: string; amount: number }[] = [];
  
  if (input.scheduledDate && input.surchargeRules && input.surchargeRules.length > 0) {
    const sDate = typeof input.scheduledDate === "string" ? new Date(input.scheduledDate) : input.scheduledDate;
    
    // Convert to IST context (ignoring UTC mismatch)
    const dayOfWeek = sDate.getDay(); // 0-6
    const hours = sDate.getHours();
    const minutes = sDate.getMinutes();
    const minutesSinceMidnight = hours * 60 + minutes;

    const dateStr = sDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

    for (const rule of input.surchargeRules) {
      if (!rule.is_active) continue;

      let match = false;
      const cond = rule.conditions || {};

      // Date match
      if (cond.dates && cond.dates.includes(dateStr)) {
        match = true;
      }

      // Day of week match
      if (cond.days_of_week && cond.days_of_week.includes(dayOfWeek)) {
        match = true;
      }

      // Time range match
      if (cond.hours_range && cond.hours_range.length === 2) {
        const [startStr, endStr] = cond.hours_range;
        const [sh, sm] = startStr.split(":").map(Number);
        const [eh, em] = endStr.split(":").map(Number);
        
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (startMin > endMin) {
          // Spans midnight, e.g. 20:00 to 06:00
          if (minutesSinceMidnight >= startMin || minutesSinceMidnight <= endMin) {
            match = true;
          }
        } else {
          // Regular day time, e.g. 09:00 to 18:00
          if (minutesSinceMidnight >= startMin && minutesSinceMidnight <= endMin) {
            match = true;
          }
        }
      }

      // Pincode match
      if (cond.pincodes && input.pincode && cond.pincodes.includes(input.pincode)) {
        match = true;
      }

      if (match) {
        let amt = 0;
        if (rule.amount_type === "percentage") {
          // percentage applies to subtotal
          amt = Math.round(subtotal * (Number(rule.amount_value) / 100));
        } else {
          amt = Number(rule.amount_value);
        }

        if (rule.rule_type === "surcharge") {
          surchargesList.push({ name: rule.name, amount: amt });
          subtotal += amt;
        } else {
          // Dynamic discount
          surchargesList.push({ name: `${rule.name} (Discount)`, amount: -amt });
          subtotal = Math.max(0, subtotal - amt);
        }
      }
    }
  }

  // 4. Calculate Membership Discounts
  let discountAmount = 0;
  if (input.isMember && input.memberBenefit) {
    const pct = input.memberBenefit.discount_percent || 0;
    if (pct > 0) {
      discountAmount = Math.round(subtotal * (pct / 100));
      subtotal = Math.max(0, subtotal - discountAmount);
    }
  }

  // 5. Calculate GST Amount
  let gstAmount = 0;
  if (isGstApplicable) {
    gstAmount = Math.round(subtotal * (gstRatePercent / 100));
  }

  // 6. Apply Coupon Codes
  let couponDiscount = 0;
  if (input.coupon) {
    const minAmt = Number(input.coupon.min_booking_amount || 0);
    // Check if subtotal meets min amount
    if (subtotal >= minAmt) {
      if (input.coupon.discount_type === "percentage") {
        couponDiscount = Math.round(subtotal * (Number(input.coupon.discount_value) / 100));
      } else {
        couponDiscount = Number(input.coupon.discount_value);
      }
      
      // Limit max discount
      if (input.coupon.max_discount !== undefined && input.coupon.max_discount !== null) {
        couponDiscount = Math.min(couponDiscount, Number(input.coupon.max_discount));
      }
    }
  }

  // Calculate price before wallet usage
  let payableAmount = Math.max(0, subtotal + gstAmount + travelFee - couponDiscount);

  // 7. Apply Wallet usage
  let walletDiscount = 0;
  if (input.walletBalanceToUse && input.walletBalanceToUse > 0) {
    walletDiscount = Math.min(input.walletBalanceToUse, payableAmount);
    payableAmount = Math.max(0, payableAmount - walletDiscount);
  }

  return {
    base_price: basePrice,
    hourly_price: hourlyPrice,
    area_price: areaPrice,
    quantity_price: quantityPrice,
    distance_price: distancePrice,
    inspection_fee: inspectionFee,
    travel_fee: travelFee,
    surcharges: surchargesList,
    addons_total: addonsTotal,
    addons_breakdown: addonsBreakdown,
    gst_amount: gstAmount,
    discount_amount: discountAmount,
    coupon_discount: couponDiscount,
    wallet_discount: walletDiscount,
    total_price: payableAmount,
  };
}

/**
 * Helper to format base/starting price labels nicely for user listings.
 */
export function formatStartingPrice(basePrice: number, pricingModel?: string): string {
  if (!pricingModel) return `₹${basePrice}`;
  const model = pricingModel.toLowerCase();
  if (model === "hourly") return `₹${basePrice}/hr`;
  if (model === "area") return `₹${basePrice}/sqft`;
  if (model === "quantity") return `₹${basePrice}/unit`;
  if (model === "distance") return `₹${basePrice}/km`;
  if (model === "inspection") return `₹${basePrice} (Inspection)`;
  if (model === "hybrid") return `₹${basePrice} base`;
  return `₹${basePrice}`;
}
