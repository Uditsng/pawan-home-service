"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SerializedPartner, PartnerBooking, PartnerReview } from "./page";
import {
  updatePartnerStatusAction,
  onboardPartnerAction,
  editPartnerAction,
  reviewKycAction,
  savePartnerNoteAction,
  getPartnerBookingsAction,
  getPartnerReviewsAction,
  getPartnerEarningsAction,
  type PartnerEarningsSummary,
} from "./actions";

interface RawBookingFromAction {
  id: string;
  status: string;
  total_amount: number | string;
  created_at: string;
  scheduled_date: string | null;
  pincode: string | null;
  city: string | null;
  services: {
    title: string | null;
    category: string | null;
  } | null;
  customer: {
    full_name: string | null;
  } | null;
}

interface RawReviewFromAction {
  id: string;
  rating: number | string;
  comment: string | null;
  created_at: string;
  bookings: {
    services: {
      title: string | null;
    } | null;
  } | null;
  customer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PartnersConsoleProps {
  initialPartners: SerializedPartner[];
  allServices: { id: string; title: string; category_name: string }[];
  fleetCounts?: {
    total: number;
    active: number;
    busy: number;
    offline: number;
    suspended: number;
  };
}

const MENU_WIDTH_PX = 192;
const MENU_GAP_PX = 4;
const VIEWPORT_MARGIN_PX = 8;
const MENU_EST_HEIGHT_PX = 250;

/**
 * Viewport-anchored placement for the fixed-position row actions menu.
 * getBoundingClientRect() is viewport-relative, matching position:fixed —
 * never mix in window.scrollY/X or the menu lands off-screen when scrolled.
 */
function getMenuPositionStyle(rect: DOMRect): React.CSSProperties {
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX;
  const spaceAbove = rect.top - VIEWPORT_MARGIN_PX;
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN_PX, rect.right - MENU_WIDTH_PX),
    Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_MARGIN_PX)
  );
  const maxHeight = Math.max(160, Math.max(spaceAbove, spaceBelow) - MENU_GAP_PX);

  if (spaceBelow < MENU_EST_HEIGHT_PX && spaceAbove > spaceBelow) {
    return {
      bottom: window.innerHeight - rect.top + MENU_GAP_PX,
      left,
      maxHeight,
    };
  }
  return {
    top: rect.bottom + MENU_GAP_PX,
    left,
    maxHeight,
  };
}

