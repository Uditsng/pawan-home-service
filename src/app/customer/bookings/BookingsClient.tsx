"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRefreshableData } from "@/lib/refresh/RefreshContext";
import PullToRefresh from "@/components/PullToRefresh";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";
import CancelBookingDialog from "@/components/booking/CancelBookingDialog";
import { createClient } from "@/utils/supabase/client";
import { isCancellableStatus, isReschedulableStatus } from "@/utils/bookingPolicy";

type Booking = {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  total_amount: number;
  services: {
    title: string;
    category: string;
    image_url: string | null;
    subcategories: {
      icon_name: string;
    } | null;
  } | null;
  partner: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  reviews?: {
    id: string;
    rating: number;
    comment: string | null;
  }[] | null;
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "pending":
    case "reassigned":
      return "bg-warning/10 text-warning";
    case "confirmed":
    case "assigned":
    case "accepted":
      return "bg-success/10 text-success";
    case "professional_en_route":
    case "professional_arrived":
    case "otp_pending":
    case "in_progress":
      return "bg-info/10 text-info";
    case "completed":
      return "bg-surface-container-high text-on-surface-variant";
    case "cancelled":
    case "expired":
    case "refunded":
      return "bg-error/10 text-error";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "assigned":
      return "Assigned";
    case "accepted":
      return "Accepted";
    case "professional_en_route":
      return "Pro On The Way";
    case "professional_arrived":
      return "Pro Arrived";
    case "otp_pending":
      return "OTP Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "reassigned":
      return "Reassigned";
    case "expired":
      return "Expired";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
};

