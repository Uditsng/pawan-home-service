// ============================================================
// Invoice TypeScript Interfaces — Source of Truth
// ============================================================

export interface InvoiceSeller {
  company_name: string;
  legal_name: string;
  logo_url: string;
  gst_number: string;
  support_phone: string;
  support_email: string;
  website: string;
  address: string;
  tagline: string;
  footer_text: string;
}

export interface InvoiceCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  business_name?: string | null;
  business_gstin?: string | null;
}

export interface InvoicePartner {
  id: string;
  full_name: string;
}

export interface InvoiceBooking {
  id: string;
  scheduled_date: string | null;
  created_at: string;
  service_title: string;
  category_name: string | null;
  pricing_model: string | null;
  meeting_location?: string | null;
  destination?: string | null;
  expected_bags?: number | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  total: number;
  meta?: Record<string, unknown> | null;
}

export interface InvoicePayment {
  method: string;
  status: string;
  transaction_id: string;
  paid_at: string | null;
}

export interface InvoiceDiscounts {
  coupon?: {
    code: string;
    amount: number;
  } | null;
  referral?: number;
  wallet?: number;
  manual?: number;
}

export interface InvoiceFinancials {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number; // total discount sum
  grand_total: number;
  discounts: InvoiceDiscounts;
}

/**
 * Immutable invoice snapshot stored in the database.
 * Future changes to bookings, customers, or services will not affect generated invoices.
 */
export interface InvoiceSnapshot {
  version: string;
  invoice_number: string;
  invoice_date: string;
  financials: InvoiceFinancials;
  seller: InvoiceSeller;
  customer: InvoiceCustomer;
  partner: InvoicePartner | null;
  booking: InvoiceBooking;
  line_items: InvoiceLineItem[];
  payment: InvoicePayment;
}