export function PartnersConsole({ initialPartners, allServices = [], fleetCounts }: PartnersConsoleProps) {
  const [partners, setPartners] = useState<SerializedPartner[]>(initialPartners);
  const [isPending, startTransition] = useTransition();

  // On-demand bookings and reviews cache
  const [drawerBookings, setDrawerBookings] = useState<PartnerBooking[] | null>(null);
  const [isLoadingDrawerBookings, setIsLoadingDrawerBookings] = useState(false);
  const [drawerReviews, setDrawerReviews] = useState<PartnerReview[] | null>(null);
  const [isLoadingDrawerReviews, setIsLoadingDrawerReviews] = useState(false);

  const [loadedReviews, setLoadedReviews] = useState<PartnerReview[] | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedArea, setSelectedArea] = useState<string>("All");

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
    status: "active" as "pending" | "active" | "offline" | "busy" | "suspended",
    is_available: true,
    services: [] as string[],
    pincodes: ""
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // KYC Review Modal States
  const [reviewKycPartner, setReviewKycPartner] = useState<SerializedPartner | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [kycSuccess, setKycSuccess] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);

  // Reviews Modal States
  const [selectedReviewsPartner, setSelectedReviewsPartner] = useState<SerializedPartner | null>(null);

  // Profile Drawer States
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [selectedProfilePartner, setSelectedProfilePartner] = useState<SerializedPartner | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "analytics" | "bookings" | "reviews" | "notes">("overview");
  const [drawerEarnings, setDrawerEarnings] = useState<PartnerEarningsSummary | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  // Profile Note States
  const [partnerNoteInput, setPartnerNoteInput] = useState("");
  const [partnerRiskTriggerInput, setPartnerRiskTriggerInput] = useState("");
  const [drawerActionError, setDrawerActionError] = useState<string | null>(null);

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

  // Compile list of unique service areas covered by partners
  const allAreas = Array.from(
    new Set(
      partners.flatMap(p => 
        p.service_areas?.map(sa => sa.city ? `${sa.city} (${sa.pincode})` : sa.pincode) || []
      )
    )
  ).filter(Boolean).sort();

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
      if (selectedStatus === "Pending" && partner.status !== "pending") return false;
    }

    // 3. Area Covered Filter
    if (selectedArea !== "All") {
      const hasArea = partner.service_areas?.some(sa => {
        const areaStr = sa.city ? `${sa.city} (${sa.pincode})` : sa.pincode;
        return areaStr === selectedArea;
      });
      if (!hasArea) return false;
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
            reviews: [],
            bookings_count: 0,
            reviews_count: 0
          };
          setPartners(prev => [newPartner, ...prev]);
          setOnboardSuccess("New Professional added successfully! Edit profile to add skills.");
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
        } else {
          setOnboardError(res.error || "Failed to add professional.");
        }
      } catch (err: unknown) {
        setOnboardError((err as Error).message || "Failed to add professional.");
      }
    });
  };

  const handleSavePartnerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfilePartner) return;

    startTransition(async () => {
      try {
        const triggerToSave = partnerRiskTriggerInput.trim() || selectedProfilePartner.risk_trigger || "";
        await savePartnerNoteAction(selectedProfilePartner.id, partnerNoteInput, triggerToSave);
        
        // Update local state
        setPartners(prev => prev.map(p => {
          if (p.id === selectedProfilePartner.id) {
            return { 
              ...p, 
              internal_note: partnerNoteInput, 
              risk_trigger: triggerToSave 
            };
          }
          return p;
        }));

        setSelectedProfilePartner(prev => prev ? { 
          ...prev, 
          internal_note: partnerNoteInput, 
          risk_trigger: triggerToSave 
        } : null);

        setPartnerNoteInput("");
        setPartnerRiskTriggerInput("");
        setDrawerActionError(null);
      } catch (err: unknown) {
        setDrawerActionError((err as Error).message || "Failed to save note.");
      }
    });
  };

  const openProfileDrawer = (partner: SerializedPartner) => {
    setSelectedProfilePartner(partner);
    setPartnerNoteInput(partner.internal_note || "");
    setPartnerRiskTriggerInput(partner.risk_trigger || "");
    setIsProfileDrawerOpen(true);
    setActiveProfileTab("overview");

    // Load bookings on-demand
    setIsLoadingDrawerBookings(true);
    setDrawerBookings(null);
    getPartnerBookingsAction(partner.id)
      .then((data) => {
        const mapped = (data as unknown as RawBookingFromAction[] || []).map((b) => ({
          id: b.id,
          status: b.status,
          total_amount: Number(b.total_amount || 0),
          created_at: b.created_at,
          scheduled_date: b.scheduled_date || null,
          pincode: b.pincode || null,
          city: b.city || null,
          services: b.services ? {
            title: b.services.title || "Home Service",
            category: b.services.category || ""
          } : null,
          customer: b.customer ? {
            full_name: b.customer.full_name || "Unknown Customer"
          } : null
        }));
        setDrawerBookings(mapped);
      })
      .catch(console.error)
      .finally(() => setIsLoadingDrawerBookings(false));

    // Load reviews on-demand
    setIsLoadingDrawerReviews(true);
    setDrawerReviews(null);
    getPartnerReviewsAction(partner.id)
      .then((data) => {
        const mapped = (data as unknown as RawReviewFromAction[] || []).map((r) => ({
          id: r.id,
          rating: Number(r.rating || 5),
          comment: r.comment || null,
          created_at: r.created_at,
          bookings: r.bookings ? {
            services: r.bookings.services ? {
              title: r.bookings.services.title || "Home Service"
            } : null
          } : null,
          customer: r.customer ? {
            full_name: r.customer.full_name || "Anonymous",
            avatar_url: r.customer.avatar_url || null
          } : null
        }));
        setDrawerReviews(mapped);
      })
      .catch(console.error)
      .finally(() => setIsLoadingDrawerReviews(false));

    // Load earnings on-demand
    setIsLoadingEarnings(true);
    setDrawerEarnings(null);
    getPartnerEarningsAction(partner.id)
      .then(setDrawerEarnings)
      .catch(console.error)
      .finally(() => setIsLoadingEarnings(false));
  };

  const openReviewsModal = (partner: SerializedPartner) => {
    setSelectedReviewsPartner(partner);
    setIsLoadingReviews(true);
    setLoadedReviews(null);
    getPartnerReviewsAction(partner.id)
      .then((data) => {
        const mapped = (data as unknown as RawReviewFromAction[] || []).map((r) => ({
          id: r.id,
          rating: Number(r.rating || 5),
          comment: r.comment || null,
          created_at: r.created_at,
          bookings: r.bookings ? {
            services: r.bookings.services ? {
              title: r.bookings.services.title || "Home Service"
            } : null
          } : null,
          customer: r.customer ? {
            full_name: r.customer.full_name || "Anonymous",
            avatar_url: r.customer.avatar_url || null
          } : null
        }));
        setLoadedReviews(mapped);
      })
      .catch(console.error)
      .finally(() => setIsLoadingReviews(false));
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
          setEditSuccess("Professional profile updated successfully!");
          setTimeout(() => {
            setIsEditModalOpen(false);
            setEditSuccess(null);
          }, 1500);
        } else {
          setEditError(res.error || "Failed to update professional.");
        }
      } catch (err: unknown) {
        setEditError((err as Error).message || "Failed to update professional.");
      }
    });
  };

  const handleReviewKyc = (status: "approved" | "rejected") => {
    if (!reviewKycPartner) return;
    setKycSuccess(null);
    setKycError(null);

    startTransition(async () => {
      try {
        const res = await reviewKycAction(
          reviewKycPartner.id,
          status,
          status === "rejected" ? kycRejectReason : undefined
        );
        if (res.success) {
          setKycSuccess(`KYC status updated to ${status} successfully!`);
          setPartners((prev) =>
            prev.map((p) =>
              p.id === reviewKycPartner.id
                ? {
                    ...p,
                    kyc_status: status,
                    kyc_rejection_reason: status === "rejected" ? kycRejectReason : null,
                  }
                : p
            )
          );
          setTimeout(() => {
            setReviewKycPartner(null);
            setKycRejectReason("");
            setKycSuccess(null);
          }, 1500);
        } else {
          setKycError(res.error || "Failed to update KYC status.");
        }
      } catch (err: unknown) {
        setKycError((err as Error).message || "Failed to update KYC status.");
      }
    });
  };

  return (
    <div className="space-y-4">

      {/* ─── 0. FLEET SUMMARY HEADER CARDS ─── */}
      {fleetCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          <div className="bg-primary rounded-xl p-3 text-on-primary">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Professionals</p>
            <p className="text-lg font-black font-headline tracking-tight text-secondary mt-0.5">{fleetCounts.total}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Active Now</p>
            <p className="text-lg font-black font-headline tracking-tight text-emerald-600 mt-0.5">{fleetCounts.active}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">On Job</p>
            <p className="text-lg font-black font-headline tracking-tight text-amber-600 mt-0.5">{fleetCounts.busy}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Offline</p>
            <p className="text-lg font-black font-headline tracking-tight text-on-surface-variant/80 mt-0.5">{fleetCounts.offline}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Suspended</p>
            <p className="text-lg font-black font-headline tracking-tight text-red-600 mt-0.5">{fleetCounts.suspended}</p>
          </div>
        </div>
      )}

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
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Setup</option>
                <option value="Online">Online / Active</option>
                <option value="Busy">Busy / On Job</option>
                <option value="Offline">Offline</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Filter: Area */}
            <div className="flex flex-col gap-1">
              <select
                value={selectedArea}
                onChange={(e) => handleFilterChange(setSelectedArea, e.target.value)}
                className="w-full bg-surface-container-low text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-2 rounded-lg border border-outline-variant/30 focus:border-secondary/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">All Areas</option>
                {allAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
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
            <span className="material-symbols-outlined text-base">person_add</span> Add Professional
          </Button>

        </div>
      </Card>

      {/* ─── 2. HIGH-DENSITY FLEET DATA TABLE (RESPONSIVE VIEWPORT STYLES) ─── */}
      <Card variant="solid" className="p-0 overflow-visible ring-1 ring-outline-variant/10">

        {/* Table-based Responsive Compact Operational Data Grid */}
        <div className="overflow-x-auto min-h-45">
          <table className="w-full border-collapse text-left min-w-188">
            <thead>
              <tr className="bg-surface-dim/40 border-b border-outline-variant/20 uppercase text-[9px] font-black text-on-surface-variant tracking-widest">
                <th className="py-2 px-3">Professional</th>
                <th className="py-2 px-3 text-center w-28">Rating & Jobs</th>
                <th className="py-2 px-3 text-center w-36">Reliability</th>
                <th className="py-2 px-3 w-40">Status</th>
                <th className="py-2 px-3 text-right w-16">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant/50">
                    <span className="material-symbols-outlined text-2xl block mb-1 opacity-40">query_stats</span>
                    <p className="text-[11px] font-semibold">No professionals found.</p>
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
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-primary font-headline uppercase leading-none tracking-tight truncate">{partner.full_name}</h4>
                          <p className="text-[9px] text-on-surface-variant/60 font-semibold mt-0.5">{partner.phone}</p>
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
                      <div className="flex flex-wrap gap-1 mb-1">
                        {/* Live status state pill */}
                        {partner.status === 'pending' && (
                          <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span> Pending Setup
                          </span>
                        )}
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

                        {/* KYC Status Badge */}
                        {partner.kyc_status === 'approved' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            KYC Verified
                          </span>
                        ) : partner.kyc_status === 'rejected' ? (
                          <span className="bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            KYC Rejected
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1">
                            KYC Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Col 5: Actions */}
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="slate"
                          onClick={() => openProfileDrawer(partner)}
                          className="bg-surface-container hover:bg-primary hover:text-white rounded-lg p-1 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="View Profile"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </Button>
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
                          className="p-1 h-6 w-6 rounded-lg hover:bg-surface-container-high transition-colors inline-flex items-center justify-center shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">more_vert</span>
                        </Button>
                      </div>
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
            <span className="text-primary">{totalItems}</span> registered professionals
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
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOnboardingModalOpen(false)} />

          {/* Form Modal Box container */}
          <div className="relative w-full max-w-md bg-white rounded-4xl overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">New professional setup</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Add Professional</h3>
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
                  Add Professional
                </Button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* ─── 5. INTERACTIVE EDIT TECHNICIAN MODAL ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsEditModalOpen(false)} />

          {/* Form Modal Box container */}
          <div className="relative w-full max-w-md bg-white rounded-4xl overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Professional profile updates</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Edit Professional</h3>
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

      {/* ─── 6. INTERACTIVE KYC REVIEW MODAL ─── */}
      {reviewKycPartner && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setReviewKycPartner(null)} />

          <div className="relative w-full max-w-2xl bg-white rounded-4xl overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">KYC Verification</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">
                  Review KYC: {reviewKycPartner.full_name}
                </h3>
              </div>
              <button
                onClick={() => setReviewKycPartner(null)}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-6 flex-1 text-xs font-bold text-primary">
              {/* Document URLs Display */}
              <div>
                <h4 className="text-xs font-headline font-black text-secondary uppercase tracking-wider mb-3">Uploaded Documents</h4>
                {reviewKycPartner.kyc_documents ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(reviewKycPartner.kyc_documents).map(([key, val]) => {
                      if (typeof val !== "string" || !val.startsWith("http")) return null;
                      const label = key.replace(/_/g, " ").replace("url", "").toUpperCase();
                      return (
                        <div key={key} className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-on-surface-variant">{label}</span>
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary text-white text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg hover:brightness-110 flex items-center gap-1 shrink-0"
                          >
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span> View Doc
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-surface-container rounded-2xl text-center font-medium text-on-surface-variant">
                    No documents uploaded yet.
                  </div>
                )}
              </div>

              {/* Professional Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-dim/40 rounded-2xl p-4 border border-outline-variant/10">
                <div>
                  <h4 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-1">Experience</h4>
                  <p className="text-xs font-bold text-primary">
                    {reviewKycPartner.kyc_documents?.experience_years ? `${reviewKycPartner.kyc_documents.experience_years} Years` : "—"}
                  </p>
                </div>
                <div>
                  <h4 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-1">Nearby Police Station</h4>
                  <p className="text-xs font-bold text-primary">
                    {String(reviewKycPartner.kyc_documents?.police_station_details || "—")}
                  </p>
                </div>
              </div>

              {/* Bank Info */}
              <div>
                <h4 className="text-xs font-headline font-black text-secondary uppercase tracking-wider mb-3">Bank Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-dim/40 rounded-2xl p-4 border border-outline-variant/10">
                  <div>
                    <h4 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-1">Bank Name</h4>
                    <p className="text-xs font-bold text-primary">{String(reviewKycPartner.kyc_documents?.bank_name || "—")}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-1">Account Number</h4>
                    <p className="text-xs font-bold text-primary">{String(reviewKycPartner.kyc_documents?.bank_account_no || "—")}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 mb-1">IFSC Code</h4>
                    <p className="text-xs font-bold text-primary">{String(reviewKycPartner.kyc_documents?.bank_ifsc || "—")}</p>
                  </div>
                </div>
              </div>

              {/* Rejection input field */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">KYC Rejection Reason (Required for rejection)</label>
                <textarea
                  placeholder="e.g. Uploaded Aadhaar card is blurred..."
                  rows={2}
                  value={kycRejectReason}
                  onChange={(e) => setKycRejectReason(e.target.value)}
                  className="w-full bg-surface-container-low text-primary p-3 rounded-xl border border-outline-variant/40 focus:border-secondary focus:outline-none font-semibold resize-none"
                />
              </div>

              {kycError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span> {kycError}
                </div>
              )}

              {kycSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> {kycSuccess}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-outline-variant/15 flex gap-3 shrink-0">
              <Button
                type="button"
                variant="slate"
                onClick={() => setReviewKycPartner(null)}
                className="flex-1 py-3 text-primary bg-surface-container hover:bg-surface-container-high rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleReviewKyc("rejected")}
                disabled={isPending || !kycRejectReason.trim()}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50"
              >
                Reject KYC
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleReviewKyc("approved")}
                disabled={isPending}
                className="flex-1 py-3 bg-secondary hover:brightness-105 text-primary rounded-xl"
              >
                Approve KYC
              </Button>
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
            className="fixed w-48 bg-white border border-outline-variant/30 rounded-xl shadow-xl z-9999 p-1 divide-y divide-outline-variant/10 text-left animate-in fade-in duration-100 overflow-y-auto"
            style={getMenuPositionStyle(dropdownMenu.rect)}
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
                <span className="material-symbols-outlined text-xs">edit</span> Edit Professional
              </button>
              <button
                onClick={() => {
                  setReviewKycPartner(dropdownMenu.partner);
                  setKycRejectReason(dropdownMenu.partner.kyc_rejection_reason || "");
                  setKycSuccess(null);
                  setKycError(null);
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">verified_user</span> Review KYC Documents
              </button>
              <button
                onClick={() => {
                  openReviewsModal(dropdownMenu.partner);
                  setDropdownMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-[#1c2438] hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">rate_review</span> View Reviews ({dropdownMenu.partner.reviews_count})
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
      {/* ─── 8. REVIEWS & RATINGS DETAIL MODAL ─── */}
      {selectedReviewsPartner && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Closer backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedReviewsPartner(null)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-white rounded-4xl overflow-hidden shadow-2xl p-6 border border-outline-variant/30 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Professional Feedback</span>
                <h3 className="text-xl font-bold font-headline text-primary uppercase mt-1">Reviews ({selectedReviewsPartner.reviews_count})</h3>
                <p className="text-[11px] text-on-surface-variant/70 font-medium mt-1">
                  Showing ratings and comments for <span className="font-bold">{selectedReviewsPartner.full_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedReviewsPartner(null)}
                className="p-1.5 rounded-xl hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Overall Summary block inside Modal */}
            <div className="bg-surface-container-low rounded-2xl p-4 mb-4 flex items-center gap-4 shrink-0">
              <div className="text-center bg-white px-4 py-3 rounded-xl border border-outline-variant/10 min-w-20">
                <span className="text-3xl font-black text-primary leading-none tracking-tight">
                  {selectedReviewsPartner.rating_avg ? selectedReviewsPartner.rating_avg.toFixed(1) : "—"}
                </span>
                <div className="flex items-center justify-center text-amber-500 gap-0.5 mt-1">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
              </div>
              <div className="text-xs">
                <p className="font-bold text-primary">Aggregate score from completed jobs.</p>
                <p className="text-on-surface-variant font-medium mt-0.5">
                  Professional reliability rate is <span className="font-bold">{selectedReviewsPartner.reliability_rate}%</span>.
                </p>
              </div>
            </div>

            {/* Scrollable Reviews List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
              {isLoadingReviews ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-2">progress_activity</span>
                  <p className="text-xs text-on-surface-variant font-bold">Loading reviews...</p>
                </div>
              ) : !loadedReviews || loadedReviews.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-35">rate_review</span>
                  <p className="font-bold text-sm">No reviews yet</p>
                  <p className="text-xs mt-1 text-on-surface-variant/60">
                    This professional has not received any customer ratings yet.
                  </p>
                </div>
              ) : (
                loadedReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl space-y-2 hover:bg-surface-container-low/20 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs overflow-hidden border border-outline-variant/10">
                          {review.customer?.avatar_url ? (
                            <Image
                              src={review.customer.avatar_url}
                              alt={review.customer.full_name || "User"}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{review.customer?.full_name?.charAt(0).toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{review.customer?.full_name || "Anonymous"}</p>
                          <p className="text-[10px] text-on-surface-variant/50 font-medium">
                            {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`material-symbols-outlined text-sm ${
                              star <= review.rating ? "text-secondary font-fill" : "text-on-surface-variant/20"
                            }`}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic bg-surface-container-low/30 p-2.5 rounded-xl border border-outline-variant/5">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    )}

                    {review.bookings?.services?.title && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant bg-surface-container-high/40 px-2.5 py-1 rounded-md w-fit">
                        <span className="material-symbols-outlined text-[10px]">build</span>
                        <span>{review.bookings.services.title}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-outline-variant/10 shrink-0">
              <Button
                variant="slate"
                className="w-full py-2.5 rounded-xl text-xs"
                onClick={() => setSelectedReviewsPartner(null)}
              >
                Close Panel
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ─── 9. SEAMLESS PARTNER PROFILE DETAILS DRAWER ─── */}
      {isProfileDrawerOpen && selectedProfilePartner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          {/* Overlay closer */}
          <div className="absolute inset-0" onClick={() => setIsProfileDrawerOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-surface-container-lowest h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col z-10 border-l border-outline-variant/20 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 bg-primary text-white flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm border border-white/15 overflow-hidden shrink-0">
                  {selectedProfilePartner.avatar_url ? (
                    <Image src={selectedProfilePartner.avatar_url} alt={selectedProfilePartner.full_name} width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedProfilePartner.full_name ? selectedProfilePartner.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "P"}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                    {selectedProfilePartner.full_name || "Unknown Partner"}
                    {selectedProfilePartner.service_tier === "premium" && (
                      <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                    )}
                  </h4>
                  <p className="text-xs opacity-80 font-normal mt-0.5">{selectedProfilePartner.email || "No email linked"}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-outline-variant/10 bg-surface-container-low/50 px-4">
              <button
                onClick={() => setActiveProfileTab("overview")}
                className={`grow py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeProfileTab === "overview" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveProfileTab("bookings")}
                className={`grow py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeProfileTab === "bookings" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Jobs ({selectedProfilePartner.bookings_count})
              </button>
              <button
                onClick={() => setActiveProfileTab("reviews")}
                className={`grow py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeProfileTab === "reviews" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Reviews ({selectedProfilePartner.reviews_count})
              </button>
              <button
                onClick={() => { setActiveProfileTab("analytics"); if (!drawerEarnings) { setIsLoadingEarnings(true); getPartnerEarningsAction(selectedProfilePartner.id).then(setDrawerEarnings).catch(console.error).finally(() => setIsLoadingEarnings(false)); } }}
                className={`grow py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeProfileTab === "analytics" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveProfileTab("notes")}
                className={`grow py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                  activeProfileTab === "notes" ? "border-secondary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
                }`}
              >
                Notes
              </button>
            </div>

            {/* Drawer Body Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Overview Tab */}
              {activeProfileTab === "overview" && (
                <div className="space-y-6 text-xs text-primary font-bold">
                  {/* Status & Compliance */}
                  <div className="space-y-4 pb-4 border-b border-outline-variant/10">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Professional Profile</h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Status</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                          selectedProfilePartner.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                          selectedProfilePartner.status === 'busy' ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' :
                          selectedProfilePartner.status === 'suspended' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                          'bg-slate-500/10 text-on-surface-variant border border-outline-variant/40'
                        }`}>
                          {selectedProfilePartner.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/50">Compliance (KYC)</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                          selectedProfilePartner.kyc_status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                          selectedProfilePartner.kyc_status === 'rejected' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                        }`}>
                          {selectedProfilePartner.kyc_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills / Services Covered */}
                  <div className="space-y-2 pb-4 border-b border-outline-variant/10">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Assigned Services</h5>
                    {selectedProfilePartner.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfilePartner.skills.map((skill, idx) => (
                          <span
                            key={`skill-${idx}`}
                            className="inline-flex items-center gap-1 bg-green-500/10 border border-outline-variant/20 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full"
                          >
                            {/* <span className="material-symbols-outlined text-xs text-[#059669] drop-shadow-sm">check_circle</span> */}
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic">No services mapped yet.</p>
                    )}
                  </div>

                  {/* Territory coverage */}
                  <div className="space-y-2 pb-4 border-b border-outline-variant/10">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Service Areas</h5>
                    {selectedProfilePartner.service_areas && selectedProfilePartner.service_areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfilePartner.service_areas.map((area, idx) => (
                          <span
                            key={`area-${idx}`}
                            className="inline-flex items-center gap-1 bg-surface-container-low border border-outline-variant/30 text-on-surface text-[10px] font-bold px-2.5 py-1 rounded-full"
                          >
                            {/* <span className="material-symbols-outlined text-xs text-on-surface-variant">location_on</span> */}
                            {area.city || "Area"} · {area.pincode}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic">No service areas mapped yet.</p>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-3 pb-4 border-b border-outline-variant/10">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Financial Summary</h5>
                    {isLoadingEarnings ? (
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Loading earnings...
                      </div>
                    ) : drawerEarnings ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Total Earnings</p>
                          <p className="text-sm font-black text-primary">₹{drawerEarnings.totalEarnings.toLocaleString()}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">This Month</p>
                          <p className="text-sm font-black text-secondary">₹{drawerEarnings.thisMonthEarnings.toLocaleString()}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Avg Per Job</p>
                          <p className="text-sm font-black text-primary">₹{drawerEarnings.avgPerJob.toLocaleString()}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Commission Paid</p>
                          <p className="text-sm font-black text-error">₹{drawerEarnings.totalCommission.toLocaleString()}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Jobs Done</p>
                          <p className="text-sm font-black text-primary">{drawerEarnings.jobsCount}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-2.5">
                          <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Service Revenue</p>
                          <p className="text-sm font-black text-primary">₹{drawerEarnings.totalServiceRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic">No completed jobs data.</p>
                    )}
                  </div>

                  {/* Booking Status Distribution */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Booking Status</h5>
                    {drawerBookings ? (
                      <div className="space-y-1.5">
                        {[
                          { label: "Completed", status: "completed", color: "bg-secondary" },
                          { label: "Cancelled", status: "cancelled", color: "bg-error" },
                          { label: "In Progress", status: "in_progress", color: "bg-primary/60" },
                          { label: "Other", status: "other", color: "bg-on-surface-variant/30" },
                        ].map((item) => {
                          const count = item.status === "other"
                            ? drawerBookings.filter((b) => !["completed", "cancelled", "in_progress"].includes(b.status)).length
                            : drawerBookings.filter((b) => b.status === item.status).length;
                          const total = drawerBookings.length;
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          if (count === 0) return null;
                          return (
                            <div key={item.label} className="flex items-center gap-2 text-[11px]">
                              <div className="w-16 shrink-0 text-on-surface-variant font-bold">{item.label}</div>
                              <div className="flex-1 h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="w-12 text-right font-bold text-on-surface">{count}</div>
                            </div>
                          );
                        })}
                        {drawerBookings.length === 0 && (
                          <p className="text-[10px] text-on-surface-variant/60 font-medium italic">No bookings yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic">Loading bookings...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Jobs ledger history Tab */}
              {activeProfileTab === "bookings" && (
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-2">Job History</h5>
                  {isLoadingDrawerBookings ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary mb-2">progress_activity</span>
                      <p className="text-[10px] text-on-surface-variant font-bold">Loading jobs...</p>
                    </div>
                  ) : drawerBookings && drawerBookings.length > 0 ? (
                    <div className="divide-y divide-outline-variant/10">
                      {drawerBookings.map(b => (
                        <div key={b.id} className="py-3.5 flex justify-between items-center gap-3 text-xs">
                          <div>
                            <p className="font-bold text-primary uppercase">{b.services?.title || "Service Job"}</p>
                            <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-medium">Customer: {b.customer?.full_name || "Unknown"}</p>
                            <p className="text-[9px] text-on-surface-variant/40 mt-0.5 font-semibold">{new Date(b.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">₹{b.total_amount}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 ${
                              b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              b.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant/35">build</span>
                      <p className="text-[11px] font-semibold text-on-surface-variant/70 mt-1">No jobs completed yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews History Tab */}
              {activeProfileTab === "reviews" && (
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-2">Reviews History</h5>
                  {isLoadingDrawerReviews ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary mb-2">progress_activity</span>
                      <p className="text-[10px] text-on-surface-variant font-bold">Loading reviews...</p>
                    </div>
                  ) : drawerReviews && drawerReviews.length > 0 ? (
                    <div className="divide-y divide-outline-variant/10">
                      {drawerReviews.map(r => (
                        <div key={r.id} className="py-3.5 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-primary">{r.customer?.full_name || "Anonymous"}</p>
                              <p className="text-[9px] text-on-surface-variant/40 mt-0.5 font-semibold">{new Date(r.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`material-symbols-outlined text-xs ${
                                    star <= r.rating ? "text-secondary font-fill" : "text-on-surface-variant/20"
                                  }`}
                                >
                                  star
                                </span>
                              ))}
                            </div>
                          </div>
                          {r.comment && (
                            <p className="text-[11px] text-on-surface-variant/70 italic font-medium leading-relaxed bg-surface-container-low/40 p-2.5 rounded-lg border border-outline-variant/5">
                              &ldquo;{r.comment}&rdquo;
                            </p>
                          )}
                          {r.bookings?.services?.title && (
                            <span className="text-[8px] font-black uppercase text-on-surface-variant/60 bg-surface-container/60 px-2 py-0.5 rounded inline-block">
                              {r.bookings.services.title}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant/35">rate_review</span>
                      <p className="text-[11px] font-semibold text-on-surface-variant/70 mt-1">No reviews recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeProfileTab === "analytics" && (
                <div className="space-y-5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-2">Performance Analytics</h5>

                  {/* Earnings Trend */}
                  <div className="space-y-2 pb-4 border-b border-outline-variant/10">
                    <h6 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold">Monthly Earnings Trend</h6>
                    {isLoadingEarnings ? (
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant py-4">
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Loading analytics...
                      </div>
                    ) : drawerEarnings && drawerEarnings.monthlyTrend.length > 0 ? (
                      <div className="space-y-1.5 pt-2">
                        {(() => {
                          const maxVal = Math.max(...drawerEarnings.monthlyTrend.map((m) => m.payout), 1);
                          return drawerEarnings.monthlyTrend.slice(0, 6).map((m) => {
                            const pct = (m.payout / maxVal) * 100;
                            return (
                              <div key={m.month} className="flex items-center gap-2 text-[10px]">
                                <span className="w-12 shrink-0 font-bold text-on-surface-variant/80">{m.month}</span>
                                <div className="flex-1 h-3 bg-surface-container-high rounded-full overflow-hidden">
                                  <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                                </div>
                                <span className="w-14 text-right font-bold text-primary">₹{m.payout.toLocaleString()}</span>
                                <span className="w-8 text-right text-on-surface-variant/60">{m.jobs} jobs</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic py-2">No earnings data yet.</p>
                    )}
                  </div>

                  {/* Jobs Trend (Weekly from drawerBookings) */}
                  <div className="space-y-2 pb-4 border-b border-outline-variant/10">
                    <h6 className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold">Recent Job Activity</h6>
                    {drawerBookings && drawerBookings.length > 0 ? (
                      <div className="space-y-1.5 pt-2">
                        {(() => {
                          const weekly = new Map<string, { jobs: number; completed: number }>();
                          for (const b of drawerBookings) {
                            const d = new Date(b.created_at);
                            const weekStart = new Date(d);
                            weekStart.setDate(d.getDate() - d.getDay());
                            const key = weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                            if (!weekly.has(key)) weekly.set(key, { jobs: 0, completed: 0 });
                            const w = weekly.get(key)!;
                            w.jobs++;
                            if (b.status === "completed") w.completed++;
                          }
                          const entries = Array.from(weekly.entries()).slice(0, 8);
                          const maxJobs = Math.max(...entries.map(([, w]) => w.jobs), 1);
                          return entries.map(([week, w]) => {
                            const pct = (w.jobs / maxJobs) * 100;
                            return (
                              <div key={week} className="flex items-center gap-2 text-[10px]">
                                <span className="w-14 shrink-0 font-bold text-on-surface-variant/80">W/o {week}</span>
                                <div className="flex-1 h-3 bg-surface-container-high rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                                </div>
                                <span className="w-16 text-right font-bold text-on-surface">{w.jobs} jobs</span>
                                <span className="w-10 text-right" style={{ color: w.completed === w.jobs ? "var(--color-success)" : "var(--color-warning)" }}>
                                  {w.completed}/{w.jobs}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/60 font-medium italic py-2">No booking data yet.</p>
                    )}
                  </div>

                  {/* Rating & Reliability */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-container-low rounded-lg p-3 text-center">
                      <p className="text-[20px] font-black text-secondary">{selectedProfilePartner.rating_avg.toFixed(1)}</p>
                      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">Rating</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3 text-center">
                      <p className="text-[20px] font-black text-primary">{selectedProfilePartner.reliability_rate}%</p>
                      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">Reliability</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3 text-center">
                      <p className="text-[20px] font-black text-primary">{selectedProfilePartner.jobs_done}</p>
                      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">Jobs Done</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3 text-center">
                      <p className="text-[20px] font-black text-error">{selectedProfilePartner.jobs_cancelled}</p>
                      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">Cancellations</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Override Tab */}
              {activeProfileTab === "notes" && (
                <div className="space-y-5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-2">Admin Notes</h5>
                  
                  {selectedProfilePartner.internal_note ? (
                    <div className="border border-outline-variant/15 p-3.5 rounded-xl bg-surface-container-low/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Active internal note</p>
                      <p className="text-xs text-on-surface-variant mt-1.5 italic font-normal leading-relaxed">
                        &quot;{selectedProfilePartner.internal_note}&quot;
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-on-surface-variant/50 italic">No notes logged for this user yet.</p>
                  )}

                  <form onSubmit={handleSavePartnerNote} className="space-y-4 border-t border-outline-variant/15 pt-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Add/Edit Profile Note</label>
                      <textarea
                        required
                        rows={3}
                        value={partnerNoteInput}
                        onChange={(e) => setPartnerNoteInput(e.target.value)}
                        placeholder="Log internal comments here..."
                        className="w-full border border-outline-variant/20 rounded-xl p-3 bg-surface-container-low focus:ring-1 focus:ring-secondary/50 outline-none text-xs transition-all placeholder:text-on-surface-variant/40 font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Update Risk Trigger Reason (Optional)</label>
                      <input
                        type="text"
                        value={partnerRiskTriggerInput}
                        onChange={(e) => setPartnerRiskTriggerInput(e.target.value)}
                        placeholder="e.g. KYC Suspicious, Low Rating Alert"
                        className="w-full border border-outline-variant/20 rounded-xl p-3 bg-surface-container-low focus:ring-1 focus:ring-secondary/50 outline-none text-xs transition-all placeholder:text-on-surface-variant/40 font-semibold"
                      />
                    </div>

                    {drawerActionError && (
                      <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        <span>{drawerActionError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full bg-secondary hover:brightness-105 hover:scale-[1.01] text-primary rounded-xl py-3 font-black text-xs uppercase tracking-widest transition-all"
                      disabled={isPending}
                    >
                      {isPending ? "Saving changes..." : "Save Notes & Risk Reason"}
                    </Button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
