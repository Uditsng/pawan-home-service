"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";
import { logAdminAuditAction } from "@/utils/auditLogger";
import {
  revalidateCategories,
  revalidateServices,
  revalidateSubcategories,
} from "@/utils/supabase/cacheInvalidators";

export interface AdminCategoryFormState {
  type: "success" | "error" | null;
  message: string | null;
}

function parseJsonArray(formData: FormData, key: string): string[] {
  const raw = String(formData.get(key) || "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter((s) => s.length > 0);
    }
  } catch {
    return [];
  }
  return [];
}

function readImageUrl(formData: FormData): string | null {
  const value = String(formData.get("image_url") || "").trim();
  return value === "" ? null : value;
}

function invalidateCategoryPages(): void {
  revalidateCategories();
  revalidatePath("/", "page");
  revalidatePath("/services", "page");
  revalidatePath("/services/[category]", "page");
  revalidatePath("/customer", "page");
  revalidatePath("/customer/services/[category]", "page");
  revalidatePath("/admin/categories", "page");
  revalidatePath("/admin/services", "page");
}

function invalidateSubcategoryPages(): void {
  revalidateSubcategories();
  revalidateServices();
  revalidatePath("/", "page");
  revalidatePath("/services", "page");
  revalidatePath("/services/[category]", "page");
  revalidatePath("/customer", "page");
  revalidatePath("/customer/services/[category]", "page");
  revalidatePath("/admin/categories", "page");
  revalidatePath("/admin/services", "page");
}

export async function createCategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { type: "error", message: "Category name is required." };
  const imageUrl = readImageUrl(formData);
  const db = await createClient();
  const { data, error } = await db
    .from("categories")
    .insert({ category_name: name, image_url: imageUrl })
    .select("id, category_name")
    .single();
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "CREATE",
    targetEntity: "categories",
    recordId: data.id,
    recordTitle: data.category_name,
    newData: { category_name: data.category_name, image_url: imageUrl },
  });

  invalidateCategoryPages();
  return { type: "success", message: null };
}

export async function updateCategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const categoryId = String(formData.get("category_id") || "");
  if (!categoryId) return { type: "error", message: "Missing category id." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { type: "error", message: "Category name is required." };
  const imageUrl = readImageUrl(formData);
  const db = await createClient();

  const { data: existing } = await db
    .from("categories")
    .select("id, category_name, image_url")
    .eq("id", categoryId)
    .single();
  if (!existing) return { type: "error", message: "Category not found." };

  const patch = { category_name: name, image_url: imageUrl };
  const { error } = await db.from("categories").update(patch).eq("id", categoryId);
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "categories",
    recordId: categoryId,
    recordTitle: name,
    oldData: { category_name: existing.category_name, image_url: existing.image_url },
    newData: patch,
  });

  invalidateCategoryPages();
  return { type: "success", message: null };
}

export async function deleteCategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const categoryId = String(formData.get("category_id") || "");
  if (!categoryId) return { type: "error", message: "Missing category id." };
  const db = await createClient();

  const { count, error: countError } = await db
    .from("subcategories")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (countError) return { type: "error", message: countError.message };
  if (count && count > 0) {
    return {
      type: "error",
      message: `Cannot delete: this category still has ${count} sub-categor${count === 1 ? "y" : "ies"}. Delete or move them first.`,
    };
  }

  const { data: existing } = await db
    .from("categories")
    .select("id, category_name")
    .eq("id", categoryId)
    .single();
  if (!existing) return { type: "error", message: "Category not found." };

  const { error } = await db.from("categories").delete().eq("id", categoryId);
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "DELETE",
    targetEntity: "categories",
    recordId: categoryId,
    recordTitle: existing.category_name,
  });

  invalidateCategoryPages();
  return { type: "success", message: null };
}

export async function createSubcategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const categoryId = String(formData.get("category_id") || "");
  if (!categoryId) return { type: "error", message: "Missing category id." };
  const names = parseJsonArray(formData, "names_json");
  if (names.length === 0) return { type: "error", message: "Type at least one sub-category name." };
  const icon = String(formData.get("icon_name") || "sparkles").trim() || "sparkles";
  const imageUrl = readImageUrl(formData);
  const db = await createClient();

  const { data: category } = await db
    .from("categories")
    .select("category_name")
    .eq("id", categoryId)
    .single();
  if (!category) return { type: "error", message: "Category not found." };

  const rows = names.map((name) => ({
    category_id: categoryId,
    subcategory_name: name,
    icon_name: icon,
    image_url: imageUrl,
  }));
  const { data: created, error } = await db.from("subcategories").insert(rows).select("id, subcategory_name");
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "CREATE",
    targetEntity: "subcategories",
    recordTitle: category.category_name,
    newData: {
      category_id: categoryId,
      created: created?.map((r) => ({ id: r.id, name: r.subcategory_name })),
      icon_name: icon,
      shared_image_url: imageUrl,
    },
  });

  invalidateSubcategoryPages();
  return { type: "success", message: null };
}

