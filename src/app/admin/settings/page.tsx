import { createClient } from "@/utils/supabase/server";
import { SettingsConsole } from "./SettingsConsole";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  let isSchemaError = false;

  // 1. Fetch bookings count to display seeding status
  const { count: dbBookingsCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true });

  // 2. Fetch platform_settings
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*');

  if (error) {
    if (error.code === '42P01') {
      isSchemaError = true;
    } else {
      console.error("Settings query error:", error);
    }
  }

  // Parse fields or fall back to defaults
  const settingsMap = (data || []).reduce((acc: any, row) => {
    try {
      acc[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch {
      acc[row.key] = row.value;
    }
    return acc;
  }, {});

  const taxRate = settingsMap['tax_rate'] || "18%";
  const cancellationWindow = settingsMap['free_cancellation_window'] || "2 Hours";
  const penaltyRate = settingsMap['partner_penalty_rate'] || "10%";
  const serviceAreas = settingsMap['service_areas'] || ['Roorkee', 'Chandigarh', 'Dehradun', 'Haridwar'];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">Settings</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Manage platform rules, default rates, and serviceable areas.</p>
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
        initialTaxRate={taxRate}
        initialCancellationWindow={cancellationWindow}
        initialPenaltyRate={penaltyRate}
        initialServiceAreas={serviceAreas}
        dbBookingsCount={dbBookingsCount || 0}
      />
    </div>
  );
}
