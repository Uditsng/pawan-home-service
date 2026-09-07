"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { createAdminClient } from "@/utils/supabase/admin";
import { logAdminAuditAction } from "@/utils/auditLogger";

/**
 * Update Partner Role/Status (Approval/Blocking)
 */
export async function updatePartnerStatus(partnerId: string, status: 'active' | 'suspended' | 'blocked') {
  await requireAdmin();
  const supabase = await createClient();

  const { data: oldPartner } = await supabase.from('profiles').select('full_name, email, status').eq('id', partnerId).single();

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', partnerId);

  if (error) throw new Error(error.message);

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "partners",
    recordId: partnerId,
    recordTitle: oldPartner?.full_name || oldPartner?.email || "Partner Profile",
    oldData: { status: oldPartner?.status },
    newData: { status },
  });

  revalidatePath('/admin/partners');
}

/**
 * Update Booking Status (Operational Override)
 */
export async function updateBookingStatus(bookingId: string, status: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: oldBooking } = await supabase.from('bookings').select('status, booking_reference').eq('id', bookingId).single();

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "bookings",
    recordId: bookingId,
    recordTitle: `Booking #${oldBooking?.booking_reference || bookingId.slice(0, 8)}`,
    oldData: { status: oldBooking?.status },
    newData: { status },
  });

  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
}

/**
 * Assign Partner to Booking
 */
export async function assignPartnerToBooking(bookingId: string, partnerId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: oldBooking } = await supabase.from('bookings').select('partner_id, status, booking_reference').eq('id', bookingId).single();

  const { error } = await supabase
    .from('bookings')
    .update({ 
      partner_id: partnerId,
      status: 'confirmed' // Auto-confirm when assigned by admin
    })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "bookings",
    recordId: bookingId,
    recordTitle: `Booking #${oldBooking?.booking_reference || bookingId.slice(0, 8)}`,
    oldData: { partner_id: oldBooking?.partner_id, status: oldBooking?.status },
    newData: { partner_id: partnerId, status: 'confirmed' },
  });

  revalidatePath('/admin/bookings');
}

/**
 * Delete Service (Clean Catalog)
 */
export async function deleteService(serviceId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: oldService } = await supabase.from('services').select('title, category, base_price').eq('id', serviceId).single();

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
      
      await logAdminAuditAction({
        action: "STATUS_CHANGE",
        targetEntity: "services",
        recordId: serviceId,
        recordTitle: oldService?.title || "Service Catalog Item",
        oldData: { is_active: true },
        newData: { is_active: false, reason: "Deactivated due to active booking constraints" },
      });

      throw new Error("SERVICE_DEACTIVATED: This service has existing bookings and cannot be hard-deleted. It has been deactivated instead.");
    }
    throw new Error(error.message);
  }

  await logAdminAuditAction({
    action: "DELETE",
    targetEntity: "services",
    recordId: serviceId,
    recordTitle: oldService?.title || "Service Catalog Item",
    oldData: oldService || undefined,
  });

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

/**
 * Duplicate Service (Clone Catalog Item and all relations)
 */
