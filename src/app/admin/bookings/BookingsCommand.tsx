"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/utils/supabase/client";
import type {
  SerializedBooking,
  AvailablePartner,
  BookingStatusCounts,
} from "./page";
import {
  updateBookingStatusAction,
  manualAssignPartnerAction,
  reassignPartnerAction,
} from "./actions";

// ─── Props Interface ─────────────────────────────────────────

interface AuditTrailLog {
  id: string;
  booking_id?: string;
  action: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

interface NotificationLog {
  id: string;
  booking_id?: string;
  title: string;
  role?: string | null;
  message?: string | null;
  body?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BookingsCommandProps {
  initialBookings: SerializedBooking[];
  serviceCategories: string[];
  cities: string[];
  availablePartners: AvailablePartner[];
}

// ─── Status config ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "warning" | "primary" | "success" | "danger" | "surface"; dotClass: string }
> = {
  pending: { label: "Pending", variant: "warning", dotClass: "bg-[#D97706] animate-pulse" },
  confirmed: { label: "Confirmed", variant: "primary", dotClass: "bg-primary animate-pulse" },
  accepted: { label: "Accepted", variant: "primary", dotClass: "bg-primary" },
  in_progress: { label: "In Progress", variant: "primary", dotClass: "bg-blue-500 animate-pulse" },
  completed: { label: "Completed", variant: "success", dotClass: "bg-secondary" },
  cancelled: { label: "Cancelled", variant: "danger", dotClass: "bg-red-500" },
};

// ─── Component ───────────────────────────────────────────────

export function BookingsCommand({
  initialBookings,
  serviceCategories,
  cities,
  availablePartners,
}: BookingsCommandProps) {
  const [bookings, setBookings] = useState<SerializedBooking[]>(initialBookings);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Portal-based dropdown state for specific row actions to prevent overflow clipping
  const [dropdownMenu, setDropdownMenu] = useState<{
    bookingId: string;
    rect: DOMRect;
    booking: SerializedBooking;
  } | null>(null);

  useEffect(() => {
    const handleClose = () => {
      setDropdownMenu(null);
    };
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose, true);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose, true);
    };
  }, []);

  // Detail Drawer
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"timeline" | "details" | "partner" | "actions">("timeline");

  // Dynamic Audit trail & notifications states
  const [auditTrail, setAuditTrail] = useState<AuditTrailLog[]>([]);
  const [notificationsLog, setNotificationsLog] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (!selectedBooking?.id || !isDetailDrawerOpen) {
      return;
    }

    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const supabase = createClient();
        
        // Fetch audit trail
        const { data: auditData } = await supabase
          .from("booking_audit_trail")
          .select("*")
          .eq("booking_id", selectedBooking.id)
          .order("timestamp", { ascending: false });

        // Fetch notifications logs
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("booking_id", selectedBooking.id)
          .order("created_at", { ascending: false });

        setAuditTrail(auditData || []);
        setNotificationsLog(notifData || []);
      } catch (err) {
        console.error("Failed to fetch booking details logs:", err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [selectedBooking?.id, isDetailDrawerOpen]);

  // Manual Assign Drawer
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [assignTargetBooking, setAssignTargetBooking] = useState<SerializedBooking | null>(null);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");

  // Confirmation Modals
  const [modalAction, setModalAction] = useState<"cancel" | "complete" | "reassign" | null>(null);
  const [modalTargetBooking, setModalTargetBooking] = useState<SerializedBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // ─── Reactive Status Counts ────────────────────────────────

  const statusCounts: BookingStatusCounts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    accepted: bookings.filter((b) => b.status === "accepted").length,
    in_progress: bookings.filter((b) => b.status === "in_progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const unassignedCount = bookings.filter(
    (b) => b.status === "pending" && !b.partner_id
  ).length;

  const currentGmv = bookings.reduce((acc, b) => acc + b.total_amount, 0);

  // ─── Filtering Logic ──────────────────────────────────────

  const filteredBookings = bookings.filter((booking) => {
    // Status filter
    if (activeStatus !== "all" && booking.status !== activeStatus) return false;

    // Search: Booking ID, customer name, partner name, phone
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const idMatch = booking.id.toLowerCase().includes(q) || `bk-${booking.id.slice(0, 8)}`.toLowerCase().includes(q);
      const custMatch = (booking.customer?.full_name || "").toLowerCase().includes(q);
      const partMatch = (booking.partner?.full_name || "").toLowerCase().includes(q);
      const phoneMatch = (booking.customer?.phone || "").includes(searchTerm) || (booking.partner?.phone || "").includes(searchTerm);
      if (!idMatch && !custMatch && !partMatch && !phoneMatch) return false;
    }

    // Category filter
    if (categoryFilter !== "All" && booking.service?.category !== categoryFilter) return false;

    // City filter
    if (cityFilter !== "All" && booking.city !== cityFilter) return false;

    // Date filter
    if (dateFilter && booking.created_at) {
      const bookingDate = format(new Date(booking.created_at), "yyyy-MM-dd");
      if (bookingDate !== dateFilter) return false;
    }

    return true;
  });

  // ─── Pagination ────────────────────────────────────────────

  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  // ─── Actions ───────────────────────────────────────────────

  const handleStatusUpdate = (bookingId: string, newStatus: string, reason?: string) => {
    setDropdownMenu(null);
    setModalAction(null);
    setModalTargetBooking(null);

    startTransition(async () => {
      try {
        await updateBookingStatusAction(bookingId, newStatus, reason);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: newStatus,
                  ...(newStatus === "cancelled"
                    ? { cancelled_at: new Date().toISOString(), cancelled_by: "SYSTEM", cancellation_reason: reason || null }
                    : {}),
                  ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
                }
              : b
          )
        );
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        setActionError(null);
        setCancelReason("");
      } catch (err: unknown) {
        setActionError((err as Error).message || "Failed to update booking status.");
      }
    });
  };

  const handleManualAssign = (bookingId: string, partnerId: string) => {
    startTransition(async () => {
      try {
        await manualAssignPartnerAction(bookingId, partnerId);
        const assignedPartner = availablePartners.find((p) => p.id === partnerId);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  partner_id: partnerId,
                  status: "confirmed",
                  accepted_at: new Date().toISOString(),
                  partner: assignedPartner
                    ? {
                        id: assignedPartner.id,
                        full_name: assignedPartner.full_name,
                        email: assignedPartner.email,
                        phone: assignedPartner.phone,
                        avatar_url: assignedPartner.avatar_url,
                        status: assignedPartner.status,
                      }
                    : b.partner,
                }
              : b
          )
        );
        setIsAssignDrawerOpen(false);
        setAssignTargetBooking(null);
        setPartnerSearchTerm("");
        setActionError(null);
      } catch (err: unknown) {
        setActionError((err as Error).message || "Failed to assign partner.");
      }
    });
  };

  const handleReassign = (bookingId: string, reason?: string) => {
    setModalAction(null);
    setModalTargetBooking(null);

    startTransition(async () => {
      try {
        const result = await reassignPartnerAction(bookingId, reason);
        if (result.newPartnerId) {
          const newPartner = availablePartners.find((p) => p.id === result.newPartnerId);
          setBookings((prev) =>
            prev.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    partner_id: result.newPartnerId,
                    status: "confirmed",
                    partner: newPartner
                      ? {
                          id: newPartner.id,
                          full_name: newPartner.full_name,
                          email: newPartner.email,
                          phone: newPartner.phone,
                          avatar_url: newPartner.avatar_url,
                          status: newPartner.status,
                        }
                      : b.partner,
                  }
                : b
            )
          );
        } else {
          setBookings((prev) =>
            prev.map((b) =>
              b.id === bookingId ? { ...b, partner_id: null, status: "pending", partner: null } : b
            )
          );
        }
        setActionError(null);
        setCancelReason("");
      } catch (err: unknown) {
        setActionError((err as Error).message || "Reassignment failed.");
      }
    });
  };

  const openDetailDrawer = (booking: SerializedBooking) => {
    setAuditTrail([]);
    setNotificationsLog([]);
    setSelectedBooking(booking);
    setActiveDrawerTab("timeline");
    setIsDetailDrawerOpen(true);
  };

  const openAssignDrawer = (booking: SerializedBooking) => {
    setAssignTargetBooking(booking);
    setPartnerSearchTerm("");
    setIsAssignDrawerOpen(true);
    setDropdownMenu(null);
  };

  const openModal = (booking: SerializedBooking, action: "cancel" | "complete" | "reassign") => {
    setModalTargetBooking(booking);
    setModalAction(action);
    setCancelReason("");
    setDropdownMenu(null);
  };

  // ─── Available partners filtered for assign drawer ─────────

  const filteredPartners = availablePartners.filter((p) => {
    if (partnerSearchTerm) {
      const q = partnerSearchTerm.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q)) ||
        p.cities.some((c) => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ─── Status pills config ──────────────────────────────────

  const statusPills: { key: string; label: string; count: number }[] = [
    { key: "all", label: "All", count: statusCounts.all },
    { key: "pending", label: "Pending", count: statusCounts.pending },
    { key: "confirmed", label: "Confirmed", count: statusCounts.confirmed },
    { key: "in_progress", label: "In Progress", count: statusCounts.in_progress },
    { key: "completed", label: "Completed", count: statusCounts.completed },
    { key: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
  ];

  // ─── RENDER ────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between gap-4 text-xs font-semibold text-red-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-lg">error</span>
            <p className="leading-relaxed">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 rounded-lg hover:bg-red-500/20 text-red-700 transition-colors shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base font-bold block">close</span>
          </button>
        </div>
      )}

      {/* ─── 1. OPERATIONAL METRIC CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-20 h-20 bg-primary/5 rounded-bl-[48px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Total Operations
          </p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-1.5">
            {statusCounts.all} Bookings
          </h2>
          <div className="flex gap-3 mt-1.5 text-xs text-on-surface-variant/80 font-normal">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              {statusCounts.completed} Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {statusCounts.confirmed + statusCounts.in_progress + statusCounts.accepted} Active
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-20 h-20 bg-secondary/5 rounded-bl-[48px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Gross Merchandise Value
          </p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-1.5">
            ₹{currentGmv.toLocaleString()}
          </h2>
          <p className="text-[11px] text-on-surface-variant/85 mt-1 font-normal">
            Accumulated across all booking operations
          </p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden group ${
          unassignedCount > 0
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-surface-container-lowest border-outline-variant/15"
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Unassigned Queue
          </p>
          <h2 className={`text-2xl font-bold font-headline mt-1.5 ${
            unassignedCount > 0 ? "text-amber-700" : "text-primary"
          }`}>
            {unassignedCount} Pending
          </h2>
          {unassignedCount > 0 ? (
            <p className="text-[11px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Requires manual assignment
            </p>
          ) : (
            <p className="text-[11px] text-secondary mt-1 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              All bookings assigned
            </p>
          )}
        </div>
      </div>

      {/* ─── 2. SEARCH, FILTERS, & STATUS PILLS ─────────────── */}
      <Card variant="glass" className="p-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 group" suppressHydrationWarning={true}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search Booking ID, Customer, Technician, Phone..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              autoComplete="off"
              name="search"
              id="admin-bookings-search"
              suppressHydrationWarning={true}
              className="w-full bg-surface-container-low text-primary text-xs font-semibold pl-9 pr-4 py-2 rounded-lg border border-outline-variant/40 focus:border-secondary/70 focus:outline-none focus:ring-1 focus:ring-secondary/10 transition-all placeholder-on-surface-variant/40"
            />
            {searchTerm && (
              <button
                onClick={() => handleFilterChange(setSearchTerm, "")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
            >
              <option value="All">🔧 All Services</option>
              {serviceCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => handleFilterChange(setCityFilter, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
            >
              <option value="All">📍 All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleFilterChange(setDateFilter, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Status Segment Pills */}
        <div className="mt-3 flex bg-surface-container p-1 rounded-xl border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handleFilterChange(setActiveStatus, pill.key)}
              className={`shrink-0 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeStatus === pill.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </Card>

      {/* ─── 3. HIGH-DENSITY DATA TABLE ──────────────────────── */}
      <Card variant="solid" className="p-0 overflow-hidden ring-1 ring-outline-variant/10 rounded-xl">

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-dim/40 border-b border-outline-variant/20 uppercase text-[9px] font-black text-on-surface-variant tracking-widest">
                <th className="py-2.5 px-4">Operational ID</th>
                <th className="py-2.5 px-4">Client / Zone</th>
                <th className="py-2.5 px-4">Service Engine</th>
                <th className="py-2.5 px-4">Deployment</th>
                <th className="py-2.5 px-4 text-center">Lifecycle State</th>
                <th className="py-2.5 px-4 text-right">Volume</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-3xl block mb-1 opacity-40">inbox</span>
                    <p className="text-xs font-semibold">No bookings match the current filters.</p>
                    <p className="text-[11px] text-on-surface-variant/40 mt-0.5">Adjust your search or status filters and try again.</p>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking) => {
                  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

                  return (
                    <tr key={booking.id} className="hover:bg-surface-container-low/30 transition-colors group">

                      {/* Col 1: Operational ID & Timestamp */}
                      <td className="py-2 px-4">
                        <p className="text-xs font-black text-primary font-mono tracking-tighter">
                          BK-{booking.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none mt-0.5">
                          {booking.created_at
                             ? format(new Date(booking.created_at), "MMM dd, yyyy · hh:mm a")
                             : "Unscheduled"}
                        </p>
                      </td>

                      {/* Col 2: Client / Zone */}
                      <td className="py-2 px-4">
                        {booking.customer ? (
                          <Link
                            href="/admin/customers"
                            className="text-xs font-extrabold text-primary uppercase tracking-tight hover:text-secondary transition-colors"
                          >
                            {booking.customer.full_name}
                          </Link>
                        ) : (
                          <p className="text-xs font-extrabold text-on-surface-variant/50 uppercase tracking-tight">
                            Guest User
                          </p>
                        )}
                        <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-0.5 leading-none mt-0.5">
                          <span className="material-symbols-outlined text-secondary text-xs">location_on</span>
                          {[booking.city, booking.pincode].filter(Boolean).join(" · ") || "Zone N/A"}
                        </p>
                        {booking.customer?.phone ? (
                          <p className="text-[9px] font-bold text-on-surface-variant/75 flex items-center gap-0.5 leading-none mt-0.5">
                            <span className="material-symbols-outlined text-secondary text-[10px]">phone</span>
                            {booking.customer.phone}
                          </p>
                        ) : (
                          <p className="text-[9px] font-normal text-on-surface-variant/40 italic leading-none mt-0.5">
                            No Phone Number
                          </p>
                        )}
                      </td>

                      {/* Col 3: Service Engine */}
                      <td className="py-2 px-4">
                        <p className="text-xs font-black text-primary uppercase tracking-tight">
                          {booking.service?.title || "Home Service"}
                        </p>
                        <p className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none mt-0.5">
                          {booking.service?.category || "General"}
                        </p>
                      </td>

                      {/* Col 4: Deployment / Partner */}
                      <td className="py-2 px-4">
                        {booking.partner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-black text-[9px] border border-primary/10 shrink-0 overflow-hidden">
                              {booking.partner.avatar_url ? (
                                <Image
                                  src={booking.partner.avatar_url}
                                  alt={booking.partner.full_name}
                                  width={28}
                                  height={28}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                booking.partner.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()
                              )}
                            </div>
                            <Link
                              href="/admin/partners"
                              className="text-xs font-extrabold text-primary uppercase tracking-tight hover:text-secondary transition-colors"
                            >
                              {booking.partner.full_name}
                            </Link>
                          </div>
                        ) : booking.status === "pending" ? (
                          <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span>
                            Unassigned
                          </span>
                        ) : (
                          <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Col 5: Lifecycle State */}
                      <td className="py-2 px-4 text-center">
                        <Badge variant={statusConf.variant} className="text-[9px] px-1.5 py-0">
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusConf.dotClass}`}></span>
                          {statusConf.label}
                        </Badge>
                      </td>

                      {/* Col 6: Volume / Financial */}
                      <td className="py-2 px-4 text-right">
                        <p className="text-sm font-bold text-primary font-headline tracking-tighter leading-none">
                          ₹{booking.total_amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none mt-0.5">
                          {booking.payment_method || "UPI"}
                        </p>
                      </td>

                      {/* Col 7: Actions */}
                      <td className="py-2 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            onClick={() => openDetailDrawer(booking)}
                            className="bg-primary hover:bg-primary/90 text-white text-[9px] uppercase tracking-widest font-black py-1.5 px-3 rounded-lg transition-all"
                          >
                            Manage
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (dropdownMenu?.bookingId === booking.id) {
                                  setDropdownMenu(null);
                                } else {
                                  setDropdownMenu({
                                    bookingId: booking.id,
                                    rect,
                                    booking
                                  });
                                }
                              }}
                              className="p-1 h-7 w-7 rounded-lg hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px] font-bold block">more_vert</span>
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="block lg:hidden divide-y divide-outline-variant/15 p-3 space-y-3">
          {paginatedBookings.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant/50 bg-white rounded-xl p-4 ring-1 ring-outline-variant/10">
              <span className="material-symbols-outlined text-3xl block mb-1 opacity-40">inbox</span>
              <p className="text-xs font-semibold">No bookings match the current filters.</p>
            </div>
          ) : (
            paginatedBookings.map((booking) => {
              const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl p-3.5 ring-1 ring-outline-variant/10 shadow-sm space-y-3 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-primary font-mono tracking-tighter">
                        BK-{booking.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-0.5">
                        {booking.created_at ? format(new Date(booking.created_at), "MMM dd, yyyy") : "N/A"}
                      </p>
                    </div>
                    <Badge variant={statusConf.variant} className="text-[9px] px-1.5 py-0">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusConf.dotClass}`}></span>
                      {statusConf.label}
                    </Badge>
                  </div>

                  {/* Service & Customer */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-primary uppercase tracking-tight">
                      {booking.service?.title || "Home Service"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/70 font-semibold">
                      Client: {booking.customer?.full_name || "Guest"} · {booking.customer?.phone || "No Phone"} · {booking.city || "N/A"}
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 bg-surface-dim/40 rounded-xl p-2 border border-outline-variant/10">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Amount</p>
                      <p className="text-primary font-black text-xs mt-0.5">₹{booking.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Payment</p>
                      <p className="text-primary font-black text-xs mt-0.5">{booking.payment_method || "UPI"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Technician</p>
                      <p className="text-primary font-black text-[9px] mt-0.5 truncate">
                        {booking.partner?.full_name || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-outline-variant/10">
                    {!booking.partner_id && booking.status === "pending" && (
                      <button
                        onClick={() => openAssignDrawer(booking)}
                        className="p-1.5 bg-surface-container rounded-lg text-on-surface-variant hover:bg-secondary/15 hover:text-primary transition-colors"
                        title="Assign Technician"
                      >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                      </button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => openDetailDrawer(booking)}
                      className="bg-primary hover:bg-primary/90 text-white text-[9px] uppercase tracking-widest font-black py-1 px-2.5 rounded-lg transition-all"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── PAGINATION FOOTER ─────────────────────────────── */}
        <div className="bg-surface-dim/30 border-t border-outline-variant/15 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-on-surface-variant/60">
            Showing <span className="text-primary">{Math.min(totalItems, startIndex + 1)}</span> to{" "}
            <span className="text-primary">{Math.min(totalItems, startIndex + itemsPerPage)}</span> of{" "}
            <span className="text-primary">{totalItems}</span> bookings
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-surface-container-low text-primary text-xs font-bold px-2 py-1 rounded-lg border border-outline-variant/40 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="slate"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 h-9 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (currentPage <= 3) {
                  pageNum = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = currentPage - 2 + idx;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                      currentPage === pageNum
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <Button
                variant="slate"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 h-9 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 4. BOOKING DETAIL DRAWER ────────────────────────── */}
      {isDetailDrawerOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="absolute inset-0" onClick={() => setIsDetailDrawerOpen(false)} />

          <div className="relative w-full max-w-lg bg-surface-container-lowest h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-outline-variant/20 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 bg-primary text-white flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Operational ID
                </p>
                <h4 className="text-lg font-bold font-mono tracking-tighter mt-1">
                  BK-{selectedBooking.id.slice(0, 8).toUpperCase()}
                </h4>
                <p className="text-xs opacity-80 font-normal mt-1">
                  {selectedBooking.service?.title || "Home Service"} · ₹{selectedBooking.total_amount.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={STATUS_CONFIG[selectedBooking.status]?.variant || "primary"}
                  className="bg-white/10 border-white/20 text-white"
                >
                  {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                </Badge>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-outline-variant/10 bg-surface-container-low/50 px-4">
              {(["timeline", "details", "partner", "actions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDrawerTab(tab)}
                  className={`grow py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    activeDrawerTab === tab
                      ? "border-secondary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Timeline Tab */}
              {activeDrawerTab === "timeline" && (
                <div className="space-y-6">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Booking Lifecycle Timeline</h5>
                  <div className="relative border-l-2 border-outline-variant/30 pl-6 ml-3 space-y-6">
                    {selectedBooking.completed_at && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-secondary border-2 border-white"></span>
                        <p className="text-xs font-bold text-primary">Service Completed</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                          {format(new Date(selectedBooking.completed_at), "PPP · p")}
                        </p>
                      </div>
                    )}
                    {selectedBooking.cancelled_at && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-red-500 border-2 border-white"></span>
                        <p className="text-xs font-bold text-red-600">Booking Cancelled</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                          By: {selectedBooking.cancelled_by || "System"} · {format(new Date(selectedBooking.cancelled_at), "PPP · p")}
                        </p>
                        {selectedBooking.cancellation_reason && (
                          <p className="text-[10px] text-on-surface-variant/70 italic mt-1 bg-surface-container p-2 rounded-lg border border-outline-variant/10">
                            &quot;{selectedBooking.cancellation_reason}&quot;
                          </p>
                        )}
                      </div>
                    )}
                    {selectedBooking.started_at && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></span>
                        <p className="text-xs font-bold text-primary">Service In Progress</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                          {format(new Date(selectedBooking.started_at), "PPP · p")}
                        </p>
                      </div>
                    )}
                    {selectedBooking.accepted_at && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white"></span>
                        <p className="text-xs font-bold text-primary">Technician Assigned</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                          {selectedBooking.partner?.full_name || "Technician"} confirmed · {format(new Date(selectedBooking.accepted_at), "PPP · p")}
                        </p>
                      </div>
                    )}
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-on-surface-variant/30 border-2 border-white"></span>
                      <p className="text-xs font-bold text-primary">Booking Created</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                        {selectedBooking.created_at ? format(new Date(selectedBooking.created_at), "PPP · p") : "N/A"}
                      </p>
                    </div>
                  </div>

                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary pt-4 border-t border-outline-variant/10">Operational Audit Trail</h5>
                  {isLoadingLogs ? (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                      <span className="animate-spin text-sm">rotate_right</span> Loading logs...
                    </div>
                  ) : auditTrail.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/50 italic">No audit events logged for this booking yet.</p>
                  ) : (
                    <div className="relative border-l-2 border-outline-variant/30 pl-6 ml-3 space-y-4">
                      {auditTrail.map((log) => (
                        <div key={log.id} className="relative">
                          <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          </span>
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-primary">{log.action.replace(/_/g, " ")}</p>
                            <span className="text-[8px] font-black uppercase bg-surface-container px-1.5 py-0.5 rounded-sm tracking-wider text-on-surface-variant">
                              {log.actor}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant/60">
                            {format(new Date(log.timestamp), "PPP · p")}
                          </p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <pre className="text-[9px] text-on-surface-variant/75 mt-1 bg-surface-container p-2 rounded-lg border border-outline-variant/10 font-mono overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary pt-4 border-t border-outline-variant/10">Notification Logs</h5>
                  {isLoadingLogs ? (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
                      <span className="animate-spin text-sm">rotate_right</span> Loading logs...
                    </div>
                  ) : notificationsLog.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/50 italic">No notifications logged for this booking yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notificationsLog.map((notif) => {
                        const dateStr = notif.created_at || notif.updated_at;
                        return (
                          <div key={notif.id} className="bg-surface-container/50 border border-outline-variant/10 p-3 rounded-xl space-y-1">
                            <div className="flex justify-between items-start">
                              <h6 className="text-xs font-bold text-primary">{notif.title}</h6>
                              <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm tracking-wider">
                                {notif.role || "user"}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant/85 leading-normal">{notif.message || notif.body}</p>
                            <p className="text-[9px] text-on-surface-variant/50">
                              Sent: {dateStr ? format(new Date(dateStr), "PPP · p") : "Unknown Date"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Details Tab */}
              {activeDrawerTab === "details" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Booking Metadata</h5>
                  <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Service</p>
                        <p className="text-xs font-bold text-primary mt-1">{selectedBooking.service?.title || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Category</p>
                        <p className="text-xs font-bold text-primary mt-1">{selectedBooking.service?.category || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Scheduled Date</p>
                        <p className="text-xs font-bold text-primary mt-1">
                          {selectedBooking.scheduled_date
                            ? format(new Date(selectedBooking.scheduled_date), "EEE, dd MMM · hh:mm a")
                            : "Unscheduled"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Amount</p>
                        <p className="text-xs font-bold text-primary mt-1">₹{selectedBooking.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Payment</p>
                        <p className="text-xs font-bold text-primary mt-1">{selectedBooking.payment_method || "UPI"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">City / Zone</p>
                        <p className="text-xs font-bold text-primary mt-1">{selectedBooking.city || "N/A"}</p>
                      </div>
                    </div>

                    {selectedBooking.address && (
                      <div className="border-t border-outline-variant/10 pt-4">
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Full Address</p>
                        <p className="text-xs font-normal text-primary mt-1">{selectedBooking.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Customer Information</h5>
                  <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs border border-primary/10">
                        {selectedBooking.customer?.full_name
                          ? selectedBooking.customer.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
                          : "U"}
                      </div>
                      <div>
                        <Link href="/admin/customers" className="text-xs font-bold text-primary hover:text-secondary transition-colors">
                          {selectedBooking.customer?.full_name || "Unknown Customer"}
                        </Link>
                        <p className="text-[10px] text-on-surface-variant/60 font-normal">{selectedBooking.customer?.email || "No email"}</p>
                        <p className="text-[10px] text-on-surface-variant/50 font-normal">{selectedBooking.customer?.phone || "No phone"}</p>
                      </div>
                    </div>
                  </div>

                  {/* OTP Security & Timing */}
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">OTP Security & Timing</h5>
                  <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Arrival OTP</p>
                        <p className="text-xs font-bold text-primary mt-1 font-mono">{selectedBooking.arrival_otp || "Not generated"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Arrival OTP Verified</p>
                        <p className={`text-xs font-bold mt-1 ${selectedBooking.arrival_otp_verified ? "text-green-600" : "text-amber-600"}`}>
                          {selectedBooking.arrival_otp_verified ? "Verified ✓" : "Pending ✗"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Completion OTP</p>
                        <p className="text-xs font-bold text-primary mt-1 font-mono">{selectedBooking.completion_otp || "Not generated"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Completion OTP Verified</p>
                        <p className={`text-xs font-bold mt-1 ${selectedBooking.completion_otp_verified ? "text-green-600" : "text-amber-600"}`}>
                          {selectedBooking.completion_otp_verified ? "Verified ✓" : "Pending ✗"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Failed OTP Attempts</p>
                        <p className={`text-xs font-bold mt-1 ${selectedBooking.failed_otp_attempts > 0 ? "text-red-600 font-extrabold" : "text-primary"}`}>
                          {selectedBooking.failed_otp_attempts} / 5
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Service Duration</p>
                        <p className="text-xs font-bold text-primary mt-1 font-mono">
                          {selectedBooking.service_started_at && selectedBooking.service_completed_at
                            ? `${Math.round((new Date(selectedBooking.service_completed_at).getTime() - new Date(selectedBooking.service_started_at).getTime()) / 60000)} mins`
                            : "N/A"}
                        </p>
                      </div>
                      <div className="col-span-2 border-t border-outline-variant/10 pt-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Service Started At</p>
                        <p className="text-xs font-bold text-primary mt-1">
                          {selectedBooking.service_started_at
                            ? format(new Date(selectedBooking.service_started_at), "PPP · p")
                            : "Not started"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Service Completed At</p>
                        <p className="text-xs font-bold text-primary mt-1">
                          {selectedBooking.service_completed_at
                            ? format(new Date(selectedBooking.service_completed_at), "PPP · p")
                            : "Not completed"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Partner Tab */}
              {activeDrawerTab === "partner" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Assigned Technician</h5>
                  {selectedBooking.partner ? (
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10">
                          {selectedBooking.partner.avatar_url ? (
                            <Image src={selectedBooking.partner.avatar_url} alt={selectedBooking.partner.full_name} width={48} height={48} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            selectedBooking.partner.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <Link href="/admin/partners" className="text-sm font-bold text-primary hover:text-secondary transition-colors">
                            {selectedBooking.partner.full_name}
                          </Link>
                          <p className="text-[10px] text-on-surface-variant/60">{selectedBooking.partner.email || "No email"}</p>
                          <p className="text-[10px] text-on-surface-variant/50">{selectedBooking.partner.phone || "No phone"}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                          selectedBooking.partner.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-surface-container text-on-surface-variant border-outline-variant"
                        }`}>
                          {selectedBooking.partner.status}
                        </span>
                      </div>

                      {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                        <div className="mt-4 pt-4 border-t border-outline-variant/10">
                          <Button
                            variant="outline"
                            onClick={() => openModal(selectedBooking, "reassign")}
                            className="w-full rounded-xl text-xs font-bold"
                          >
                            <span className="material-symbols-outlined text-sm mr-1">swap_horiz</span>
                            Reassign to Another Technician
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-xl text-center space-y-4">
                      <span className="material-symbols-outlined text-4xl text-amber-500">person_search</span>
                      <p className="text-sm font-bold text-amber-700">No Technician Assigned</p>
                      <p className="text-xs text-on-surface-variant/70">This booking is waiting for technician assignment.</p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setIsDetailDrawerOpen(false);
                          openAssignDrawer(selectedBooking);
                        }}
                        className="bg-secondary hover:brightness-105 text-primary font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl"
                      >
                        <span className="material-symbols-outlined text-sm mr-1">person_add</span>
                        Assign Technician Now
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeDrawerTab === "actions" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Administrative Overrides</h5>

                  {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                    <>
                      <button
                        onClick={() => openModal(selectedBooking, "complete")}
                        className="w-full bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 p-4 rounded-xl flex items-center gap-3 transition-colors"
                      >
                        <span className="material-symbols-outlined text-secondary">check_circle</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-primary">Force Mark as Completed</p>
                          <p className="text-[10px] text-on-surface-variant/60">Override lifecycle and close this booking.</p>
                        </div>
                      </button>

                      <button
                        onClick={() => openModal(selectedBooking, "cancel")}
                        className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 transition-colors"
                      >
                        <span className="material-symbols-outlined text-red-500">cancel</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-red-700">Force Cancel Booking</p>
                          <p className="text-[10px] text-on-surface-variant/60">Terminate this operation permanently.</p>
                        </div>
                      </button>

                      {!selectedBooking.partner_id && (
                        <button
                          onClick={() => {
                            setIsDetailDrawerOpen(false);
                            openAssignDrawer(selectedBooking);
                          }}
                          className="w-full bg-primary/5 hover:bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-primary">person_add</span>
                          <div className="text-left">
                            <p className="text-xs font-bold text-primary">Manually Assign Technician</p>
                            <p className="text-[10px] text-on-surface-variant/60">Select a technician from the active workforce.</p>
                          </div>
                        </button>
                      )}
                    </>
                  )}

                  {(selectedBooking.status === "completed" || selectedBooking.status === "cancelled") && (
                    <div className="text-center py-8 bg-surface-container/30 rounded-xl">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">lock</span>
                      <p className="text-xs font-semibold text-on-surface-variant/60 mt-2">
                        This booking is {selectedBooking.status}. No further overrides available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. MANUAL ASSIGN TECHNICIAN DRAWER ─────────────────── */}
      {isAssignDrawerOpen && assignTargetBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="absolute inset-0" onClick={() => setIsAssignDrawerOpen(false)} />

          <div className="relative w-full max-w-lg bg-surface-container-lowest h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-outline-variant/20 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 bg-primary text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Manual Technician Assignment</p>
                  <h4 className="text-base font-bold mt-1">
                    BK-{assignTargetBooking.id.slice(0, 8).toUpperCase()}
                  </h4>
                  <p className="text-xs opacity-80 font-normal mt-1">
                    {assignTargetBooking.service?.title || "Home Service"} · {assignTargetBooking.city || "Local Area"}
                  </p>
                </div>
                <button
                  onClick={() => setIsAssignDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Partner Search */}
            <div className="p-4 border-b border-outline-variant/10">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant/40 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search technicians by name, skill, or city..."
                  value={partnerSearchTerm}
                  onChange={(e) => setPartnerSearchTerm(e.target.value)}
                  className="w-full bg-surface-container text-primary text-sm font-semibold pl-10 pr-4 py-3 rounded-xl border border-outline-variant/30 focus:border-secondary/60 focus:outline-none focus:ring-4 focus:ring-secondary/10 transition-all placeholder-on-surface-variant/40"
                />
              </div>
            </div>

            {/* Partners List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredPartners.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant/50">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">person_search</span>
                  <p className="text-xs font-semibold">No eligible partners found.</p>
                </div>
              ) : (
                filteredPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 hover:border-secondary/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs border border-primary/10 shrink-0">
                      {partner.avatar_url ? (
                        <Image src={partner.avatar_url} alt={partner.full_name} width={40} height={40} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        partner.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary uppercase tracking-tight">{partner.full_name}</p>
                      <p className="text-[10px] text-on-surface-variant/60 truncate">{partner.skills.slice(0, 2).join(" · ") || "General"}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[9px] font-bold text-on-surface-variant/50 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-amber-500 text-[10px]">star</span>
                          {partner.rating_avg.toFixed(1)}
                        </span>
                        <span className="text-[9px] font-bold text-on-surface-variant/50">{partner.jobs_done} jobs</span>
                        <span className="text-[9px] font-bold text-on-surface-variant/50">{partner.reliability_rate}% reliable</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        partner.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-surface-container-highest text-on-surface-variant"
                      }`}>
                        {partner.status}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleManualAssign(assignTargetBooking.id, partner.id)}
                        disabled={isPending}
                        className="bg-secondary hover:brightness-105 text-primary font-black text-[8px] uppercase tracking-widest py-1.5 px-3 rounded-lg"
                      >
                        {isPending ? "..." : "Assign"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. CONFIRMATION MODALS ──────────────────────────── */}
      {modalAction && modalTargetBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-55">
          <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/20 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h4 className="text-base font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              {modalAction === "cancel"
                ? "Force Cancel Booking"
                : modalAction === "complete"
                ? "Mark as Completed"
                : "Reassign Technician"}
            </h4>
            <p className="text-xs text-on-surface-variant/80 font-normal mt-3">
              Are you sure you want to{" "}
              {modalAction === "cancel"
                ? "permanently cancel"
                : modalAction === "complete"
                ? "force-complete"
                : "unassign/reassign the technician on"}{" "}
              booking{" "}
              <span className="font-bold text-primary font-mono">
                BK-{modalTargetBooking.id.slice(0, 8).toUpperCase()}
              </span>
              ?
            </p>

            {(modalAction === "cancel" || modalAction === "reassign") && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-primary mb-1.5">
                  {modalAction === "cancel" ? "Cancellation Reason" : "Reassignment Reason"}
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={`Enter the reason for ${modalAction === "cancel" ? "cancellation" : "reassignment"}...`}
                  className="w-full border border-outline-variant/20 rounded-xl p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-xs transition-all placeholder:text-on-surface-variant/50"
                />
              </div>
            )}

            {modalAction === "cancel" && (
              <p className="text-[10px] text-error font-semibold mt-2">
                ⚠️ This will terminate the booking permanently and notify all parties.
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="slate"
                size="sm"
                className="rounded-lg font-bold text-xs"
                onClick={() => {
                  setModalAction(null);
                  setModalTargetBooking(null);
                  setCancelReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant={modalAction === "cancel" ? "primary" : "primary"}
                size="sm"
                disabled={isPending}
                className={`rounded-lg font-bold text-xs ${
                  modalAction === "cancel" ? "bg-red-600 hover:bg-red-700" : ""
                }`}
                onClick={() => {
                  if (modalAction === "cancel") {
                    handleStatusUpdate(modalTargetBooking.id, "cancelled", cancelReason || undefined);
                  } else if (modalAction === "complete") {
                    handleStatusUpdate(modalTargetBooking.id, "completed");
                  } else if (modalAction === "reassign") {
                    handleReassign(modalTargetBooking.id, cancelReason || undefined);
                  }
                }}
              >
                {isPending
                  ? "Processing..."
                  : modalAction === "cancel"
                  ? "Confirm Cancel"
                  : modalAction === "complete"
                  ? "Confirm Complete"
                  : "Confirm Reassign"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ─── PORTAL-BASED ROW ACTIONS DROPDOWN ────────────────── */}
      {dropdownMenu && createPortal(
        <>
          {/* Backdrop for outside click */}
          <div 
            className="fixed inset-0 z-9998 bg-transparent" 
            onClick={() => setDropdownMenu(null)} 
          />
          
          {/* Menu container */}
          <div 
            className="fixed w-48 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-9999 p-1 divide-y divide-outline-variant/10 text-left animate-in fade-in duration-100"
            style={{
              top: `${
                dropdownMenu.rect.bottom + 180 > window.innerHeight
                  ? dropdownMenu.rect.top - 185
                  : dropdownMenu.rect.bottom + 4
              }px`,
              left: `${dropdownMenu.rect.right - 192}px`
            }}
          >
            <div className="py-1">
              <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3 py-0.5 tracking-wider">Operations</p>
              <button
                onClick={() => {
                  openDetailDrawer(dropdownMenu.booking);
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-bold text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                View Details
              </button>
              {!dropdownMenu.booking.partner_id && dropdownMenu.booking.status === "pending" && (
                <button
                  onClick={() => {
                    openAssignDrawer(dropdownMenu.booking);
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Assign Technician
                </button>
              )}
              {dropdownMenu.booking.partner_id && dropdownMenu.booking.status !== "completed" && dropdownMenu.booking.status !== "cancelled" && (
                <button
                  onClick={() => {
                    openModal(dropdownMenu.booking, "reassign");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">swap_horiz</span>
                  Reassign Tech
                </button>
              )}
            </div>

            <div className="py-1">
              <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3 py-0.5 tracking-wider">Overrides</p>
              {dropdownMenu.booking.status !== "completed" && dropdownMenu.booking.status !== "cancelled" && (
                <button
                  onClick={() => {
                    openModal(dropdownMenu.booking, "complete");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Mark Completed
                </button>
              )}
              {dropdownMenu.booking.status !== "cancelled" && (
                <button
                  onClick={() => {
                    openModal(dropdownMenu.booking, "cancel");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Force Cancel
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

