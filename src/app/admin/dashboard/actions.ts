"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Export Financial CSV — Generates a CSV data URI of the current month's
 * completed bookings with commission splits.
 */
export async function exportFinancialCSV(): Promise<{ csv: string; filename: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      total_amount,
      status,
      created_at,
      city,
      service:service_id (title, category),
      customer:customer_id (full_name),
      partner:partner_id (full_name)
    `)
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false });

  const rows = (bookings || []).map((b: Record<string, unknown>) => {
    const svc = b.service as Record<string, unknown> | null;
    const cust = b.customer as Record<string, unknown> | null;
    const part = b.partner as Record<string, unknown> | null;
    const gross = Number(b.total_amount || 0);

    return [
      b.created_at,
      `BK-${String(b.id || "").slice(0, 8).toUpperCase()}`,
      svc?.title || "N/A",
      svc?.category || "N/A",
      cust?.full_name || "N/A",
      part?.full_name || "Unassigned",
      gross,
      (gross * 0.2).toFixed(2),
      (gross * 0.8).toFixed(2),
      b.city || "N/A",
      b.status,
    ].join(",");
  });

  const header = "Timestamp,Booking ID,Service,Category,Customer,Partner,Gross Amount,Platform Commission,Partner Share,City,Status";
  const csv = [header, ...rows].join("\n");

  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const filename = `PHSCompany_Financial_${monthName.replace(/\s/g, "_")}.csv`;

  return { csv, filename };
}