export async function duplicateService(serviceId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch original service details
  const { data: service, error: fetchErr } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (fetchErr || !service) {
    throw new Error("Service not found: " + (fetchErr?.message || ""));
  }

  // 2. Generate unique title and slug
  const timestamp = Date.now().toString().slice(-4);
  const newTitle = `${service.title} (Copy ${timestamp})`;
  const newSlug = `${service.slug}-copy-${timestamp}`;

  // 3. Create duplicate service row
  const { data: newService, error: insertErr } = await supabase
    .from("services")
    .insert({
      category: service.category,
      subcategory_id: service.subcategory_id,
      title: newTitle,
      slug: newSlug,
      description: service.description,
      long_description: service.long_description,
      banner_url: service.banner_url,
      base_price: service.base_price,
      original_price: service.original_price,
      price_breakdown: service.price_breakdown,
      is_active: true, // Start as draft but active so it can be published
      status: 'draft',  // Cloned services default to draft
      is_featured: service.is_featured,
      priority: service.priority,
      estimated_duration: service.estimated_duration,
      gst_applicable: service.gst_applicable,
      tags: service.tags,
      keywords: service.keywords,
      preparation_instructions: service.preparation_instructions,
      warranty: service.warranty,
      revisit_policy: service.revisit_policy,
      cancellation_policy: service.cancellation_policy,
      pricing_model: service.pricing_model,
      pricing_config: service.pricing_config,
      form_fields: service.form_fields,
      scheduling_config: service.scheduling_config,
      availability_config: service.availability_config,
      policy_config: service.policy_config,
      requirements_config: service.requirements_config,
      page_content: service.page_content,
      image_url: service.image_url,
    })
    .select("id")
    .single();

  if (insertErr || !newService) {
    throw new Error("Failed to insert duplicated service: " + (insertErr?.message || ""));
  }

  // 4. Duplicate linked service duration pricing (if any)
  const { data: durationRates } = await supabase
    .from("service_duration_pricing")
    .select("*")
    .eq("service_id", serviceId);

  if (durationRates && durationRates.length > 0) {
    const rateRows = durationRates.map((r) => ({
      service_id: newService.id,
      duration_minutes: r.duration_minutes,
      price: r.price,
    }));
    await supabase.from("service_duration_pricing").insert(rateRows);
  }

  // 5. Duplicate service variants (if any)
  const { data: variants } = await supabase
    .from("service_variants")
    .select("*")
    .eq("service_id", serviceId);

  if (variants && variants.length > 0) {
    const variantRows = variants.map((v) => ({
      service_id: newService.id,
      title: v.title,
      description: v.description,
      price: v.price,
      original_price: v.original_price,
      duration_minutes: v.duration_minutes,
      image_url: v.image_url,
      is_active: v.is_active,
    }));
    await supabase.from("service_variants").insert(variantRows);
  }

  // 6. Duplicate service addons (if any)
  const { data: addons } = await supabase
    .from("service_addons")
    .select("*")
    .eq("service_id", serviceId);

  if (addons && addons.length > 0) {
    const addonRows = addons.map((a) => ({
      service_id: newService.id,
      title: a.title,
      description: a.description,
      price: a.price,
      image_url: a.image_url,
      is_required: a.is_required,
      max_quantity: a.max_quantity,
      is_active: a.is_active,
    }));
    await supabase.from("service_addons").insert(addonRows);
  }

  // 7. Duplicate service pricing rules (if any)
  const { data: rules } = await supabase
    .from("service_pricing_rules")
    .select("*")
    .eq("service_id", serviceId);

  if (rules && rules.length > 0) {
    const ruleRows = rules.map((r) => ({
      service_id: newService.id,
      name: r.name,
      rule_type: r.rule_type,
      amount_type: r.amount_type,
      amount_value: r.amount_value,
      conditions: r.conditions,
      is_active: r.is_active,
    }));
    await supabase.from("service_pricing_rules").insert(ruleRows);
  }

  await logAdminAuditAction({
    action: "CREATE",
    targetEntity: "services",
    recordId: newService.id,
    recordTitle: newTitle,
    newData: { cloned_from_id: serviceId, title: newTitle },
  });

  revalidatePath("/admin/services");
}

/**
 * Toggle Service Status (Publish / Draft)
 */
export async function toggleServiceStatus(serviceId: string, currentStatus: 'draft' | 'published' | 'upcoming') {
  await requireAdmin();
  const supabase = await createClient();

  // Upcoming services must go through the Edit form (poster + go-live flow).
  if (currentStatus === 'upcoming') {
    throw new Error("Upcoming services cannot be toggled. Use the Edit page status selector.");
  }

  const { data: oldService } = await supabase.from('services').select('title, status').eq('id', serviceId).single();

  const newStatus = currentStatus === 'draft' ? 'published' : 'draft';

  const { error } = await supabase
    .from('services')
    .update({ 
      status: newStatus,
      is_active: true // Ensure it is activated when status is toggled
    })
    .eq('id', serviceId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAuditAction({
    action: "STATUS_CHANGE",
    targetEntity: "services",
    recordId: serviceId,
    recordTitle: oldService?.title || "Service",
    oldData: { status: currentStatus },
    newData: { status: newStatus },
  });

  revalidatePath('/admin/services');
  revalidatePath('/');
}

