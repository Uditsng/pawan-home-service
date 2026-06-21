import "@/app/brand-theme.css";
import { createClient } from "@/utils/supabase/server";
import PartnerHeader from "@/components/PartnerHeader";
import PartnerBottomNav from "@/components/PartnerBottomNav";
import PartnerVisibilityWrapper from "./PartnerVisibilityWrapper";

export default async function PartnerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialStatus = "offline";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();
    if (profile?.status) {
      initialStatus = profile.status;
    }
  }

  return (
    <PartnerVisibilityWrapper
      header={<PartnerHeader initialStatus={initialStatus} />}
      bottomNav={<PartnerBottomNav />}
    >
      {children}
    </PartnerVisibilityWrapper>
  );
}
