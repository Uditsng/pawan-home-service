import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import type { Metadata } from "next";
import InvoiceClientActions from "./InvoiceClientActions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tax Invoice | PHS Cleaning Company",
    description: "View and download your PHS Cleaning Company tax invoice.",
  };
}

interface InvoiceDetails {
  id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  booking: {
    id: string;
    status: string;
    scheduled_date: string;
    created_at: string;
    address: string | null;
    city: string | null;
    pincode: string | null;
    services: {
      title: string;
      category: string;
    } | null;
  } | null;
  customer: {
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  partner: {
    id: string;
    full_name: string;
  } | null;
}

// Auto-recovery: If booking is completed but no invoice row exists, generate it.
async function ensureInvoiceExists(bookingId: string, supabase: any, userId: string): Promise<InvoiceDetails | null> {
  // Query booking details first
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, services:service_id(title, category), partner:partner_id(full_name)")
    .eq("id", bookingId)
    .eq("customer_id", userId)
    .single();

  if (!booking) return null;

  if (booking.status !== "completed") return null;

  // Let's check if invoice already exists
  const { data: existing } = await supabase
    .from("invoices")
    .select("*, booking:booking_id(id, status, scheduled_date, created_at, address, city, pincode, services:service_id(title, category)), customer:customer_id(full_name, phone, email), partner:partner_id(id, full_name)")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing) return existing as unknown as InvoiceDetails;

  // If not, calculate and insert
  let taxRatePercent = 18.00;
  const { data: taxSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "tax_rate")
    .single();

