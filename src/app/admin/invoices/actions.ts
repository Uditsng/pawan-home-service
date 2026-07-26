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

  await generateAndSaveInvoice(supabase, bookingId);

  revalidatePath("/admin/invoices");
  revalidatePath("/customer/bookings");
  return { success: true };
}
