import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import HeaderLocationDisplay from "./HeaderLocationDisplay";
import NotificationBell from "./NotificationBell";

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
    <header className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-lg pt-safe">
      <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/PHS.png"
              alt="PHS Company Logo"
              className="h-12 md:h-14 w-auto"
              width={40}
              height={40}
            />
          </Link>
          <HeaderLocationDisplay defaultAddress={defaultAddress} />
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <NotificationBell />
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/20 flex items-center justify-center font-bold text-primary shrink-0 relative">
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
