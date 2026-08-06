const STORAGE_OBJECT_PUBLIC = /\/storage\/v1\/object\/public\//;

/**
 * Builds a small, cropped thumbnail URL from a service image using Supabase
 * Storage image transformations (imgproxy). Only rewrites URLs that live in a
 * Supabase public bucket; local /assets and external URLs are returned as-is.
 */
export function getServiceThumbnailUrl(
  src: string | null | undefined,
  size = 144
): string | null {
  if (!src) return null;

  if (!STORAGE_OBJECT_PUBLIC.test(src)) return src;

  const base = src.replace(STORAGE_OBJECT_PUBLIC, "/storage/v1/render/image/public/");
  const separator = base.includes("?") ? "&" : "?";

  return `${base}${separator}width=${size}&height=${size}&resize=cover&quality=80`;
}
