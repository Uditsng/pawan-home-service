"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

/**
 * Update Customer Account Status
 */
export async function updateCustomerStatusAction(
  customerId: string, 
  status: 'active' | 'suspended' | 'flagged'
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', customerId);

  if (error) {
    console.error("Error updating customer status:", error);
    throw new Error(error.message);
  }

  revalidatePath('/admin/customers');
  return { success: true };
}

/**
 * Save CRM Internal Note and Risk Trigger Reason
 */
export async function saveCustomerNoteAction(
  customerId: string, 
  noteText: string, 
  riskTrigger?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    internal_note: noteText
  };

  if (riskTrigger !== undefined) {
    updateData.risk_trigger = riskTrigger;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', customerId);

  if (error) {
    console.error("Error saving CRM note in Supabase:", error);
    
    // Explicitly help the admin if the schema columns are missing
    if (error.message.includes("column") || error.code === '42703') {
      throw new Error(
        "DATABASE_SCHEMA_ERROR: The database columns 'internal_note' or 'risk_trigger' do not exist in the 'profiles' table. " +
        "Please run this SQL in your Supabase Dashboard SQL Editor first:\n\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_note TEXT;\n" +
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_trigger TEXT;"
      );
    }
    
    throw new Error(error.message);
  }

  revalidatePath('/admin/customers');
  return { success: true };
}
