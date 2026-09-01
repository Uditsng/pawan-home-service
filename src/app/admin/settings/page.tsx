import { createClient } from "@/utils/supabase/server";
import { SettingsConsole } from "./SettingsConsole";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";
import { fetchDemandAnalyticsAction } from "./actions";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  let isSchemaError = false;

  const { error } = await supabase.from('platform_settings').select('key').limit(1);
  if (error && error.code === '42P01') {
    isSchemaError = true;
  }

  const [settings, demandAnalytics] = await Promise.all([
    fetchPlatformSettings(supabase),
    fetchDemandAnalyticsAction().catch(() => ({ topPincodes: [], recentRequests: [], totalRequests: 0 })),
  ]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Settings & Service Areas</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Manage live service zones, pincodes, platform rules, and customer demand interest.</p>
      </div>

      {/* Database Schema Warning Banner */}
      {isSchemaError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-700">warning</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
              <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                The <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">platform_settings</code> table is missing. 
                Please apply the migration files or run the SQL in your Supabase dashboard editor to enable persistence. Falls back to simulated defaults.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto bg-amber-500/20 text-amber-800 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl border border-amber-500/25 text-center">
            Schema Pending
          </div>
        </div>
      )}

      {/* Settings console interface */}
      <SettingsConsole
        initialPlatformCommission={String(settings.platformCommission)}
        initialTaxRate={String(settings.taxRate)}
        initialGstEnabled={settings.gstEnabled}
        initialReferralEnabled={settings.referralEnabled}
        initialCancellationWindowMinutes={settings.freeCancellationWindowMinutes}
        initialPenaltyRate={String(settings.partnerPenaltyRate)}
        initialServiceAreas={settings.serviceAreas}
        initialServiceablePincodes={settings.serviceablePincodes}
        initialReferralRewardReferrer={String(settings.referralRewardReferrer)}
        initialReferralRewardReferred={String(settings.referralRewardReferred)}
        demandAnalytics={demandAnalytics}
      />
    </div>
  );
}
