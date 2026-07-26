import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import type { Metadata } from "next";
import InvoiceClientActions from "./InvoiceClientActions";
import { calculateInvoice } from "@/lib/invoice/calculateInvoice";
import { generateAndSaveInvoice } from "@/lib/invoice/invoiceGenerator";
import { generateQrSvg } from "@/lib/invoice/qrGenerator";
import { headers } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";
import { InvoiceSnapshot } from "@/lib/invoice/invoiceTypes";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tax Invoice | PHS Cleaning Company",
    description: "View and download your PHS Cleaning Company tax invoice.",
  };
}

interface InvoiceDetails {
  id: string;
  booking_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: string;
  transaction_id: string;
  payment_status?: string | null;
  created_at: string;
  booking: {
    id: string;
    status: string;
    scheduled_date: string;
    created_at: string;
    address: string | null;
    city: string | null;
    pincode: string | null;
    pricing_model: string | null;
    selected_duration_minutes: number | null;
    base_price: number | null;
    meeting_location: string | null;
    destination: string | null;
    expected_bags: number | null;
    business_name: string | null;
    business_gstin: string | null;
    total_amount: number;
    wallet_discount_applied: number | null;
    service_id: string;
    services: {
      title: string;
      category: string;
    } | null;
  } | null;
  customer: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  partner: {
    id: string;
    full_name: string;
  } | null;
  snapshot: InvoiceSnapshot | null;
}