  if (taxSetting?.value) {
    const rawTax = typeof taxSetting.value === "string" ? taxSetting.value : String(taxSetting.value);
    const parsed = parseFloat(rawTax.replace(/%/g, "").replace(/"/g, "").trim());
    if (!isNaN(parsed)) taxRatePercent = parsed;
  }

  const discountAmount = Number(booking.wallet_discount_applied || 0);
  const grandTotal = Number(booking.total_amount || 0);
  const subtotal = Math.round(((grandTotal + discountAmount) / (1 + (taxRatePercent / 100))) * 100) / 100;
  const taxAmount = Math.round(((grandTotal + discountAmount) - subtotal) * 100) / 100;

  let transactionId = "TXN-" + booking.id.substring(0, 8).toUpperCase();
  let paymentMethod = booking.payment_method || "Card";

  const { data: payment } = await supabase
    .from("payments")
    .select("razorpay_payment_id")
    .or(`booking_id.eq.${booking.id},order_id.eq.${booking.order_id || "00000000-0000-0000-0000-000000000000"}`)
    .limit(1)
    .maybeSingle();

  if (payment?.razorpay_payment_id) {
    transactionId = payment.razorpay_payment_id;
    paymentMethod = "Razorpay";
  }

  const { data: inserted, error: insertError } = await supabase
    .from("invoices")
    .insert({
      booking_id: bookingId,
      customer_id: userId,
      partner_id: booking.partner_id,
      subtotal,
      tax_rate: taxRatePercent,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      payment_status: "paid",
      payment_method: paymentMethod,
      transaction_id: transactionId
    })
    .select()
    .single();

  if (insertError) {
    console.error("Auto-recovery: Failed to create invoice on access:", insertError);
    return null;
  }

  // Fetch fully joined invoice
  const { data: fullyJoined } = await supabase
    .from("invoices")
    .select("*, booking:booking_id(id, status, scheduled_date, created_at, address, city, pincode, services:service_id(title, category)), customer:customer_id(full_name, phone, email), partner:partner_id(id, full_name)")
    .eq("id", inserted.id)
    .single();

  return fullyJoined as unknown as InvoiceDetails;
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
        services:service_id (
          title,
          category
        )
      ),
      customer:customer_id (
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
    const recovered = await ensureInvoiceExists(bookingId, supabase, user.id);
    if (recovered) {
      invoice = recovered;
    }
  }

  // If invoice still doesn't exist, check booking status to see if it's pending completion
  if (!invoice) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .maybeSingle();

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

  const invoiceData = invoice as unknown as InvoiceDetails;
  const bookingDate = invoiceData.booking?.scheduled_date ? new Date(invoiceData.booking.scheduled_date) : new Date();
  const invoiceDate = new Date(invoiceData.created_at);

  const displayBookingDate = bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }) + " &middot; " + bookingDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const displayInvoiceDate = invoiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" });
  const displayPaymentDate = invoiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const bookingRef = `BK-${invoiceData.booking?.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body selection:bg-secondary/30">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Navigation & Controls (hidden in print) */}
        <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
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
          
          <InvoiceClientActions invoiceNumber={invoiceData.invoice_number} />
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
              <div className="relative w-12 h-12 rounded-xl bg-[#002261] flex items-center justify-center shrink-0 shadow-sm print:bg-[#002261]">
                <Image
                  src="/PHS.png"
                  alt="PHS Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-none">PHS Cleaning Company</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Professional Home Services</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <h1 className="text-xl font-extrabold text-[#002261] tracking-wide uppercase">Tax Invoice</h1>
              <div className="mt-2 space-y-0.5 text-xs text-slate-500 font-medium">
                <p>Invoice No: <span className="font-bold text-slate-800">{invoiceData.invoice_number}</span></p>
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
              <p className="font-bold text-slate-800 text-sm">PHS Cleaning Company Private Limited</p>
              <div className="mt-2 space-y-1 text-slate-500 font-medium leading-relaxed">
                <p>123, Premium Heights, Civil Lines,</p>
                <p>Dehradun, Uttarakhand - 248001</p>
                <p>GSTIN: <span className="font-bold text-slate-800">05AAACP9876M1ZX</span></p>
                <p>Support Phone: +91 98765 43210</p>
                <p>Support Email: support@phs.com</p>
                <p>Website: www.phs.com</p>
              </div>
            </div>

            {/* Customer info */}
            <div>
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-3">Service Address (Customer)</h3>
              <p className="font-bold text-slate-800 text-sm">{invoiceData.customer?.full_name || "Valued Customer"}</p>
              <div className="mt-2 space-y-1 text-slate-500 font-medium leading-relaxed">
                <p>{invoiceData.booking?.address || "Service Location"}</p>
                <p>{invoiceData.booking?.city || ""}</p>
                <p>Pincode: {invoiceData.booking?.pincode || ""}</p>
                <p>Mobile: +91 {invoiceData.customer?.phone || "—"}</p>
                {invoiceData.customer?.email && <p>Email: {invoiceData.customer.email}</p>}
              </div>
            </div>
          </div>

          {/* 3. Professional Block */}
          {invoiceData.partner && (
            <div className="py-6 border-b border-slate-100 text-xs">
              <h3 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-3">Assigned Service Professional</h3>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-slate-500 font-medium">Technician Name:</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{invoiceData.partner.full_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Professional ID:</p>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">PRO-{invoiceData.partner.id.substring(0, 8).toUpperCase()}</p>
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
                  <tr>
                    <td className="py-4 pr-4 font-bold text-slate-800">
                      {invoiceData.booking?.services?.title || "Home Cleaning Service"}
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wide">
                        Category: {invoiceData.booking?.services?.category || "Cleaning"}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-800">1</td>
                    <td className="py-4 px-4 text-right">₹{(invoiceData.subtotal + invoiceData.discount_amount).toFixed(2)}</td>
                    <td className="py-4 px-4 text-right text-green-600 font-bold">-₹{invoiceData.discount_amount.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right">₹{invoiceData.tax_amount.toFixed(2)}</td>
                    <td className="py-4 pl-4 text-right font-bold text-slate-800">₹{invoiceData.grand_total.toFixed(2)}</td>
                  </tr>
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
                  <span className="font-bold text-slate-800 uppercase">{invoiceData.payment_method}</span>
                </p>
                <p className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-slate-800 select-all font-bold">{invoiceData.transaction_id}</span>
                </p>
                <p className="flex justify-between">
                  <span>Payment Date:</span>
                  <span>{displayPaymentDate}</span>
                </p>
                <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full print:bg-emerald-100">
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Calculations totals */}
            <div className="w-full md:max-w-xs ml-auto space-y-2.5 font-medium text-slate-500">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{(invoiceData.subtotal + invoiceData.discount_amount).toFixed(2)}</span>
              </div>
              {invoiceData.discount_amount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Discount (Referral / Wallet)</span>
                  <span>-₹{invoiceData.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({invoiceData.tax_rate}%)</span>
                <span>₹{invoiceData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Fees</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between text-slate-800 text-sm font-extrabold border-t border-slate-200 pt-3">
                <span>Grand Total</span>
                <span className="text-slate-900 text-lg">₹{invoiceData.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 6. Footer Disclaimer & Terms */}
          <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium leading-relaxed">
            <p>Thank you for choosing PHS Cleaning Company. We value your business!</p>
            <p className="mt-1">For support, call +91 98765 43210 or email support@phs.com.</p>
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
