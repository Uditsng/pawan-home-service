"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateTicketStatusAndNotes, escalateOrRefundBooking } from "./actions";

export interface DisputeTicket {
  id: string;
  booking_id: string;
  customer_id: string;
  partner_id: string | null;
  reason: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  internal_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  bookings: {
    id: string;
    total_amount: number;
    status: string;
    scheduled_date: string;
    services: {
      title: string;
    } | null;
  } | null;
  customer: {
    full_name: string | null;
    email: string;
  } | null;
  partner: {
    full_name: string | null;
    email: string;
  } | null;
}

interface DisputesConsoleProps {
  initialTickets: DisputeTicket[];
}

export function DisputesConsole({ initialTickets }: DisputesConsoleProps) {
  const [tickets, setTickets] = useState<DisputeTicket[]>(initialTickets);
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Drawer / Review State
  const [selectedTicket, setSelectedTicket] = useState<DisputeTicket | null>(null);
  const [drawerNotes, setDrawerNotes] = useState("");
  const [drawerStatus, setDrawerStatus] = useState<"open" | "in_progress" | "resolved">("open");
  const [drawerPriority, setDrawerPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Compute metrics
  const openCount = tickets.filter(t => t.status !== "resolved").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;
  const highPriorityCount = tickets.filter(t => t.status !== "resolved" && t.priority === "high").length;
  
  const resolutionRate = tickets.length > 0 
    ? Math.round((resolvedCount / tickets.length) * 100) 
    : 100;

  // Filtered tickets
  const filteredTickets = tickets.filter(ticket => {
    // Tab match
    const tabMatch = activeTab === "resolved" 
      ? ticket.status === "resolved" 
      : ticket.status !== "resolved";

    // Text search
    const text = searchTerm.toLowerCase();
    const searchMatch = 
      ticket.id.toLowerCase().includes(text) ||
      ticket.reason.toLowerCase().includes(text) ||
      (ticket.customer?.full_name || "").toLowerCase().includes(text) ||
      (ticket.partner?.full_name || "").toLowerCase().includes(text);

    // Priority filter
    const priorityMatch = priorityFilter === "all" || ticket.priority === priorityFilter;

    return tabMatch && searchMatch && priorityMatch;
  });

  const handleOpenReview = (ticket: DisputeTicket) => {
    setSelectedTicket(ticket);
    setDrawerNotes(ticket.internal_notes || "");
    setDrawerStatus(ticket.status);
    setDrawerPriority(ticket.priority);
    setActionSuccess(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;
    setIsSubmitting(true);
    setActionSuccess(false);
    try {
      await updateTicketStatusAndNotes(
        selectedTicket.id,
        drawerStatus,
        drawerPriority,
        drawerNotes
      );
      
      // Update local state
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
        status: drawerStatus,
        priority: drawerPriority,
        internal_notes: drawerNotes,
        resolved_at: drawerStatus === "resolved" ? new Date().toISOString() : null
      } : t));

      setActionSuccess(true);
      setTimeout(() => {
        setSelectedTicket(null);
      }, 1000);
    } catch (err) {
      alert("Error updating ticket details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundAndCancel = async () => {
    if (!selectedTicket || !selectedTicket.bookings) return;
    if (!window.confirm("Are you sure you want to cancel this booking and issue a full refund to the customer?")) return;
    setIsRefunding(true);
    try {
      await escalateOrRefundBooking(selectedTicket.bookings.id);
      
      // Update local bookings status
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
        bookings: t.bookings ? { ...t.bookings, status: "cancelled" } : null,
        status: "resolved" as const
      } : t));

      alert("Refund processed and booking has been officially cancelled.");
      setSelectedTicket(null);
    } catch (err) {
      alert("Failed to issue refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Open Tickets</p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-2">{openCount} Cases</h2>
          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            {highPriorityCount} High priority unresolved
          </span>
        </div>
        
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Average Resolution Time</p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-2">4.2 Hours</h2>
          <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Best in industry
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Resolution Rate</p>
          <h2 className="text-2xl font-bold text-secondary font-headline mt-2">{resolutionRate}%</h2>
          <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest mt-2">Of total support tickets resolved</span>
        </div>
      </div>

      {/* Tabs and Filtering Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10">
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-outline-variant/15">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "open"
                ? "bg-primary text-white shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Open Cases ({openCount})
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "resolved"
                ? "bg-primary text-white shadow-md shadow-primary/10"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="flex flex-1 w-full md:w-auto items-center gap-3 justify-end">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search people, tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-on-surface-variant/40">search</span>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Ticket ID</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">People Involved</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Complaint Reason</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Priority</th>
                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-6 py-4.5">
                    <p className="text-sm font-black text-primary font-mono tracking-tighter">DISP-{ticket.id.slice(0, 6).toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">
                      Booking: #{ticket.bookings ? ticket.bookings.id.slice(0, 8).toUpperCase() : "N/A"}
                    </p>
                  </td>
                  <td className="px-4 py-4.5">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">C: {ticket.customer?.full_name || "Unknown Customer"}</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">P: {ticket.partner?.full_name || "Unassigned"}</p>
                  </td>
                  <td className="px-4 py-4.5 max-w-xs">
                    <p className="text-sm font-bold text-primary tracking-tight leading-snug truncate">{ticket.reason}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/40 mt-1 uppercase tracking-widest">
                      Logged {new Date(ticket.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-4 py-4.5">
                    <Badge variant={ticket.priority === 'high' ? 'danger' : ticket.priority === 'medium' ? 'warning' : 'surface'}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-4.5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      ticket.status === 'open' 
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : ticket.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-secondary/10 text-secondary border-secondary/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'open' ? 'bg-red-500 animate-pulse' : ticket.status === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-secondary'}`}></span>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4.5 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReview(ticket)}
                      className="px-4 shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant/40 text-xs font-semibold">
                    No disputes found under this tab category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Review Details Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
            onClick={() => setSelectedTicket(null)}
          ></div>

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col justify-between border-l border-outline-variant/20 p-6 sm:p-8 animate-in slide-in-from-right duration-300">
            <div className="space-y-6 overflow-y-auto pr-1 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant={drawerPriority === 'high' ? 'danger' : 'warning'}>DISP-{selectedTicket.id.slice(0, 6).toUpperCase()}</Badge>
                  <h3 className="text-xl font-bold tracking-tight text-primary font-headline mt-2">Dispute Resolution</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">Reviewing booking issue and customer complaints.</p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-all"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <hr className="border-outline-variant/10" />

              {/* Case Summary */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Reason for Dispute</p>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                  <p className="text-sm font-semibold text-primary leading-relaxed">{selectedTicket.reason}</p>
                </div>
              </div>

              {/* Involved People */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Customer</p>
                  <p className="text-sm font-black text-primary uppercase mt-1 leading-tight">{selectedTicket.customer?.full_name || "Unknown"}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant mt-0.5 truncate">{selectedTicket.customer?.email}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Professional Assigned</p>
                  <p className="text-sm font-black text-primary uppercase mt-1 leading-tight">{selectedTicket.partner?.full_name || "Unassigned"}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant mt-0.5 truncate">{selectedTicket.partner?.email || "No partner assigned"}</p>
                </div>
              </div>

              {/* Associated Booking Info */}
              {selectedTicket.bookings && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-primary uppercase">Associated Booking</p>
                    <Badge variant="surface">#{selectedTicket.bookings.id.slice(0, 8).toUpperCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div>
                      <p className="text-[9px] text-on-surface-variant/60 uppercase">Service</p>
                      <p className="text-primary truncate">{selectedTicket.bookings.services?.title || "Home Service"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-on-surface-variant/60 uppercase">Base Price</p>
                      <p className="text-primary">₹{selectedTicket.bookings.total_amount}</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-[9px] text-on-surface-variant/60 uppercase">Scheduled Date</p>
                      <p className="text-primary">
                        {new Date(selectedTicket.bookings.scheduled_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-[9px] text-on-surface-variant/60 uppercase">Booking Status</p>
                      <span className={`inline-block font-black uppercase tracking-tight text-[10px] ${
                        selectedTicket.bookings.status === 'cancelled' ? 'text-red-500' : 'text-secondary'
                      }`}>
                        {selectedTicket.bookings.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispute Resolution Forms */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Update Status</label>
                    <select
                      value={drawerStatus}
                      onChange={(e) => setDrawerStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Case Priority</label>
                    <select
                      value={drawerPriority}
                      onChange={(e) => setDrawerPriority(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Admin Resolution Logs (Internal Notes)</label>
                  <textarea
                    rows={4}
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    placeholder="Enter support investigation logs, notes regarding re-scheduling or financial refund checks..."
                    className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-secondary/50 leading-relaxed"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-3 pt-4 border-t border-outline-variant/10 shrink-0">
              {selectedTicket.bookings && selectedTicket.bookings.status !== "cancelled" && (
                <button
                  onClick={handleRefundAndCancel}
                  disabled={isRefunding}
                  className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  {isRefunding ? (
                    <span className="w-4 h-4 rounded-full border-2 border-red-600/30 border-t-red-600 animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-base">refund</span>
                  )}
                  Issue Refund & Cancel Booking
                </button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-3 text-xs"
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveChanges}
                  disabled={isSubmitting}
                  className="flex-2 py-3 text-xs"
                >
                  {isSubmitting ? "Saving..." : actionSuccess ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
