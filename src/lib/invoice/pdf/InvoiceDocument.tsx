import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceSnapshot } from "../invoiceTypes";

/**
 * Official PHS invoice PDF.
 * Renders deterministically on the server (Helvetica only) so the output is
 * byte-identical on every device. Compact layout fits 3-4 line items on one page.
 */

const COLORS = {
  primary: "#002261",
  accent: "#a6ce37",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  lightBg: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: COLORS.text,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 24,
    lineHeight: 1.35,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 7,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  logo: { width: 26, height: 26, borderRadius: 6, backgroundColor: COLORS.primary },
  companyName: { fontSize: 11, fontWeight: "bold", color: COLORS.primary },
  tagline: { fontSize: 6, color: COLORS.muted, marginTop: 1, textTransform: "uppercase" },
  title: { fontSize: 13, fontWeight: "bold", color: COLORS.primary, textAlign: "right", textTransform: "uppercase", letterSpacing: 1 },
  headerMeta: { textAlign: "right", marginTop: 2, fontSize: 6.5, color: COLORS.muted },
  headerMetaStrong: { fontWeight: "bold", color: COLORS.text },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", gap: 2 },

  infoGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 9, gap: 16 },
  infoCol: { flex: 1 },
  blockLabel: { fontSize: 6, fontWeight: "bold", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  name: { fontSize: 8.5, fontWeight: "bold", color: COLORS.text, marginBottom: 1 },
  infoText: { fontSize: 6.5, color: COLORS.muted },

  table: { marginTop: 9 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  th: { fontSize: 6, fontWeight: "bold", color: "#ffffff", textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  rowAlt: { backgroundColor: COLORS.lightBg },
  cell: { fontSize: 6.5 },
  cellBold: { fontSize: 6.5, fontWeight: "bold" },
  cellMuted: { fontSize: 5.5, color: COLORS.muted, marginTop: 1 },

  totals: { marginTop: 8, alignItems: "flex-end" },
  totalsBox: { width: "55%" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5, fontSize: 6.5, color: COLORS.muted },
  totalLineStrong: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderTopWidth: 1, borderTopColor: COLORS.primary, marginTop: 2, fontSize: 8.5, fontWeight: "bold", color: COLORS.primary },

  footer: { marginTop: "auto", paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  footerText: { fontSize: 6, color: COLORS.muted, textAlign: "center" },
  footerSupport: { fontSize: 6, color: COLORS.muted, textAlign: "center", marginTop: 2 },
  footerTerms: { fontSize: 5, color: COLORS.muted, textAlign: "center", marginTop: 4, lineHeight: 1.4 },
});

const CURRENCY = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  return `${date}, ${time}`;
}

