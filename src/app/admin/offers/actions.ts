"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";

export interface OfferFormState {
  type: "success" | "error" | null;
  message: string | null;
}

const VALID_OFFER_TYPES = ["FIXED_DISCOUNT", "PERCENTAGE_DISCOUNT", "SERVICE_CREDIT"];
const VALID_VALIDITY_MODELS = ["fixed_dates", "relative_days"];
const VALID_USAGE_LIMIT_TYPES = ["one_time", "multiple"];
const VALID_ELIGIBILITY = ["all", "new", "existing"];

function readOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const str = String(value).trim();
  if (str === "") return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function readNumber(value: FormDataEntryValue | null, fallback: number): number {
  const num = readOptionalNumber(value);
  return num === null ? fallback : num;
}

function parseServiceIds(formData: FormData): string[] {
  const raw = String(formData.get("service_ids_json") || "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s)).filter((s) => s.length > 0);
    }
  } catch {
    return [];
  }
  return [];
}

interface ParsedOfferInput {
  code: string;
  name: string;
  title: string;
  description: string | null;
  display_text: string | null;
  offer_type: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "SERVICE_CREDIT";
  purchase_price: number;
  benefit_value: number;
  max_discount: number | null;
  min_booking_amount: number;
  validity_model: "fixed_dates" | "relative_days";
  valid_from: string | null;
  valid_until: string | null;
  valid_days: number | null;
  usage_limit_type: "one_time" | "multiple";
  max_redemptions_per_customer: number | null;
  eligibility: "all" | "new" | "existing";
}

function parseOfferInput(formData: FormData): { input: ParsedOfferInput; serviceIds: string[] } {
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const offerType = String(formData.get("offer_type") || "");
  const purchasePrice = readNumber(formData.get("purchase_price"), 0);
  const benefitValue = readNumber(formData.get("benefit_value"), 0);
  const maxDiscount = readOptionalNumber(formData.get("max_discount"));
  const minBookingAmount = readNumber(formData.get("min_booking_amount"), 0);
  const validityModel = String(formData.get("validity_model") || "fixed_dates");
  const validFrom = formData.get("valid_from") ? new Date(String(formData.get("valid_from"))).toISOString() : null;
  const validUntil = formData.get("valid_until") ? new Date(String(formData.get("valid_until"))).toISOString() : null;
  const validDays = readOptionalNumber(formData.get("valid_days"));
  const usageLimitType = String(formData.get("usage_limit_type") || "one_time");
  const maxRedemptions = readOptionalNumber(formData.get("max_redemptions_per_customer"));
  const eligibility = String(formData.get("eligibility") || "all");
  const serviceIds = parseServiceIds(formData);

  if (!VALID_OFFER_TYPES.includes(offerType)) {
    throw new Error("Invalid offer type.");
  }
  if (!VALID_VALIDITY_MODELS.includes(validityModel)) {
    throw new Error("Invalid validity model.");
  }
  if (!VALID_USAGE_LIMIT_TYPES.includes(usageLimitType)) {
    throw new Error("Invalid usage limit type.");
  }
  if (!VALID_ELIGIBILITY.includes(eligibility)) {
    throw new Error("Invalid eligibility bucket.");
  }

  return {
    input: {
      code,
      name,
      title,
      description: (String(formData.get("description") || "")).trim() || null,
      display_text: (String(formData.get("display_text") || "")).trim() || null,
      offer_type: offerType as ParsedOfferInput["offer_type"],
      purchase_price: purchasePrice,
      benefit_value: benefitValue,
      max_discount: maxDiscount,
      min_booking_amount: minBookingAmount,
      validity_model: validityModel as ParsedOfferInput["validity_model"],
      valid_from: validFrom,
      valid_until: validUntil,
      valid_days: validDays,
      usage_limit_type: usageLimitType as ParsedOfferInput["usage_limit_type"],
      max_redemptions_per_customer: maxRedemptions,
      eligibility: eligibility as ParsedOfferInput["eligibility"],
    },
    serviceIds,
  };
}

