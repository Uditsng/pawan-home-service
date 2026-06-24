"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  rejectJob,
  startRoute,
  reachLocation,
  verifyArrivalOtp,
  requestCompletion,
  verifyCompletionOtp,
  claimJobOffer,
} from "../actions";
import type { BookingWithDetails, BookingExtension } from "@/lib/types";
import { requestExtensionAction } from "@/app/actions/extensions";

// ─── Types ────────────────────────────────────────────────────

export interface RawService {
  title: string;
  category?: string;
}

export interface RawBooking {
  id: string;
  service_id: string;
  city: string | null;
  area: string | null;
  pincode: string | null;
  scheduled_date: string | null;
  total_amount: number | string | null;
  address: string | null;
  meeting_location?: string | null;
  destination?: string | null;
  expected_bags?: number | null;
  services: RawService | RawService[] | null;
}

export interface RawOfferRow {
  id: string;
  booking_id: string;
  broadcast_tier: number;
  created_at: string;
  bookings: RawBooking | RawBooking[] | null;
}

interface JobOffer {
  id: string;
  booking_id: string;
  broadcast_tier: number;
  created_at: string;
  bookings: {
    id: string;
    service_id: string;
    city: string | null;
    area: string | null;
    pincode: string | null;
    scheduled_date: string | null;
    total_amount: number;
    address: string | null;
    meeting_location?: string | null;
    destination?: string | null;
    expected_bags?: number | null;
    services: { title: string; category?: string } | null;
  } | null;
}

interface JobsClientProps {
  assignedJobs: BookingWithDetails[];
  activeJobs: BookingWithDetails[];
  completedJobs: BookingWithDetails[];
  offeredJobs: JobOffer[];
}

type TabKey = "offers" | "assigned" | "active" | "completed";

