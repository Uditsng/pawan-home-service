import { unstable_cache } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { TAG_PLATFORM_SETTINGS } from "@/utils/supabase/cacheTags";

export interface PlatformSettings {
  platformCommission: number;    // e.g. 20 (percent)
  taxRate: number;               // e.g. 18 (percent)
  gstEnabled: boolean;           // e.g. true/false
  referralEnabled: boolean;      // e.g. true/false
  referralRewardReferrer: number;// e.g. 50 (₹)
  referralRewardReferred: number;// e.g. 50 (₹)
  freeCancellationWindow: string;// e.g. "2 Hours"
  partnerPenaltyRate: number;   // e.g. 10 (percent)
  serviceAreas: string[];
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformCommission: 20,
  taxRate: 18,
  gstEnabled: true,
  referralEnabled: true,
  referralRewardReferrer: 50,
  referralRewardReferred: 50,
  freeCancellationWindow: "2 Hours",
  partnerPenaltyRate: 10,
  serviceAreas: ["Roorkee", "Chandigarh", "Dehradun", "Haridwar"],
};

/**
 * Single source of truth for fetching platform settings from Supabase.
 * Gracefully parses numbers, booleans, strings, and arrays with safe fallbacks.
 */
export async function fetchPlatformSettings(supabase: SupabaseClient): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase.from("platform_settings").select("key, value");

    if (error || !data || data.length === 0) {
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }

    const settingsMap = data.reduce<Record<string, unknown>>((acc, row) => {
      try {
        acc[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});

    const parseNum = (val: unknown, fallback: number): number => {
      if (val === undefined || val === null) return fallback;
      const num = parseFloat(String(val).replace(/%/g, "").trim());
      return isNaN(num) ? fallback : num;
    };

    const parseBool = (val: unknown, fallback: boolean): boolean => {
      if (val === undefined || val === null) return fallback;
      if (typeof val === "boolean") return val;
      const str = String(val).toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (str === "true" || str === "1") return true;
      if (str === "false" || str === "0") return false;
      return fallback;
    };

    const parseStringArray = (val: unknown, fallback: string[]): string[] => {
      if (Array.isArray(val)) return val.map(String);
      return fallback;
    };

    return {
      platformCommission: parseNum(settingsMap["platform_commission"], DEFAULT_PLATFORM_SETTINGS.platformCommission),
      taxRate: parseNum(settingsMap["tax_rate"], DEFAULT_PLATFORM_SETTINGS.taxRate),
      gstEnabled: parseBool(settingsMap["gst_enabled"], DEFAULT_PLATFORM_SETTINGS.gstEnabled),
      referralEnabled: parseBool(settingsMap["referral_enabled"], DEFAULT_PLATFORM_SETTINGS.referralEnabled),
      referralRewardReferrer: parseNum(settingsMap["referral_reward_referrer"], DEFAULT_PLATFORM_SETTINGS.referralRewardReferrer),
      referralRewardReferred: parseNum(settingsMap["referral_reward_referred"], DEFAULT_PLATFORM_SETTINGS.referralRewardReferred),
      freeCancellationWindow: String(settingsMap["free_cancellation_window"] || DEFAULT_PLATFORM_SETTINGS.freeCancellationWindow),
      partnerPenaltyRate: parseNum(settingsMap["partner_penalty_rate"], DEFAULT_PLATFORM_SETTINGS.partnerPenaltyRate),
      serviceAreas: parseStringArray(settingsMap["service_areas"], DEFAULT_PLATFORM_SETTINGS.serviceAreas),
    };
  } catch (err) {
    console.error("fetchPlatformSettings error:", err);
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

/**
 * Cached platform settings for high-frequency read paths (cart, checkout, payment).
 * Invalidated via TAG_PLATFORM_SETTINGS whenever settings change.
 */
export const getCachedPlatformSettings = () =>
  unstable_cache(
    async () => {
      const supabase = await createClient();
      return fetchPlatformSettings(supabase);
    },
    ["platform-settings"],
    { revalidate: 300, tags: [TAG_PLATFORM_SETTINGS] }
  )();
