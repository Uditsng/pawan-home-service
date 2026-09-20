import { InvoiceSnapshot, InvoiceLineItem, InvoiceDiscounts } from "./invoiceTypes";

export interface CalculatedInvoiceResult {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  discounts: InvoiceDiscounts;
  lineItems: InvoiceLineItem[];
}

/**
 * Centralized invoice calculation engine.
 * Computes subtotal, tax, discounts, grand totals, and line items.
 * Supports rendering from frozen snapshot or calculating dynamically from legacy database rows.
 */
export function calculateInvoice(params: {
  snapshot?: InvoiceSnapshot | null;
  booking?: {
    id: string;
    total_amount: number;
    wallet_discount_applied?: number | null;
    service_id: string;
    services?: { title: string; category?: string } | null;
  } | null;
  bookingPricing?: {
    base_price?: number;
    gst_amount?: number;
    discount_amount?: number;
    coupon_discount?: number;
    wallet_discount?: number;
    offer_id?: string | null;
    offer_entitlement_id?: string | null;
    offer_discount?: number;
    total_price?: number;
    surcharges?: { id?: string; name: string; amount: number }[] | unknown;
  } | null;
  /** Real coupon code from the parent order (fallback only; snapshots freeze their own). */
  couponCode?: string | null;
  /** Human-readable offer title for the Offer Discount row. */
  offerTitle?: string | null;
  extensions?: {
    id: string;
    additional_minutes: number;
    additional_amount: number;
    paid_at?: string | null;
  }[];
  taxRatePercent?: number;
}): CalculatedInvoiceResult {
  const {
    snapshot,
    booking,
    bookingPricing,
    couponCode,
    offerTitle,
    extensions = [],
    taxRatePercent = 18.00,
  } = params;

  // 1. If snapshot is present, return frozen values directly
  if (snapshot) {
    return {
      subtotal: Number(snapshot.financials.subtotal),
      taxRate: Number(snapshot.financials.tax_rate),
      taxAmount: Number(snapshot.financials.tax_amount),
      discountAmount: Number(snapshot.financials.discount_amount),
      grandTotal: Number(snapshot.financials.grand_total),
      discounts: snapshot.financials.discounts || {},
      lineItems: snapshot.line_items || [],
    };
  }

  // 2. Fallback: Dynamic calculation from booking, pricing, and extensions
  if (!booking) {
    return {
      subtotal: 0,
      taxRate: taxRatePercent,
      taxAmount: 0,
      discountAmount: 0,
      grandTotal: 0,
      discounts: {},
      lineItems: [],
    };
  }

  const totalExtensionAmount = extensions.reduce((sum, ext) => sum + Number(ext.additional_amount), 0);

  // Full deduction stack: coupon + offer + wallet. bookings.total_amount is
  // stored post-deduction, so the pre-discount (subtotal + tax + travel) is
  // recovered by adding ALL of these back before applying the GST divisor.
  const couponAmount = Number(bookingPricing?.coupon_discount ?? 0);
  const offerAmount = Number(bookingPricing?.offer_discount ?? 0);
  const walletAmount = Number(
    bookingPricing?.wallet_discount ?? booking.wallet_discount_applied ?? 0,
  );
  const deductionTotal = couponAmount + offerAmount + walletAmount;

  // Order fees carry an `id` (OrderFeeItem) and are ADDITIVE to the booking
  // total. Regular surcharges/dynamic discounts from the pricing engine have
  // NO id and are already embedded in bookings.total_amount (subtotal), so
  // only entries with an explicit id become their own line items. This also
  // removes the historical double-count where every surcharge was re-added.
  const rawSurcharges = Array.isArray(bookingPricing?.surcharges) ? bookingPricing.surcharges : [];
  const feeItems = rawSurcharges.filter(
    (sur): sur is { id: string; name: string; amount: number } =>
      !!sur &&
      typeof sur === "object" &&
      typeof (sur as { id?: string }).id === "string" &&
      typeof (sur as { name?: string }).name === "string" &&
      typeof (sur as { amount?: number }).amount === "number",
  );
  const orderFeesTotal = feeItems.reduce((sum, fee) => sum + Math.max(0, fee.amount), 0);

  // The invoice grand total is what was actually charged for this booking =
  // stored booking total + additive order fees.
  const grandTotal = Number(booking.total_amount || 0) + orderFeesTotal;

  // Back-calculate subtotal and tax amounts for the main booking (excluding extensions)
  // Formula: booking_total = subtotal * (1 + tax_rate/100) - deductions
  // So: subtotal = (booking_total + deductions) / (1 + tax_rate/100)
  const initialGrandTotal = grandTotal - totalExtensionAmount - orderFeesTotal;
  const initialSubtotal = Math.round(((initialGrandTotal + deductionTotal) / (1 + (taxRatePercent / 100))) * 100) / 100;
  const initialTax = Math.round(((initialGrandTotal + deductionTotal) - initialSubtotal) * 100) / 100;

  // Build Main Line Item
  const lineItems: InvoiceLineItem[] = [
    {
      description: booking.services?.title || "Home Cleaning Service",
      quantity: 1,
      unit_price: initialSubtotal + deductionTotal,
      discount: deductionTotal,
      tax: initialTax,
      total: initialGrandTotal,
      meta: { category: booking.services?.category || "Cleaning" },
    },
  ];

  // Include additive order fees as their own line items (already excluded from
  // the main line through initialGrandTotal, so the table reconciles).
  for (const fee of feeItems) {
    const feeAmount = Math.max(0, fee.amount);
    if (feeAmount <= 0) continue;
    lineItems.push({
      description: fee.name,
      quantity: 1,
      unit_price: feeAmount,
      discount: 0,
      tax: 0,
      total: feeAmount,
      meta: { id: fee.id, type: "fee" },
    });
  }

  // Add extensions as separate line items
  extensions.forEach((ext) => {
    const extAmt = Number(ext.additional_amount);
    const extSub = Math.round((extAmt / (1 + (taxRatePercent / 100))) * 100) / 100;
    const extTax = Math.round((extAmt - extSub) * 100) / 100;

    const hours = ext.additional_minutes >= 60 ? Math.floor(ext.additional_minutes / 60) : 0;
    const mins = ext.additional_minutes % 60;
    const durationLabel = hours > 0 
      ? `${hours} Hour${hours > 1 ? "s" : ""}${mins > 0 ? ` ${mins} Mins` : ""}`
      : `${mins} Mins`;

    lineItems.push({
      description: `Time Extension (+${durationLabel})`,
      quantity: 1,
      unit_price: extSub,
      discount: 0,
      tax: extTax,
      total: extAmt,
      meta: { paid_at: ext.paid_at },
    });
  });

  // Calculate cumulative totals
  const subtotal = Math.round((initialSubtotal + extensions.reduce((sum, ext) => {
    const extAmt = Number(ext.additional_amount);
    return sum + Math.round((extAmt / (1 + (taxRatePercent / 100))) * 100) / 100;
  }, 0)) * 100) / 100;

  const taxAmount = Math.round((initialTax + extensions.reduce((sum, ext) => {
    const extAmt = Number(ext.additional_amount);
    const extSub = Math.round((extAmt / (1 + (taxRatePercent / 100))) * 100) / 100;
    return sum + (extAmt - extSub);
  }, 0)) * 100) / 100;

  // Build discount breakdown
  const discounts: InvoiceDiscounts = {};
  if (bookingPricing) {
    if (couponAmount > 0) {
      discounts.coupon = {
        code: couponCode || "COUPON",
        amount: couponAmount,
      };
    }
    if (offerAmount > 0) {
      discounts.offer = {
        id: bookingPricing.offer_id || bookingPricing.offer_entitlement_id || "",
        title: offerTitle || "Offer",
        amount: offerAmount,
      };
    }
    if (walletAmount > 0) {
      discounts.wallet = walletAmount;
    }
  } else if (deductionTotal > 0) {
    // Treat legacy generic discount as wallet
    discounts.wallet = deductionTotal;
  }

  return {
    subtotal,
    taxRate: taxRatePercent,
    taxAmount,
    discountAmount: deductionTotal,
    grandTotal,
    discounts,
    lineItems,
  };
}
