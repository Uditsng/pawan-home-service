import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PartnerSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-12 flex flex-col font-body">

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col justify-center py-8 sm:py-16">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/partner/profile" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-headline font-black text-on-surface">App Settings</h1>
        </div>

        <div className="max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-xs relative overflow-hidden bg-surface-container-lowest mx-auto border border-outline-variant/15">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Standard Emerald icon container as per rule 11-B & 8-H */}
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-primary">
            <span className="material-symbols-outlined text-3xl">settings</span>
          </div>

          <span className="inline-flex items-center gap-1 bg-secondary/15 px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold text-primary mb-3 uppercase tracking-widest border border-secondary/30">
            Coming Soon
          </span>

          <h2 className="text-xl sm:text-2xl font-headline font-black tracking-tight text-on-surface mb-2">
            App Settings
          </h2>

          <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed mb-6 font-medium">
            We are building tools to help you manage app notifications, display preferences, and offline job parameters. These settings will be active in an upcoming release.
          </p>

          <div className="pt-4 border-t border-outline-variant/15 text-[11px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
            PHS Partner App v1.0.2
          </div>
        </div>
      </main>
    </div>
  );
}
