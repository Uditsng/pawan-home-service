"use client";

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

export interface UpcomingServiceRow {
  id: string;
  title: string;
  poster_url?: string | null;
  status?: string | null;
  subcategories?: {
    subcategory_name: string;
    icon_name: string | null;
    categories?: { category_name: string } | null;
  } | null;
  waitlist?: { count: number } | null;
}

export interface WaitlistMember {
  id: string;
  service_id: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function WaitlistClient({
  services,
  members,
  totalWaitlisters,
}: {
  services: UpcomingServiceRow[];
  members: WaitlistMember[];
  totalWaitlisters: number;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return services;
    return services.filter((s) => s.title.toLowerCase().includes(term));
  }, [services, searchTerm]);

  const topService = useMemo(() => {
    let top: UpcomingServiceRow | null = null;
    let topCount = 0;
    for (const s of services) {
      const count = Number(s.waitlist?.count || 0);
      if (count > topCount) {
        topCount = count;
        top = s;
      }
    }
    return top;
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Upcoming Services</p>
          <p className="text-3xl font-black text-primary font-headline mt-2">{services.length}</p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Total Waitlisters</p>
          <p className="text-3xl font-black text-secondary font-headline mt-2">{totalWaitlisters}</p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/15 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Most Requested</p>
          <p className="text-sm font-bold text-on-surface font-headline mt-2 leading-snug">
            {topService ? topService.title : "—"}
          </p>
          {topService && (
            <p className="text-[10px] text-on-surface-variant/70 font-bold mt-1">
              {Number(topService.waitlist?.count || 0)} interested
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm p-4">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
          <input
            type="text"
            placeholder="Search upcoming services..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container rounded-lg border border-outline-variant/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-xs font-bold text-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Service</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Category</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80 text-right">Interested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-20">notifications_active</span>
                      <p className="text-xs font-bold">No upcoming services found.</p>
                      <p className="text-[10px] text-on-surface-variant/70">Create a &quot;Coming Soon&quot; service to start collecting waitlisters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => {
                  const count = Number(service.waitlist?.count || 0);
                  const isExpanded = expandedId === service.id;
                  const serviceMembers = members.filter((m) => m.service_id === service.id);
                  const iconName = service.subcategories?.icon_name || "home_repair_service";
                  const catName =
                    service.subcategories?.categories?.category_name ||
                    service.subcategories?.subcategory_name ||
                    "Uncategorized";

                  return (
                    <Fragment key={service.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : service.id)}
                        className="hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-surface-container border border-outline-variant/15 shrink-0">
                              {service.poster_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={service.poster_url} alt={service.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[#059669]">{iconName}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-primary text-xs leading-tight">{service.title}</p>
                              <p className="text-[10px] text-on-surface-variant/70 font-medium mt-0.5">{serviceMembers.length} waiting</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{catName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="primary" className="text-[8px] px-2 py-0.5">Upcoming</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Badge variant={count > 0 ? "success" : "surface"} className="text-[10px] px-2 py-0.5 font-black">
                              {count}
                            </Badge>
                            <span
                              className={`material-symbols-outlined text-on-surface-variant/60 text-base transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            >
                              expand_more
                            </span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-surface/40">
                          <td colSpan={4} className="px-4 py-4">
                            {serviceMembers.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-xs font-bold text-on-surface-variant">No waitlisters yet.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-outline-variant/20">
                                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Customer</th>
                                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Phone</th>
                                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Email</th>
                                      <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 text-right">Joined</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant/10">
                                    {serviceMembers.map((m) => {
                                      const p = m.profiles;
                                      const initial = p?.full_name ? p.full_name.charAt(0).toUpperCase() : "?";
                                      return (
                                        <tr key={m.id}>
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-outline-variant/10 shrink-0">
                                                {p?.avatar_url ? (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  <span>{initial}</span>
                                                )}
                                              </div>
                                              <span className="text-xs font-bold text-on-surface">{p?.full_name || "Unknown User"}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 text-[11px] font-bold text-on-surface-variant">{p?.phone || "—"}</td>
                                          <td className="px-3 py-2.5 text-[11px] font-semibold text-on-surface-variant">{p?.email || "—"}</td>
                                          <td className="px-3 py-2.5 text-right text-[11px] font-bold text-on-surface-variant whitespace-nowrap">
                                            {formatDate(m.created_at)} · {formatTime(m.created_at)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}