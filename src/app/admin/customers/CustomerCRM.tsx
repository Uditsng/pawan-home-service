"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateCustomerStatusAction, saveCustomerNoteAction } from "./actions";

interface Booking {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  services?: {
    title: string;
  } | null;
}

interface Customer {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  status: 'active' | 'suspended' | 'flagged';
  avatar_url?: string | null;
  internal_note?: string | null;
  risk_trigger?: string | null;
  bookings: Booking[];
  totalBookings: number;
  spent: number;
  cancelRate: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export function CustomerCRM({ 
  initialCustomers 
}: { 
  initialCustomers: Customer[] 
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD or range
  const [activeSegment, setActiveSegment] = useState<"All" | "HighValue">("All");

  // Selection & Details Drawer States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"timeline" | "bookings" | "risk" | "notes">("timeline");
  
  // Note Text Area State
  const [noteInput, setNoteInput] = useState("");
  const [riskTriggerInput, setRiskTriggerInput] = useState("");

  // Confirmation Modals State
  const [modalType, setModalType] = useState<"suspend" | "flag" | "reactivate" | null>(null);
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Portal-based dropdown state for specific row actions to prevent overflow clipping
  const [dropdownMenu, setDropdownMenu] = useState<{
    customerId: string;
    rect: DOMRect;
    customer: Customer;
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

  // Filter Logic
  const filteredCustomers = customers.filter(customer => {
    // 1. Segment Filtering
    if (activeSegment === "HighValue") {
      const isHighValue = customer.spent >= 3000 || customer.totalBookings >= 5;
      if (!isHighValue) return false;
    }

    // 2. Multi-parameter Search (Name, Email, Phone, Booking ID)
    const matchesSearch = 
      (customer.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").includes(searchTerm) ||
      customer.bookings.some(b => (b.id || "").toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // 3. Risk Level Filter
    if (riskFilter !== "All" && customer.riskLevel !== riskFilter) return false;

    // 4. Account Status Filter
    if (statusFilter !== "All" && customer.status !== statusFilter.toLowerCase()) return false;

    // 5. Date Filter (Registration date checking)
    if (dateFilter) {
      const regDate = format(new Date(customer.created_at), "yyyy-MM-dd");
      if (regDate !== dateFilter) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Quick Action triggers
  const openConfirmation = (customer: Customer, type: "suspend" | "flag" | "reactivate") => {
    setTargetCustomer(customer);
    setModalType(type);
  };

  const executeStatusChange = () => {
    if (!targetCustomer || !modalType) return;
    
    const targetStatus = 
      modalType === "suspend" ? "suspended" : 
      modalType === "flag" ? "flagged" : "active";

    startTransition(async () => {
      try {
        await updateCustomerStatusAction(targetCustomer.id, targetStatus);
        
        // Update local state
        setCustomers(prev => prev.map(c => {
          if (c.id === targetCustomer.id) {
            return { ...c, status: targetStatus };
          }
          return c;
        }));

        // If drawer is open for this customer, update selected customer
        if (selectedCustomer?.id === targetCustomer.id) {
          setSelectedCustomer(prev => prev ? { ...prev, status: targetStatus } : null);
        }

        setModalType(null);
        setTargetCustomer(null);
        setActionError(null);
      } catch (err: unknown) {
        setActionError((err as Error).message || "Failed to update status.");
      }
    });
  };

  // Note actions
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    startTransition(async () => {
      try {
        const triggerToSave = riskTriggerInput.trim() || selectedCustomer.risk_trigger || "";
        await saveCustomerNoteAction(selectedCustomer.id, noteInput, triggerToSave);
        
        // Update local state
        setCustomers(prev => prev.map(c => {
          if (c.id === selectedCustomer.id) {
            return { 
              ...c, 
              internal_note: noteInput, 
              risk_trigger: triggerToSave 
            };
          }
          return c;
        }));

        setSelectedCustomer(prev => prev ? { 
          ...prev, 
          internal_note: noteInput, 
          risk_trigger: triggerToSave 
        } : null);

        setNoteInput("");
        setRiskTriggerInput("");
        setActionError(null);
      } catch (err: unknown) {
        setActionError((err as Error).message || "Failed to save note.");
      }
    });
  };

  const openDrawer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNoteInput(customer.internal_note || "");
    setRiskTriggerInput(customer.risk_trigger || "");
    setIsDrawerOpen(true);
  };

  // Dynamic Metrics calculation based on INITIAL dataset
  const avgLtv = customers.reduce((acc, c) => acc + c.spent, 0) / (customers.length || 1);
  const activeCount = customers.filter(c => c.status === "active").length;
  const highRiskCount = customers.filter(c => c.riskLevel === "High").length;

  return (
    <div className="space-y-4">
      {/* Dynamic Action Error Banner */}
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
      
      {/* Dynamic Operational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-20 h-20 bg-primary/5 rounded-bl-[48px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Total Monitored Users</p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-1.5">{customers.length} Customers</h2>
          <div className="flex gap-3 mt-1.5 text-xs text-on-surface-variant/80 font-normal">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>{activeCount} Active</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{highRiskCount} High Risk</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-20 h-20 bg-secondary/5 rounded-bl-[48px] transition-transform group-hover:scale-105"></div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">Avg. Life-Time Value</p>
          <h2 className="text-2xl font-bold text-primary font-headline mt-1.5">₹{Math.round(avgLtv).toLocaleString()}</h2>
          <p className="text-[11px] text-on-surface-variant/85 mt-1 font-normal">Accumulated spend across booking catalog</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">CRM Stickiness Rate</p>
          <h2 className="text-2xl font-bold text-secondary font-headline mt-1.5">78.5%</h2>
          <p className="text-[11px] text-on-surface-variant/85 mt-1 font-normal">Percent of customers returning within 45 days</p>
        </div>
      </div>

      {/* SEARCH, FILTERING, & CONTROLS ROW */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/15 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h3 className="font-bold text-sm text-primary font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">tune</span>
            Operational Filter Console
          </h3>
          <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant/10 shadow-inner w-full md:w-auto">
            <button
              onClick={() => setActiveSegment("All")}
              className={`grow md:grow-0 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeSegment === "All" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveSegment("HighValue")}
              className={`grow md:grow-0 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeSegment === "HighValue" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              ⭐ High Value
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Query Search */}
          <div className="relative" suppressHydrationWarning={true}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
            <input
              type="text"
              placeholder="Search Name, Email, Phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
              name="search"
              id="customer-crm-search"
              suppressHydrationWarning={true}
              className="w-full border border-outline-variant/20 rounded-lg py-2 pl-9 pr-4 bg-surface-container focus:ring-1 focus:ring-primary/50 outline-none text-xs transition-all placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Risk Level Selector */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => handleFilterChange(setRiskFilter, e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg py-2 px-3 bg-surface-container focus:ring-1 focus:ring-primary/50 outline-none text-xs text-on-surface-variant transition-all cursor-pointer"
            >
              <option value="All">⚠️ All Risk Profiles</option>
              <option value="Low">🟢 Low Risk</option>
              <option value="Medium">🟡 Medium Risk</option>
              <option value="High">🔴 High Risk</option>
            </select>
          </div>

          {/* Account Status Selector */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg py-2 px-3 bg-surface-container focus:ring-1 focus:ring-primary/50 outline-none text-xs text-on-surface-variant transition-all cursor-pointer"
            >
              <option value="All">🔒 All Account Statuses</option>
              <option value="Active">Active Accounts</option>
              <option value="Suspended">Suspended Accounts</option>
              <option value="Flagged">Flagged Accounts</option>
            </select>
          </div>

          {/* Registration Date picker */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleFilterChange(setDateFilter, e.target.value)}
              className="w-full border border-outline-variant/20 rounded-lg py-2 px-3 bg-surface-container focus:ring-1 focus:ring-primary/50 outline-none text-xs text-on-surface-variant transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* OPERATIONAL CUSTOMER DATA TABLE */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">Customer Details</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">Engagement Details</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">LTV / Average Spend</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">Risk Assessment</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => {
                  const avgSpend = customer.totalBookings > 0 ? customer.spent / customer.totalBookings : 0;
                  
                  // Calculate dynamic last active indicators
                  let lastActiveText = "Active 2 hours ago";
                  if (customer.bookings.length > 0) {
                    const sortedBookings = [...customer.bookings].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const lastBookingDate = new Date(sortedBookings[0].created_at);
                    lastActiveText = `Booked ${formatDistanceToNow(lastBookingDate)} ago`;
                  } else {
                    const regDate = new Date(customer.created_at);
                    lastActiveText = `Joined ${formatDistanceToNow(regDate)} ago`;
                  }

                  return (
                    <tr key={customer.id} className="hover:bg-surface-container-low/20 transition-colors group">
                      {/* Identity Column */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs border border-primary/10 shrink-0">
                            {customer.full_name ? customer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-primary uppercase tracking-tight leading-none mb-0.5">{customer.full_name || "Unknown Customer"}</p>
                            <p className="text-[10px] text-on-surface-variant/70 font-normal leading-none mt-0.5">{customer.email || "No email linked"}</p>
                            <p className="text-[9px] text-on-surface-variant/50 font-normal leading-none mt-0.5">{customer.phone || "No phone added"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Engagement Column */}
                      <td className="px-4 py-2">
                        <p className="text-xs font-semibold text-primary">{customer.totalBookings} Completed Jobs</p>
                        <p className="text-[9px] text-on-surface-variant/70 mt-0.5">{lastActiveText}</p>
                      </td>

                      {/* LTV & Spend Column */}
                      <td className="px-4 py-2">
                        <p className="text-sm font-bold text-primary font-headline">₹{customer.spent.toLocaleString()}</p>
                        <p className="text-[9px] font-semibold text-secondary mt-0.5">Avg: ₹{Math.round(avgSpend).toLocaleString()} / job</p>
                      </td>

                      {/* Risk Indicators Column */}
                      <td className="px-4 py-2">
                        <div className="space-y-0.5">
                          <Badge variant={
                            customer.riskLevel === 'High' ? 'danger' :
                            customer.riskLevel === 'Medium' ? 'warning' : 'success'
                          } className="text-[9px] px-1.5 py-0">
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              customer.riskLevel === 'High' ? 'bg-red-500 animate-pulse' :
                              customer.riskLevel === 'Medium' ? 'bg-[#D97706]' : 'bg-secondary'
                            }`}></span>
                            {customer.riskLevel} Risk
                          </Badge>
                          {customer.risk_trigger && (
                            <p className="text-[9px] text-error font-semibold uppercase tracking-wider block">
                              🚨 {customer.risk_trigger}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Context Actions Column */}
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Current Account Status Badge */}
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            customer.status === 'suspended' ? 'bg-red-100 text-red-700' :
                            customer.status === 'flagged' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {customer.status}
                          </span>

                          <Button
                            variant="slate"
                            size="sm"
                            onClick={() => openDrawer(customer)}
                            className="bg-surface-container hover:bg-primary hover:text-white rounded-lg px-2 py-1 font-bold text-[11px]"
                          >
                            View Profile
                          </Button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (dropdownMenu?.customerId === customer.id) {
                                  setDropdownMenu(null);
                                } else {
                                  setDropdownMenu({
                                    customerId: customer.id,
                                    rect,
                                    customer
                                  });
                                }
                              }}
                              className="p-1 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px] font-bold block">more_vert</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-10 py-12 text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 animate-bounce">search_off</span>
                    <p className="text-sm font-semibold text-on-surface-variant/70 mt-2">No matching customers found</p>
                    <p className="text-xs text-on-surface-variant/40 mt-1">Refine your filters or queries and try again.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer */}
        <div className="px-4 py-3 bg-surface-container-low/50 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-on-surface-variant/70">
              Showing <span className="font-bold">{filteredCustomers.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold">{filteredCustomers.length}</span> entries
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant/30">·</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-surface-container rounded-lg border border-outline-variant/20 text-xs text-on-surface-variant outline-none cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="rounded-lg font-bold text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="rounded-lg font-bold text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SEAMLESS PROFILE DETAILS DRAWER */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          {/* Overlay closer */}
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-surface-container-lowest h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-outline-variant/20 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 bg-primary text-white flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm border border-white/15">
                  {selectedCustomer.full_name ? selectedCustomer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "U"}
                </div>
                <div>
                  <h4 className="text-base font-bold uppercase tracking-tight">{selectedCustomer.full_name || "Unknown Customer"}</h4>
                  <p className="text-xs opacity-80 font-normal mt-0.5">{selectedCustomer.email || "No email linked"}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-outline-variant/10 bg-surface-container-low/50 px-4">
              <button
                onClick={() => setActiveDrawerTab("timeline")}
                className={`grow py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeDrawerTab === "timeline" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveDrawerTab("bookings")}
                className={`grow py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeDrawerTab === "bookings" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Bookings ({selectedCustomer.bookings.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab("risk")}
                className={`grow py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeDrawerTab === "risk" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Fraud/Risk
              </button>
              <button
                onClick={() => setActiveDrawerTab("notes")}
                className={`grow py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeDrawerTab === "notes" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Notes
              </button>
            </div>

            {/* Drawer Body Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Timeline Tab */}
              {activeDrawerTab === "timeline" && (
                <div className="space-y-6">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">CRM Operational Timeline</h5>
                  <div className="relative border-l-2 border-outline-variant/30 pl-6 ml-3 space-y-6">
                    {/* Note creation event */}
                    {selectedCustomer.internal_note && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-secondary border-2 border-white"></span>
                        <p className="text-xs font-bold text-primary">CRM Note Logged</p>
                        <p className="text-[11px] text-on-surface-variant/70 italic mt-1 font-normal bg-surface-container p-3 rounded-lg border border-outline-variant/10">
                          &quot;{selectedCustomer.internal_note}&quot;
                        </p>
                      </div>
                    )}

                    {/* Bookings events */}
                    {selectedCustomer.bookings.map((booking) => (
                      <div key={booking.id} className="relative">
                        <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-white"></span>
                        <p className="text-xs font-bold text-primary">
                          Service Booked: {booking.services?.title || "Home Service"}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-0.5">
                          Amount: ₹{booking.total_amount} · Status: <span className="uppercase font-bold">{booking.status}</span>
                        </p>
                        <p className="text-[9px] text-on-surface-variant/40 mt-0.5">
                          {format(new Date(booking.created_at), "PPP · p")}
                        </p>
                      </div>
                    ))}

                    {/* Registration event */}
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#cbd5e1] border-2 border-white"></span>
                      <p className="text-xs font-bold text-primary">Customer Registered</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                        Account created at: {format(new Date(selectedCustomer.created_at), "PPP")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings Ledger Tab */}
              {activeDrawerTab === "bookings" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Booking Ledger History</h5>
                  {selectedCustomer.bookings.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCustomer.bookings.map(b => (
                        <div key={b.id} className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 flex justify-between items-center gap-3">
                          <div>
                            <p className="text-xs font-bold text-primary uppercase">{b.services?.title || "Service Job"}</p>
                            <p className="text-[10px] text-on-surface-variant/50 mt-1 font-semibold">ID: {b.id.substring(0, 8)}...</p>
                            <p className="text-[9px] text-on-surface-variant/40 mt-0.5">{format(new Date(b.created_at), "MMM dd, yyyy")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-primary">₹{b.total_amount}</p>
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 ${
                              b.status === 'completed' ? 'bg-green-100 text-green-700' :
                              b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-surface-container/30 rounded-xl">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">shopping_cart</span>
                      <p className="text-xs font-semibold text-on-surface-variant/70 mt-2">No bookings recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Fraud & Risk tab */}
              {activeDrawerTab === "risk" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Fraud Profile & Risk Assessment</h5>
                  <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Calculated Cancellation Rate</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 bg-surface-container-high h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              selectedCustomer.cancelRate > 30 ? "bg-red-500" :
                              selectedCustomer.cancelRate > 15 ? "bg-amber-500" : "bg-secondary"
                            }`} 
                            style={{ width: `${Math.min(selectedCustomer.cancelRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-primary">{Math.round(selectedCustomer.cancelRate)}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/10 pt-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Current Flag Status</p>
                        <p className="text-xs font-bold text-primary mt-1 uppercase">{selectedCustomer.status}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/70">Active Risk Trigger</p>
                        <p className="text-xs font-bold text-error mt-1">{selectedCustomer.risk_trigger || "None Detected"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-error/5 p-4 rounded-xl border border-error/20 space-y-2">
                    <p className="text-xs font-bold text-error flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">security_alert</span>
                      Manual Risk Override Trigger
                    </p>
                    <p className="text-[10px] text-on-surface-variant/75 font-normal">
                      Update the current risk trigger identifier below to flag specific behavior types (e.g. Device Switch, Payment Dispute).
                    </p>
                  </div>
                </div>
              )}

              {/* Internal Notes Tab */}
              {activeDrawerTab === "notes" && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-primary">CRM Admin Notes logs</h5>
                  
                  {selectedCustomer.internal_note ? (
                    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/15 relative">
                      <p className="text-xs font-semibold text-primary">Active internal note:</p>
                      <p className="text-xs text-on-surface-variant mt-2 italic font-normal">
                        &quot;{selectedCustomer.internal_note}&quot;
                      </p>
                      <div className="text-[9px] text-on-surface-variant/40 mt-3 text-right">
                        Permanently stored in database profile ledger
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-surface-container/30 rounded-xl">
                      <p className="text-xs font-medium text-on-surface-variant/60">No notes written for this user yet.</p>
                    </div>
                  )}

                  {/* Note Creator Form */}
                  <form onSubmit={handleSaveNote} className="space-y-4 border-t border-outline-variant/15 pt-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-primary">Add/Edit Profile Note</label>
                      <textarea
                        required
                        rows={3}
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Log internal comments here..."
                        className="w-full border border-outline-variant/20 rounded-xl p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-xs transition-all placeholder:text-on-surface-variant/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-primary">Update Risk Reason (Optional)</label>
                      <input
                        type="text"
                        value={riskTriggerInput}
                        onChange={(e) => setRiskTriggerInput(e.target.value)}
                        placeholder="e.g. Payment Dispute Flag, Account Shared"
                        className="w-full border border-outline-variant/20 rounded-xl p-3 bg-surface-container focus:ring-2 focus:ring-primary/20 outline-none text-xs transition-all placeholder:text-on-surface-variant/50"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full rounded-xl py-3 font-bold text-xs"
                      disabled={isPending}
                    >
                      {isPending ? "Saving changes..." : "Save CRM Profile Metadata"}
                    </Button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* DENSE CONFIRMATION MODALS */}
      {modalType && targetCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-55">
          <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/20 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h4 className="text-base font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              Confirm Operational Override
            </h4>
            <p className="text-xs text-on-surface-variant/80 font-normal mt-3">
              Are you sure you want to update <span className="font-bold text-primary">{targetCustomer.full_name || "this customer"}</span>&apos;s account status to{" "}
              <span className="font-bold uppercase tracking-widest text-primary">
                {modalType === "suspend" ? "suspended" : modalType === "flag" ? "flagged" : "active"}
              </span>?
            </p>
            {modalType === "suspend" && (
              <p className="text-[10px] text-error font-semibold mt-2">
                ⚠️ This will block this user from accessing booking portals or logging in.
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="slate"
                size="sm"
                className="rounded-lg font-bold text-xs"
                onClick={() => {
                  setModalType(null);
                  setTargetCustomer(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant={modalType === "suspend" ? "primary" : "secondary"}
                size="sm"
                className={`rounded-lg font-bold text-xs ${modalType === "suspend" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={executeStatusChange}
                disabled={isPending}
              >
                {isPending ? "Processing..." : "Confirm Status"}
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
            className="fixed w-44 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-9999 p-1 divide-y divide-outline-variant/10 text-left animate-in fade-in duration-100"
            style={{
              top: `${
                dropdownMenu.rect.bottom + 150 > window.innerHeight
                  ? dropdownMenu.rect.top - 155
                  : dropdownMenu.rect.bottom + 4
              }px`,
              left: `${dropdownMenu.rect.right - 176}px`
            }}
          >
            <div className="py-1">
              <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-2.5 py-0.5 tracking-wider">Management</p>
              {dropdownMenu.customer.status !== 'suspended' && (
                <button 
                  onClick={() => {
                    openConfirmation(dropdownMenu.customer, "suspend");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-error font-semibold hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">block</span>
                  Suspend Account
                </button>
              )}
              {dropdownMenu.customer.status !== 'flagged' && (
                <button 
                  onClick={() => {
                    openConfirmation(dropdownMenu.customer, "flag");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#D97706] font-semibold hover:bg-amber-500/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  Flag for Review
                </button>
              )}
              {dropdownMenu.customer.status !== 'active' && (
                <button 
                  onClick={() => {
                    openConfirmation(dropdownMenu.customer, "reactivate");
                    setDropdownMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-success font-semibold hover:bg-success/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Reactivate Account
                </button>
              )}
            </div>

            <div className="py-1">
              <button 
                onClick={() => {
                  openDrawer(dropdownMenu.customer);
                  setActiveDrawerTab("notes");
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-primary font-semibold hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">chat_bubble</span>
                Add Internal Note
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}