// Auto-recovery: If booking is completed but no invoice row exists, generate it.
async function ensureInvoiceExists(bookingId: string, supabase: SupabaseClient, userId: string, isAdmin: boolean, isPartner: boolean): Promise<InvoiceDetails | null> {
  // Query booking details first
  let query = supabase
    .from("bookings")
    .select("customer_id, partner_id, status")
    .eq("id", bookingId);

  if (!isAdmin) {
    if (isPartner) {
      query = query.eq("partner_id", userId);
    } else {
      query = query.eq("customer_id", userId);
    }
  }

  const { data: booking } = await query.single();
  if (!booking || booking.status !== "completed") return null;

  try {
    await generateAndSaveInvoice(supabase, bookingId);

    // Let's check if invoice already exists
    const { data: existing } = await supabase
      .from("invoices")
      .select(`
        *,
        booking:booking_id (
          id, status, scheduled_date, created_at, address, city, pincode, pricing_model, selected_duration_minutes, base_price, meeting_location, destination, expected_bags, business_name, business_gstin, total_amount, wallet_discount_applied, service_id,
          services:service_id (title, category)
        ),
        customer:customer_id (id, full_name, phone, email),
        partner:partner_id (id, full_name)
      `)
      .eq("booking_id", bookingId)
      .maybeSingle();

    return existing as unknown as InvoiceDetails;
  } catch (err) {
    console.error("Auto-recovery: Failed to create invoice on access:", err);
    return null;
  }
}

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolve user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isPartner = profile?.role === "partner";

  // Fetch the invoice
  let { data: invoice } = await supabase
    .from("invoices")
    .select(`
      *,
      booking:booking_id (
        id,
        status,
        scheduled_date,
        created_at,
        address,
        city,
        pincode,
        pricing_model,
        selected_duration_minutes,
        base_price,
        meeting_location,
        destination,
        expected_bags,
        business_name,
        business_gstin,
        total_amount,
        wallet_discount_applied,
        service_id,
        services:service_id (
          title,
          category
        )
      ),
      customer:customer_id (
        id,
        full_name,
        phone,
        email
      ),
      partner:partner_id (
        id,
        full_name
      )
    `)
    .eq("booking_id", bookingId)
    .maybeSingle();

  // If no invoice but booking completed, attempt auto-recovery
  if (!invoice) {
    const recovered = await ensureInvoiceExists(bookingId, supabase, user.id, isAdmin, isPartner);
    if (recovered) {
      invoice = recovered;
    }
  }

  // If invoice still doesn't exist, check booking status to see if it's pending completion
  if (!invoice) {
    let bookingQuery = supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId);

    if (!isAdmin) {
      if (isPartner) {
        bookingQuery = bookingQuery.eq("partner_id", user.id);
      } else {
        bookingQuery = bookingQuery.eq("customer_id", user.id);
      }
    }

    const { data: booking } = await bookingQuery.maybeSingle();
    const isCompleted = booking?.status === "completed";

    return (
      <div className="bg-surface text-on-surface min-h-screen pb-20 font-body flex flex-col justify-between">
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-amber-600 text-3xl font-bold">hourglass_empty</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-primary mb-2">Invoice Not Available</h1>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed mb-8">
            {isCompleted 
              ? "We are currently generating your invoice. Please refresh the page in a few moments."
              : "Invoices are generated automatically once your service is fully completed and verified by OTP."}
          </p>
          <Link href="/customer/bookings" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold font-headline rounded-xl text-sm transition-opacity hover:opacity-90">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Bookings
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const typedInvoice = invoice as unknown as InvoiceDetails;

  // Fetch Pricing breakdown and extensions for legacy calculation fallback if snapshot is not present
  let bookingPricing = null;
  if (!typedInvoice.snapshot) {
    const { data: pricing } = await supabase
      .from("booking_pricing")
      .select("*")
      .eq("booking_id", typedInvoice.booking_id)
      .maybeSingle();
    bookingPricing = pricing;
  }

  const { data: extensionsData } = await supabase
    .from("booking_extensions")
    .select("*")
    .eq("booking_id", bookingId)
    .in("status", ["paid", "active", "completed"]);
  const extensionRows = extensionsData || [];

  // Centralized calculations
  const calculation = calculateInvoice({
    snapshot: typedInvoice.snapshot,
    booking: typedInvoice.booking,
    bookingPricing,
    extensions: extensionRows,
    taxRatePercent: typedInvoice.tax_rate,
  });

  const seller = typedInvoice.snapshot?.seller || {
    company_name: "PHS Cleaning Company",
    legal_name: "PHS Cleaning Company Private Limited",
    logo_url: "/PHS.png",
    gst_number: "05AAACP9876M1ZX",
    support_phone: "+91 98765 43210",
    support_email: "support@phs.com",
    website: "www.phs.com",
    address: "123, Premium Heights, Civil Lines, Dehradun, Uttarakhand - 248001",
    tagline: "Professional Home Services",
    footer_text: "Thank you for choosing PHS Cleaning Company. We value your business!",
  };

  const customer = typedInvoice.snapshot?.customer || {
    id: typedInvoice.customer?.id || "",
    full_name: typedInvoice.customer?.full_name || "Valued Customer",
    phone: typedInvoice.customer?.phone || "—",
    email: typedInvoice.customer?.email || null,
    address: typedInvoice.booking?.address || "Service Location",
    city: typedInvoice.booking?.city || "",
    pincode: typedInvoice.booking?.pincode || "",
    business_name: typedInvoice.booking?.business_name || null,
    business_gstin: typedInvoice.booking?.business_gstin || null,
  };

  const partner = typedInvoice.snapshot?.partner || typedInvoice.partner;
  const booking = typedInvoice.snapshot?.booking || typedInvoice.booking;
  const payment = typedInvoice.snapshot?.payment || {
    method: typedInvoice.payment_method || "Card",
    status: typedInvoice.payment_status || "Paid",
    transaction_id: typedInvoice.transaction_id || "—",
    paid_at: typedInvoice.created_at || new Date().toISOString(),
  };

  const bookingDate = booking?.scheduled_date ? new Date(booking.scheduled_date) : new Date();
  const invoiceDate = new Date(typedInvoice.created_at);
  const paymentDate = payment.paid_at ? new Date(payment.paid_at) : invoiceDate;

  const displayBookingDate = bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }) + " &middot; " + bookingDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const displayInvoiceDate = invoiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" });
  const displayPaymentDate = paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const bookingRef = booking?.id ? `BK-${booking.id.substring(0, 6).toUpperCase()}` : "BK-PHS";

  // Generate QR code Verification URL
  const reqHeaders = await headers();
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const verificationUrl = `${protocol}://${reqHeaders.get("host") || "phs.com"}/invoice/${typedInvoice.invoice_number}`;
  const qrSvg = generateQrSvg(verificationUrl, 3, 2);

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body selection:bg-secondary/30">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Navigation & Controls (hidden in print) */}
        <section className="no-print mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link 
              href="/customer/bookings" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Bookings
            </Link>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-primary">
              View Invoice
            </h1>
          </div>
          
          <InvoiceClientActions invoiceNumber={typedInvoice.invoice_number} />
        </section>

        {/* Invoice Container (styled for paper/A4) */}
        <div className="bg-white text-slate-800 p-6 md:p-12 rounded-3xl border border-slate-100 shadow-sm font-sans print-card relative overflow-hidden">
          
          {/* Print Styles Sheet (Self-contained) */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body {
                background: white !important;
                color: #1e293b !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .print-card {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              @page {
                size: A4;
                margin: 1.5cm;
              }
            }
          `}} />

          {/* Top Decorative Border (Design system flare - hidden in print) */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary no-print"></div>

          {/* 1. Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm print:bg-primary">
                <Image
                  src={seller.logo_url || "/PHS.png"}
                  alt="PHS Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-none">{seller.company_name}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{seller.tagline}</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <h1 className="text-xl font-extrabold text-primary tracking-wide uppercase font-headline">Tax Invoice</h1>
              <div className="mt-2 space-y-0.5 text-xs text-slate-500 font-medium">
                <p>Invoice No: <span className="font-bold text-slate-800">{typedInvoice.invoice_number}</span></p>
                <p>Date: <span>{displayInvoiceDate}</span></p>
                <p>Booking ID: <span className="font-bold text-slate-800">#{bookingRef}</span></p>
                <p>Service Date: <span dangerouslySetInnerHTML={{ __html: displayBookingDate }}></span></p>
              </div>
            </div>
          </div>

          {/* 2. Addresses Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100 text-xs">
            {/* Seller info */}
            <div>
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-3">Service Provider (Seller)</h3>
              <p className="font-bold text-slate-800 text-sm">{seller.legal_name}</p>
              <div className="mt-2 space-y-1 text-slate-500 font-medium leading-relaxed">
                <p>{seller.address}</p>
                <p>GSTIN: <span className="font-bold text-slate-800">{seller.gst_number}</span></p>
                <p>Support Phone: {seller.support_phone}</p>
                <p>Support Email: {seller.support_email}</p>
                <p>Website: {seller.website}</p>
              </div>
            </div>

            {/* Customer info */}
            <div>
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-3">Service Address (Customer)</h3>
              <p className="font-bold text-slate-800 text-sm">{customer.full_name}</p>
              <div className="mt-2 space-y-1 text-slate-500 font-medium leading-relaxed">
                <p>{customer.address}</p>
                <p>{customer.city}</p>
                <p>Pincode: {customer.pincode}</p>
                <p>Mobile: +91 {customer.phone || "—"}</p>
                {customer.email && <p>Email: {customer.email}</p>}
                
                {/* Business Details Display */}
                {customer.business_name && (
                  <div className="mt-3 pt-3 border-t border-slate-100/80 space-y-1 text-[11px] text-slate-700">
                    <p className="font-black uppercase tracking-wider text-[8px] text-slate-400">Business Billing details</p>
                    <p>Company: <span className="font-bold text-slate-800">{customer.business_name}</span></p>
                    {customer.business_gstin && <p>GSTIN: <span className="font-mono font-bold text-slate-800">{customer.business_gstin}</span></p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Professional Block */}
          {partner && (
            <div className="py-6 border-b border-slate-100 text-xs">
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-3">Assigned Service Professional</h3>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-slate-500 font-medium">Technician Name:</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{partner.full_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Professional ID:</p>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">PRO-{partner.id?.substring(0, 8).toUpperCase() || "PHSPRO"}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Service Details Table */}
          <div className="py-8">
            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-4">Service Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 pr-4">Service Item</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Tax (18%)</th>
                    <th className="py-3 pl-4 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {calculation.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 pr-4 font-bold text-slate-800">
                        {item.description}
                        {typeof item.meta?.category === "string" && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wide">
                            Category: {item.meta.category}
                          </p>
                        )}
                        {typeof item.meta?.paid_at === "string" && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wide">
                            Requested by Pro · Paid on {new Date(item.meta.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" })}
                          </p>
                        )}
                        {/* CarryBuddy details */}
                        {item.description === "CarryBuddy" && booking?.meeting_location && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100/50 space-y-1 text-[11px] font-medium text-slate-600 max-w-sm">
                            <p className="flex items-start gap-1">
                              <span className="font-bold text-slate-800 shrink-0">Meet At:</span>
                              <span>{booking?.meeting_location}</span>
                            </p>
                            <p className="flex items-start gap-1">
                              <span className="font-bold text-slate-800 shrink-0">Drop At:</span>
                              <span>{booking?.destination || "Not Specified"}</span>
                            </p>
                            <p className="flex items-start gap-1">
                              <span className="font-bold text-slate-800 shrink-0">Expected Bags:</span>
                              <span>{booking?.expected_bags || 0} bags</span>
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-800">{item.quantity}</td>
                      <td className="py-4 px-4 text-right">₹{item.unit_price.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-green-600 font-bold">
                        {item.discount > 0 ? `-₹${item.discount.toFixed(2)}` : "₹0.00"}
                      </td>
                      <td className="py-4 px-4 text-right">₹{item.tax.toFixed(2)}</td>
                      <td className="py-4 pl-4 text-right font-bold text-slate-800">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Breakdown & Grand Totals */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-6 border-t border-slate-100 text-xs">
            {/* Payment Method / Audit details */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full md:max-w-xs print:bg-slate-50">
              <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[9px] mb-2.5">Payment Details</h4>
              <div className="space-y-1.5 font-medium text-slate-600">
                <p className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-slate-800 uppercase">{payment.method}</span>
                </p>
                <p className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-slate-800 select-all font-bold">{payment.transaction_id || "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span>Payment Date:</span>
                  <span>{displayPaymentDate}</span>
                </p>
                <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full print:bg-emerald-100">
                    {payment.status || "Paid"}
                  </span>
                </div>
              </div>
              
              {/* QR Verification Code */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col items-center gap-1.5 text-center">
                <div 
                  className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-200/50 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scan to Verify Invoice</span>
              </div>
            </div>

            {/* Calculations totals */}
            <div className="w-full md:max-w-xs ml-auto space-y-2.5 font-medium text-slate-500">
              <div className="flex justify-between text-slate-600">
                <span>Service Subtotal</span>
                <span>₹{calculation.subtotal.toFixed(2)}</span>
              </div>
              {calculation.discounts.coupon && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Coupon Discount ({calculation.discounts.coupon.code})</span>
                  <span>-₹{calculation.discounts.coupon.amount.toFixed(2)}</span>
                </div>
              )}
              {calculation.discounts.referral && calculation.discounts.referral > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Referral Discount</span>
                  <span>-₹{calculation.discounts.referral.toFixed(2)}</span>
                </div>
              )}
              {calculation.discounts.wallet && calculation.discounts.wallet > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Wallet Used</span>
                  <span>-₹{calculation.discounts.wallet.toFixed(2)}</span>
                </div>
              )}
              {calculation.discounts.manual && calculation.discounts.manual > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Manual Discount</span>
                  <span>-₹{calculation.discounts.manual.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({calculation.taxRate}%)</span>
                <span>₹{calculation.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Fees</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between text-slate-800 text-sm font-extrabold border-t border-slate-200 pt-3">
                <span>Grand Total</span>
                <span className="text-slate-900 text-lg">₹{calculation.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 6. Footer Disclaimer & Terms */}
          <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium leading-relaxed">
            <p>{seller.footer_text || "Thank you for choosing PHS Cleaning Company. We value your business!"}</p>
            <p className="mt-1">For support, call {seller.support_phone} or email {seller.support_email}.</p>
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3 inline-block text-left text-[9px] text-slate-400/80 max-w-lg print:bg-slate-50">
              <p className="font-bold uppercase tracking-wider text-[8px] text-slate-400 mb-1">Terms & Conditions:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>This is a computer-generated tax invoice and requires no physical signature.</li>
                <li>Taxes calculated as applicable in accordance with Indian GST statutes.</li>
                <li>For support, refund queries, or dispute resolution, contact our billing desk directly within 7 business days of service.</li>
              </ul>
            </div>
          </div>

        </div>

      </main>

      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}
