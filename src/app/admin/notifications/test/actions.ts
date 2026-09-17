"use server";

import { requireAdmin } from "@/utils/supabase/auth-checks";
import {
  collectDiagnostics,
  simulatePipelineCycle,
} from "./diagnostics";
import type { PipelineDiagnostics } from "./diagnostics";

/**
 * Refresh the full diagnostics snapshot (column probes, RPC probes, token
 * registry, ledger overview, reclaim). Admin-gated.
 */
export async function refreshDiagnosticsAction(): Promise<PipelineDiagnostics> {
  await requireAdmin();
  return collectDiagnostics();
}

/**
 * Run an E2E pipeline simulation targeted at the calling admin.
 */
export async function simulatePipelineAction() {
  const admin = await requireAdmin();
  const result = await simulatePipelineCycle(admin.id);
  return result;
}