export async function updateSubcategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const subId = String(formData.get("subcategory_id") || "");
  if (!subId) return { type: "error", message: "Missing sub-category id." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { type: "error", message: "Sub-category name is required." };
  const icon = String(formData.get("icon_name") || "").trim();
  if (!icon) return { type: "error", message: "Icon is required." };
  const categoryId = String(formData.get("category_id") || "");
  const db = await createClient();

  const { data: existing } = await db
    .from("subcategories")
    .select("id, subcategory_name, icon_name, category_id, image_url")
    .eq("id", subId)
    .single();
  if (!existing) return { type: "error", message: "Sub-category not found." };

  const patch: {
    subcategory_name: string;
    icon_name: string;
    image_url: string | null;
    category_id?: string;
  } = { subcategory_name: name, icon_name: icon, image_url: readImageUrl(formData) };
  if (categoryId && categoryId !== existing.category_id) patch.category_id = categoryId;

  const { error } = await db.from("subcategories").update(patch).eq("id", subId);
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "subcategories",
    recordId: subId,
    recordTitle: name,
    oldData: {
      subcategory_name: existing.subcategory_name,
      icon_name: existing.icon_name,
      category_id: existing.category_id,
      image_url: existing.image_url,
    },
    newData: patch,
  });

  invalidateSubcategoryPages();
  return { type: "success", message: null };
}

export async function deleteSubcategoryAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const subId = String(formData.get("subcategory_id") || "");
  if (!subId) return { type: "error", message: "Missing sub-category id." };
  const db = await createClient();

  const { count, error: countError } = await db
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("subcategory_id", subId);
  if (countError) return { type: "error", message: countError.message };
  if (count && count > 0) {
    return {
      type: "error",
      message: `Cannot delete: this sub-category has ${count} service${count === 1 ? "" : "s"}. Reassign or delete them first.`,
    };
  }

  const { data: existing } = await db
    .from("subcategories")
    .select("id, subcategory_name")
    .eq("id", subId)
    .single();
  if (!existing) return { type: "error", message: "Sub-category not found." };

  const { error } = await db.from("subcategories").delete().eq("id", subId);
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "DELETE",
    targetEntity: "subcategories",
    recordId: subId,
    recordTitle: existing.subcategory_name,
  });

  invalidateSubcategoryPages();
  return { type: "success", message: null };
}

export async function assignServicesAction(
  _prev: AdminCategoryFormState,
  formData: FormData
): Promise<AdminCategoryFormState> {
  await requireAdmin();
  const categoryId = String(formData.get("category_id") || "");
  const targetSubId = String(formData.get("subcategory_id") || "");
  const serviceIds = parseJsonArray(formData, "service_ids_json");
  if (!categoryId || !targetSubId) return { type: "error", message: "Missing target sub-category." };
  if (serviceIds.length === 0) return { type: "error", message: "No services selected." };
  const db = await createClient();

  const { data: targetSub } = await db
    .from("subcategories")
    .select("id, category_id, subcategory_name")
    .eq("id", targetSubId)
    .single();
  if (!targetSub || targetSub.category_id !== categoryId) {
    return { type: "error", message: "Target sub-category not found under this category." };
  }

  const { data: existingServices, error: fetchError } = await db
    .from("services")
    .select("id, title, subcategory_id")
    .in("id", serviceIds);
  if (fetchError) return { type: "error", message: fetchError.message };
  if (!existingServices || existingServices.length === 0) {
    return { type: "error", message: "No matching services found." };
  }

  const moved = existingServices.map((s) => ({ id: s.id, title: s.title, from: s.subcategory_id ?? null }));
  const { error } = await db
    .from("services")
    .update({ subcategory_id: targetSubId })
    .in("id", existingServices.map((s) => s.id));
  if (error) return { type: "error", message: error.message };

  await logAdminAuditAction({
    action: "UPDATE",
    targetEntity: "services",
    recordTitle: targetSub.subcategory_name,
    newData: {
      to_subcategory_id: targetSubId,
      moved: moved.map((m) => ({ id: m.id, title: m.title, from_subcategory_id: m.from })),
    },
  });

  revalidateServices(targetSubId);
  for (const m of moved) {
    if (m.from && m.from !== targetSubId) {
      revalidateTag(`services-sub-${m.from}`, "default");
    }
  }
  revalidatePath("/admin/categories", "page");
  revalidatePath("/admin/services", "page");
  revalidatePath("/customer", "page");
  return { type: "success", message: null };
}