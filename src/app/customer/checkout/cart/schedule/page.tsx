import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ScheduleCartClient from "./ScheduleCartClient";

export default async function CartSchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: savedAddresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  return (
    <ScheduleCartClient 
      initialAddresses={savedAddresses || []} 
    />
  );
}