function validateOfferInput(input: ParsedOfferInput, serviceIds: string[]): void {
  if (!input.code) throw new Error("Offer code is required.");
  if (!input.name) throw new Error("Offer name is required.");
  if (!input.title) throw new Error("Offer title is required.");

  if (!Number.isFinite(input.benefit_value) || input.benefit_value <= 0) {
    throw new Error("Benefit value must be greater than 0.");
  }
  if (input.offer_type === "PERCENTAGE_DISCOUNT" && input.benefit_value > 100) {
    throw new Error("Percentage benefit cannot exceed 100.");
  }
  if (!Number.isFinite(input.purchase_price) || input.purchase_price < 0) {
    throw new Error("Purchase price cannot be negative.");
  }
  if (!Number.isFinite(input.min_booking_amount) || input.min_booking_amount < 0) {
    throw new Error("Minimum booking amount cannot be negative.");
  }
  if (input.max_discount !== null && (!Number.isFinite(input.max_discount) || input.max_discount < 0)) {
    throw new Error("Max discount cannot be negative.");
  }

  if (input.validity_model === "fixed_dates" && (!input.valid_from || !input.valid_until)) {
    throw new Error("Fixed-date offers require both a start and end date.");
  }
  if (input.validity_model === "fixed_dates" && input.valid_from && input.valid_until) {
    if (new Date(input.valid_from) >= new Date(input.valid_until)) {
      throw new Error("End date must be after the start date.");
    }
  }
  if (input.validity_model === "relative_days" && (!input.valid_days || input.valid_days <= 0)) {
    throw new Error("Relative-day offers require a positive number of days.");
  }

  if (input.usage_limit_type === "one_time") {
    if (input.max_redemptions_per_customer !== null) {
      throw new Error("One-time offers cannot specify a per-customer redemption limit.");
    }
  } else if (!input.max_redemptions_per_customer || input.max_redemptions_per_customer <= 0) {
    throw new Error("Multiple-use offers require a positive redemption limit per customer.");
  }

  if (serviceIds.length === 0) {
    throw new Error("Select at least one eligible service for this offer.");
  }
}

async function writeEligibleServices(
  db: Awaited<ReturnType<typeof createClient>>,
  offerId: string,
  serviceIds: string[]
): Promise<void> {
  const rows = serviceIds.map((serviceId) => ({ offer_id: offerId, service_id: serviceId }));
  const { error } = await db.from("offer_eligible_services").insert(rows);
  if (error) {
    throw new Error(`Failed to save eligible services: ${error.message}`);
  }
}

export async function createOfferAction(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const user = await requireAdmin();
  const db = await createClient();

  let parsed: { input: ParsedOfferInput; serviceIds: string[] };
  try {
    parsed = parseOfferInput(formData);
    validateOfferInput(parsed.input, parsed.serviceIds);
  } catch (e) {
    return { type: "error", message: (e as Error).message };
  }

  const { data: offer, error } = await db
    .from("offers")
    .insert({
      ...parsed.input,
      status: "draft",
      created_by: user.id,
    })
    .select("id, title")
    .single();

  if (error) {
    return { type: "error", message: error.message };
  }

  try {
    await writeEligibleServices(db, offer.id, parsed.serviceIds);
  } catch (e) {
    await db.from("offers").delete().eq("id", offer.id);
    return { type: "error", message: (e as Error).message };
  }

  await logAdminAuditAction({
    action: "CREATE",
    targetEntity: "offers",
    recordId: offer.id,
    recordTitle: offer.title,
    newData: {
      code: parsed.input.code,
      offer_type: parsed.input.offer_type,
      purchase_price: parsed.input.purchase_price,
      benefit_value: parsed.input.benefit_value,
      status: "draft",
      service_ids: parsed.serviceIds,
    },
  });

  revalidatePath("/admin/offers");
  return { type: "success", message: null };
}

export async function updateOfferAction(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  await requireAdmin();
  const offerId = String(formData.get("offer_id") || "");
  if (!offerId) return { type: "error", message: "Missing offer id." };

  const db = await createClient();

  let parsed: { input: ParsedOfferInput; serviceIds: string[] };
  let existing: { id: string; title: string; status: string } | null = null;
  try {
    parsed = parseOfferInput(formData);
    validateOfferInput(parsed.input, parsed.serviceIds);
    const { data } = await db.from("offers").select("id, title, status").eq("id", offerId).single();
    existing = data ?? null;
    if (!existing) throw new Error("Offer not found.");
  } catch (e) {
    return { type: "error", message: (e as Error).message };
  }

  const { error } = await db
    .from("offers")
    .update({ ...parsed.input, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) {
    return { type: "error", message: error.message };
  }

  const { error: delErr } = await db.from("offer_eligible_services").delete().eq("offer_id", offerId);
  if (delErr) {
    return { type: "error", message: `Failed to replace eligible services: ${delErr.message}` };
  }

  try {
    await writeEligibleServices(db, offerId, parsed.serviceIds);
  } catch (e) {
    return { type: "error", message: (e as Error).message };
  }

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "offers",
    recordId: offerId,
    recordTitle: existing.title,
    oldData: { status: existing.status },
    newData: { ...parsed.input, service_ids: parsed.serviceIds },
  });

  revalidatePath("/admin/offers");
  revalidatePath(`/admin/offers/${offerId}`);
  return { type: "success", message: null };
}

