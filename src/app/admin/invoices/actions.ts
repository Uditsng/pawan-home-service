"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { generateAndSaveInvoice } from "@/lib/invoice/invoiceGenerator";

/**
 * Regenerate or create an invoice for a completed booking (Admin Override)
 */
export async function regenerateInvoiceAction(bookingId: string) {
  await requireAdmin();
  const supabase = await createClient();

  try {
    await generateAndSaveInvoice(supabase, bookingId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to regenerate invoice: ${errMsg}`);
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/customer/bookings");
  return { success: true };
}
