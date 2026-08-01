import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveInvoice, InvoiceUserRole } from "@/lib/invoice/getInvoice";
import { calculateInvoice } from "@/lib/invoice/calculateInvoice";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Tax Invoice | PHS Cleaning Company",
  description: "View and download your PHS Cleaning Company tax invoice.",
};

const CURRENCY = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  return `${date}, ${time}`;
}

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id: bookingId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile?.role || "customer") as InvoiceUserRole;

  const { invoice, isCompleted } = await resolveInvoice({
    supabase,
    adminClient: createAdminClient(),
    bookingId,
    userId: user.id,
    role,
  });

  if (!invoice) {
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
          <Link
            href="/customer/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold font-headline rounded-xl text-sm transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Bookings
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Legacy fallback data (pre-snapshot invoices)
  let bookingPricing = null;
  if (!invoice.snapshot) {
    const { data: pricing } = await supabase
      .from("booking_pricing")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();
    bookingPricing = pricing;
  }
  const { data: extensionsData } = await supabase
    .from("booking_extensions")
    .select("*")
    .eq("booking_id", bookingId)
    .in("status", ["paid"]);
  const extensionRows = extensionsData || [];

  const calc = calculateInvoice({
    snapshot: invoice.snapshot,
    booking: invoice.booking,
    bookingPricing,
    extensions: extensionRows,
    taxRatePercent: invoice.tax_rate,
  });

  const snapshot = invoice.snapshot;
  const seller = snapshot?.seller || {
    company_name: "PHS Cleaning Company",
    tagline: "Professional Home Services",
    logo_url: "/PHS.png",
    footer_text: "Thank you for choosing PHS Cleaning Company. We value your business!",
    support_phone: "+91 98765 43210",
    support_email: "support@phs.com",
  };
  const customer = snapshot?.customer || {
    id: invoice.customer?.id || "",
    full_name: invoice.customer?.full_name || "Valued Customer",
    phone: invoice.customer?.phone || null,
    email: invoice.customer?.email || null,
    address: invoice.booking?.address || "Service Location",
    city: invoice.booking?.city || "",
    pincode: invoice.booking?.pincode || null,
    business_name: invoice.booking?.business_name || null,
    business_gstin: invoice.booking?.business_gstin || null,
  };
  const booking = snapshot?.booking || invoice.booking;
  const partner = snapshot?.partner || invoice.partner;
  const payment = snapshot?.payment || {
    method: invoice.payment_method || "Card",
    status: invoice.payment_status || "Paid",
    transaction_id: invoice.transaction_id || "—",
    paid_at: invoice.created_at || null,
  };

  const bookingRef = booking?.id ? `BK-${booking.id.substring(0, 6).toUpperCase()}` : "BK-PHS";
  const pdfUrl = `/api/invoice/${bookingId}/pdf?download=1`;
  const serviceTitle = snapshot?.booking?.service_title || invoice.booking?.services?.title || "Home Service";
  const categoryName = snapshot?.booking?.category_name || invoice.booking?.services?.category || null;

  const summaryRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Service Subtotal", value: CURRENCY(calc.subtotal) },
  ];
  if (calc.discounts.coupon && calc.discounts.coupon.amount > 0) {
    summaryRows.push({ label: `Coupon Discount (${calc.discounts.coupon.code})`, value: `-${CURRENCY(calc.discounts.coupon.amount)}` });
  }
  if ((calc.discounts.referral ?? 0) > 0) {
    summaryRows.push({ label: "Referral Discount", value: `-${CURRENCY(calc.discounts.referral || 0)}` });
  }
  if ((calc.discounts.wallet ?? 0) > 0) {
    summaryRows.push({ label: "Wallet Used", value: `-${CURRENCY(calc.discounts.wallet || 0)}` });
  }
  if ((calc.discounts.manual ?? 0) > 0) {
    summaryRows.push({ label: "Manual Discount", value: `-${CURRENCY(calc.discounts.manual || 0)}` });
  }
  summaryRows.push({ label: `GST (${calc.taxRate}%)`, value: CURRENCY(calc.taxAmount) });

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header / controls */}
        <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/customer/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Bookings
            </Link>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-primary">Tax Invoice</h1>
          </div>
          <a
            href={pdfUrl}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold text-xs uppercase tracking-widest shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            Download PDF
          </a>
        </section>

        {/* Invoice paper preview (mirrors the PDF) */}
        <div className="bg-white text-on-surface rounded-3xl border border-outline-variant/20 shadow-sm p-6 md:p-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b-2 border-primary">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                <Image src={seller.logo_url || "/PHS.png"} alt="PHS Logo" width={40} height={40} className="object-contain" unoptimized />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary leading-none font-headline">{seller.company_name}</h2>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">{seller.tagline}</p>
              </div>
            </div>
            <div className="text-left md:text-right text-xs text-on-surface-variant font-medium">
              <h3 className="text-xl font-extrabold text-primary tracking-wide uppercase font-headline">Tax Invoice</h3>
              <div className="mt-1.5 space-y-0.5">
                <p>
                  Invoice No: <span className="font-bold text-on-surface">{invoice.invoice_number}</span>
                </p>
                <p>Date: <span>{formatDate(invoice.created_at)}</span></p>
                <p>
                  Booking ID: <span className="font-bold text-on-surface">#{bookingRef}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bill To + Service details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 text-xs">
            <div>
              <h4 className="font-bold text-on-surface-variant uppercase tracking-widest text-[9px] mb-2">Billed To</h4>
              <p className="font-bold text-on-surface text-sm">{customer.full_name}</p>
              <div className="mt-1.5 space-y-1 text-on-surface-variant font-medium leading-relaxed">
                <p>{[customer.address, customer.city].filter(Boolean).join(", ") || "Service Location"}</p>
                {customer.pincode ? <p>Pincode: {customer.pincode}</p> : null}
                {customer.phone ? <p>Mobile: +91 {customer.phone}</p> : null}
                {customer.email ? <p>Email: {customer.email}</p> : null}
                {customer.business_name ? (
                  <div className="mt-2 pt-2 border-t border-outline-variant/60 space-y-0.5">
                    <p className="font-bold text-on-surface">Business: {customer.business_name}</p>
                    {customer.business_gstin ? <p>GSTIN: {customer.business_gstin}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-on-surface-variant uppercase tracking-widest text-[9px] mb-2">Service Details</h4>
              <div className="space-y-1 text-on-surface-variant font-medium leading-relaxed">
                <p>Service: <span className="font-bold text-on-surface">{serviceTitle}</span></p>
                {categoryName ? <p>Category: {categoryName}</p> : null}
                <p>Service Date: {formatDate(booking?.scheduled_date, true)}</p>
                <p>Professional: <span className="font-bold text-on-surface">{partner?.full_name || "PHS Professional"}</span></p>
                <p>Payment Method: <span className="font-bold text-on-surface uppercase">{payment.method}</span></p>
                <p>Payment Status: <span className="font-bold text-on-surface uppercase">{payment.status || "Paid"}</span></p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-2">
            <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[9px]">Item</th>
                    <th className="py-2.5 px-4 text-center font-bold uppercase tracking-wider text-[9px]">Qty</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[9px]">Unit Price</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[9px]">Discount</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[9px]">Tax</th>
                    <th className="py-2.5 px-4 text-right font-bold uppercase tracking-wider text-[9px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {calc.lineItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-surface-dim/40" : ""}>
                      <td className="py-3 px-4 font-bold text-on-surface">
                        {item.description}
                        {typeof item.meta?.category === "string" ? (
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5 tracking-wide">
                            Category: {item.meta.category}
                          </p>
                        ) : null}
                        {typeof item.meta?.paid_at === "string" ? (
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5 tracking-wide">
                            Requested by Pro · Paid on {formatDate(item.meta.paid_at)}
                          </p>
                        ) : null}
                        {item.description === "CarryBuddy" && booking?.meeting_location ? (
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                            Meet: {booking.meeting_location} · Drop: {booking.destination || "Not Specified"} · Bags: {booking.expected_bags ?? 0}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-center text-on-surface">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-on-surface">{CURRENCY(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-bold text-success">
                        {item.discount > 0 ? `-${CURRENCY(item.discount)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-on-surface">{CURRENCY(item.tax)}</td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface">{CURRENCY(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary + totals */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-6 border-t border-outline-variant/40 text-xs">
            <div className="w-full md:max-w-xs">
              <div className="bg-surface-dim/50 border border-outline-variant/30 rounded-2xl p-4 space-y-1.5 font-medium text-on-surface-variant">
                <p className="flex justify-between">
                  <span>Payment Mode</span>
                  <span className="font-bold text-on-surface uppercase">{payment.method}</span>
                </p>
                <p className="flex justify-between">
                  <span>Transaction ID</span>
                  <span className="font-mono text-on-surface select-all font-bold">{payment.transaction_id || "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span>Payment Date</span>
                  <span>{formatDate(payment.paid_at, true)}</span>
                </p>
              </div>
            </div>
            <div className="w-full md:max-w-xs ml-auto space-y-2 font-medium text-on-surface-variant">
              {summaryRows.map((row, idx) => (
                <div key={idx} className="flex justify-between text-on-surface-variant">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-primary text-base font-extrabold border-t-2 border-primary pt-3">
                <span>Grand Total</span>
                <span className="font-headline">{CURRENCY(calc.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-outline-variant/40 text-center text-[10px] text-on-surface-variant font-medium leading-relaxed">
            <p>{seller.footer_text || "Thank you for choosing PHS Cleaning Company. We value your business!"}</p>
            <p className="mt-1">For support, call {seller.support_phone} or email {seller.support_email}.</p>
            <div className="mt-4 bg-surface-dim/50 border border-outline-variant/30 rounded-xl p-3 inline-block text-left text-[9px] text-on-surface-variant max-w-lg">
              <p className="font-bold uppercase tracking-wider mb-1">Terms &amp; Conditions:</p>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>This is a computer-generated tax invoice and requires no physical signature.</li>
                <li>Taxes applied as per applicable Indian GST statutes.</li>
                <li>For refunds or disputes, contact our billing desk within 7 business days of service.</li>
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
