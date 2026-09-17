import { requireAdmin } from "@/utils/supabase/auth-checks";
import { collectDiagnostics } from "./diagnostics";
import { PipelineDiagnosticsClient } from "./PipelineDiagnosticsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsTestPage() {
  await requireAdmin();

  let initial = null as Awaited<ReturnType<typeof collectDiagnostics>> | null;
  let loadError: string | null = null;
  try {
    initial = await collectDiagnostics();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">
            Notification Diagnostics
          </h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Validate the delivery ledger schema, claim RPCs, token registry, and the full
            enqueue → claim → dispatch journey.
          </p>
        </div>
      </div>

      <PipelineDiagnosticsClient initial={initial} loadError={loadError} />
    </div>
  );
}