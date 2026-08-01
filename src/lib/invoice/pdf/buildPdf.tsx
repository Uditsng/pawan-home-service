import { renderToBuffer } from "@react-pdf/renderer";
import InvoiceDocument from "./InvoiceDocument";
import type { InvoiceSnapshot } from "../invoiceTypes";

export interface BuildInvoicePdfOptions {
  snapshot: InvoiceSnapshot;
  /** Optional base64 data URI of the company logo. Omit to render without a logo image. */
  logoDataUri?: string | null;
}

/**
 * Renders the official invoice to a PDF buffer on the server.
 * Uses Helvetica (react-pdf built-in) so output is deterministic everywhere.
 */
export async function buildInvoicePdf({ snapshot, logoDataUri }: BuildInvoicePdfOptions): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument snapshot={snapshot} logoDataUri={logoDataUri} />);
}
