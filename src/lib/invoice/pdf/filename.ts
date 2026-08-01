/**
 * Derives a professional, filesystem-safe PDF filename from an invoice number.
 * Example: "PHS-2026-000123" -> "PHS_Invoice_2026-000123.pdf"
 */
export function invoiceFilename(invoiceNumber: string): string {
  const cleaned = (invoiceNumber || "").replace(/[^A-Za-z0-9-]/g, "").trim();
  const base = cleaned.startsWith("PHS-") ? cleaned.slice(4) : cleaned;
  const safe = base || "Invoice";
  return `PHS_Invoice_${safe}.pdf`;
}