export default function BookingsClient({
  bookings: initialBookings,
  userId,
  cancellationWindowMinutes,
}: {
  bookings: Booking[];
  userId: string;
  cancellationWindowMinutes: number;
}) {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Ongoing" | "Completed" | "Cancelled">("Upcoming");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const tabs: Array<"Upcoming" | "Ongoing" | "Completed" | "Cancelled"> = [
    "Upcoming",
    "Ongoing",
    "Completed",
    "Cancelled",
  ];

  const fetchBookings = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(title, category, image_url, subcategories(icon_name)), partner:partner_id(full_name, avatar_url), reviews:reviews(id, rating, comment)")
      .eq("customer_id", userId)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;
    return (data || []) as Booking[];
  }, [userId]);

  const { data: liveBookings, refresh } = useRefreshableData<Booking[]>(
    "bookings",
    fetchBookings,
    {
      initialData: initialBookings,
      cachePolicy: "none",
      realtimeConfig: {
        table: "bookings",
        filter: `customer_id=eq.${userId}`,
      },
    }
  );

  const bookings = liveBookings || initialBookings;

  const tabCounts = useMemo(() => {
    return {
      Upcoming: bookings.filter((b) =>
        ["pending", "confirmed", "assigned", "accepted", "reassigned"].includes(b.status)
      ).length,
      Ongoing: bookings.filter((b) =>
        ["professional_en_route", "professional_arrived", "otp_pending", "in_progress"].includes(b.status)
      ).length,
      Completed: bookings.filter((b) => b.status === "completed").length,
      Cancelled: bookings.filter((b) =>
        ["cancelled", "expired", "refunded"].includes(b.status)
      ).length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      switch (activeTab) {
        case "Upcoming":
          return ["pending", "confirmed", "assigned", "accepted", "reassigned"].includes(booking.status);
        case "Ongoing":
          return ["professional_en_route", "professional_arrived", "otp_pending", "in_progress"].includes(booking.status);
        case "Completed":
          return booking.status === "completed";
        case "Cancelled":
          return ["cancelled", "expired", "refunded"].includes(booking.status);
        default:
          return true;
      }
    });
  }, [bookings, activeTab]);

  return (
    <PullToRefresh onRefresh={refresh}>
      {/* Segmented Tabs Control with Count Badges */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar py-1 px-3 sm:px-4 md:px-6 mb-6 md:mb-8 flex gap-2">
        {tabs.map((tab) => {
          const count = tabCounts[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3.5 sm:px-4 md:px-5 py-2 md:py-2.5 rounded-full font-semibold font-headline text-xs md:text-sm transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span>{tab}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Booking Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 px-3 sm:px-4 md:px-6 w-full max-w-full min-w-0">
        {filteredBookings.length === 0 ? (
          /* Elevated Empty State with Illustration & Actionable CTA */
          <div className="glass-panel p-6 sm:p-8 md:p-12 rounded-3xl bg-surface-container-lowest/80 border border-outline-variant/15 flex flex-col items-center justify-center text-center lg:col-span-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#059669] text-2xl sm:text-3xl">calendar_month</span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-primary font-headline">
              No {activeTab.toLowerCase()} bookings found
            </h3>
            <p className="text-xs md:text-sm text-on-surface-variant max-w-sm mt-1.5 mb-6">
              {activeTab === "Upcoming"
                ? "Looking for reliable home maintenance or deep cleaning? Book a certified professional in minutes."
                : `You don't have any bookings in ${activeTab.toLowerCase()} status.`}
            </p>
            <Link
              href="/customer/dashboard"
              className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs md:text-sm transition-transform active:scale-95 hover:bg-primary/90 shadow-md flex items-center gap-2"
            >
              <span>Book a Service</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const dateObj = new Date(booking.scheduled_date || booking.created_at);
            const dateStr = dateObj.toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Kolkata",
            });
            const timeStr = dateObj.toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            });

            return (
              <div
                key={booking.id}
                className="glass-panel rounded-2xl p-3.5 sm:p-4 transition-all duration-300 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden"
              >
                <div>
                  {/* Card Header: Service Info + Status & Price */}
                  <div className="flex justify-between items-start mb-3 md:mb-4 gap-2 sm:gap-3 min-w-0">
                    <div className="flex gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <ServiceCardThumbnail
                        imageUrl={booking.services?.image_url}
                        iconName={booking.services?.subcategories?.icon_name || "home_repair_service"}
                        containerClassName="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl shrink-0"
                        iconClassName="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#059669] drop-shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-headline text-sm sm:text-base md:text-lg font-bold text-on-surface leading-tight truncate">
                          {booking.services?.title || "Service"}
                        </h3>
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] sm:text-xs md:text-sm mt-1 flex-wrap">
                          <span className="material-symbols-outlined text-[14px] sm:text-sm shrink-0">calendar_today</span>
                          <span className="truncate">{dateStr}</span>
                          <span className="opacity-40">·</span>
                          <span className="shrink-0">{timeStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge + Mandatory Price */}
                    <div className="flex flex-col items-end gap-1 shrink-0 min-w-fit">
                      <span className={`px-2.5 py-0.5 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full font-headline tracking-wide uppercase whitespace-nowrap ${getStatusClasses(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                      <span className="font-headline font-black text-xs sm:text-sm md:text-base text-primary whitespace-nowrap">
                        ₹{Math.round(booking.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="bg-surface-container-low rounded-xl p-2.5 sm:p-3 mb-3 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center shrink-0">
                        {booking.partner?.avatar_url ? (
                          <Image src={booking.partner.avatar_url} alt={booking.partner.full_name} width={32} height={32} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant text-base">person</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] sm:text-[10px] text-on-surface-variant font-medium leading-none">Professional</p>
                        <p className="text-xs sm:text-sm font-bold text-on-surface truncate mt-0.5">
                          {booking.partner?.full_name || "Assigning soon..."}
                        </p>
                      </div>
                    </div>
                    {booking.partner && (
                      <div className="flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        <span className="text-[9px] font-bold text-success uppercase tracking-wider">Assigned</span>
                      </div>
                    )}
                  </div>

                  {(booking.status === "pending" || booking.status === "reassigned") && !booking.partner && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/50 border border-outline-variant/10 mb-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-xs md:text-sm shrink-0">info</span>
                      <p className="text-[10px] md:text-xs text-on-surface-variant font-medium leading-tight">Finding the nearest certified Pro for your area.</p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-outline-variant/10">
                  <Link
                    href={booking.status === "completed" ? `/customer/bookings/${booking.id}/invoice` : `/customer/bookings/${booking.id}/tracking`}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-white font-bold font-headline text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all hover:bg-primary/90 active:scale-98"
                  >
                    {booking.status === "completed" ? (
                      <>
                        <span className="material-symbols-outlined text-base">receipt_long</span>
                        View Receipt
                      </>
                    ) : ["cancelled", "expired", "refunded"].includes(booking.status) ? (
                      <>
                        <span className="material-symbols-outlined text-base">info</span>
                        Details
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">map</span>
                        Track Booking
                      </>
                    )}
                  </Link>

                  {booking.status === "completed" && (!booking.reviews || booking.reviews.length === 0) && (
                    <Link
                      href={`/customer/bookings/${booking.id}/tracking`}
                      className="px-4 py-2.5 rounded-xl bg-secondary text-primary font-bold font-headline text-xs md:text-sm transition-all hover:brightness-105 active:scale-98 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      Rate & Review
                    </Link>
                  )}

                  {booking.status === "completed" && booking.reviews && booking.reviews.length > 0 && (
                    <div className="px-3 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-bold font-headline text-xs flex items-center justify-center gap-1 border border-outline-variant/10">
                      <span className="material-symbols-outlined text-sm text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span>{booking.reviews[0].rating} ★ Rated</span>
                    </div>
                  )}

                  {/* Reschedule & Cancel actions (driven by status policy) */}
                  {(isReschedulableStatus(booking.status) || isCancellableStatus(booking.status)) && (
                    <div className="flex gap-2">
                      {isReschedulableStatus(booking.status) && (
                        <Link
                          href={`/customer/bookings/${booking.id}/reschedule`}
                          className="px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold font-headline text-xs md:text-sm transition-all hover:bg-surface-container-high active:scale-98 flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">update</span>
                          Reschedule
                        </Link>
                      )}
                      {isCancellableStatus(booking.status) && (
                        <button
                          onClick={() => setCancelTarget(booking)}
                          className="px-3 py-2.5 rounded-xl border border-error/25 bg-surface-container-low text-error font-bold font-headline text-xs md:text-sm transition-all hover:bg-error/10 active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {cancelTarget && (
        <CancelBookingDialog
          bookingId={cancelTarget.id}
          createdAt={cancelTarget.created_at}
          scheduledDate={cancelTarget.scheduled_date}
          totalAmount={cancelTarget.total_amount}
          cancellationWindowMinutes={cancellationWindowMinutes}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => {
            setCancelTarget(null);
            void refresh();
          }}
        />
      )}
    </PullToRefresh>
  );
}
