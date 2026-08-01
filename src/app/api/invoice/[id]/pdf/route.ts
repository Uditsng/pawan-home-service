import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveInvoice, InvoiceUserRole } from "@/lib/invoice/getInvoice";
import { buildInvoicePdf } from "@/lib/invoice/pdf/buildPdf";
import { invoiceFilename } from "@/lib/invoice/pdf/filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveLogoDataUri(request: NextRequest, logoUrl: string | undefined): Promise<string | null> {
  try {
    let url = logoUrl || "/PHS.png";
    if (url.startsWith("/")) {
      const proto = request.headers.get("x-forwarded-proto") || "https";
      const host = request.headers.get("host") || "phscleaningcompany.com";
      url = `${proto}://${host}${url}`;
    }
    if (!/^https?:\/\//i.test(url)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isCompleted) {
    return NextResponse.json({ error: "Invoice not available until the service is completed" }, { status: 409 });
  }
  if (!invoice.snapshot) {
    return NextResponse.json({ error: "Invoice data is not available yet. Please try again in a moment." }, { status: 503 });
  }

  const logoDataUri = await resolveLogoDataUri(request, invoice.snapshot?.seller.logo_url);
  const pdfBuffer = await buildInvoicePdf({
    snapshot: invoice.snapshot!,
    logoDataUri,
  });

  const filename = invoiceFilename(invoice.invoice_number);
  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
