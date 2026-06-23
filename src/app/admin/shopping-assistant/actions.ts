"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/auth-checks";

const CARRYBUDDY_SERVICE_ID = "7e3a6a9b-6401-4f56-8360-7a0be7470dae";

export async function savePackageAction(payload: {
  durationMinutes: number;
  price: number;
  originalPrice: number | null;
  isActive: boolean;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_duration_pricing")
    .upsert(
      {
        service_id: CARRYBUDDY_SERVICE_ID,
        duration_minutes: payload.durationMinutes,
        price: payload.price,
        original_price: payload.originalPrice,
        is_active: payload.isActive,
      },
      {
        onConflict: "service_id,duration_minutes",
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/shopping-assistant");
  revalidatePath("/customer/services/personal-assistance-services/carrybuddy");
  return { success: true };
}

export async function togglePackageAction(durationMinutes: number, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_duration_pricing")
    .update({ is_active: isActive })
    .eq("service_id", CARRYBUDDY_SERVICE_ID)
    .eq("duration_minutes", durationMinutes);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/shopping-assistant");
  revalidatePath("/customer/services/personal-assistance-services/carrybuddy");
  return { success: true };
}

export async function deletePackageAction(durationMinutes: number) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_duration_pricing")
    .delete()
    .eq("service_id", CARRYBUDDY_SERVICE_ID)
    .eq("duration_minutes", durationMinutes);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/shopping-assistant");
  revalidatePath("/customer/services/personal-assistance-services/carrybuddy");
  return { success: true };
}
