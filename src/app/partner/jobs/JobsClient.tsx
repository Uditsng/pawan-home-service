"use client";

import { useState, useTransition } from "react";
import { rejectJob, startJob, completeJob } from "../actions";
import type { BookingWithDetails } from "@/lib/types";

interface JobsClientProps {
  assignedJobs: BookingWithDetails[];
  activeJobs: BookingWithDetails[];
  completedJobs: BookingWithDetails[];
}

type TabKey = "assigned" | "active" | "completed";

export default function JobsClient({
  assignedJobs,
  activeJobs,
  completedJobs,
}: JobsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("assigned");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "assigned", label: "Assigned", count: assignedJobs.length },
    { key: "active", label: "Active", count: activeJobs.length },
    { key: "completed", label: "Completed", count: completedJobs.length },
  ];

  const currentJobs =
    activeTab === "assigned"
      ? assignedJobs
      : activeTab === "active"
        ? activeJobs
        : completedJobs;

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
      "Job rejected. We'll reassign it to another Professional."
    );
    setRejectBookingId(null);
    setRejectReason("");
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
      case "in_progress":
        return "build";
      case "confirmed":
        return "assignment_ind";
      case "accepted":
        return "check_circle";
      case "pending":
        return "schedule";
      case "completed":
        return "task_alt";
      default:
        return "help";
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "in_progress":
        return "bg-primary/10 text-primary";
      case "confirmed":
        return "bg-secondary/10 text-secondary";
      case "accepted":
        return "bg-tertiary-container/10 text-tertiary-container";
      case "pending":
        return "bg-amber-500/10 text-amber-600";
      case "completed":
        return "bg-green-500/10 text-green-600";
      default:
        return "bg-surface-container text-on-surface-variant";
    }
  }

  function getActionButton(job: BookingWithDetails) {
    // Assigned tab: Start or Reject
    if (activeTab === "assigned") {
      return (
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              handleAction(() => startJob(job.id), "Job started! You're on your way.")
            }
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Start Job"}
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

    // Active tab: Start or Complete
    if (activeTab === "active") {
      if (job.status === "accepted") {
        return (
          <button
            disabled={isPending}
            onClick={() =>
              handleAction(() => startJob(job.id), "Job started!")
            }
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Start Route"}
          </button>
        );
      }
      if (job.status === "in_progress") {
        return (
          <button
            disabled={isPending}
            onClick={() =>
              handleAction(() => completeJob(job.id), "Job completed!")
            }
            className="bg-linear-to-br from-[#00685f] to-[#008378] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,104,95,0.25)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? "Processing..." : "Complete Job"}
          </button>
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

  return (
    <>
      {/* Toast Messages */}
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

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-[slideUp_0.3s_ease-out] shadow-2xl">
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
              Let us know why so we can improve job matching. This booking will be automatically reassigned to another Professional.
            </p>

            {/* Quick reason buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {rejectReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${rejectReason === reason
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Custom reason input */}
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

      {/* Tab Bar */}
      <div className="px-3 flex gap-2 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${activeTab === tab.key
                ? "bg-primary text-on-primary shadow-md"
                : "bg-transparent text-on-surface-variant hover:bg-surface-container-low"
              }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Job Cards */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-4">
        {currentJobs.length === 0 && (
          <div className="bg-surface-container p-8 rounded-3xl text-center shadow-inner">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">
              {activeTab === "assigned"
                ? "assignment_ind"
                : activeTab === "active"
                  ? "event_available"
                  : "task_alt"}
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
                ? "New jobs will be automatically assigned to you based on your skills and availability."
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
            {/* Auto-assigned badge for assigned jobs */}
            {activeTab === "assigned" && (
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Auto-Assigned to You
                </span>
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl ${getStatusColor(job.status)} flex items-center justify-center border border-white/40 shadow-sm`}
                >
                  <span className="material-symbols-outlined font-bold">
                    {getStatusIcon(job.status)}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-[15px] leading-tight text-on-surface">
                    {job.services?.title || "Untitled Service"}
                  </h3>
                  <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                    Booking {job.id.substring(0, 8)}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 ${getStatusColor(job.status)}`}
              >
                {(job.status === "in_progress" || job.status === "confirmed") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                )}
                {job.status.replace("_", " ")}
              </span>
            </div>

            <div className="space-y-2 mb-5 pl-1">
              <div className="flex items-center gap-3 text-[13px] text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">
                  calendar_clock
                </span>
                {job.scheduled_date
                  ? new Date(job.scheduled_date).toLocaleString()
                  : "Date TBD"}
              </div>
              <div className="flex items-center gap-3 text-[13px] text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">
                  location_on
                </span>
                {job.city || "Location TBD"}
              </div>
              {job.customer?.full_name && (
                <div className="flex items-center gap-3 text-[13px] text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">
                    person
                  </span>
                  {job.customer.full_name}
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
      </main>
    </>
  );
}
