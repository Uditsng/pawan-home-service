"use client";

import { useState } from "react";
import {Card} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_email: string;
  actor_name: string | null;
  action: string;
  target_entity: string;
  record_id: string | null;
  record_title: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogsViewProps {
  logs: AuditLogRow[];
}

export default function AuditLogsView({ logs }: AuditLogsViewProps) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Action match
    if (actionFilter !== "ALL" && log.action !== actionFilter) {
      return false;
    }
    // Entity match
    if (entityFilter !== "ALL" && log.target_entity !== entityFilter) {
      return false;
    }
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchActor = log.actor_email.toLowerCase().includes(q) || (log.actor_name && log.actor_name.toLowerCase().includes(q));
      const matchTitle = log.record_title && log.record_title.toLowerCase().includes(q);
      const matchEntity = log.target_entity.toLowerCase().includes(q);
      const matchRecordId = log.record_id && log.record_id.toLowerCase().includes(q);

      if (!matchActor && !matchTitle && !matchEntity && !matchRecordId) {
        return false;
      }
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">LOGIN</span>;
      case "CREATE":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">CREATE</span>;
      case "UPDATE":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">UPDATE</span>;
      case "DELETE":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">DELETE</span>;
      case "STATUS_CHANGE":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">STATUS CHANGE</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">{action}</span>;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "auth":
        return "vpn_key";
      case "services":
        return "handyman";
      case "partners":
        return "handshake";
      case "bookings":
        return "calendar_month";
      case "settings":
        return "settings";
      case "coupons":
        return "local_offer";
      default:
        return "history";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card variant="solid" className="p-5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search by Admin, Email, Title, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="STATUS_CHANGE">Status Change</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="auth">Auth & Logins</option>
              <option value="services">Services Catalog</option>
              <option value="partners">Partners</option>
              <option value="bookings">Bookings</option>
              <option value="settings">Settings</option>
              <option value="coupons">Coupons</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table Card */}
      <Card variant="solid" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Timestamp</th>
                <th className="py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Admin User</th>
                <th className="py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Action</th>
                <th className="py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Entity & Target</th>
                <th className="py-3.5 px-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">search_off</span>
                      <p className="font-semibold">No audit logs found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const dateStr = new Date(log.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-4 px-5 align-top whitespace-nowrap">
                        <p className="text-xs font-semibold text-primary">{dateStr}</p>
                        {log.ip_address && <p className="text-[10px] text-on-surface-variant mt-0.5">IP: {log.ip_address}</p>}
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(log.actor_name || log.actor_email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-primary">{log.actor_name || "Admin"}</p>
                            <p className="text-[11px] text-on-surface-variant">{log.actor_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-top whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-lg">
                            {getEntityIcon(log.target_entity)}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-primary capitalize">{log.target_entity}</p>
                            <p className="text-xs text-on-surface-variant font-medium">
                              {log.record_title || log.record_id || "System Event"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                        {(log.old_data || log.new_data) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-xs text-primary"
                          >
                            <span className="material-symbols-outlined text-sm mr-1">
                              {isExpanded ? "expand_less" : "expand_more"}
                            </span>
                            {isExpanded ? "Hide Diff" : "View Diff"}
                          </Button>
                        ) : (
                          <span className="text-xs text-on-surface-variant/60 italic">No extra payload</span>
                        )}

                        {isExpanded && (
                          <div className="mt-3 text-left p-3.5 bg-surface-container rounded-xl border border-outline-variant text-xs space-y-3 font-mono">
                            {log.old_data && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1">Previous Snapshot (Old)</p>
                                <pre className="p-2 bg-red-500/5 rounded-lg border border-red-500/10 text-red-700 overflow-x-auto text-[11px]">
                                  {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Updated Snapshot (New)</p>
                                <pre className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-emerald-700 overflow-x-auto text-[11px]">
                                  {JSON.stringify(log.new_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
