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
    total_price?: number;
  } | null;
  extensions?: {
    id: string;
    additional_minutes: number;
    additional_amount: number;
    paid_at?: string | null;
  }[];
  taxRatePercent?: number;
}): CalculatedInvoiceResult {
  const { snapshot, booking, bookingPricing, extensions = [], taxRatePercent = 18.00 } = params;

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
  const discountAmount = Number(bookingPricing?.discount_amount ?? booking.wallet_discount_applied ?? 0);
  const grandTotal = Number(booking.total_amount || 0);

  // Back-calculate subtotal and tax amounts for the main booking (excluding extensions)
  // Formula: total_amount = subtotal * (1 + tax_rate/100) - discount
  // So: subtotal = (total_amount + discount) / (1 + tax_rate/100)
  const initialGrandTotal = grandTotal - totalExtensionAmount;
  const initialSubtotal = Math.round(((initialGrandTotal + discountAmount) / (1 + (taxRatePercent / 100))) * 100) / 100;
  const initialTax = Math.round(((initialGrandTotal + discountAmount) - initialSubtotal) * 100) / 100;

  // Build Main Line Item
  const lineItems: InvoiceLineItem[] = [
    {
      description: booking.services?.title || "Home Cleaning Service",
      quantity: 1,
      unit_price: initialSubtotal + discountAmount,
      discount: discountAmount,
      tax: initialTax,
      total: initialGrandTotal,
      meta: { category: booking.services?.category || "Cleaning" },
    },
  ];

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
    if (Number(bookingPricing.coupon_discount) > 0) {
      discounts.coupon = {
        code: "COUPON",
        amount: Number(bookingPricing.coupon_discount),
      };
    }
    if (Number(bookingPricing.wallet_discount) > 0) {
      discounts.wallet = Number(bookingPricing.wallet_discount);
    }
  } else if (discountAmount > 0) {
    // Treat legacy generic discount as wallet
    discounts.wallet = discountAmount;
  }

  return {
    subtotal,
    taxRate: taxRatePercent,
    taxAmount,
    discountAmount,
    grandTotal,
    discounts,
    lineItems,
  };
}
