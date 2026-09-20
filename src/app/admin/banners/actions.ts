"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";
import { revalidateBanners } from "@/utils/supabase/cacheInvalidators";

export interface BannerFormState {
  type: "success" | "error" | null;
  message: string | null;
}

interface ParsedBannerInput {
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

function readNumber(value: FormDataEntryValue | null, fallback: number): number {
  const str = String(value ?? "").trim();
  if (str === "") return fallback;
  const num = Number(str);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Validates the custom link target. Accepts an empty value (banner is not
 * clickable), an internal route (`/...`) or an external `http(s)://` URL.
 * Blocks unsafe schemes like `javascript:` / `data:`.
 */
function sanitizeLinkUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  throw new Error("Link URL must be an internal path (e.g. /customer/services) or a valid http(s) URL.");
}

function parseBannerInput(formData: FormData): ParsedBannerInput {
  const title = String(formData.get("title") || "").trim();
  const imageUrl = String(formData.get("image_url") || "").trim();
  const linkUrl = sanitizeLinkUrl(String(formData.get("link_url") || ""));
  const isActive = formData.get("is_active") === "on" || formData.get("is_active") === "true";
  const sortOrder = readNumber(formData.get("sort_order"), 0);

  if (!title) throw new Error("Banner title is required.");
  if (!imageUrl) throw new Error("Banner image is required — upload a carousel image above.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sort order must be a non-negative whole number.");
  }

  return { title, image_url: imageUrl, link_url: linkUrl, is_active: isActive, sort_order: sortOrder };
}

async function revalidateBannerRoutes(): Promise<void> {
  revalidatePath("/admin/banners");
  revalidatePath("/customer/dashboard");
  revalidateBanners();
}

export async function createBannerAction(_prev: BannerFormState, formData: FormData): Promise<BannerFormState> {
  const user = await requireAdmin();
  const db = await createClient();

  let input: ParsedBannerInput;
  try {
    input = parseBannerInput(formData);
  } catch (e) {
    return { type: "error", message: (e as Error).message };
  }

  const { data: banner, error } = await db
    .from("home_banners")
    .insert({ ...input, created_by: user.id })
    .select("id, title")
    .single();

  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "CREATE",
    targetEntity: "home_banners",
    recordId: banner.id,
    recordTitle: banner.title,
    newData: { ...input },
  });

  await revalidateBannerRoutes();
  return { type: "success", message: null };
}

export async function updateBannerAction(_prev: BannerFormState, formData: FormData): Promise<BannerFormState> {
  await requireAdmin();
  const bannerId = String(formData.get("banner_id") || "");
  if (!bannerId) return { type: "error", message: "Missing banner id." };

  const db = await createClient();

  let input: ParsedBannerInput;
  let existing: { id: string; title: string; is_active: boolean; sort_order: number } | null = null;
  try {
    input = parseBannerInput(formData);
    const { data } = await db
      .from("home_banners")
      .select("id, title, is_active, sort_order")
      .eq("id", bannerId)
      .single();
    existing = data ?? null;
    if (!existing) throw new Error("Banner not found.");
  } catch (e) {
    return { type: "error", message: (e as Error).message };
  }

  const { error } = await db
    .from("home_banners")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", bannerId);

  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "home_banners",
    recordId: bannerId,
    recordTitle: existing.title,
    oldData: { is_active: existing.is_active, sort_order: existing.sort_order },
    newData: { ...input },
  });

  await revalidateBannerRoutes();
  return { type: "success", message: null };
}

export async function toggleBannerActiveAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const bannerId = String(formData.get("banner_id") || "");
    const newActive = String(formData.get("new_active") || "") === "true";
    if (!bannerId) return { error: "Missing banner id." };

    const db = await createClient();
    const { data } = await db
      .from("home_banners")
      .select("id, title, is_active")
      .eq("id", bannerId)
      .single();
    if (!data) return { error: "Banner not found." };
    if (data.is_active === newActive) return {};

    const { error } = await db
      .from("home_banners")
      .update({ is_active: newActive, updated_at: new Date().toISOString() })
      .eq("id", bannerId);
    if (error) return { error: error.message };

    await logAdminAuditAction({
      action: "STATUS_CHANGE",
      targetEntity: "home_banners",
      recordId: bannerId,
      recordTitle: data.title,
      oldData: { is_active: data.is_active },
      newData: { is_active: newActive },
    });

    await revalidateBannerRoutes();
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteBannerAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const bannerId = String(formData.get("banner_id") || "");
    if (!bannerId) return { error: "Missing banner id." };

    const db = await createClient();
    const { data } = await db
      .from("home_banners")
      .select("id, title")
      .eq("id", bannerId)
      .single();
    if (!data) return { error: "Banner not found." };

    const { error } = await db.from("home_banners").delete().eq("id", bannerId);
    if (error) return { error: error.message };

    await logAdminAuditAction({
      action: "DELETE",
      targetEntity: "home_banners",
      recordId: bannerId,
      recordTitle: data.title,
      oldData: null,
    });

    await revalidateBannerRoutes();
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Moves a banner up/down in the carousel by swapping `sort_order` with its
 * neighbor. Uses the client-scoped DB so RLS (admin) applies; the swap is
 * idempotent and never duplicates positions.
 */
export async function reorderBannerAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const bannerId = String(formData.get("banner_id") || "");
    const direction = String(formData.get("direction") || "");
    if (!bannerId || (direction !== "up" && direction !== "down")) {
      return { error: "Invalid reorder request." };
    }

    const db = await createClient();
    const { data: rows } = await db
      .from("home_banners")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const ordered = (rows || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = ordered.findIndex((r) => r.id === bannerId);
    if (index < 0) return { error: "Banner not found." };

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return { error: "Already at the first/last position." };

    const current = ordered[index];
    const neighbor = ordered[targetIndex];

    // Swap using two targeted updates so identical sort_orders can never collide.
    const { error: swap1 } = await db
      .from("home_banners")
      .update({ sort_order: neighbor.sort_order, updated_at: new Date().toISOString() })
      .eq("id", current.id);
    if (swap1) return { error: swap1.message };

    const { error: swap2 } = await db
      .from("home_banners")
      .update({ sort_order: current.sort_order, updated_at: new Date().toISOString() })
      .eq("id", neighbor.id);
    if (swap2) return { error: swap2.message };

    await logAdminAuditAction({
      action: "UPDATE",
      targetEntity: "home_banners",
      recordId: current.id,
      recordTitle: current.title,
      oldData: { sort_order: current.sort_order },
      newData: { sort_order: neighbor.sort_order, direction },
    });

    await revalidateBannerRoutes();
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}