function InvoiceDocument({ snapshot, logoDataUri }: { snapshot: InvoiceSnapshot; logoDataUri?: string | null }) {
  const { seller, customer, partner, booking, line_items, financials, payment } = snapshot;
  const bookingRef = booking?.id ? `BK-${booking.id.substring(0, 6).toUpperCase()}` : "BK-PHS";
  const { discounts } = financials;

  const summaryRows: { label: string; value: string; strong?: boolean }[] = [
    { label: "Service Subtotal", value: CURRENCY(financials.subtotal) },
  ];
  if (discounts?.coupon && discounts.coupon.amount > 0) {
    summaryRows.push({ label: `Coupon Discount (${discounts.coupon.code || "COUPON"})`, value: `-${CURRENCY(discounts.coupon.amount)}` });
  }
  if ((discounts?.referral ?? 0) > 0) {
    summaryRows.push({ label: "Referral Discount", value: `-${CURRENCY(discounts.referral || 0)}` });
  }
  if ((discounts?.wallet ?? 0) > 0) {
    summaryRows.push({ label: "Wallet Used", value: `-${CURRENCY(discounts.wallet || 0)}` });
  }
  if ((discounts?.manual ?? 0) > 0) {
    summaryRows.push({ label: "Manual Discount", value: `-${CURRENCY(discounts.manual || 0)}` });
  }
  summaryRows.push({ label: `GST (${financials.tax_rate}%)`, value: CURRENCY(financials.tax_amount) });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            {logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is not an HTML <img>; alt is unsupported
              <Image src={logoDataUri} style={styles.logo} />
            ) : (
              <View style={styles.logo} />
            )}
            <View>
              <Text style={styles.companyName}>{seller.company_name}</Text>
              <Text style={styles.tagline}>{seller.tagline}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.title}>Tax Invoice</Text>
            <View style={styles.metaLine}>
              <Text style={styles.headerMeta}>Invoice No: </Text>
              <Text style={[styles.headerMeta, styles.headerMetaStrong]}>{snapshot.invoice_number}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.headerMeta}>Date: </Text>
              <Text style={[styles.headerMeta, styles.headerMetaStrong]}>{formatDate(snapshot.invoice_date)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.headerMeta}>Booking ID: </Text>
              <Text style={[styles.headerMeta, styles.headerMetaStrong]}>#{bookingRef}</Text>
            </View>
          </View>
        </View>

        {/* Bill To + Service details */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.blockLabel}>Billed To</Text>
            <Text style={styles.name}>{customer.full_name}</Text>
            <Text style={styles.infoText}>{[customer.address, customer.city].filter(Boolean).join(", ") || "Service Location"}</Text>
            <Text style={styles.infoText}>{customer.pincode ? `Pincode: ${customer.pincode}` : ""}</Text>
            <Text style={styles.infoText}>{customer.phone ? `Mobile: +91 ${customer.phone}` : ""}</Text>
            {customer.email ? <Text style={styles.infoText}>Email: {customer.email}</Text> : null}
            {customer.business_name ? (
              <>
                <Text style={[styles.infoText, { fontWeight: "bold", marginTop: 2 }]}>Business: {customer.business_name}</Text>
                {customer.business_gstin ? <Text style={styles.infoText}>GSTIN: {customer.business_gstin}</Text> : null}
              </>
            ) : null}
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.blockLabel}>Service Details</Text>
            <Text style={styles.infoText}>Service: {booking.service_title || "Home Service"}</Text>
            {booking.category_name ? <Text style={styles.infoText}>Category: {booking.category_name}</Text> : null}
            <Text style={styles.infoText}>Service Date: {formatDate(booking.scheduled_date, true)}</Text>
            <Text style={styles.infoText}>Professional: {partner?.full_name || "PHS Professional"}</Text>
            <Text style={styles.infoText}>Payment Method: {payment.method}</Text>
            <Text style={styles.infoText}>Payment Status: {payment.status || "Paid"}</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>Item</Text>
            <Text style={[styles.th, { flex: 0.7, textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Unit Price</Text>
            <Text style={[styles.th, { flex: 1.3, textAlign: "right" }]}>Discount</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Tax</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Total</Text>
          </View>
          {line_items.map((item, idx) => (
            <View key={idx} style={idx % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
              <View style={{ flex: 3 }}>
                <Text style={styles.cellBold}>{item.description}</Text>
                {typeof item.meta?.category === "string" ? (
                  <Text style={styles.cellMuted}>Category: {item.meta.category}</Text>
                ) : null}
                {typeof item.meta?.paid_at === "string" ? (
                  <Text style={styles.cellMuted}>Requested by Pro · Paid on {formatDate(item.meta.paid_at)}</Text>
                ) : null}
                {item.description === "CarryBuddy" && booking.meeting_location ? (
                  <Text style={styles.cellMuted}>
                    Meet: {booking.meeting_location} · Drop: {booking.destination || "Not Specified"} · Bags: {booking.expected_bags ?? 0}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.cell, { flex: 0.7, textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[styles.cell, { flex: 1.4, textAlign: "right" }]}>{CURRENCY(item.unit_price)}</Text>
              <Text style={[styles.cell, { flex: 1.3, textAlign: "right" }]}>{item.discount > 0 ? `-${CURRENCY(item.discount)}` : "—"}</Text>
              <Text style={[styles.cell, { flex: 1.2, textAlign: "right" }]}>{CURRENCY(item.tax)}</Text>
              <Text style={[styles.cellBold, { flex: 1.4, textAlign: "right" }]}>{CURRENCY(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            {summaryRows.map((row, idx) => (
              <View key={idx} style={styles.totalLine}>
                <Text>{row.label}</Text>
                <Text>{row.value}</Text>
              </View>
            ))}
            <View style={styles.totalLineStrong}>
              <Text>Grand Total</Text>
              <Text>{CURRENCY(financials.grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{seller.footer_text}</Text>
          <Text style={styles.footerSupport}>
            For support, call {seller.support_phone} or email {seller.support_email}
          </Text>
          <Text style={styles.footerTerms}>
            This is a computer-generated tax invoice and requires no physical signature. Taxes applied as per applicable Indian GST
            statutes. For refunds or disputes, contact our billing desk within 7 business days of service.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default InvoiceDocument;
