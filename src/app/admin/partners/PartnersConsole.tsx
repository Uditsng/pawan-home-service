"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SerializedPartner } from "./page";
import {
  updatePartnerStatusAction,
  onboardPartnerAction,
  editPartnerAction
} from "./actions";

interface PartnersConsoleProps {
  initialPartners: SerializedPartner[];
  allServices: { id: string; title: string; category_name: string }[];
}

export function PartnersConsole({ initialPartners, allServices = [] }: PartnersConsoleProps) {
  const [partners, setPartners] = useState<SerializedPartner[]>(initialPartners);
  const [isPending, startTransition] = useTransition();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Onboard Technician Modal States
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

  // Edit Technician Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    city: "Roorkee",
    status: "active" as "active" | "offline" | "busy" | "suspended",
    is_available: true,
    services: [] as string[],
    pincodes: ""
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Emergency Dispatch Modal States
  const [emergencyBookingPartnerId, setEmergencyBookingPartnerId] = useState<string | null>(null);
  const [emergencyBookingSelected, setEmergencyBookingSelected] = useState("BK-8842 - Pest Control (Roorkee)");
  const [emergencySuccess, setEmergencySuccess] = useState<string | null>(null);

  // Dropdown UI state for specific row actions (Portal-based to avoid overflow clipping)
  const [dropdownMenu, setDropdownMenu] = useState<{
    partnerId: string;
    rect: DOMRect;
    partner: SerializedPartner;
  } | null>(null);

  // Close dropdown on scroll or resize to prevent float/alignment issues
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

  // Compile list of unique cities dynamically filled by partners/technicians
  const allCities = Array.from(
    new Set(partners.flatMap(p => p.cities))
  ).filter(Boolean);

  // --- Filtering Logic ---
  const filteredPartners = partners.filter(partner => {
    // 1. Universal Search Index (Name, Phone, Email, Skills, Cities)
    const normalizedQuery = searchTerm.toLowerCase();
    const matchesSearch =
      partner.full_name.toLowerCase().includes(normalizedQuery) ||
      partner.phone.includes(searchTerm) ||
      partner.email.toLowerCase().includes(normalizedQuery) ||
      partner.skills.some(skill => skill.toLowerCase().includes(normalizedQuery)) ||
      partner.cities.some(city => city.toLowerCase().includes(normalizedQuery));

    if (!matchesSearch) return false;

    // 2. Operational Real-time Status Filter
    if (selectedStatus !== "All") {
      if (selectedStatus === "Online" && partner.status !== "active") return false;
      if (selectedStatus === "Offline" && partner.status !== "offline") return false;
      if (selectedStatus === "Busy" && partner.status !== "busy") return false;
      if (selectedStatus === "Suspended" && partner.status !== "suspended") return false;
    }

    // 3. City Covered Filter
    if (selectedCity !== "All" && !partner.cities.includes(selectedCity)) {
      return false;
    }

    return true;
  });

  // --- Pagination Slice ---
  const totalItems = filteredPartners.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedPartners = filteredPartners.slice(indexOfFirstItem, indexOfLastItem);

  // Reset pagination on filter change
  const handleFilterChange = (filterSetter: (val: string) => void, val: string) => {
    filterSetter(val);
    setCurrentPage(1);
  };

  // --- Operational Actions ---

  const handleUpdateStatus = (partnerId: string, newStatus: 'active' | 'offline' | 'busy' | 'suspended') => {
    setDropdownMenu(null);
    startTransition(async () => {
      try {
        await updatePartnerStatusAction(partnerId, newStatus);
        setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, status: newStatus } : p));
      } catch (err: unknown) {
        console.error(err);
      }
    });
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.full_name || !onboardForm.email || !onboardForm.phone) {
      setOnboardError("All standard fields are required.");
      return;
    }

    setOnboardError(null);
    setOnboardSuccess(null);

    startTransition(async () => {
      try {
        const payload = {
          full_name: onboardForm.full_name,
          email: onboardForm.email,
          phone: onboardForm.phone,
          password: onboardForm.password || undefined,
          city: "Roorkee",
          service_tier: "standard" as "premium" | "standard",
          services: [],
          pincodes: []
        };
        const res = await onboardPartnerAction(payload);
        if (res.success) {
          const newPartner: SerializedPartner = {
            id: res.partnerId || crypto.randomUUID(),
            full_name: onboardForm.full_name,
            email: onboardForm.email,
            phone: onboardForm.phone,
            avatar_url: null,
            status: 'offline',
            service_tier: 'standard',
            kyc_status: 'approved',
            kyc_rejection_reason: null,
            kyc_documents: null,
            rating_avg: 5.0,
            jobs_done: 0,
            jobs_cancelled: 0,
            reliability_rate: 100,
            skills: [],
            categories: [],
            cities: [],
            pincodes: [],
            bookings: [],
            reviews: []
          };
          setPartners(prev => [newPartner, ...prev]);
          setOnboardSuccess("New Technician onboarded successfully! Edit profile to add skills.");
          setTimeout(() => {
            setIsOnboardingModalOpen(false);
            setOnboardForm({
              full_name: "",
              email: "",
              phone: "",
              password: ""
            });
            setOnboardSuccess(null);
          }, 1500);
        }
      } catch (err: unknown) {
        setOnboardError((err as Error).message || "Failed to create technician.");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.full_name || !editForm.email || !editForm.phone) {
      setEditError("Full name, email, and phone are required.");
      return;
    }

    setEditError(null);
    setEditSuccess(null);

    startTransition(async () => {
      try {
        const payload = {
          id: editForm.id,
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          password: editForm.password || undefined,
          city: editForm.city,
          service_tier: "standard" as "premium" | "standard",
          status: editForm.status,
          is_available: editForm.status !== 'offline',
          services: editForm.services,
          pincodes: editForm.pincodes.split(',').map(p => p.trim()).filter(Boolean)
        };
        const res = await editPartnerAction(payload);
        if (res.success) {
          setPartners(prev => prev.map(p => {
            if (p.id === editForm.id) {
              return {
                ...p,
                full_name: editForm.full_name,
                email: editForm.email,
                phone: editForm.phone,
                city: editForm.city,
                cities: [editForm.city],
                status: editForm.status,
                skills: allServices.filter(s => editForm.services.includes(s.id)).map(s => s.title),
                categories: Array.from(new Set(allServices.filter(s => editForm.services.includes(s.id)).map(s => s.category_name))),
                pincodes: payload.pincodes
              };
            }
            return p;
          }));
          setEditSuccess("Technician profile updated successfully!");
          setTimeout(() => {
            setIsEditModalOpen(false);
            setEditSuccess(null);
          }, 1500);
        }
      } catch (err: unknown) {
        setEditError((err as Error).message || "Failed to update technician.");
      }
    });
  };

  const handleEmergencyDispatchSubmit = () => {
    if (!emergencyBookingPartnerId) return;
    setEmergencySuccess(null);
    startTransition(async () => {
      try {
        // Mock a success
        setEmergencySuccess("Manual dispatch successfully routed! Technician assigned.");
        // Transition partner status to Busy / On Job
        setPartners(prev => prev.map(p => p.id === emergencyBookingPartnerId ? { ...p, status: 'busy' } : p));
        setTimeout(() => {
          setEmergencyBookingPartnerId(null);
          setEmergencySuccess(null);
        }, 1500);
      } catch (err: unknown) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-4">

      {/* ─── 1. FLEET SEARCH, FILTERS, & ONBOARDING CONTROLS ROW ─── */}
      <Card variant="glass" className="p-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

          {/* Search Input Box */}
          <div className="relative flex-1 group" suppressHydrationWarning={true}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, mobile, skills, or city..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              autoComplete="off"
              name="search"
              id="admin-partners-search"
              suppressHydrationWarning={true}
              className="w-full bg-surface-container-low text-primary text-xs font-semibold pl-9 pr-4 py-2 rounded-lg border border-outline-variant/30 focus:border-secondary/70 focus:outline-none focus:ring-1 focus:ring-secondary/10 transition-all placeholder-on-surface-variant/40"
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

          {/* Filtering Dropdown Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 lg:flex-none">

            {/* Filter: Status */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/30 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">📡 All Statuses</option>
                <option value="Online">Online / Active</option>
                <option value="Busy">Busy / On Job</option>
                <option value="Offline">Offline</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Filter: City */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedCity}
                onChange={(e) => handleFilterChange(setSelectedCity, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/30 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">📍 All Cities</option>
                {allCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Action Anchor Button */}
          <Button
            variant="primary"
            onClick={() => setIsOnboardingModalOpen(true)}
            className="bg-secondary hover:brightness-105 hover:scale-[1.01] text-primary font-black text-xs uppercase tracking-widest px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md shadow-secondary/10"
          >
            <span className="material-symbols-outlined text-base">person_add</span> Onboard Technician
          </Button>

        </div>
      </Card>

      {/* ─── 2. HIGH-DENSITY FLEET DATA TABLE (RESPONSIVE VIEWPORT STYLES) ─── */}
      <Card variant="solid" className="p-0 overflow-visible ring-1 ring-outline-variant/10">

        {/* Table-based Responsive Compact Operational Data Grid */}
        <div className="overflow-x-auto min-h-[180px]">
          <table className="w-full border-collapse text-left min-w-[750px]">
            <thead>
              <tr className="bg-surface-dim/40 border-b border-outline-variant/20 uppercase text-[9px] font-black text-on-surface-variant tracking-widest">
                <th className="py-2 px-3">Identity</th>
                <th className="py-2 px-3 text-center w-28">Performance</th>
                <th className="py-2 px-3 text-center w-36">Reliability & Cancel</th>
                <th className="py-2 px-3 w-56">Status & Service Area</th>
                <th className="py-2 px-3 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-2xl block mb-1 opacity-40">query_stats</span>
                    <p className="text-[11px] font-semibold">No matches found for search query or filtering parameters.</p>
                  </td>
                </tr>
              ) : (
                paginatedPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-surface-container-low/20 transition-colors"
                  >
                    {/* Col 1: Identity */}
                    <td className="py-1.5 px-3 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-black border border-outline-variant/30 text-[9px]">
                          {partner.avatar_url ? (
                            <Image src={partner.avatar_url} alt={partner.full_name} width={28} height={28} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span>{partner.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-[11px] font-bold text-primary font-headline uppercase leading-none tracking-tight truncate">{partner.full_name}</h4>
                          <p className="text-[9px] text-on-surface-variant/70 font-medium truncate max-w-[180px]">
                            {partner.skills.slice(0, 2).join(" • ") || "General Services"}
                          </p>
                          <div className="flex gap-1 items-center mt-0.5">
                            <span className="bg-primary/5 text-primary border border-primary/10 text-[7.5px] font-extrabold px-1 rounded uppercase">
                              {partner.cities[0] || 'Roorkee'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Performance */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-primary">
                          <span className="material-symbols-outlined text-amber-500 fill-amber-500 text-[10px]">star</span>
                          <span className="text-[11px] font-bold">{partner.rating_avg.toFixed(1)}</span>
                        </div>
                        <span className="text-[8px] text-on-surface-variant/50 font-bold uppercase tracking-wider">{partner.jobs_done} Jobs done</span>
                      </div>
                    </td>

                    {/* Col 3: Reliability & Cancel */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-[11px] font-bold ${partner.reliability_rate >= 90 ? 'text-primary' : 'text-amber-600'}`}>{partner.reliability_rate}%</span>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider ${partner.jobs_cancelled > 2 ? 'text-error' : 'text-on-surface-variant/40'}`}>
                          {partner.jobs_cancelled} cancels
                        </span>
                      </div>
                    </td>

                    {/* Col 4: Status */}
                    <td className="py-1.5 px-3">
                      <div className="space-y-0.5">
                        {/* Live status state pill */}
                        {partner.status === 'active' && (
                          <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span> Online
                          </span>
                        )}
                        {partner.status === 'busy' && (
                          <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span> Busy / On Job
                          </span>
                        )}
                        {partner.status === 'offline' && (
                          <span className="bg-slate-500/10 text-on-surface-variant border border-outline-variant/40 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span> Offline
                          </span>
                        )}
                        {partner.status === 'suspended' && (
                          <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> Suspended
                          </span>
                        )}

                        <div className="text-[9px] text-on-surface-variant/70 font-semibold truncate max-w-[200px]">
                          Pincodes: {partner.pincodes.join(", ") || "None"}
                        </div>
                      </div>
                    </td>

                    {/* Col 5: Actions */}
                    <td className="py-1.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          if (dropdownMenu?.partnerId === partner.id) {
                            setDropdownMenu(null);
                          } else {
                            setDropdownMenu({
                              partnerId: partner.id,
                              rect,
                              partner
                            });
                          }
                        }}
                        className="p-1 h-6 w-6 rounded-lg hover:bg-surface-container-high transition-colors inline-flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-base">more_vert</span>
                      </Button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PAGINATION BOTTOM CONTROLS (FULLY RESPONSIVE) ─── */}
        <div className="bg-surface-dim/30 border-t border-outline-variant/15 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Item count text */}
          <div className="text-[11px] font-bold text-on-surface-variant/60">
            Showing <span className="text-primary">{Math.min(totalItems, indexOfFirstItem + 1)}</span> to{" "}
            <span className="text-primary">{Math.min(totalItems, indexOfLastItem)}</span> of{" "}
            <span className="text-primary">{totalItems}</span> registered technicians
          </div>

          {/* Controls Paginator buttons */}
          <div className="flex items-center gap-2">

            {/* Items Per Page dropdown selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/40">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-surface-container-low text-primary text-[11px] font-bold px-2 py-1 rounded-lg border border-outline-variant/40 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="slate"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 h-7 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </Button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all ${currentPage === pageNum
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface-container-low text-primary hover:bg-surface-container-high'
                    }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button
                variant="slate"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 h-7 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Button>
            </div>

          </div>

        </div>

      </Card>

      {/* ─── 4. INTERACTIVE ONBOARD TECHNICIAN MODAL ─── */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOnboardingModalOpen(false)} />

          {/* Form Modal Box container */}
          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">New technician setup</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Onboard Technician</h3>
              </div>
              <button
                onClick={() => setIsOnboardingModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs font-bold text-primary">

              {/* Field 1: Full name */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={onboardForm.full_name}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 2: Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh.kumar@example.com"
                  value={onboardForm.email}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 2.5: Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Password (optional)</label>
                <input
                  type="password"
                  placeholder="Default: PavanStaff123!"
                  value={onboardForm.password}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 3: Phone */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9942314511"
                  value={onboardForm.phone}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Error messages toast in Modal */}
              {onboardError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span> {onboardError}
                </div>
              )}

              {/* Success messages toast in Modal */}
              {onboardSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> {onboardSuccess}
                </div>
              )}

              {/* Button footer actions */}
              <div className="pt-4 border-t border-outline-variant/15 flex gap-3">
                <Button
                  type="button"
                  variant="slate"
                  onClick={() => setIsOnboardingModalOpen(false)}
                  className="flex-1 py-3 text-primary bg-surface-container hover:bg-surface-container-high rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  className="flex-1 py-3 bg-secondary hover:brightness-105 text-primary rounded-xl"
                >
                  Onboard Pro
                </Button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* ─── 5. INTERACTIVE EDIT TECHNICIAN MODAL ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsEditModalOpen(false)} />

          {/* Form Modal Box container */}
          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Technician profile updates</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Edit Technician</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-primary">

              {/* Field 1: Full name */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 2: Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh.kumar@example.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 2.5: Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Password Override (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="New password value..."
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Field 3: Phone */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9942314511"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                />
              </div>



              {/* Error messages toast in Modal */}
              {editError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span> {editError}
                </div>
              )}

              {/* Success messages toast in Modal */}
              {editSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> {editSuccess}
                </div>
              )}

              {/* Button footer actions */}
              <div className="pt-4 border-t border-outline-variant/15 flex gap-3">
                <Button
                  type="button"
                  variant="slate"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 text-primary bg-surface-container hover:bg-surface-container-high rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  className="flex-1 py-3 bg-secondary hover:brightness-105 text-primary rounded-xl"
                >
                  Save Changes
                </Button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* ─── 6. INTERACTIVE EMERGENCY DISPATCH ASSIGNMENT MODAL ─── */}
      {emergencyBookingPartnerId && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          <div className="absolute inset-0 cursor-pointer" onClick={() => setEmergencyBookingPartnerId(null)} />

          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Quick dispatch control</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Assign Booking</h3>
              </div>
              <button
                onClick={() => setEmergencyBookingPartnerId(null)}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-primary">
              <p className="text-[10px] text-on-surface-variant/70 leading-relaxed font-semibold">
                Force-assign a pending home service booking directly onto this technician&apos;s itinerary.
              </p>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Select Pending Job</label>
                <select
                  value={emergencyBookingSelected}
                  onChange={(e) => setEmergencyBookingSelected(e.target.value)}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:outline-none"
                >
                  <option value="BK-8842">BK-8842 - Pest Control (Roorkee Cantt)</option>
                  <option value="BK-8890">BK-8890 - Sofa Deep Cleaning (Civil Lines)</option>
                  <option value="BK-8901">BK-8901 - Plumber Service (IIT Roorkee)</option>
                </select>
              </div>

              {emergencySuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> {emergencySuccess}
                </div>
              )}

              <div className="pt-4 border-t border-outline-variant/15 flex gap-3">
                <Button
                  type="button"
                  variant="slate"
                  onClick={() => setEmergencyBookingPartnerId(null)}
                  className="flex-1 py-3 text-primary bg-surface-container hover:bg-surface-container-high rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleEmergencyDispatchSubmit}
                  disabled={isPending}
                  className="flex-1 py-3 bg-secondary hover:brightness-105 text-primary rounded-xl"
                >
                  Dispatch Assignment
                </Button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ─── PORTAL-BASED ROW ACTIONS DROPDOWN ─── */}
      {dropdownMenu && createPortal(
        <>
          {/* Backdrop for outside click */}
          <div
            className="fixed inset-0 z-9998 bg-transparent"
            onClick={() => setDropdownMenu(null)}
          />

          {/* Menu container */}
          <div
            className="fixed w-48 bg-white border border-outline-variant/30 rounded-xl shadow-xl z-9999 p-1 divide-y divide-outline-variant/10 text-left animate-in fade-in duration-100"
            style={{
              top: `${dropdownMenu.rect.bottom + window.scrollY + 160 > window.innerHeight + window.scrollY
                  ? dropdownMenu.rect.top + window.scrollY - 165 // open upward
                  : dropdownMenu.rect.bottom + window.scrollY + 4 // open downward
                }px`,
              left: `${dropdownMenu.rect.right - 192 + window.scrollX}px` // aligned to the right side of button
            }}
          >
            <div className="py-0.5">
              <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-2.5 py-0.5 tracking-wider">Management</p>
              <button
                onClick={() => {
                  setEditForm({
                    id: dropdownMenu.partner.id,
                    full_name: dropdownMenu.partner.full_name,
                    email: dropdownMenu.partner.email,
                    phone: dropdownMenu.partner.phone,
                    password: "",
                    city: dropdownMenu.partner.cities[0] || "Roorkee",
                    status: dropdownMenu.partner.status,
                    is_available: dropdownMenu.partner.status !== 'offline',
                    services: allServices.filter(s => dropdownMenu.partner.skills.includes(s.title)).map(s => s.id),
                    pincodes: dropdownMenu.partner.pincodes.join(", ")
                  });
                  setIsEditModalOpen(true);
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">edit</span> Edit Technician
              </button>
              <button
                onClick={() => {
                  setEmergencyBookingPartnerId(dropdownMenu.partner.id);
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">bolt</span> Assign Dispatch Job
              </button>
            </div>

            <div className="py-0.5">
              <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-2.5 py-0.5 tracking-wider">Change Status</p>
              {dropdownMenu.partner.status !== 'active' && (
                <button
                  onClick={() => handleUpdateStatus(dropdownMenu.partner.id, 'active')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-55 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Activate / Online
                </button>
              )}
              {dropdownMenu.partner.status !== 'busy' && (
                <button
                  onClick={() => handleUpdateStatus(dropdownMenu.partner.id, 'busy')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-55 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Mark as Busy
                </button>
              )}
              {dropdownMenu.partner.status !== 'offline' && (
                <button
                  onClick={() => handleUpdateStatus(dropdownMenu.partner.id, 'offline')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Force Offline
                </button>
              )}
              {dropdownMenu.partner.status !== 'suspended' && (
                <button
                  onClick={() => handleUpdateStatus(dropdownMenu.partner.id, 'suspended')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-55 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Suspend
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
