import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AddressListClient from "./AddressListClient";
import type { UserAddress } from "@/lib/types/address";

export default async function SavedAddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: addresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="bg-surface text-on-background min-h-screen pb-24 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 pb-6 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <a
            href="/profile"
            className="p-1.5 rounded-xl hover:bg-on-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">
              arrow_back
            </span>
          </a>
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-wide">
            Saved Addresses
          </h1>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 relative z-10">
        <AddressListClient addresses={(addresses as UserAddress[]) || []} />
      </main>

      <BottomNav />
    </div>
  );
}
