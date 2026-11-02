import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import HeaderLocationDisplay from "./HeaderLocationDisplay";
import NotificationBell from "./NotificationBell";
import CartHeaderButton from "./CartHeaderButton";

export default async function CustomerHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = { full_name: "Guest", avatar_url: "" };
  let defaultAddress: { label: string; city: string; formatted_address: string } | null = null;

  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
    if (data) profile = data;

    // Fetch user's default address
    const { data: addressData } = await supabase
      .from('user_addresses')
      .select('label, city, formatted_address')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (addressData) {
      defaultAddress = addressData;
    }
  }

  const firstName = profile.full_name ? profile.full_name.split(" ")[0] : "There";

  return (
    <header className="sticky top-0 w-full max-w-full z-50 bg-surface/90 backdrop-blur-lg pt-safe overflow-hidden">
      <div className="flex justify-between items-center w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 max-w-7xl mx-auto gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 min-w-0 flex-1">
          <Link href="/customer/dashboard" className="flex items-center shrink-0">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain shrink-0"
              width={40}
              height={40}
              priority
            />
          </Link>
          <HeaderLocationDisplay defaultAddress={defaultAddress} />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
          <CartHeaderButton />
          <NotificationBell />
          <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/20 flex items-center justify-center font-bold text-primary shrink-0 relative text-xs sm:text-sm">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={firstName} fill className="object-cover" sizes="40px" />
            ) : (
              firstName.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