export default function JobsClient({
  assignedJobs,
  activeJobs,
  completedJobs,
  offeredJobs: initialOfferedJobs,
}: JobsClientProps) {
  const [activeTab, setActiveTab]     = useState<TabKey>("offers");
  const [isPending, startTransition]  = useTransition();
  const [actionError, setActionError]   = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [enteredOtps, setEnteredOtps]   = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime]   = useState<Date>(new Date());

  // Job states for polling/realtime updates
  const [assigned, setAssigned] = useState<BookingWithDetails[]>(assignedJobs);
  const [active, setActive] = useState<BookingWithDetails[]>(activeJobs);
  const [completed, setCompleted] = useState<BookingWithDetails[]>(completedJobs);

  // Time Extension states
  const [extensionsMap, setExtensionsMap] = useState<Record<string, BookingExtension[]>>({});
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionJob, setExtensionJob] = useState<BookingWithDetails | null>(null);
  const [pricingOptions, setPricingOptions] = useState<{ duration_minutes: number; price: number }[]>([]);
  const [selectedExtMinutes, setSelectedExtMinutes] = useState<number>(60);

  const getHourlyTimeRemaining = useCallback((job: BookingWithDetails) => {
    if (job.status !== "in_progress" || !job.started_at || !job.selected_duration_minutes) {
      return 0;
    }
    const startedAtMs = new Date(job.started_at).getTime();
    const durationMs = job.selected_duration_minutes * 60 * 1000;
    const expireTimeMs = startedAtMs + durationMs;
    const diff = expireTimeMs - currentTime.getTime();
    return Math.max(0, Math.floor(diff / 1000));
  }, [currentTime]);

  const formatSecondsLeft = useCallback((seconds: number) => {
    if (seconds <= 0) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live job offers (updated via Realtime)
  const [offeredJobs, setOfferedJobs] = useState<JobOffer[]>(initialOfferedJobs);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen]   = useState(false);
  const [rejectBookingId, setRejectBookingId]   = useState<string | null>(null);
  const [rejectReason, setRejectReason]         = useState("");

  // Claiming state for individual offer cards
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // ─── Supabase Realtime: subscribe to my job offers ──────────
  const refreshOffers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("booking_job_offers")
      .select(`
        id, booking_id, broadcast_tier, created_at,
        bookings:booking_id (
          id, service_id, city, area, pincode, scheduled_date, total_amount, address,
          services:service_id ( title, category )
        )
      `)
      .eq("status", "offered")
      .order("created_at", { ascending: false });

    const mapped = (data as unknown as RawOfferRow[] || []).map((row) => {
      const rawBooking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
      const rawService = rawBooking?.services
        ? (Array.isArray(rawBooking.services) ? rawBooking.services[0] : rawBooking.services)
        : null;

      return {
        id: row.id,
        booking_id: row.booking_id,
        broadcast_tier: row.broadcast_tier,
        created_at: row.created_at,
        bookings: rawBooking
          ? {
              id: rawBooking.id,
              service_id: rawBooking.service_id,
              city: rawBooking.city,
              area: rawBooking.area,
              pincode: rawBooking.pincode,
              scheduled_date: rawBooking.scheduled_date,
              total_amount: Number(rawBooking.total_amount || 0),
              address: rawBooking.address,
              services: rawService
                ? {
                    title: rawService.title,
                    category: rawService.category,
                  }
                : null,
            }
          : null,
      };
    });

    setOfferedJobs(mapped);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to changes on booking_job_offers for this user's rows
    const channel = supabase
      .channel("partner-job-offers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_job_offers",
        },
        () => {
          // Refetch on any change (insert/update)
          void refreshOffers();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshOffers]);

  // Polling for active jobs & extensions
  const refreshJobs = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [assignedRes, activeRes, completedRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, services:service_id(title, category), customer:customer_id(full_name)")
          .eq("partner_id", user.id)
          .in("status", ["assigned", "confirmed"])
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("bookings")
          .select("*, services:service_id(title, category), customer:customer_id(full_name)")
          .eq("partner_id", user.id)
          .in("status", ["accepted", "professional_en_route", "professional_arrived", "otp_pending", "in_progress"])
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("bookings")
          .select("*, services:service_id(title, category), customer:customer_id(full_name)")
          .eq("partner_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(20)
      ]);

      if (assignedRes.data) setAssigned(assignedRes.data as BookingWithDetails[]);
      if (activeRes.data) {
        const jobs = activeRes.data as BookingWithDetails[];
        setActive(jobs);
        
        if (jobs.length > 0) {
          const { data: exts } = await supabase
            .from("booking_extensions")
            .select("*")
            .in("booking_id", jobs.map(j => j.id))
            .order("created_at", { ascending: false });
          if (exts) {
            const grouped = exts.reduce((acc, row) => {
              if (!acc[row.booking_id]) acc[row.booking_id] = [];
              acc[row.booking_id].push(row);
              return acc;
            }, {} as Record<string, BookingExtension[]>);
            setExtensionsMap(grouped);
          }
        }
      }
      if (completedRes.data) setCompleted(completedRes.data as BookingWithDetails[]);
    } catch (err) {
      console.error("Error refreshing jobs:", err);
    }
  }, []);

  const fetchPricingOptionsForJob = async (serviceId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("service_duration_pricing")
        .select("duration_minutes, price")
        .eq("service_id", serviceId)
        .order("duration_minutes", { ascending: true });
      if (data) {
        setPricingOptions(data);
        if (data.length > 0) {
          setSelectedExtMinutes(data[0].duration_minutes);
        }
      }
    } catch (err) {
      console.error("Error fetching pricing options:", err);
    }
  };

  const openExtensionModal = (job: BookingWithDetails) => {
    setExtensionJob(job);
    setPricingOptions([]);
    setExtensionModalOpen(true);
    void fetchPricingOptionsForJob(job.service_id);
  };

  const handleRequestExtensionSubmit = async () => {
    if (!extensionJob) return;
    setActionError(null);
    setActionSuccess(null);
    setExtensionModalOpen(false);
    
    startTransition(async () => {
      const res = await requestExtensionAction(extensionJob.id, selectedExtMinutes);
      if (res.success) {
        setActionSuccess("Time extension requested successfully!");
        void refreshJobs();
      } else {
        setActionError(res.error || "Failed to request extension.");
      }
    });
  };

  useEffect(() => {
    void refreshJobs();
    const interval = setInterval(refreshJobs, 6000);
    return () => clearInterval(interval);
  }, [refreshJobs]);

  // ─── Tabs ─────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; count: number; dot?: boolean }[] = [
    { key: "offers",    label: "Job Offers", count: offeredJobs.length, dot: offeredJobs.length > 0 },
    { key: "assigned",  label: "Assigned",   count: assigned.length },
    { key: "active",    label: "Active",     count: active.length },
    { key: "completed", label: "Completed",  count: completed.length },
  ];

  const currentJobs =
    activeTab === "assigned"
      ? assigned
      : activeTab === "active"
        ? active
        : completed;

  // ─── Action helpers ──────────────────────────────────────────
  function handleAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string
  ) {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setActionSuccess(successMsg);
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(result.error || "Action failed.");
        setTimeout(() => setActionError(null), 5000);
      }
    });
  }

  function openRejectModal(bookingId: string) {
    setRejectBookingId(bookingId);
    setRejectReason("");
    setRejectModalOpen(true);
  }

  function handleRejectSubmit() {
    if (!rejectBookingId || !rejectReason.trim()) return;
    setRejectModalOpen(false);
    handleAction(
      () => rejectJob(rejectBookingId, rejectReason.trim()),
      "Job declined. It will be reassigned to another Professional."
    );
    setRejectBookingId(null);
    setRejectReason("");
  }

  async function handleAcceptOffer(bookingId: string) {
    setClaimingId(bookingId);
    setActionError(null);
    const result = await claimJobOffer(bookingId);
    setClaimingId(null);

    if (result.success) {
      setActionSuccess("Job accepted! Check your Assigned tab.");
      setTimeout(() => setActionSuccess(null), 4000);
      // Remove from local offers immediately
      setOfferedJobs((prev) => prev.filter((o) => o.booking_id !== bookingId));
      setActiveTab("assigned");
    } else if (result.alreadyClaimed) {
      setActionError("Too slow! Another professional accepted this job first.");
      setTimeout(() => setActionError(null), 5000);
      // Remove from local view
      setOfferedJobs((prev) => prev.filter((o) => o.booking_id !== bookingId));
    } else {
      setActionError(result.error || "Failed to accept job. Please try again.");
      setTimeout(() => setActionError(null), 5000);
    }
  }

  const rejectReasons = [
    "I'm unavailable at this time",
    "Location is too far",
    "Health/personal emergency",
    "Equipment not available",
    "Schedule conflict",
  ];

  function getStatusIcon(status: string) {
    switch (status) {
      case "in_progress":             return "build";
      case "assigned":
      case "confirmed":               return "assignment_ind";
      case "professional_en_route":   return "motorcycle";
      case "professional_arrived":
      case "otp_pending":             return "lock";
      case "completed":               return "task_alt";
      default:                        return "help";
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "in_progress":             return "bg-primary/10 text-primary";
      case "assigned":
      case "confirmed":               return "bg-secondary/10 text-secondary";
      case "professional_en_route":   return "bg-blue-400/10 text-blue-500";
      case "professional_arrived":
      case "otp_pending":             return "bg-amber-500/10 text-amber-600";
      case "completed":               return "bg-green-500/10 text-green-600";
      default:                        return "bg-surface-container text-on-surface-variant";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "pending":                 return "Pending";
      case "confirmed":               return "Confirmed";
      case "assigned":                return "Assigned";
      case "accepted":                return "Accepted";
      case "professional_en_route":   return "On The Way";
      case "professional_arrived":    return "Arrived";
      case "otp_pending":             return "OTP Pending";
      case "in_progress":             return "In Progress";
      case "completed":               return "Completed";
      case "cancelled":               return "Cancelled";
      default:                        return status.replace(/_/g, " ");
    }
  }

  function getActionButton(job: BookingWithDetails) {
    if (activeTab === "assigned") {
      return (
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              handleAction(() => startRoute(job.id), "Route started! Drive safely.")
            }
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Start Route"}
          </button>
          <button
            disabled={isPending}
            onClick={() => openRejectModal(job.id)}
            className="px-4 py-2.5 border-2 border-red-200 text-red-500 font-label rounded-xl font-bold uppercase tracking-wider text-[10px] hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
          >
            Can&apos;t Do
          </button>
        </div>
      );
    }

    if (activeTab === "active") {
      if (job.status === "accepted" || job.status === "confirmed") {
        return (
          <button
            disabled={isPending}
            onClick={() => handleAction(() => startRoute(job.id), "Route started!")}
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Start Route"}
          </button>
        );
      }
      if (job.status === "professional_en_route") {
        return (
          <button
            disabled={isPending}
            onClick={() => handleAction(() => reachLocation(job.id), "Reached location. OTP generated.")}
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Reached Location"}
          </button>
        );
      }
      if (job.status === "professional_arrived" || (job.status === "otp_pending" && !job.arrival_otp_verified)) {
        const enteredOtp = enteredOtps[job.id] || "";
        const arrivalExpiresAt = job.arrival_otp_expires_at ? new Date(job.arrival_otp_expires_at) : null;
        const isArrivalExpired = arrivalExpiresAt ? currentTime > arrivalExpiresAt : false;
        return (
          <div className="flex flex-col gap-1 w-full max-w-[280px]">
            <p className="text-[10px] font-bold text-amber-600 mb-1">
              {isArrivalExpired ? "Arrival OTP has expired:" : "Enter Arrival OTP from customer:"}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit OTP"
                value={enteredOtp}
                disabled={isArrivalExpired || isPending}
                onChange={(e) => setEnteredOtps({ ...enteredOtps, [job.id]: e.target.value })}
                className="flex-1 bg-surface-container border border-outline-variant/35 text-xs font-mono font-bold tracking-widest text-center py-2 px-3 rounded-xl focus:outline-none focus:border-secondary disabled:opacity-50"
              />
              {!isArrivalExpired ? (
                <button
                  disabled={isPending || enteredOtp.length !== 6}
                  onClick={() => handleAction(() => verifyArrivalOtp(job.id, enteredOtp), "OTP verified! Service started.")}
                  className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  Verify
                </button>
              ) : (
                <button
                  disabled={isPending}
                  onClick={() => handleAction(() => reachLocation(job.id), "New Arrival OTP generated & sent to customer.")}
                  className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  Resend
                </button>
              )}
            </div>
          </div>
        );
      }
      if (job.status === "in_progress") {
        const isHourly = job.pricing_model === "hourly";
        return (
          <div className="flex items-center gap-2">
            <button
              disabled={isPending}
              onClick={() => handleAction(() => requestCompletion(job.id), "Completion OTP requested. Ask the customer for OTP.")}
              className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {isPending ? "Processing..." : "Complete Service"}
            </button>
            {isHourly && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => openExtensionModal(job)}
                className="px-4 py-2.5 border-2 border-primary/20 text-primary font-body rounded-xl font-bold uppercase tracking-wider text-[10px] hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">more_time</span>
                Request Time
              </button>
            )}
          </div>
        );
      }
      if (job.status === "otp_pending" && job.arrival_otp_verified) {
        const enteredOtp = enteredOtps[job.id] || "";
        const completionExpiresAt = job.completion_otp_expires_at ? new Date(job.completion_otp_expires_at) : null;
        const isCompletionExpired = completionExpiresAt ? currentTime > completionExpiresAt : false;
        return (
          <div className="flex flex-col gap-1 w-full max-w-[280px]">
            <p className="text-[10px] font-bold text-amber-600 mb-1">
              {isCompletionExpired ? "Completion OTP has expired:" : "Enter Completion OTP from customer:"}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit OTP"
                value={enteredOtp}
                disabled={isCompletionExpired || isPending}
                onChange={(e) => setEnteredOtps({ ...enteredOtps, [job.id]: e.target.value })}
                className="flex-1 bg-surface-container border border-outline-variant/35 text-xs font-mono font-bold tracking-widest text-center py-2 px-3 rounded-xl focus:outline-none focus:border-secondary disabled:opacity-50"
              />
              {!isCompletionExpired ? (
                <button
                  disabled={isPending || enteredOtp.length !== 6}
                  onClick={() => handleAction(() => verifyCompletionOtp(job.id, enteredOtp), "Completion OTP verified! Service closed.")}
                  className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  Verify
                </button>
              ) : (
                <button
                  disabled={isPending}
                  onClick={() => handleAction(() => requestCompletion(job.id), "New Completion OTP generated & sent to customer.")}
                  className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  Resend
                </button>
              )}
            </div>
          </div>
        );
      }
    }

    if (activeTab === "completed") {
      return (
        <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-500/10 px-3 py-1.5 rounded-lg">
          ✓ Settled
        </span>
      );
    }

    return null;
  }

  // ─── Job Offer Card ──────────────────────────────────────────
  function renderOfferCard(offer: JobOffer) {
    const b = offer.bookings;
    if (!b) return null;
    const isClaiming = claimingId === b.id;
    const payout = Math.round(Number(b.total_amount) * 0.8);
    const location = b.address || (b.area ? `${b.area}, ${b.city || ""}` : b.city || "Kanpur Nagar");

    return (
      <div
        key={offer.id}
        className="relative bg-white rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,34,97,0.08)] border border-primary/10 overflow-hidden"
      >
        {/* Tier badge */}
        <div className="absolute top-4 right-4 bg-primary/8 px-2 py-1 rounded-full">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Tier {offer.broadcast_tier}
          </span>
        </div>

        {/* Live pulse indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-secondary animate-ping opacity-60" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
            New Job Available
          </span>
        </div>

        {/* Service info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">
              home_repair_service
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline font-bold text-[16px] text-on-surface leading-tight">
              {b.services?.title ?? "Service"}
            </h3>
            <div className="flex items-start gap-1.5 mt-1">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant mt-0.5 shrink-0">location_on</span>
              <span className="text-xs font-semibold text-on-surface-variant leading-tight">{location}</span>
            </div>
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Schedule</p>
            <p className="text-xs font-bold text-on-surface">
              {b.scheduled_date
                ? new Date(b.scheduled_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
                : "TBD"}
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Pincode</p>
            <p className="text-xs font-bold text-on-surface">{b.pincode || "—"}</p>
          </div>
        </div>

        {/* CarryBuddy Details (Offers tab) */}
        {(b.meeting_location || b.expected_bags) && (
          <div className="mb-4 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              <span className="material-symbols-outlined text-secondary text-base">directions_walk</span>
              CarryBuddy Details
            </div>
            <p className="text-xs text-on-surface font-medium leading-relaxed">
              <span className="font-bold text-on-surface-variant">Meet At:</span> {b.meeting_location}
            </p>
            {b.destination && (
              <p className="text-xs text-on-surface font-medium leading-relaxed">
                <span className="font-bold text-on-surface-variant">Drop At:</span> {b.destination}
              </p>
            )}
            <p className="text-xs text-on-surface font-medium leading-relaxed">
              <span className="font-bold text-on-surface-variant">Bags:</span> {b.expected_bags || 1}
            </p>
          </div>
        )}

        {/* Payout + Accept */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Your Payout</p>
            <p className="text-2xl font-black text-primary tracking-tighter">₹{payout}</p>
          </div>

          <button
            onClick={() => void handleAcceptOffer(b.id)}
            disabled={isClaiming}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-[0_8px_20px_rgba(0,34,97,0.3)] hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isClaiming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Accept Job
              </>
            )}
          </button>
        </div>

        {/* Time received */}
        <p className="text-[10px] text-on-surface-variant/60 font-medium mt-2 text-right">
          Received {new Date(offer.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Toast Messages ─────────────────────────────────── */}
      {actionSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <span className="material-symbols-outlined text-lg">error</span>
          {actionError}
        </div>
      )}

      {/* ─── Reject Modal ───────────────────────────────────── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface">
                Can&apos;t do this job?
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              This booking will be automatically reassigned to another Professional.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {rejectReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    rejectReason === reason
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Or type your own reason..."
              rows={2}
              className="w-full p-3 rounded-xl border border-outline-variant/20 text-sm focus:ring-2 focus:ring-red-300 focus:outline-none bg-surface-container-lowest resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Request More Time Modal ───────────────────────── */}
      {extensionModalOpen && extensionJob && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl font-body">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface">
                Request More Time
              </h3>
              <button
                type="button"
                onClick={() => setExtensionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Select the additional duration you require. The customer will receive an alert to approve and pay for the extension before work continues.
            </p>

            {pricingOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading pricing rates...
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Select Extension Rate</p>
                <div className="grid grid-cols-1 gap-2">
                  {pricingOptions.map((opt) => {
                    const isSelected = selectedExtMinutes === opt.duration_minutes;
                    const label = opt.duration_minutes === 30 ? "30 Minutes" : `${opt.duration_minutes / 60} Hour${opt.duration_minutes / 60 === 1 ? "" : "s"}`;
                    return (
                      <button
                        key={opt.duration_minutes}
                        type="button"
                        onClick={() => setSelectedExtMinutes(opt.duration_minutes)}
                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                          isSelected
                            ? "bg-primary border-primary text-white shadow-md"
                            : "bg-surface border-outline-variant/10 text-on-surface hover:bg-surface-container-low hover:border-outline-variant/30"
                        }`}
                      >
                        <span className="text-xs font-bold">{label} Extension</span>
                        <span className={`text-xs font-black ${isSelected ? "text-white" : "text-primary"}`}>₹{opt.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExtensionModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestExtensionSubmit}
                disabled={isPending || pricingOptions.length === 0}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? "Sending..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab Bar ────────────────────────────────────────── */}
      <div className="px-3 flex gap-2 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-md"
                : "bg-transparent text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key
                  ? "bg-white/25 text-white"
                  : "bg-primary/10 text-primary"
              }`}>
                {tab.count}
              </span>
            )}
            {/* Pulsing dot for new offers */}
            {tab.dot && activeTab !== tab.key && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-4">

        {/* Job Offers Tab */}
        {activeTab === "offers" && (
          <>
            {offeredJobs.length === 0 ? (
              <div className="bg-surface-container p-10 rounded-3xl text-center shadow-inner">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">
                  notifications_paused
                </span>
                <p className="font-bold text-on-surface">No new job offers</p>
                <p className="text-xs font-medium text-on-surface-variant mt-1">
                  Make sure you&apos;re Online. New bookings will appear here instantly.
                </p>
              </div>
            ) : (
              offeredJobs.map((offer) => renderOfferCard(offer))
            )}
          </>
        )}

        {/* Assigned / Active / Completed Tabs */}
        {activeTab !== "offers" && (
          <>
            {currentJobs.length === 0 && (
              <div className="bg-surface-container p-8 rounded-3xl text-center shadow-inner">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">
                  {activeTab === "assigned" ? "assignment_ind" : activeTab === "active" ? "event_available" : "task_alt"}
                </span>
                <p className="font-bold text-on-surface">
                  {activeTab === "assigned"
                    ? "No new assignments"
                    : activeTab === "active"
                      ? "No active jobs right now"
                      : "No completed jobs yet"}
                </p>
                <p className="text-xs font-medium text-on-surface-variant mt-1">
                  {activeTab === "assigned"
                    ? "Accept a job offer to see it here."
                    : activeTab === "active"
                      ? "Start an assigned job to see it here."
                      : "Completed jobs will appear here after you finish them."}
                </p>
              </div>
            )}

            {currentJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-[0_4px_16px_0_rgba(15,23,42,0.04)] border border-outline-variant/10 relative group hover:shadow-[0_8px_24px_0_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl ${getStatusColor(job.status)} flex items-center justify-center border border-white/40 shadow-sm`}>
                      <span className="material-symbols-outlined font-bold">
                        {getStatusIcon(job.status)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-[15px] leading-tight text-on-surface">
                        {job.services?.title || "Untitled Service"}
                      </h3>
                      <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                        Booking #{job.id.substring(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 ${getStatusColor(job.status)}`}>
                    {(job.status === "in_progress" || job.status === "confirmed") && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                    {getStatusLabel(job.status)}
                  </span>
                </div>

                <div className="space-y-2 mb-5 pl-1">
                  <div className="flex items-center gap-3 text-[13px] text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">calendar_clock</span>
                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Date TBD"}
                  </div>
                  <div className="flex items-start gap-3 text-[13px] text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50 mt-0.5 shrink-0">location_on</span>
                    <span className="leading-tight">
                      {job.address || 
                        (job.area
                          ? `${job.area}, ${job.city || ""}`
                          : job.city || "Location TBD")
                      }
                    </span>
                  </div>
                  {job.customer?.full_name && (
                    <div className="flex items-center gap-3 text-[13px] text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">person</span>
                      {job.customer.full_name}
                    </div>
                  )}

                  {/* CarryBuddy Details */}
                  {(job.meeting_location || job.expected_bags) && (
                    <div className="flex flex-col gap-1.5 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                        <span className="material-symbols-outlined text-secondary text-base">directions_walk</span>
                        CarryBuddy Details
                      </div>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                        <span className="font-bold text-on-surface-variant/80">Meet At:</span> {job.meeting_location}
                      </p>
                      {job.destination && (
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                          <span className="font-bold text-on-surface-variant/80">Drop At:</span> {job.destination}
                        </p>
                      )}
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                        <span className="font-bold text-on-surface-variant/80">Expected Bags/Items:</span> {job.expected_bags || 1}
                      </p>
                    </div>
                  )}
                  
                  {/* Hourly Job Countdown Timer */}
                  {job.pricing_model === "hourly" && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 mt-3 font-body">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-primary/70 tracking-wider">Booked Duration</p>
                        <p className="text-xs font-extrabold text-primary">{job.selected_duration_minutes} Mins</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-primary/70 tracking-wider">Time Remaining</p>
                        {job.status === "in_progress" && job.started_at ? (
                          <p className={`text-xs font-black tracking-tight ${getHourlyTimeRemaining(job) < 600 && getHourlyTimeRemaining(job) > 0 ? "text-red-600 animate-pulse font-extrabold" : "text-primary"}`}>
                            {formatSecondsLeft(getHourlyTimeRemaining(job))}
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-on-surface-variant/70">Awaiting Start</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hourly Extension Status Check */}
                  {job.pricing_model === "hourly" && extensionsMap[job.id]?.length > 0 && (
                    <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 text-[11px] font-semibold text-on-surface-variant font-body">
                      {(() => {
                        const latest = extensionsMap[job.id][0];
                        const durationStr = latest.additional_minutes >= 60
                          ? `${latest.additional_minutes / 60} Hr${latest.additional_minutes === 60 ? "" : "s"}`
                          : `${latest.additional_minutes} Mins`;
                        if (latest.status === "requested") {
                          return (
                            <span className="text-amber-600 flex items-center gap-1.5 animate-pulse">
                              <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                              Requested +{durationStr} (₹{latest.additional_amount}) &middot; Awaiting approval
                            </span>
                          );
                        }
                        if (latest.status === "payment_pending") {
                          return (
                            <span className="text-blue-600 flex items-center gap-1.5 animate-pulse">
                              <span className="material-symbols-outlined text-[14px]">pending_payment</span>
                              Approved &middot; Awaiting customer payment (₹{latest.additional_amount})
                            </span>
                          );
                        }
                        if (latest.status === "rejected") {
                          return (
                            <span className="text-red-600 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              Extension Rejected by Customer
                            </span>
                          );
                        }
                        if (latest.status === "paid" || latest.status === "active") {
                          return (
                            <span className="text-[#059669] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Extension Activated +{durationStr}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-surface-variant/30 flex justify-between items-center bg-white/40 -mx-5 -mb-5 px-5 py-4 rounded-b-3xl">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">
                      {activeTab === "completed" ? "Earned" : "Est Payout"}
                    </span>
                    <span className="text-xl font-black text-on-surface tracking-tight">
                      ₹{(Number(job.total_amount) * 0.8).toFixed(0)}
                    </span>
                  </div>
                  {getActionButton(job)}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </>
  );
}
