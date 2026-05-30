"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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

interface BookingsCommandProps {
  initialBookings: SerializedBooking[];
  statusCounts: BookingStatusCounts;
  totalGmv: number;
  unassignedCount: number;
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
  statusCounts: initialCounts,
  totalGmv,
  unassignedCount: initialUnassigned,
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
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Action Dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Detail Drawer
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"timeline" | "details" | "partner" | "actions">("timeline");

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
    setOpenDropdownId(null);
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
    setSelectedBooking(booking);
    setActiveDrawerTab("timeline");
    setIsDetailDrawerOpen(true);
  };

  const openAssignDrawer = (booking: SerializedBooking) => {
    setAssignTargetBooking(booking);
    setPartnerSearchTerm("");
    setIsAssignDrawerOpen(true);
    setOpenDropdownId(null);
  };

  const openModal = (booking: SerializedBooking, action: "cancel" | "complete" | "reassign") => {
    setModalTargetBooking(booking);
    setModalAction(action);
    setCancelReason("");
    setOpenDropdownId(null);
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
    <div className="space-y-6">
      {/* Error Banner */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[20px] p-5 flex items-center justify-between gap-4 text-xs font-semibold text-red-700 animate-in fade-in slide-in-from-top-4 duration-300">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Total Operations
          </p>
          <h2 className="text-3xl font-bold text-primary font-headline mt-3">
            {statusCounts.all} Bookings
          </h2>
          <div className="flex gap-4 mt-2 text-xs text-on-surface-variant/80 font-normal">
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

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/5 rounded-bl-[64px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Gross Merchandise Value
          </p>
          <h2 className="text-3xl font-bold text-primary font-headline mt-3">
            ₹{currentGmv.toLocaleString()}
          </h2>
          <p className="text-xs text-on-surface-variant/85 mt-2 font-normal">
            Accumulated across all booking operations
          </p>
        </div>

        <div className={`p-6 rounded-[24px] border shadow-sm relative overflow-hidden group ${
          unassignedCount > 0
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-surface-container-lowest border-outline-variant/15"
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">
            Unassigned Queue
          </p>
          <h2 className={`text-3xl font-bold font-headline mt-3 ${
            unassignedCount > 0 ? "text-amber-700" : "text-primary"
          }`}>
            {unassignedCount} Pending
          </h2>
          {unassignedCount > 0 ? (
            <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Requires manual partner assignment
            </p>
          ) : (
            <p className="text-xs text-secondary mt-2 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              All bookings assigned
            </p>
          )}
        </div>
      </div>

      {/* ─── 2. SEARCH, FILTERS, & STATUS PILLS ─────────────── */}
      <Card variant="glass" className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search Booking ID, Customer, Partner, Phone..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-sm font-semibold pl-11 pr-4 py-3.5 rounded-2xl border border-outline-variant/40 focus:border-secondary/70 focus:outline-none focus:ring-4 focus:ring-secondary/10 transition-all placeholder-on-surface-variant/40"
            />
            {searchTerm && (
              <button
                onClick={() => handleFilterChange(setSearchTerm, "")}
                className="absolute right-3.5 top-3.5 text-on-surface-variant/50 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
            >
              <option value="All">🔧 All Services</option>
              {serviceCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => handleFilterChange(setCityFilter, e.target.value)}
              className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
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
              className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Status Segment Pills */}
        <div className="mt-4 flex bg-surface-container p-1 rounded-xl border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handleFilterChange(setActiveStatus, pill.key)}
              className={`shrink-0 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeStatus === pill.key
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </Card>

      {/* ─── 3. HIGH-DENSITY DATA TABLE ──────────────────────── */}
      <Card variant="solid" className="p-0 overflow-hidden ring-1 ring-outline-variant/10">

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-dim/40 border-b border-outline-variant/20 uppercase text-[9px] font-black text-on-surface-variant tracking-widest">
                <th className="py-4.5 px-6">Operational ID</th>
                <th className="py-4.5 px-5">Client / Zone</th>
                <th className="py-4.5 px-5">Service Engine</th>
                <th className="py-4.5 px-5">Deployment</th>
                <th className="py-4.5 px-5 text-center">Lifecycle State</th>
                <th className="py-4.5 px-5 text-right">Volume</th>
                <th className="py-4.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">inbox</span>
                    <p className="text-sm font-semibold">No bookings match the current filters.</p>
                    <p className="text-xs text-on-surface-variant/40 mt-1">Adjust your search or status filters and try again.</p>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking) => {
                  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

                  return (
                    <tr key={booking.id} className="hover:bg-surface-container-low/30 transition-colors group">

                      {/* Col 1: Operational ID & Timestamp */}
                      <td className="py-5 px-6">
                        <p className="text-sm font-black text-primary font-mono tracking-tighter">
                          BK-{booking.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-1">
                          {booking.created_at
                            ? format(new Date(booking.created_at), "MMM dd, yyyy · hh:mm a")
                            : "Unscheduled"}
                        </p>
                      </td>

                      {/* Col 2: Client / Zone */}
                      <td className="py-5 px-5">
                        {booking.customer ? (
                          <Link
                            href="/admin/customers"
                            className="text-sm font-extrabold text-primary uppercase tracking-tight hover:text-secondary transition-colors"
                          >
                            {booking.customer.full_name}
                          </Link>
                        ) : (
                          <p className="text-sm font-extrabold text-on-surface-variant/50 uppercase tracking-tight">
                            Guest User
                          </p>
                        )}
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
                          {[booking.city, booking.pincode].filter(Boolean).join(" · ") || "Zone N/A"}
                        </p>
                        {booking.address && (
                          <p className="text-[9px] text-on-surface-variant/40 font-normal mt-0.5 truncate max-w-[180px]">
                            {booking.address}
                          </p>
                        )}
                      </td>

                      {/* Col 3: Service Engine */}
                      <td className="py-5 px-5">
                        <p className="text-sm font-black text-primary uppercase tracking-tight">
                          {booking.service?.title || "Home Service"}
                        </p>
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">
                          {booking.service?.category || "General"}
                        </p>
                      </td>

                      {/* Col 4: Deployment / Partner */}
                      <td className="py-5 px-5">
                        {booking.partner ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-[10px] border border-primary/10 shrink-0">
                              {booking.partner.avatar_url ? (
                                <img
                                  src={booking.partner.avatar_url}
                                  alt={booking.partner.full_name}
                                  className="w-full h-full object-cover rounded-xl"
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
                          <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            Auto-Assigning...
                          </span>
                        ) : (
                          <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Col 5: Lifecycle State */}
                      <td className="py-5 px-5 text-center">
                        <Badge variant={statusConf.variant}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConf.dotClass}`}></span>
                          {statusConf.label}
                        </Badge>
                      </td>

                      {/* Col 6: Volume / Financial */}
                      <td className="py-5 px-5 text-right">
                        <p className="text-base font-bold text-primary font-headline tracking-tighter">
                          ₹{booking.total_amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
                          {booking.payment_method || "UPI"}
                        </p>
                      </td>

                      {/* Col 7: Actions */}
                      <td className="py-5 px-5 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            onClick={() => openDetailDrawer(booking)}
                            className="bg-primary hover:bg-primary/90 text-white text-[9px] uppercase tracking-widest font-black py-2 px-3.5 rounded-xl transition-all"
                          >
                            Manage
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              onClick={() => setOpenDropdownId(openDropdownId === booking.id ? null : booking.id)}
                              className="p-1 h-9 w-9 rounded-xl hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">more_vert</span>
                            </Button>

                            {openDropdownId === booking.id && (
                              <div className="absolute right-0 mt-2 w-52 bg-white border border-outline-variant/30 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-1.5 divide-y divide-outline-variant/10">
                                  <div className="py-1">
                                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3.5 py-1 tracking-wider">Operations</p>
                                    <button
                                      onClick={() => openDetailDrawer(booking)}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-primary hover:bg-surface-container-low rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-sm">visibility</span>
                                      View Full Details
                                    </button>
                                    {!booking.partner_id && (
                                      <button
                                        onClick={() => openAssignDrawer(booking)}
                                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-xl transition-colors flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-sm">person_add</span>
                                        Manually Assign Partner
                                      </button>
                                    )}
                                    {booking.partner_id && booking.status !== "completed" && booking.status !== "cancelled" && (
                                      <button
                                        onClick={() => openModal(booking, "reassign")}
                                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                        Reassign Partner
                                      </button>
                                    )}
                                  </div>

                                  <div className="py-1">
                                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3.5 py-1 tracking-wider">Overrides</p>
                                    {booking.status !== "completed" && booking.status !== "cancelled" && (
                                      <button
                                        onClick={() => openModal(booking, "complete")}
                                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-xl transition-colors flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Mark as Completed
                                      </button>
                                    )}
                                    {booking.status !== "cancelled" && (
                                      <button
                                        onClick={() => openModal(booking, "cancel")}
                                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        Force Cancel Booking
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
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
        <div className="block lg:hidden divide-y divide-outline-variant/15 p-4 space-y-4">
          {paginatedBookings.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant/50 bg-white rounded-3xl p-6 ring-1 ring-outline-variant/10">
              <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">inbox</span>
              <p className="text-sm font-semibold">No bookings match the current filters.</p>
            </div>
          ) : (
            paginatedBookings.map((booking) => {
              const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl p-5 ring-1 ring-outline-variant/10 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-primary font-mono tracking-tighter">
                        BK-{booking.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-1">
                        {booking.created_at ? format(new Date(booking.created_at), "MMM dd, yyyy") : "N/A"}
                      </p>
                    </div>
                    <Badge variant={statusConf.variant}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConf.dotClass}`}></span>
                      {statusConf.label}
                    </Badge>
                  </div>

                  {/* Service & Customer */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-extrabold text-primary uppercase tracking-tight">
                      {booking.service?.title || "Home Service"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/70 font-semibold">
                      Client: {booking.customer?.full_name || "Guest"} · {booking.city || "N/A"}
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 bg-surface-dim/40 rounded-2xl p-3 border border-outline-variant/10">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Amount</p>
                      <p className="text-primary font-black text-sm mt-0.5">₹{booking.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Payment</p>
                      <p className="text-primary font-black text-sm mt-0.5">{booking.payment_method || "UPI"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Partner</p>
                      <p className="text-primary font-black text-[10px] mt-0.5 truncate">
                        {booking.partner?.full_name || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/10">
                    {!booking.partner_id && booking.status === "pending" && (
                      <button
                        onClick={() => openAssignDrawer(booking)}
                        className="p-2 bg-surface-container rounded-xl text-on-surface-variant hover:bg-secondary/15 hover:text-primary transition-colors"
                        title="Assign Partner"
                      >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                      </button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => openDetailDrawer(booking)}
                      className="bg-primary hover:bg-primary/90 text-white text-[8px] uppercase tracking-widest font-black py-1.5 px-3 rounded-xl transition-all"
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
        <div className="bg-surface-dim/30 border-t border-outline-variant/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                className="bg-surface-container-low text-primary text-xs font-bold px-2 py-1 rounded-xl border border-outline-variant/40 focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
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
                        <p className="text-xs font-bold text-primary">Partner Assigned</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                          {selectedBooking.partner?.full_name || "Professional"} confirmed · {format(new Date(selectedBooking.accepted_at), "PPP · p")}
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
                </div>
              )}

              {/* Partner Tab */}
              {activeDrawerTab === "partner" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Assigned Professional</h5>
                  {selectedBooking.partner ? (
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10">
                          {selectedBooking.partner.avatar_url ? (
                            <img src={selectedBooking.partner.avatar_url} alt={selectedBooking.partner.full_name} className="w-full h-full object-cover rounded-xl" />
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
                            Reassign to Another Professional
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-xl text-center space-y-4">
                      <span className="material-symbols-outlined text-4xl text-amber-500">person_search</span>
                      <p className="text-sm font-bold text-amber-700">No Professional Assigned</p>
                      <p className="text-xs text-on-surface-variant/70">This booking is waiting for partner assignment.</p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setIsDetailDrawerOpen(false);
                          openAssignDrawer(selectedBooking);
                        }}
                        className="bg-secondary hover:brightness-105 text-primary font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl"
                      >
                        <span className="material-symbols-outlined text-sm mr-1">person_add</span>
                        Assign Partner Now
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
                            <p className="text-xs font-bold text-primary">Manually Assign Partner</p>
                            <p className="text-[10px] text-on-surface-variant/60">Override auto-assignment and select a Professional.</p>
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

      {/* ─── 5. MANUAL ASSIGN PARTNER DRAWER ─────────────────── */}
      {isAssignDrawerOpen && assignTargetBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="absolute inset-0" onClick={() => setIsAssignDrawerOpen(false)} />

          <div className="relative w-full max-w-lg bg-surface-container-lowest h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-outline-variant/20 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 bg-primary text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Manual Override Assignment</p>
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
                  placeholder="Search partners by name, skill, or city..."
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
                        <img src={partner.avatar_url} alt={partner.full_name} className="w-full h-full object-cover rounded-xl" />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[55]">
          <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/20 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h4 className="text-base font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              {modalAction === "cancel"
                ? "Force Cancel Booking"
                : modalAction === "complete"
                ? "Mark as Completed"
                : "Reassign Partner"}
            </h4>
            <p className="text-xs text-on-surface-variant/80 font-normal mt-3">
              Are you sure you want to{" "}
              {modalAction === "cancel"
                ? "permanently cancel"
                : modalAction === "complete"
                ? "force-complete"
                : "reassign the partner on"}{" "}
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
    </div>
  );
}
