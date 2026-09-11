"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

interface SaveAddressPayload {
  id?: string;
  label: string;
  house_flat: string;
  building_society: string;
  area_colony: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  is_default?: boolean;
}

type AddressRow = {
  id: string;
  label: string;
  formatted_address: string;
  address_line_1: string;
  address_line_2: string | null;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  is_default: boolean;
};

export async function saveAddress(payload: SaveAddressPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // If this is set as default, unset all other defaults first
  if (payload.is_default) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  // Check if user has no addresses yet — make first one default
  const { count } = await supabase
    .from("user_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const isFirst = (count ?? 0) === 0;

  const formattedAddress = [
    payload.house_flat.trim(),
    payload.building_society.trim(),
    payload.area_colony.trim(),
    payload.landmark?.trim() ? `Near ${payload.landmark.trim()}` : null,
    payload.city.trim(),
    payload.state.trim(),
    payload.pincode.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const lat = payload.latitude && Number(payload.latitude) !== 0 ? payload.latitude : null;
  const lng = payload.longitude && Number(payload.longitude) !== 0 ? payload.longitude : null;

  let queryResult: PostgrestSingleResponse<AddressRow>;

  if (payload.id) {
    // Preserve the current default state unless explicitly changed
    const { data: existing } = await supabase
      .from("user_addresses")
      .select("is_default")
      .eq("id", payload.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isDefault = payload.is_default ?? existing?.is_default ?? false;

    queryResult = await supabase
      .from("user_addresses")
      .update({
        label: payload.label,
        formatted_address: formattedAddress,
        address_line_1: payload.house_flat,
        address_line_2: payload.building_society,
        area: payload.area_colony,
        landmark: payload.landmark || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        latitude: lat,
        longitude: lng,
        place_id: payload.place_id?.trim() || "structured",
        is_default: isDefault,
      })
      .eq("id", payload.id)
      .eq("user_id", user.id)
      .select()
      .single();
  } else {
    queryResult = await supabase
      .from("user_addresses")
      .insert({
        user_id: user.id,
        label: payload.label,
        formatted_address: formattedAddress,
        address_line_1: payload.house_flat,
        address_line_2: payload.building_society,
        area: payload.area_colony,
        landmark: payload.landmark || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        latitude: lat,
        longitude: lng,
        place_id: payload.place_id?.trim() || "structured",
        is_default: payload.is_default || isFirst,
      })
      .select()
      .single();
  }

  const { data, error } = queryResult;

  if (error) {
    console.error("Address creation error:", error.message);
    return { error: "Failed to save address. Please try again." };
  }

  revalidatePath("/customer/profile/addresses");
  revalidatePath("/customer/dashboard");
  revalidatePath("/", "layout");

  return { data };
}

export async function deleteAddress(addressId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if this was the default address
  const { data: address } = await supabase
    .from("user_addresses")
    .select("is_default")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Address deletion error:", error.message);
    return { error: "Failed to delete address. Please try again." };
  }

  // If deleted address was default, set the most recent one as default
  if (address?.is_default) {
    const { data: remaining } = await supabase
      .from("user_addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (remaining && remaining.length > 0) {
      await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", remaining[0].id);
    }
  }

  revalidatePath("/customer/profile/addresses");
  revalidatePath("/customer/dashboard");
  revalidatePath("/", "layout");

  return { success: true };
}

export async function setDefaultAddress(addressId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Unset all defaults
  await supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // Set the new default
  const { error } = await supabase
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Address update error:", error.message);
    return { error: "Failed to update address. Please try again." };
  }

  revalidatePath("/customer/profile/addresses");
  revalidatePath("/customer/dashboard");
  revalidatePath("/", "layout");

  return { success: true };
}