export async function toggleOfferStatusAction(formData: FormData): Promise<{ error?: string }> {
  let offer: { id: string; title: string; status: string } | null = null;
  try {
    await requireAdmin();
    const offerId = String(formData.get("offer_id") || "");
    const newStatus = String(formData.get("new_status") || "");

    if (!offerId) return { error: "Missing offer id." };
    if (!["draft", "active", "paused", "expired", "archived"].includes(newStatus)) {
      return { error: "Invalid target status." };
    }

    const db = await createClient();

    const { data } = await db.from("offers").select("id, title, status").eq("id", offerId).single();
    offer = data ?? null;
    if (!offer) return { error: "Offer not found." };
    if (offer.status === newStatus) return {};

    // Activating requires a complete, valid offer.
    if (newStatus === "active") {
      const { count, error: countError } = await db
        .from("offer_eligible_services")
        .select("offer_id", { count: "exact", head: true })
        .eq("offer_id", offerId);
      if (countError) return { error: countError.message };
      if (!count || count === 0) {
        return { error: "Cannot activate an offer without eligible services." };
      }

      const { data: full } = await db.from("offers").select("*").eq("id", offerId).single();
      const offerRow = full as { validity_model?: string; valid_from?: string | null; valid_until?: string | null; valid_days?: number | null } | null;
      if (offerRow) {
        if (offerRow.validity_model === "fixed_dates" && (!offerRow.valid_from || !offerRow.valid_until)) {
          return { error: "Cannot activate — fixed-date offer is missing validity dates." };
        }
        if (offerRow.validity_model === "relative_days" && (!offerRow.valid_days || offerRow.valid_days <= 0)) {
          return { error: "Cannot activate — relative-day offer is missing validity duration." };
        }
      }
    }

    const { error } = await db
      .from("offers")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", offerId);
    if (error) return { error: error.message };

    await logAdminAuditAction({
      action: "STATUS_CHANGE",
      targetEntity: "offers",
      recordId: offerId,
      recordTitle: offer.title,
      oldData: { status: offer.status },
      newData: { status: newStatus },
    });

    revalidatePath("/admin/offers");
    revalidatePath(`/admin/offers/${offerId}`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteOfferAction(formData: FormData): Promise<{ error?: string }> {
  let offer: { id: string; title: string; status: string } | null = null;
  try {
    await requireAdmin();
    const offerId = String(formData.get("offer_id") || "");
    if (!offerId) return { error: "Missing offer id." };

    const db = await createClient();
    const { data } = await db.from("offers").select("id, title, status").eq("id", offerId).single();
    offer = data ?? null;
    if (!offer) return { error: "Offer not found." };

    // Only drafts may be permanently deleted; anything with activity must be archived.
    if (offer.status !== "draft") {
      return { error: "Only draft offers can be deleted. Archive or pause this offer instead." };
    }

    const { count: purchaseCount } = await db
      .from("offer_purchases")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offerId);
    if (purchaseCount && purchaseCount > 0) {
      return { error: "This offer already has purchases — archive it instead of deleting." };
    }

    const { error } = await db.from("offers").delete().eq("id", offerId);
    if (error) return { error: error.message };

    await logAdminAuditAction({
      action: "DELETE",
      targetEntity: "offers",
      recordId: offerId,
      recordTitle: offer.title,
      oldData: { status: offer.status },
    });

    revalidatePath("/admin/offers");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function voidOfferEntitlementAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const entitlementId = String(formData.get("entitlement_id") || "");
    if (!entitlementId) return { error: "Missing entitlement id." };

    const db = await createClient();
    const { data } = await db
      .from("offer_entitlements")
      .select("id, offer_id, status, remaining_value")
      .eq("id", entitlementId)
      .single();
    if (!data) return { error: "Entitlement not found." };
    if (data.status && data.status !== "active") {
      return { error: `Only active entitlements can be voided (current: ${data.status}).` };
    }

    const { error } = await db
      .from("offer_entitlements")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", entitlementId);
    if (error) return { error: error.message };

    await logAdminAuditAction({
      action: "STATUS_CHANGE",
      targetEntity: "offers",
      recordId: entitlementId,
      recordTitle: `Offer entitlement voided (offer ${data.offer_id})`,
      oldData: { status: "active" },
      newData: { status: "cancelled", reason: "Admin void", remaining_value: data.remaining_value },
    });

    revalidatePath(`/admin/offers/${data.offer_id}`);
    revalidatePath("/admin/offers");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}