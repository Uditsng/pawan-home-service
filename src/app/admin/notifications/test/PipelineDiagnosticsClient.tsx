"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  refreshDiagnosticsAction,
  simulatePipelineAction,
} from "./actions";
import type {
  PipelineDiagnostics,
  SimulationResult,
} from "./diagnostics";

function LedgerStatusBadge({ status }: { status: string }) {
  let variant: "primary" | "surface" | "success" | "warning" | "danger" = "surface";
  if (status === "queued" || status === "in_flight" || status === "retryable") variant = "warning";
  else if (status === "firebase_accepted") variant = "primary";
  else if (status === "delivered" || status === "opened" || status === "read") variant = "success";
  else if (status === "failed_permanent" || status === "failed_unregistered" || status === "expired") variant = "danger";
  return <Badge variant={variant}>{status}</Badge>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">
      {children}
    </h3>
  );
}

function isLoaded(d: PipelineDiagnostics | null | undefined): d is PipelineDiagnostics {
  return !!d;
}

export function PipelineDiagnosticsClient({
  initial,
  loadError,
}: {
  initial: PipelineDiagnostics | null;
  loadError: string | null;
}) {
  const [diag, setDiag] = useState<PipelineDiagnostics | null>(initial);
  const [error, setError] = useState<string | null>(loadError);
  const [busy, setBusy] = useState<"refresh" | "simulate" | null>(null);
  const [sim, setSim] = useState<SimulationResult | null>(null);

  async function refresh() {
    setBusy("refresh");
    setError(null);
    try {
      setDiag(await refreshDiagnosticsAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function runSimulation() {
    setBusy("simulate");
    setError(null);
    setSim(null);
    try {
      const result = await simulatePipelineAction();
      setSim(result);
      // Refresh the ledger snapshot so the new journey rows show up.
      setDiag(await refreshDiagnosticsAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const missingColumns = isLoaded(diag)
    ? diag.columns.filter((c) => !c.present)
    : [];
  const missingRpcs = isLoaded(diag) ? diag.rpcs.filter((r) => !r.present) : [];
  const allHealthy = isLoaded(diag) && missingColumns.length === 0 && missingRpcs.length === 0;

  return (
    <div className="space-y-4">
      {error && (
        <Card variant="outline" className="border-red-500/30 !rounded-xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
            <div>
              <p className="text-sm font-bold text-red-600">Diagnostics error</p>
              <p className="text-xs text-on-surface-variant mt-1 font-mono break-all">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Overall health + actions */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                allHealthy ? "bg-secondary/10" : missingColumns.length > 0 || missingRpcs.length > 0 ? "bg-red-500/10" : "bg-amber-500/10"
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  allHealthy ? "text-secondary" : missingColumns.length > 0 || missingRpcs.length > 0 ? "text-red-600" : "text-amber-600"
                }`}
              >
                {allHealthy ? "verified" : "report"}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary font-headline">
                {isLoaded(diag)
                  ? allHealthy
                    ? "Pipeline schema is healthy"
                    : `${missingColumns.length} column${missingColumns.length === 1 ? "" : "s"} or RPC probe${missingColumns.length + missingRpcs.length === 1 ? "" : "s"} failed`
                  : "Waiting for diagnostics…"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {isLoaded(diag)
                  ? `FCM configured: ${diag.fcmConfigured ? "yes" : "no — rows will be recorded as degraded"} · Reclaimed stale rows this pass: ${diag.reclaimCount}`
                  : "Run a manual refresh if this stays blank."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={refresh} disabled={busy !== null}>
              {busy === "refresh" ? "Refreshing…" : "Refresh"}
            </Button>
            <Button size="sm" onClick={runSimulation} disabled={busy !== null}>
              {busy === "simulate" ? "Simulating…" : "Run E2E Simulation"}
            </Button>
          </div>
        </div>
      </Card>

      {!isLoaded(diag) && !error && (
        <Card>
          <p className="text-sm text-on-surface-variant">
            Loading diagnostics… if this persists, check the server console for errors.
          </p>
        </Card>
      )}

      {isLoaded(diag) && (
        <>
          {/* Schema probes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Schema Columns (delivery ledger)</SectionTitle>
              <div className="grid grid-cols-1 gap-1.5">
                {diag.columns.map((c) => (
                  <div
                    key={`${c.table}.${c.column}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-container/60"
                  >
                    <span className="text-xs font-mono text-on-surface-variant">
                      {c.table}.{c.column}
                    </span>
                    <Badge variant={c.present ? "success" : "danger"}>
                      {c.present ? "present" : "missing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <SectionTitle>Claim / Reclaim RPCs</SectionTitle>
                <div className="grid grid-cols-1 gap-1.5">
                  {diag.rpcs.map((r) => (
                    <div
                      key={r.name}
                      className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-container/60"
                    >
                      <span className="text-xs font-mono text-on-surface-variant">{r.name}</span>
                      <Badge variant={r.present ? "success" : "danger"}>
                        {r.present ? "present" : "missing"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Realtime Publication (manual check)</SectionTitle>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-2">
                  These tables must be members of the <span className="font-mono">supabase_realtime</span> publication for live bell / job-offer refreshes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {diag.advertised.tables.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 text-[10px] font-mono rounded-full bg-surface-container text-on-surface-variant"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Ledger status counts */}
          <Card>
            <SectionTitle>Delivery Ledger — Status Counts</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(diag.ledger?.counts || {})).map(([status, count]) => (
                <Badge key={status} variant={statusBadgeVariant(status)}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Token registry + recent ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Device Token Registry</SectionTitle>
              {diag.tokens ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Metric label="Total" value={diag.tokens.total} />
                    <Metric label="Active" value={diag.tokens.active} />
                    <Metric label="Inactive" value={diag.tokens.inactive} />
                  </div>
                  <Table>
                    <TableHead>
                      <tr>
                        {["Platform", "Status", "Token", "App"].map((h) => (
                          <TableTh key={h}>{h}</TableTh>
                        ))}
                      </tr>
                    </TableHead>
                    <TableBody>
                      {diag.tokens.recent.map((t) => (
                        <tr key={t.id}>
                          <TableCell>{t.platform || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={t.is_active ? "success" : "surface"}>
                              {t.is_active ? "active" : "inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell mono>{t.masked_token || "—"}</TableCell>
                          <TableCell mono>{t.app_version || "—"}</TableCell>
                        </tr>
                      ))}
                      {diag.tokens.recent.length === 0 && (
                        <tr>
                          <TableCell colSpan={4}>No registered tokens yet.</TableCell>
                        </tr>
                      )}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant">Token table unavailable (schema probe failed).</p>
              )}
            </Card>

            <Card>
              <SectionTitle>Recent Delivery Ledger Rows</SectionTitle>
              <Table>
                <TableHead>
                  <tr>
                    {["Status", "Platform", "Retries", "Token", "User"].map((h) => (
                      <TableTh key={h}>{h}</TableTh>
                    ))}
                  </tr>
                </TableHead>
                <TableBody>
                  {(diag.ledger?.recent || []).map((r) => (
                    <tr key={r.id}>
                      <TableCell>
                        <LedgerStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{r.platform || "—"}</TableCell>
                      <TableCell mono>{r.retry_count}</TableCell>
                      <TableCell mono>{r.masked_token || "—"}</TableCell>
                      <TableCell mono>{r.user_id.slice(0, 8)}…</TableCell>
                    </tr>
                  ))}
                  {(!diag.ledger || diag.ledger.recent.length === 0) && (
                    <tr>
                      <TableCell colSpan={5}>No delivery rows yet — run the E2E simulation.</TableCell>
                    </tr>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Simulation result */}
          {sim && (
            <Card>
              <SectionTitle>E2E Simulation Result</SectionTitle>
              {sim.ok ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                    <span className="font-mono">notification_id: {sim.notificationId}</span>
                    <Badge variant="primary">{sim.notificationType}</Badge>
                    <span className="text-on-surface-variant">in-app delivery_status:</span>
                    <Badge variant={sim.deliveryStatus === "created" ? "surface" : "primary"}>
                      {sim.deliveryStatus}
                    </Badge>
                  </div>
                  {(sim.ledgerRows || []).map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 bg-surface-container/60"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <LedgerStatusBadge status={row.status} />
                        <span className="text-xs font-mono text-on-surface-variant">{row.platform || "no platform"}</span>
                        <span className="text-xs font-mono text-on-surface-variant">retries: {row.retry_count}</span>
                      </div>
                      <span className="text-xs font-mono">{row.masked_token || "no token"}</span>
                    </div>
                  ))}
                  {sim.note && <p className="text-xs text-on-surface-variant leading-relaxed">{sim.note}</p>}
                </div>
              ) : (
                <p className="text-xs text-red-600 font-bold">{sim.error}</p>
              )}
            </Card>
          )}

          {/* Advertised channel map */}
          <Card>
            <SectionTitle>Canonical Channels (src/lib/notifications/types.ts)</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {diag.advertised.channelMap.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 text-[10px] font-mono rounded-full bg-surface-container text-on-surface-variant"
                >
                  {c}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function statusBadgeVariant(status: string): "primary" | "surface" | "success" | "warning" | "danger" {
  if (status === "queued" || status === "in_flight" || status === "retryable") return "warning";
  if (status === "firebase_accepted") return "primary";
  if (status === "delivered" || status === "opened" || status === "read") return "success";
  if (status === "failed_permanent" || status === "failed_unregistered" || status === "expired") return "danger";
  return "surface";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface-container/60 px-4 py-3 text-center">
      <p className="text-2xl font-black text-primary font-headline">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">{label}</p>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full text-left text-xs">{children}</table>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface-container/80">
      <tr>{children}</tr>
    </thead>
  );
}

function TableTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-[10px] uppercase tracking-widest text-on-surface-variant font-black px-3 py-2">
      {children}
    </th>
  );
}

function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-outline-variant/20">{children}</tbody>;
}

function TableCell({
  children,
  mono,
  colSpan,
}: {
  children: React.ReactNode;
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-3 py-2 text-on-surface-variant ${mono ? "font-mono" : ""}`}>
      {children}
    </td>
  );
}