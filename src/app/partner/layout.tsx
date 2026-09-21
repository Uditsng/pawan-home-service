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
  let avatarUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, avatar_url")
      .eq("id", user.id)
      .single();
    if (profile?.status) {
      initialStatus = profile.status;
    }
    if (profile?.avatar_url) {
      avatarUrl = profile.avatar_url;
    }
  }

  return (
    <PartnerVisibilityWrapper
      header={<PartnerHeader initialStatus={initialStatus} avatarUrl={avatarUrl} />}
      bottomNav={<PartnerBottomNav />}
    >
      {children}
    </PartnerVisibilityWrapper>
  );
}
