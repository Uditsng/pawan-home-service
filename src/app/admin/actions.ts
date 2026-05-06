"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Update Partner Role/Status (Approval/Blocking)
 */
export async function updatePartnerStatus(partnerId: string, status: 'active' | 'suspended' | 'blocked') {
  const supabase = await createClient();

  // In a real app, we might have a specific 'status' column in profiles or a 'partners' table.
  // For now, we'll use metadata or just assume they are active if role is partner.
  // If we had a verification system, we'd update that here.
  
  // Example: update a hypothetical 'verification_status' column
  const { error } = await supabase
    .from('profiles')
    .update({ 
       // Assume there's a field for this or metadata
       role: status === 'blocked' ? 'customer' : 'partner' 
    })
    .eq('id', partnerId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/partners');
}

/**
 * Update Booking Status (Operational Override)
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
}

/**
 * Assign Partner to Booking
 */
export async function assignPartnerToBooking(bookingId: string, partnerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookings')
    .update({ 
      partner_id: partnerId,
      status: 'confirmed' // Auto-confirm when assigned by admin
    })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/bookings');
}

/**
 * Delete Service (Clean Catalog)
 */
export async function deleteService(serviceId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/services');
}
