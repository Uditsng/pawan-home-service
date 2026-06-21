"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Update Partner Role/Status (Approval/Blocking)
 */
export async function updatePartnerStatus(partnerId: string, status: 'active' | 'suspended' | 'blocked') {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', partnerId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/partners');
}

/**
 * Update Booking Status (Operational Override)
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) {
    if (error.code === '23503') {
      // Foreign key violation: this service is tied to existing bookings.
      // We will perform a soft delete by marking it inactive instead.
      const { error: updateError } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', serviceId);
      
      if (updateError) throw new Error(updateError.message);
      
      throw new Error("SERVICE_DEACTIVATED: This service has existing bookings and cannot be hard-deleted. It has been deactivated instead.");
    }
    throw new Error(error.message);
  }

  revalidatePath('/admin/services');
}

/**
 * Helper action to verify/create the services bucket in Supabase storage.
 */
export async function ensureServicesBucketAction() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const exists = buckets.some(b => b.id === "services");
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket("services", {
      public: true,
      fileSizeLimit: 1048576, // 1MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"]
    });

    if (createError) {
      throw new Error(`Failed to create services storage bucket: ${createError.message}`);
    }
  }

  return { success: true };
}

