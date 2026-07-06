"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { InvoiceSeller } from "@/lib/invoice/invoiceTypes";

/**
 * Updates the dynamically managed company profile config for invoices.
 */
export async function updateInvoiceCompanyProfileAction(settings: InvoiceSeller) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key: "invoice_company_profile",
      value: settings as unknown as Record<string, unknown>, // Store JSONB directly
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save invoice settings: ${error.message}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/invoice");
  revalidatePath("/customer/bookings");
  return { success: true };
}
