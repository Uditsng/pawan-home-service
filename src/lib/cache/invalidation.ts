import { storageService } from "@/lib/storage/StorageService";

const CACHE_PREFIX = "phs_cache_";

/**
 * Removes the app's localStorage cache entries for the given refresh keys so the
 * next mount re-fetches fresh data (notifications, wallet, bookings, offers, ...).
 */
export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  await Promise.all(
    keys.map(async (key) => {
      try {
        await storageService.remove(`${CACHE_PREFIX}${key}`);
      } catch (err) {
        console.error(`[cache-invalidation] Failed to invalidate key "${key}":`, err);
      }
    })
  );
}