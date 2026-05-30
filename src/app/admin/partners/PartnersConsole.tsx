"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SerializedPartner } from "./page";
import { 
  updatePartnerStatusAction, 
  updatePartnerTierAction, 
  reviewKycAction, 
  onboardPartnerAction 
} from "./actions";

interface PartnersConsoleProps {
  initialPartners: SerializedPartner[];
  pendingBookings?: { id: string; status: string; created_at: string; pincode: string | null; city: string | null; services: { title: string } | null }[];
}

export function PartnersConsole({ initialPartners, pendingBookings: _pendingBookings }: PartnersConsoleProps) {
  const [partners, setPartners] = useState<SerializedPartner[]>(initialPartners);
  const [isPending, startTransition] = useTransition();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [selectedKyc, setSelectedKyc] = useState<string>("All");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // KYC Side Drawer States
  const [selectedPartnerForKyc, setSelectedPartnerForKyc] = useState<SerializedPartner | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [kycSubmitError, setKycSubmitError] = useState<string | null>(null);
  const [kycSubmitSuccess, setKycSubmitSuccess] = useState<string | null>(null);

  // Command Profile Deep-Dive Overlay States
  const [activeCommandPartner, setActiveCommandPartner] = useState<SerializedPartner | null>(null);
  const [activeTab, setActiveTab] = useState<"payouts" | "reviews" | "logistics">("payouts");

  // Onboard Partner Modal States
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "Roorkee",
    service_tier: "standard" as "premium" | "standard"
  });
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState<string | null>(null);

  // Emergency Dispatch Modal States
  const [emergencyBookingPartnerId, setEmergencyBookingPartnerId] = useState<string | null>(null);
  const [emergencyBookingSelected, setEmergencyBookingSelected] = useState("BK-8842 - Pest Control (Roorkee)");
  const [emergencySuccess, setEmergencySuccess] = useState<string | null>(null);

  // Dropdown UI state for specific row actions
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Compile list of unique cities for filtering
  const allCities = Array.from(
    new Set(partners.flatMap(p => p.cities).concat(partners.map(p => p.phone ? "Roorkee" : "Haridwar")))
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

    // 2. Service Tier Filter
    if (selectedTier !== "All" && partner.service_tier !== selectedTier.toLowerCase()) {
      return false;
    }

    // 3. Operational Real-time Status Filter
    if (selectedStatus !== "All") {
      if (selectedStatus === "Online" && partner.status !== "active") return false;
      if (selectedStatus === "Offline" && partner.status !== "offline") return false;
      if (selectedStatus === "Busy" && partner.status !== "busy") return false;
      if (selectedStatus === "Suspended" && partner.status !== "suspended") return false;
    }

    // 4. City Covered Filter
    if (selectedCity !== "All" && !partner.cities.includes(selectedCity) && selectedCity !== "Roorkee") {
      // Fallback fallback checks
      if (selectedCity === "Roorkee" && partner.cities.length === 0) return true;
      return false;
    }

    // 5. Verification Progress Filter
    if (selectedKyc !== "All" && partner.kyc_status !== selectedKyc.toLowerCase()) {
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
    setOpenDropdownId(null);
    startTransition(async () => {
      try {
        await updatePartnerStatusAction(partnerId, newStatus);
        setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, status: newStatus } : p));
        // Also update details in active sub-workspace
        if (activeCommandPartner?.id === partnerId) {
          setActiveCommandPartner(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  const handleUpdateTier = (partnerId: string, newTier: 'premium' | 'standard') => {
    setOpenDropdownId(null);
    startTransition(async () => {
      try {
        await updatePartnerTierAction(partnerId, newTier);
        setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, service_tier: newTier } : p));
        if (activeCommandPartner?.id === partnerId) {
          setActiveCommandPartner(prev => prev ? { ...prev, service_tier: newTier } : null);
        }
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  const handleReviewKyc = (status: 'approved' | 'rejected') => {
    if (!selectedPartnerForKyc) return;
    const partnerId = selectedPartnerForKyc.id;

    if (status === 'rejected' && !kycRejectReason.trim()) {
      setKycSubmitError("Please provide a rejection reason.");
      return;
    }

    setKycSubmitError(null);
    setKycSubmitSuccess(null);

    startTransition(async () => {
      try {
        await reviewKycAction(partnerId, status, kycRejectReason);
        setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, kyc_status: status, kyc_rejection_reason: status === 'rejected' ? kycRejectReason : null } : p));
        setKycSubmitSuccess(`KYC profile successfully ${status === 'approved' ? 'approved' : 'rejected'}!`);
        setTimeout(() => {
          setSelectedPartnerForKyc(null);
          setKycRejectReason("");
          setKycSubmitSuccess(null);
        }, 1500);
      } catch (err: any) {
        setKycSubmitError(err.message || "Failed to update compliance details.");
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
        const res = await onboardPartnerAction(onboardForm);
        if (res.success) {
          const newPartner: SerializedPartner = {
            id: res.partnerId || crypto.randomUUID(),
            full_name: onboardForm.full_name,
            email: onboardForm.email,
            phone: onboardForm.phone,
            avatar_url: null,
            status: 'offline',
            service_tier: onboardForm.service_tier,
            kyc_status: 'pending',
            kyc_rejection_reason: null,
            kyc_documents: null,
            rating_avg: 4.8,
            jobs_done: 0,
            jobs_cancelled: 0,
            reliability_rate: 98,
            skills: ["General Pest Control"],
            categories: ["Pest Control Services"],
            cities: [onboardForm.city],
            pincodes: ["247667"],
            bookings: [],
            reviews: []
          };
          setPartners(prev => [newPartner, ...prev]);
          setOnboardSuccess("New Professional onboarded successfully as Offline pending setup!");
          setTimeout(() => {
            setIsOnboardingModalOpen(false);
            setOnboardForm({
              full_name: "",
              email: "",
              phone: "",
              city: "Roorkee",
              service_tier: "standard"
            });
            setOnboardSuccess(null);
          }, 1500);
        }
      } catch (err: any) {
        setOnboardError(err.message || "Failed to create partner.");
      }
    });
  };

  const handleEmergencyDispatchSubmit = () => {
    if (!emergencyBookingPartnerId) return;
    setEmergencySuccess(null);
    startTransition(async () => {
      try {
        // Mock a success
        setEmergencySuccess("Emergency dispatch successfully routed! Partner assigned.");
        // Transition partner status to Busy / On Job
        setPartners(prev => prev.map(p => p.id === emergencyBookingPartnerId ? { ...p, status: 'busy' } : p));
        setTimeout(() => {
          setEmergencyBookingPartnerId(null);
          setEmergencySuccess(null);
        }, 1500);
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* ─── 1. FLEET SEARCH, FILTERS, & ONBOARDING CONTROLS ROW ─── */}
      <Card variant="glass" className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Input Box */}
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, mobile, skills, or city..."
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

          {/* Filtering Dropdown Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Filter: Tier */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedTier}
                onChange={(e) => handleFilterChange(setSelectedTier, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">⚡ All Tiers</option>
                <option value="Premium">Premium Partner</option>
                <option value="Standard">Standard Partner</option>
              </select>
            </div>

            {/* Filter: Status */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
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
                className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">📍 All Cities</option>
                <option value="Roorkee">Roorkee</option>
                {allCities.filter(c => c !== "Roorkee").map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Filter: KYC Verification */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedKyc}
                onChange={(e) => handleFilterChange(setSelectedKyc, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[11px] uppercase tracking-wider font-extrabold px-3 py-3 rounded-2xl border border-outline-variant/40 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">🛡️ All Compliance</option>
                <option value="Approved">KYC Verified</option>
                <option value="Pending">KYC Pending</option>
                <option value="Rejected">KYC Rejected</option>
              </select>
            </div>

          </div>

          {/* Action Anchor Button */}
          <Button
            variant="primary"
            onClick={() => setIsOnboardingModalOpen(true)}
            className="bg-secondary hover:brightness-105 hover:scale-[1.02] text-primary font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shrink-0 transition-all shadow-md shadow-secondary/15"
          >
            <span className="material-symbols-outlined text-lg">person_add</span> Onboard Partner
          </Button>

        </div>
      </Card>

      {/* ─── 2. HIGH-DENSITY FLEET DATA TABLE (RESPONSIVE VIEWPORT STYLES) ─── */}
      <Card variant="solid" className="p-0 overflow-hidden ring-1 ring-outline-variant/10">
        
        {/* LARGE SCREENS: Table-based Operational Data Grid */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-dim/40 border-b border-outline-variant/20 uppercase text-[9px] font-black text-on-surface-variant tracking-widest">
                <th className="py-4.5 px-6">Identity & Tier</th>
                <th className="py-4.5 px-4 text-center">Performance</th>
                <th className="py-4.5 px-4 text-center">Reliability & Cancel Rate</th>
                <th className="py-4.5 px-4">Compliance Status</th>
                <th className="py-4.5 px-6 text-right">Command Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">query_stats</span>
                    <p className="text-sm font-semibold">No matches found for search query or filtering parameters.</p>
                  </td>
                </tr>
              ) : (
                paginatedPartners.map(partner => (
                  <tr 
                    key={partner.id}
                    className="hover:bg-surface-container-low/30 transition-colors group"
                  >
                    {/* Col 1: Identity */}
                    <td className="py-5 px-6 max-w-xs">
                      <div className="flex items-center gap-4">
                        <div className={`relative shrink-0 w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black border transition-all ${partner.service_tier === 'premium' ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant/40'}`}>
                          {partner.avatar_url ? (
                            <img src={partner.avatar_url} alt={partner.full_name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <span>{partner.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</span>
                          )}
                          {partner.service_tier === 'premium' && (
                            <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white text-[8px]">
                              ★
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-primary font-headline uppercase leading-none tracking-tight">{partner.full_name}</h4>
                          <p className="text-[10px] text-on-surface-variant/70 font-semibold truncate max-w-[200px]">
                            {partner.skills.slice(0,2).join(" • ") || "General Services"}
                          </p>
                          <div className="flex gap-1.5 items-center mt-1">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              partner.service_tier === 'premium' 
                                ? 'bg-secondary/15 text-secondary border-secondary/30' 
                                : 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                            }`}>
                              {partner.service_tier}
                            </span>
                            <span className="bg-primary/5 text-primary border border-primary/10 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                              {partner.cities[0] || 'Roorkee'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Performance */}
                    <td className="py-5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-amber-500 fill-amber-500 text-sm">star</span>
                          <span className="text-sm font-black">{partner.rating_avg.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase mt-1 tracking-wider">{partner.jobs_done} Jobs done</span>
                      </div>
                    </td>

                    {/* Col 3: Reliability & Cancel */}
                    <td className="py-5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-sm font-black ${partner.reliability_rate >= 90 ? 'text-primary' : 'text-amber-600'}`}>{partner.reliability_rate}%</span>
                        <span className={`text-[9px] font-extrabold uppercase mt-0.5 tracking-wider ${partner.jobs_cancelled > 2 ? 'text-error' : 'text-on-surface-variant/40'}`}>
                          {partner.jobs_cancelled} cancels
                        </span>
                      </div>
                    </td>

                    {/* Col 4: Status */}
                    <td className="py-5 px-4">
                      <div className="space-y-2">
                        {/* Live status state pill */}
                        {partner.status === 'active' && (
                          <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active / Online
                          </span>
                        )}
                        {partner.status === 'busy' && (
                          <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Busy / On Job
                          </span>
                        )}
                        {partner.status === 'offline' && (
                          <span className="bg-slate-500/10 text-on-surface-variant border border-outline-variant/40 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Offline
                          </span>
                        )}
                        {partner.status === 'suspended' && (
                          <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> Suspended
                          </span>
                        )}

                        {/* KYC verified indicator */}
                        <div className="flex items-center gap-1">
                          {partner.kyc_status === 'approved' ? (
                            <div className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                              <span className="material-symbols-outlined text-[14px]">verified</span> KYC Verified
                            </div>
                          ) : partner.kyc_status === 'rejected' ? (
                            <div className="flex items-center gap-0.5 text-error text-[10px] font-bold uppercase tracking-wide">
                              <span className="material-symbols-outlined text-[14px]">cancel</span> Rejected
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 text-amber-600 text-[10px] font-bold uppercase tracking-wide animate-pulse">
                              <span className="material-symbols-outlined text-[14px]">pending</span> KYC Pending
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Col 5: Actions */}
                    <td className="py-5 px-6 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          onClick={() => {
                            setActiveCommandPartner(partner);
                            setActiveTab("payouts");
                          }}
                          className="bg-primary hover:bg-[#0F172A] text-white text-[9px] uppercase tracking-widest font-black py-2 px-3.5 rounded-xl transition-all"
                        >
                          Command
                        </Button>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            onClick={() => setOpenDropdownId(openDropdownId === partner.id ? null : partner.id)}
                            className="p-1 h-9 w-9 rounded-xl hover:bg-surface-container-high transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </Button>

                          {/* Quick Overrides Row Dropdown Menu */}
                          {openDropdownId === partner.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-outline-variant/30 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="p-1.5 divide-y divide-outline-variant/10">
                                
                                <div className="py-1">
                                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3.5 py-1 tracking-wider">Compliance</p>
                                  <button
                                    onClick={() => {
                                      setSelectedPartnerForKyc(partner);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-sm">badge</span> Audit Document / KYC
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEmergencyBookingPartnerId(partner.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-xl transition-colors flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-sm">bolt</span> Assign Emergency Job
                                  </button>
                                </div>

                                <div className="py-1">
                                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3.5 py-1 tracking-wider">Change Status</p>
                                  {partner.status !== 'active' && (
                                    <button
                                      onClick={() => handleUpdateStatus(partner.id, 'active')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activate / Online
                                    </button>
                                  )}
                                  {partner.status !== 'busy' && (
                                    <button
                                      onClick={() => handleUpdateStatus(partner.id, 'busy')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Mark as Busy / On Job
                                    </button>
                                  )}
                                  {partner.status !== 'offline' && (
                                    <button
                                      onClick={() => handleUpdateStatus(partner.id, 'offline')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-slate-500"></span> Force Offline
                                    </button>
                                  )}
                                  {partner.status !== 'suspended' && (
                                    <button
                                      onClick={() => handleUpdateStatus(partner.id, 'suspended')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-red-600"></span> Suspend Partner
                                    </button>
                                  )}
                                </div>

                                <div className="py-1">
                                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40 px-3.5 py-1 tracking-wider">Service Tier</p>
                                  {partner.service_tier === 'premium' ? (
                                    <button
                                      onClick={() => handleUpdateTier(partner.id, 'standard')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-sm">star_half</span> Demote to Standard
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateTier(partner.id, 'premium')}
                                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-sm">star</span> Make Premium
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- SMALL SCREENS: Fully Responsive Glassmorphic Cards Layout --- */}
        <div className="block lg:hidden divide-y divide-outline-variant/15 p-4 space-y-4">
          {paginatedPartners.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant/50 bg-white rounded-3xl p-6 ring-1 ring-outline-variant/10">
              <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">query_stats</span>
              <p className="text-sm font-semibold">No matches found for search query or filtering parameters.</p>
            </div>
          ) : (
            paginatedPartners.map(partner => (
              <div 
                key={partner.id}
                className="bg-white rounded-3xl p-5 ring-1 ring-outline-variant/10 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Header card info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black border transition-all ${partner.service_tier === 'premium' ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant/40'}`}>
                      {partner.avatar_url ? (
                        <img src={partner.avatar_url} alt={partner.full_name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{partner.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-primary font-headline uppercase leading-none tracking-tight">{partner.full_name}</h4>
                      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-1">
                        {partner.service_tier} • {partner.cities[0] || 'Roorkee'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status pill */}
                  <div>
                    {partner.status === 'active' && <Badge variant="success">Active</Badge>}
                    {partner.status === 'busy' && <Badge variant="warning">Busy</Badge>}
                    {partner.status === 'offline' && <Badge variant="surface">Offline</Badge>}
                    {partner.status === 'suspended' && <Badge variant="danger">Suspended</Badge>}
                  </div>
                </div>

                {/* Subcategory skill badges */}
                <p className="text-[10px] text-on-surface-variant/70 font-semibold truncate leading-relaxed">
                  Skills: {partner.skills.join(" • ") || "General Services"}
                </p>

                {/* Grid performance details */}
                <div className="grid grid-cols-3 gap-3 bg-surface-dim/40 rounded-2xl p-3 border border-outline-variant/10">
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Rating</p>
                    <div className="flex items-center justify-center gap-0.5 text-primary font-black text-sm mt-0.5">
                      <span className="material-symbols-outlined text-amber-500 fill-amber-500 text-xs">star</span>
                      {partner.rating_avg.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Jobs</p>
                    <p className="text-primary font-black text-sm mt-0.5">{partner.jobs_done}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Reliability</p>
                    <p className="text-primary font-black text-sm mt-0.5">{partner.reliability_rate}%</p>
                  </div>
                </div>

                {/* Compliance progress & buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
                  <div className="flex items-center gap-1">
                    {partner.kyc_status === 'approved' ? (
                      <div className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[13px]">verified</span> Verified
                      </div>
                    ) : partner.kyc_status === 'rejected' ? (
                      <div className="flex items-center gap-0.5 text-error text-[10px] font-bold uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[13px]">cancel</span> Rejected
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 text-amber-600 text-[10px] font-bold uppercase tracking-wide animate-pulse">
                        <span className="material-symbols-outlined text-[13px]">pending</span> KYC Pending
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedPartnerForKyc(partner);
                      }}
                      className="p-2 bg-surface-container rounded-xl text-on-surface-variant hover:bg-secondary/15 hover:text-primary transition-colors flex items-center justify-center"
                      title="Audit Compliance Documents"
                    >
                      <span className="material-symbols-outlined text-sm">badge</span>
                    </button>
                    <button
                      onClick={() => {
                        setEmergencyBookingPartnerId(partner.id);
                      }}
                      className="p-2 bg-surface-container rounded-xl text-on-surface-variant hover:bg-secondary/15 hover:text-primary transition-colors flex items-center justify-center"
                      title="Assign Emergency Job"
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                    </button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setActiveCommandPartner(partner);
                        setActiveTab("payouts");
                      }}
                      className="bg-primary hover:bg-[#0F172A] text-white text-[8px] uppercase tracking-widest font-black py-1.5 px-3 rounded-xl transition-all"
                    >
                      Command
                    </Button>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === partner.id ? null : partner.id)}
                      className="p-1.5 h-8 w-8 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">settings</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown in Mobile Card */}
                {openDropdownId === partner.id && (
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3 space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Change Status State</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleUpdateStatus(partner.id, 'active')} className="text-[10px] font-bold p-2 bg-emerald-500/10 text-emerald-700 rounded-xl hover:bg-emerald-50 text-center">Active</button>
                      <button onClick={() => handleUpdateStatus(partner.id, 'busy')} className="text-[10px] font-bold p-2 bg-amber-500/10 text-amber-700 rounded-xl hover:bg-amber-50 text-center">Busy</button>
                      <button onClick={() => handleUpdateStatus(partner.id, 'offline')} className="text-[10px] font-bold p-2 bg-slate-500/10 text-slate-700 rounded-xl hover:bg-slate-100 text-center">Offline</button>
                      <button onClick={() => handleUpdateStatus(partner.id, 'suspended')} className="text-[10px] font-bold p-2 bg-red-500/10 text-red-700 rounded-xl hover:bg-red-50 text-center">Suspend</button>
                    </div>
                    <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider pt-2">Service Tier</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateTier(partner.id, partner.service_tier === 'premium' ? 'standard' : 'premium')} 
                        className="text-[10px] font-bold p-2 w-full bg-primary text-white rounded-xl text-center"
                      >
                        {partner.service_tier === 'premium' ? 'Demote to Standard' : 'Make Premium'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))
          )}
        </div>

        {/* ─── PAGINATION BOTTOM CONTROLS (FULLY RESPONSIVE) ─── */}
        <div className="bg-surface-dim/30 border-t border-outline-variant/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Item count text */}
          <div className="text-xs font-bold text-on-surface-variant/60">
            Showing <span className="text-primary">{Math.min(totalItems, indexOfFirstItem + 1)}</span> to{" "}
            <span className="text-primary">{Math.min(totalItems, indexOfLastItem)}</span> of{" "}
            <span className="text-primary">{totalItems}</span> registered partners
          </div>

          {/* Controls Paginator buttons */}
          <div className="flex items-center gap-3">
            
            {/* Items Per Page dropdown selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-surface-container-low text-primary text-xs font-bold px-2 py-1 rounded-xl border border-outline-variant/40 focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="slate"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 h-9 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </Button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    currentPage === pageNum 
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
                className="px-2 py-1 h-9 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </Button>
            </div>

          </div>

        </div>

      </Card>

      {/* ─── 3. INTERACTIVE SIDE DRAWER (KYC DOCUMENT COMPLIANCE AUDIT) ─── */}
      {selectedPartnerForKyc && (
        <div className="fixed inset-0 bg-[#002261]/20 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-300">
          
          {/* Backdrop Closer */}
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setSelectedPartnerForKyc(null)} 
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6 flex flex-col justify-between border-l border-outline-variant/30 animate-in slide-in-from-right duration-350">
            
            {/* Header info */}
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Compliance center</span>
                  <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Audit documents / KYC</h3>
                  <p className="text-xs text-on-surface-variant/60 font-semibold mt-0.5">{selectedPartnerForKyc.full_name} • Partner ID: #{selectedPartnerForKyc.id.substring(0,8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedPartnerForKyc(null)}
                  className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Status information banner */}
              <div className="bg-surface-dim/50 border border-outline-variant/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40 tracking-wider">Verification status</p>
                  <p className="text-sm font-bold text-primary capitalize mt-0.5">{selectedPartnerForKyc.kyc_status} status</p>
                </div>
                <div>
                  {selectedPartnerForKyc.kyc_status === 'approved' ? (
                    <Badge variant="success">Verified</Badge>
                  ) : selectedPartnerForKyc.kyc_status === 'rejected' ? (
                    <Badge variant="danger">Rejected</Badge>
                  ) : (
                    <Badge variant="warning">Pending Review</Badge>
                  )}
                </div>
              </div>

              {/* Submitted documents scroll grid */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Submitted Document Files</p>
                
                {/* Doc 1: Aadhaar Card */}
                <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 flex items-center justify-between hover:border-secondary transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                      <span className="material-symbols-outlined text-lg">badge</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase">National ID (Aadhaar Card)</p>
                      <p className="text-[10px] text-on-surface-variant/50 font-bold mt-0.5">aadhaar_front_back_verify.pdf • 42 KB</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                </div>

                {/* Doc 2: Driving License */}
                <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 flex items-center justify-between hover:border-secondary transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                      <span className="material-symbols-outlined text-lg">commute</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase">Driving License (DL)</p>
                      <p className="text-[10px] text-on-surface-variant/50 font-bold mt-0.5">dl_valid_till_2031.jpg • 88 KB</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                </div>

                {/* Doc 3: Trade License */}
                <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 flex items-center justify-between hover:border-secondary transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-700">
                      <span className="material-symbols-outlined text-lg">article</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase">Pest Control Certification</p>
                      <p className="text-[10px] text-on-surface-variant/50 font-bold mt-0.5">pest_trade_permit_level2.pdf • 154 KB</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-amber-600">hourglass_empty</span>
                </div>

              </div>

              {/* KYC Rejection Text Area panel */}
              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Reason for Rejection (Required if Rejecting)</p>
                <textarea
                  placeholder="Explain why this professional profile documents are invalid..."
                  value={kycRejectReason}
                  onChange={(e) => setKycRejectReason(e.target.value)}
                  className="w-full bg-surface-container-low text-xs font-semibold p-3.5 rounded-2xl border border-outline-variant/40 focus:border-secondary focus:outline-none min-h-[80px]"
                />
              </div>

              {/* Toast Error Alert inside Drawer */}
              {kycSubmitError && (
                <div className="mt-4 bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-200 flex items-center gap-2 animate-pulse">
                  <span className="material-symbols-outlined text-sm">error</span> {kycSubmitError}
                </div>
              )}

              {/* Toast Success Alert */}
              {kycSubmitSuccess && (
                <div className="mt-4 bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> {kycSubmitSuccess}
                </div>
              )}

            </div>

            {/* Bottom Actions footer */}
            <div className="pt-6 border-t border-outline-variant/15 flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleReviewKyc('rejected')}
                disabled={isPending}
                className="flex-1 py-3 text-red-600 border-red-500/20 hover:bg-red-50 rounded-2xl"
              >
                Reject KYC
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReviewKyc('approved')}
                disabled={isPending}
                className="flex-1 py-3 bg-secondary hover:brightness-105 text-primary rounded-2xl"
              >
                Approve & Verify
              </Button>
            </div>

          </div>

        </div>
      )}

      {/* ─── 4. "COMMAND PROFILE" DEEP-DIVE OVERLAY WORKSPACE ─── */}
      {activeCommandPartner && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-in fade-in duration-300">
          
          <div className="w-full max-w-4xl bg-[#f5f6f8] rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[90vh] border border-outline-variant/20 animate-in zoom-in-95 duration-250">
            
            {/* Header section identical in theme to Partner Profile style */}
            <div className="bg-primary text-white p-6 relative shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-secondary font-black text-xl border border-white/20 relative">
                    {activeCommandPartner.avatar_url ? (
                      <img src={activeCommandPartner.avatar_url} alt={activeCommandPartner.full_name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{activeCommandPartner.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold font-headline uppercase leading-none tracking-tight">{activeCommandPartner.full_name}</h2>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        activeCommandPartner.service_tier === 'premium' ? 'bg-secondary text-primary' : 'bg-white/15 text-white'
                      }`}>
                        {activeCommandPartner.service_tier}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 font-semibold mt-1">Partner ID: #{activeCommandPartner.id.toUpperCase()}</p>
                    <p className="text-xs text-white/70 font-semibold">{activeCommandPartner.phone} • {activeCommandPartner.email}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge variant={activeCommandPartner.status === 'active' ? 'success' : activeCommandPartner.status === 'busy' ? 'warning' : 'outline'} className="py-1 text-xs">
                    {activeCommandPartner.status}
                  </Badge>
                  <Button
                    variant="slate"
                    onClick={() => setActiveCommandPartner(null)}
                    className="p-1 h-9 w-9 bg-white/10 text-white hover:bg-white/20 rounded-xl"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </Button>
                </div>
              </div>

              {/* Tab Navigation header */}
              <div className="flex gap-6 mt-6 border-t border-white/10 pt-4">
                <button
                  onClick={() => setActiveTab("payouts")}
                  className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${
                    activeTab === 'payouts' ? 'text-secondary border-secondary' : 'text-white/60 border-transparent hover:text-white'
                  }`}
                >
                  Payouts & Ledger
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${
                    activeTab === 'reviews' ? 'text-secondary border-secondary' : 'text-white/60 border-transparent hover:text-white'
                  }`}
                >
                  Customer Reviews
                </button>
                <button
                  onClick={() => setActiveTab("logistics")}
                  className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${
                    activeTab === 'logistics' ? 'text-secondary border-secondary' : 'text-white/60 border-transparent hover:text-white'
                  }`}
                >
                  Logistics & Tracking
                </button>
              </div>

            </div>

            {/* Scrollable Main body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Tab 1: Payouts & Ledger */}
              {activeTab === 'payouts' && (
                <div className="space-y-6">
                  
                  {/* Ledger Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card variant="glass" className="p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Total Earnings</p>
                      <h3 className="text-2xl font-black text-primary font-headline mt-2">₹{(activeCommandPartner.jobs_done * 850).toLocaleString()}</h3>
                      <p className="text-[8px] font-bold text-secondary uppercase mt-1">Platform Cut 15%</p>
                    </Card>
                    <Card variant="glass" className="p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Pending Clearance</p>
                      <h3 className="text-2xl font-black text-primary font-headline mt-2">₹1,850</h3>
                      <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase mt-1">Settles Mon, 25 May</p>
                    </Card>
                    <Card variant="glass" className="p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Bank Account</p>
                      <h3 className="text-base font-black text-primary font-headline mt-3">HDFC Bank ****9941</h3>
                      <p className="text-[8px] font-bold text-emerald-600 uppercase mt-1">Verified IFSC HDFC0001</p>
                    </Card>
                  </div>

                  {/* Transaction History log */}
                  <div className="bg-white rounded-3xl border border-outline-variant/10 p-5 shadow-sm space-y-4">
                    <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Earnings & Commission Ledger</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold">
                        <thead>
                          <tr className="border-b border-outline-variant/10 text-on-surface-variant/50 uppercase text-[9px] font-black tracking-wider">
                            <th className="pb-3">Booking ID</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Service Details</th>
                            <th className="pb-3 text-right">Job Cost</th>
                            <th className="pb-3 text-right">Payout (85%)</th>
                            <th className="pb-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5 text-primary font-bold">
                          <tr>
                            <td className="py-3 text-secondary">#BK-9912</td>
                            <td className="py-3">18 May 2026</td>
                            <td className="py-3">Cockroach Control Service</td>
                            <td className="py-3 text-right">₹1,200</td>
                            <td className="py-3 text-right text-emerald-700">₹1,020</td>
                            <td className="py-3 text-center"><Badge variant="success">Settled</Badge></td>
                          </tr>
                          <tr>
                            <td className="py-3 text-secondary">#BK-9844</td>
                            <td className="py-3">14 May 2026</td>
                            <td className="py-3">Termite Wood Treatment</td>
                            <td className="py-3 text-right">₹2,800</td>
                            <td className="py-3 text-right text-emerald-700">₹2,380</td>
                            <td className="py-3 text-center"><Badge variant="success">Settled</Badge></td>
                          </tr>
                          <tr>
                            <td className="py-3 text-secondary">#BK-9751</td>
                            <td className="py-3">11 May 2026</td>
                            <td className="py-3">Sofa Fabric Cleaning</td>
                            <td className="py-3 text-right">₹999</td>
                            <td className="py-3 text-right text-emerald-700">₹849</td>
                            <td className="py-3 text-center"><Badge variant="success">Settled</Badge></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Reviews & Ratings */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl border border-outline-variant/10 p-5 shadow-sm flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Quality metrics</p>
                      <h3 className="text-3xl font-black text-primary font-headline mt-1">{activeCommandPartner.rating_avg.toFixed(2)}</h3>
                      <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-1">Based on {activeCommandPartner.jobs_done} customer reviews</p>
                    </div>
                    <div className="flex text-amber-500 gap-1 text-2xl">
                      {[1,2,3,4,5].map(star => (
                        <span key={star} className="material-symbols-outlined fill-amber-500">star</span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Customer Feedback</p>
                  
                  {/* Reviews scrolling list */}
                  <div className="space-y-3">
                    <Card variant="outline" className="p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-primary">UDIT SINGH (Roorkee)</h4>
                          <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase mt-0.5">Booking #BK-9912 • Bed Bug Treatment</p>
                        </div>
                        <div className="flex text-amber-500 text-xs">
                          {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-[14px] fill-amber-500">star</span>)}
                        </div>
                      </div>
                      <p className="text-xs text-primary/80 leading-relaxed font-semibold mt-2">
                        "The pest control treatment was done very cleanly. The technician explained all the precautions nicely. Recommended!"
                      </p>
                    </Card>

                    <Card variant="outline" className="p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-primary">ANANYA SHARMA (Haridwar)</h4>
                          <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase mt-0.5">Booking #BK-9751 • Sofa Fabric Treatment</p>
                        </div>
                        <div className="flex text-amber-500 text-xs">
                          {[1,2,3,4].map(s => <span key={s} className="material-symbols-outlined text-[14px] fill-amber-500">star</span>)}
                        </div>
                      </div>
                      <p className="text-xs text-primary/80 leading-relaxed font-semibold mt-2">
                        "Good clean service. A little late by 15 minutes, but the sofa looks brand new now."
                      </p>
                    </Card>
                  </div>

                </div>
              )}

              {/* Tab 3: Logistics & Real-time Route Tracking */}
              {activeTab === 'logistics' && (
                <div className="space-y-6">
                  
                  {/* Grid layout containing Routes & Map */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Routes timeline */}
                    <div className="bg-white rounded-3xl border border-outline-variant/10 p-5 shadow-sm space-y-4">
                      <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Today's Dispatch Schedule</p>
                      
                      <div className="relative border-l-2 border-outline-variant/60 pl-6 ml-3 space-y-6 text-xs font-bold text-primary">
                        
                        {/* Route 1 */}
                        <div className="relative">
                          <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-md"></span>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">09:30 AM • Completed</span>
                          <h4 className="text-sm font-extrabold mt-1">BK-9912: Bed Bug Eradication</h4>
                          <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-0.5">Civil Lines, Roorkee</p>
                        </div>

                        {/* Route 2 */}
                        <div className="relative animate-pulse-slow">
                          <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-md"></span>
                          <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">02:30 PM • Active Job</span>
                          <h4 className="text-sm font-extrabold mt-1">BK-9844: Cockroach Treatment</h4>
                          <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-0.5">IIT Roorkee Campus, Roorkee</p>
                        </div>

                        {/* Route 3 */}
                        <div className="relative">
                          <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-md"></span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">06:00 PM • Dispatched</span>
                          <h4 className="text-sm font-extrabold mt-1">BK-9751: General Ant Spray</h4>
                          <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-0.5">Roorkee Cantt, Roorkee</p>
                        </div>

                      </div>
                    </div>

                    {/* MOCK DYNAMIC GPS LOGISTICS MAP */}
                    <div className="bg-white rounded-3xl border border-outline-variant/10 p-5 shadow-sm space-y-4">
                      <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-wider">Live Fleet Logistics Route Map</p>
                      
                      {/* Stylized SVG Map with coordinates representation */}
                      <div className="relative bg-surface-dim border border-outline-variant/30 rounded-2xl h-56 w-full overflow-hidden flex items-center justify-center">
                        
                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          {/* Grid backing map lines */}
                          <line x1="20" y1="0" x2="20" y2="300" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="80" y1="0" x2="80" y2="300" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="140" y1="0" x2="140" y2="300" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="200" y1="0" x2="200" y2="300" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="260" y1="0" x2="260" y2="300" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="320" y1="0" x2="320" y2="300" stroke="#E2E8F0" strokeWidth="1" />

                          <line x1="0" y1="40" x2="400" y2="40" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="0" y1="160" x2="400" y2="160" stroke="#E2E8F0" strokeWidth="1" />
                          <line x1="0" y1="220" x2="400" y2="220" stroke="#E2E8F0" strokeWidth="1" />

                          {/* Mapped Roadways */}
                          <path d="M 10 90 L 390 90" stroke="#CBD5E1" strokeWidth="12" fill="none" strokeLinecap="round" />
                          <path d="M 140 10 L 140 210" stroke="#CBD5E1" strokeWidth="12" fill="none" strokeLinecap="round" />
                          <path d="M 10 160 L 390 160" stroke="#CBD5E1" strokeWidth="8" fill="none" strokeLinecap="round" />
                          
                          {/* Mapped Service Boundary Ring */}
                          <circle cx="140" cy="90" r="70" stroke="#a6ce37" strokeWidth="2" strokeDasharray="6,4" fill="#a6ce37" fillOpacity="0.05" />

                          {/* Completed Route Pin */}
                          <circle cx="50" cy="90" r="6" fill="#10B981" />
                          
                          {/* Scheduled Route Pin */}
                          <circle cx="280" cy="160" r="6" fill="#64748B" />

                          {/* Active Dispatch Pin */}
                          <circle cx="140" cy="140" r="6" fill="#F59E0B" />
                        </svg>

                        {/* Mapped location overlay markers */}
                        <div className="absolute top-[80px] left-[130px] animate-bounce bg-[#002261] text-secondary font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-lg border border-secondary">
                          🏁 IIT Roorkee
                        </div>

                        {/* Live active vehicle signal */}
                        <div className="absolute top-[125px] left-[125px] flex items-center justify-center">
                          <span className="absolute inline-flex h-8 w-8 rounded-full bg-secondary/35 animate-ping"></span>
                          <span className="relative rounded-full h-4 w-4 bg-secondary flex items-center justify-center border border-[#002261] shadow">
                            <span className="material-symbols-outlined text-[9px] font-black text-[#002261]">person_pin</span>
                          </span>
                        </div>

                        {/* Boundary badge indicator overlay */}
                        <div className="absolute bottom-2 right-2 bg-[#002261]/80 backdrop-blur text-white text-[8px] font-black tracking-widest px-2.5 py-1 rounded-xl">
                          ACTIVE RADIUS: 6.5 KM
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Sub-workspace bottom actions */}
            <div className="p-6 border-t border-outline-variant/15 bg-white flex justify-end">
              <Button
                variant="primary"
                onClick={() => setActiveCommandPartner(null)}
                className="bg-primary hover:bg-[#0F172A] text-white text-[10px] uppercase font-black tracking-widest py-3 px-6 rounded-2xl"
              >
                Close Control Desk
              </Button>
            </div>

          </div>

        </div>
      )}

      {/* ─── 5. INTERACTIVE ONBOARD PARTNER MODAL ─── */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          
          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOnboardingModalOpen(false)} />

          {/* Form Modal Box container */}
          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">New professional setup</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Onboard Partner</h3>
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

              {/* Field 4: Home City & Tier Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Default City</label>
                  <select
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                  >
                    <option value="Roorkee">Roorkee</option>
                    <option value="Haridwar">Haridwar</option>
                    <option value="Dehradun">Dehradun</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Service Tier</label>
                  <select
                    value={onboardForm.service_tier}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, service_tier: e.target.value as 'premium' | 'standard' }))}
                    className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none"
                  >
                    <option value="standard">Standard Partner</option>
                    <option value="premium">Premium Partner</option>
                  </select>
                </div>

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

      {/* ─── 6. INTERACTIVE EMERGENCY DISPATCH ASSIGNMENT MODAL ─── */}
      {emergencyBookingPartnerId && (
        <div className="fixed inset-0 bg-[#002261]/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          
          <div className="absolute inset-0 cursor-pointer" onClick={() => setEmergencyBookingPartnerId(null)} />

          <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Quick emergency dispatch</span>
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
                This override will bypass the automatic Round-Robin logistics queue to force-assign a pending home service booking directly onto this partner's itinerary.
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
                  Dispatch Override
                </Button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
