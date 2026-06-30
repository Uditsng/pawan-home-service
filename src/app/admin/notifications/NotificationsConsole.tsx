"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getAdminNotifications,
  duplicateAdminNotification,
  archiveAdminNotification,
  restoreAdminNotification,
  softDeleteAdminNotification,
  sendNotificationCampaignAction,
  bulkArchiveNotifications,
  bulkDeleteNotifications,
  bulkRestoreNotifications
} from "./actions";

interface Stats {
  total: number;
  draft: number;
  scheduled: number;
  completed: number;
  failed: number;
  archived: number;
}

interface AdminNotificationCampaign {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  category: string;
  priority: string;
  audience_type: string;
  audience_filters?: Record<string, unknown> | null;
  deep_link: string | null;
  status: string;
  scheduled_at: string | null;
  expires_at: string | null;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string | null;
  } | null;
}

interface NotificationsConsoleProps {
  initialStats: Stats;
  initialNotifications: AdminNotificationCampaign[];
  initialTotalCount: number;
}

export function NotificationsConsole({
  initialStats,
  initialNotifications,
  initialTotalCount,
}: NotificationsConsoleProps) {
  const router = useRouter();

  // Search & Filters State
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [audience, setAudience] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Data States
  const [notifications, setNotifications] = useState<AdminNotificationCampaign[]>(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"archive" | "delete" | "restore" | null>(null);

  // Load and refresh notifications from server
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminNotifications({
        search,
        category,
        priority,
        status,
        audience,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });

      if (!result.isSchemaError) {
        setNotifications(result.notifications);
        setTotalCount(result.totalCount);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [search, category, priority, status, audience, sortBy, sortOrder, page]);

  // Trigger reload on filter changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Bulk select toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Perform bulk action
  const handleBulkAction = async () => {
    if (selectedIds.length === 0 || !bulkActionType) return;
    setLoading(true);
    try {
      if (bulkActionType === "archive") {
        await bulkArchiveNotifications(selectedIds);
      } else if (bulkActionType === "delete") {
        await bulkDeleteNotifications(selectedIds);
      } else if (bulkActionType === "restore") {
        await bulkRestoreNotifications(selectedIds);
      }
      setSelectedIds([]);
      setIsBulkConfirmOpen(false);
      // Reload page data
      router.refresh();
      loadNotifications();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Duplicate handler
  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const cloned = await duplicateAdminNotification(id);
      if (cloned) {
        loadNotifications();
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to duplicate:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Soft Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft-delete this notification campaign? It can be restored later.")) return;
    setActionLoadingId(id);
    try {
      await softDeleteAdminNotification(id);
      loadNotifications();
      router.refresh();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Archive / Restore handlers
  const handleArchive = async (id: string) => {
    setActionLoadingId(id);
    try {
      await archiveAdminNotification(id);
      loadNotifications();
      router.refresh();
    } catch (err) {
      console.error("Failed to archive:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoadingId(id);
    try {
      await restoreAdminNotification(id);
      loadNotifications();
      router.refresh();
    } catch (err) {
      console.error("Failed to restore:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend Completed campaign
  const handleResend = async (id: string) => {
    if (!confirm("This will broadcast the notification campaign again immediately to the targeted audience. Proceed?")) return;
    setActionLoadingId(id);
    try {
      await sendNotificationCampaignAction(id);
      loadNotifications();
      router.refresh();
    } catch (err) {
      alert(`Dispatch error: ${(err as Error).message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Title",
      "Message",
      "Category",
      "Priority",
      "Audience Type",
      "Status",
      "Scheduled At",
      "Created At",
      "Recipient Count",
      "Success Count",
      "Failure Count"
    ];

    const rows = notifications.map(n => [
      n.id,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.message.replace(/"/g, '""')}"`,
      n.category,
      n.priority,
      n.audience_type,
      n.status,
      n.scheduled_at ? format(new Date(n.scheduled_at), "yyyy-MM-dd HH:mm:ss") : "",
      format(new Date(n.created_at), "yyyy-MM-dd HH:mm:ss"),
      n.recipient_count,
      n.success_count,
      n.failure_count
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phs_notifications_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status mapping colors
  const statusColors: Record<string, "surface" | "warning" | "primary" | "success" | "danger"> = {
    draft: "surface",
    scheduled: "warning",
    sending: "primary",
    completed: "success",
    failed: "danger",
    cancelled: "danger",
    archived: "surface"
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* ─── STATISTICS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Total Campaigns</p>
          <h2 className="text-xl font-bold font-headline text-primary mt-2">{stats.total}</h2>
        </Card>
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Drafts</p>
          <h2 className="text-xl font-bold font-headline text-primary mt-2">{stats.draft}</h2>
        </Card>
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Scheduled</p>
          <h2 className="text-xl font-bold font-headline text-amber-700 mt-2">{stats.scheduled}</h2>
        </Card>
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Sent</p>
          <h2 className="text-xl font-bold font-headline text-emerald-700 mt-2">{stats.completed}</h2>
        </Card>
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Failed</p>
          <h2 className="text-xl font-bold font-headline text-red-600 mt-2">{stats.failed}</h2>
        </Card>
        <Card variant="solid" className="p-4 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Archived</p>
          <h2 className="text-xl font-bold font-headline text-on-surface-variant mt-2">{stats.archived}</h2>
        </Card>
      </div>

      {/* ─── FILTERS & SEARCH CONSOLE ─── */}
      <Card variant="solid" className="p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/50 text-base">search</span>
            <input
              type="text"
              placeholder="Search by title or body..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
            <Link href="/admin/notifications/templates">
              <Button variant="ghost" size="sm" className="text-xs">
                <span className="material-symbols-outlined text-[16px] mr-1.5">auto_stories</span>
                Templates
              </Button>
            </Link>
            <Link href="/admin/notifications/create">
              <Button variant="primary" size="sm" className="text-xs text-white">
                <span className="material-symbols-outlined text-[16px] mr-1.5">add</span>
                Create Notification
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Selection Panel */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full p-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
            >
              <option value="">All Categories</option>
              <option value="promotional">Promotional</option>
              <option value="offers">Offers</option>
              <option value="discounts">Discounts</option>
              <option value="festival">Festival</option>
              <option value="reminder">Reminder</option>
              <option value="booking_update">Booking Update</option>
              <option value="payment">Payment</option>
              <option value="announcement">Announcement</option>
              <option value="emergency">Emergency</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full p-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="w-full p-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
            >
              <option value="">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => { setAudience(e.target.value); setPage(1); }}
              className="w-full p-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
            >
              <option value="">All Audiences</option>
              <option value="all">All Users</option>
              <option value="customers">Customers Only</option>
              <option value="partners">Professionals Only</option>
              <option value="admins">Admin Only</option>
              <option value="selected">Selected Users</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Sort By</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="grow p-2 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="created_at">Date Created</option>
                <option value="scheduled_at">Date Scheduled</option>
                <option value="recipient_count">Recipient Count</option>
                <option value="title">Title</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="p-2 border border-outline-variant/20 bg-surface rounded-xl text-primary hover:border-secondary transition-all"
                title={sortOrder === "asc" ? "Sort Ascending" : "Sort Descending"}
              >
                <span className="material-symbols-outlined text-base leading-none">
                  {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Clear Row */}
        {(search || category || status || priority || audience) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearch("");
                setCategory("");
                setStatus("");
                setPriority("");
                setAudience("");
                setPage(1);
              }}
              className="text-[10px] font-black text-secondary hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">filter_alt_off</span>
              Clear All Filters
            </button>
          </div>
        )}
      </Card>

      {/* ─── BULK ACTIONS PANEL ─── */}
      {selectedIds.length > 0 && (
        <Card variant="solid" className="p-4 border-l-4 border-l-secondary bg-surface-container-low flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">check_box</span>
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} campaign{selectedIds.length > 1 ? "s" : ""} selected for bulk action
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setBulkActionType("archive");
                setIsBulkConfirmOpen(true);
              }}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:bg-red-500/5"
              onClick={() => {
                setBulkActionType("delete");
                setIsBulkConfirmOpen(true);
              }}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setBulkActionType("restore");
                setIsBulkConfirmOpen(true);
              }}
            >
              Restore to Draft
            </Button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 border border-outline-variant/30 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-all"
            >
              Export
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </Card>
      )}

      {/* ─── DATA TABLE ─── */}
      <Card variant="solid" className="overflow-hidden p-0 shadow-sm border border-outline-variant/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={notifications.length > 0 && selectedIds.length === notifications.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary border-outline-variant"
                  />
                </th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Campaign</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Audience</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Priority</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Status</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Timestamps</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Delivery Stats</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-on-surface-variant/60 font-bold">Refreshing notification list...</span>
                    </div>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">campaign</span>
                      </div>
                      <p className="text-sm font-bold text-primary mb-1">No campaigns found</p>
                      <p className="text-xs text-on-surface-variant/60 leading-normal">
                        No notification broadcasts match your current selection filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => {
                  const isPendingActions = actionLoadingId === notif.id;
                  const isCompleted = notif.status === "completed";
                  const isDraft = notif.status === "draft";
                  const isScheduled = notif.status === "scheduled";
                  const isArchived = notif.status === "archived";

                  return (
                    <tr
                      key={notif.id}
                      className={`hover:bg-surface-container-low/30 transition-all ${
                        selectedIds.includes(notif.id) ? "bg-secondary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notif.id)}
                          onChange={(e) => handleSelectOne(notif.id, e.target.checked)}
                          className="w-4 h-4 rounded text-secondary focus:ring-secondary border-outline-variant"
                        />
                      </td>

                      {/* Title & Category */}
                      <td className="p-4 max-w-[280px]">
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/notifications/${notif.id}`}
                            className="font-bold text-xs text-primary hover:text-secondary hover:underline transition-all line-clamp-1"
                          >
                            {notif.title}
                          </Link>
                          <p className="text-[11px] text-on-surface-variant/75 line-clamp-2 mt-0.5 leading-relaxed font-semibold">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/10">
                              {notif.category}
                            </span>
                            {notif.creator?.full_name && (
                              <span className="text-[9px] font-medium text-on-surface-variant/40 uppercase">
                                by {notif.creator.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Audience */}
                      <td className="p-4">
                        <Badge variant="surface" className="text-[9px]">
                          {notif.audience_type === "all" ? "All Users" :
                           notif.audience_type === "customers" ? "Customers" :
                           notif.audience_type === "partners" ? "Professionals" :
                           notif.audience_type === "admins" ? "Admins Only" : "Selected Users"}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="p-4 text-center">
                        <Badge
                          variant={notif.priority === "high" ? "danger" : "primary"}
                          className="text-[9px]"
                        >
                          {notif.priority}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <Badge
                          variant={statusColors[notif.status] || "primary"}
                          className="text-[9px]"
                        >
                          {notif.status}
                        </Badge>
                      </td>

                      {/* Timestamps */}
                      <td className="p-4 text-xs font-semibold text-on-surface-variant">
                        <div className="space-y-1">
                          <div>
                            <span className="text-[9px] text-on-surface-variant/40 block leading-none uppercase">Created</span>
                            {format(new Date(notif.created_at), "dd MMM yy · hh:mm a")}
                          </div>
                          {notif.scheduled_at && (
                            <div>
                              <span className="text-[9px] text-amber-700/50 block leading-none uppercase">Scheduled</span>
                              {format(new Date(notif.scheduled_at), "dd MMM yy · hh:mm a")}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Delivery stats */}
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-black text-primary font-headline">
                            {notif.recipient_count || 0} <span className="text-[10px] text-on-surface-variant/50 font-bold">sent</span>
                          </p>
                          {(notif.success_count > 0 || notif.failure_count > 0) && (
                            <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold">
                              <span className="text-secondary">{notif.success_count} success</span>
                              <span className="w-0.5 h-2 bg-outline-variant/30" />
                              <span className="text-red-500">{notif.failure_count} fail</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        {isPendingActions ? (
                          <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/admin/notifications/${notif.id}`}>
                              <button
                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                                title="Inspect Details"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>
                            </Link>

                            {(isDraft || isScheduled) && (
                              <Link href={`/admin/notifications/${notif.id}/edit`}>
                                <button
                                  className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                                  title="Edit Campaign"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                              </Link>
                            )}

                            <button
                              onClick={() => handleDuplicate(notif.id)}
                              className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-lg transition-all"
                              title="Duplicate Campaign"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>

                            {isCompleted && (
                              <button
                                onClick={() => handleResend(notif.id)}
                                className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                                title="Resend Broadcast"
                              >
                                <span className="material-symbols-outlined text-[16px]">replay</span>
                              </button>
                            )}

                            {isArchived ? (
                              <button
                                onClick={() => handleRestore(notif.id)}
                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                                title="Restore Draft"
                              >
                                <span className="material-symbols-outlined text-[16px]">settings_backup_restore</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(notif.id)}
                                className="p-1.5 text-on-surface-variant hover:text-amber-700 hover:bg-surface-container rounded-lg transition-all"
                                title="Archive Campaign"
                              >
                                <span className="material-symbols-outlined text-[16px]">archive</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(notif.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-lg transition-all"
                              title="Delete Campaign"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
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

        {/* ─── PAGINATION BAR ─── */}
        {totalPages > 1 && (
          <div className="px-5 py-4 bg-surface-dim/20 border-t border-outline-variant/10 flex justify-between items-center">
            <span className="text-xs text-on-surface-variant font-semibold">
              Showing page {page} of {totalPages} ({totalCount} campaigns)
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── BULK CONFIRMATION MODAL ─── */}
      {isBulkConfirmOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center z-100 p-4">
          <Card variant="solid" className="w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-primary font-headline">
                Confirm Bulk Action
              </h3>
              <p className="text-xs text-on-surface-variant/80 mt-1 leading-normal">
                You are about to bulk-{bulkActionType} {selectedIds.length} campaigns. Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => setIsBulkConfirmOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="text-xs text-white"
                onClick={handleBulkAction}
                disabled={loading}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
