"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Booking = {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  services: {
    title: string;
    category: string;
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
      return "bg-primary/10 text-primary";
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

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const [activeTab, setActiveTab] = useState("Upcoming");

  const tabs = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

  const filteredBookings = bookings.filter((booking) => {
    switch (activeTab) {
      case "Upcoming":
        return (
          booking.status === "pending" ||
          booking.status === "confirmed" ||
          booking.status === "assigned" ||
          booking.status === "accepted" ||
          booking.status === "reassigned"
        );
      case "Ongoing":
        return (
          booking.status === "professional_en_route" ||
          booking.status === "professional_arrived" ||
          booking.status === "otp_pending" ||
          booking.status === "in_progress"
        );
      case "Completed":
        return booking.status === "completed";
      case "Cancelled":
        return (
          booking.status === "cancelled" ||
          booking.status === "expired" ||
          booking.status === "refunded"
        );
      default:
        return true;
    }
  });

  return (
    <>
      {/* Segmented Tabs Control */}
      <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto no-scrollbar py-1 px-4 md:px-6 after:content-[''] after:shrink-0 after:w-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold font-headline text-xs md:text-sm transition-all shadow-sm ${activeTab === tab
              ? "bg-primary-container text-on-primary-container"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Booking Cards List */}
      <div className="grid gap-2 md:gap-3 px-3 md:px-4 lg:grid-cols-2">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-10 md:py-12 bg-surface-container-lowest rounded-sm lg:col-span-2">
            <p className="text-on-surface-variant font-medium text-sm md:text-base">No {activeTab.toLowerCase()} bookings found.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const dateObj = new Date(booking.scheduled_date || booking.created_at);
            const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" });
            const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

            return (
              <div key={booking.id} className="glass-panel rounded-2xl p-3 md:p-4 transition-all duration-300">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div className="flex gap-2">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-green-500/10 flex items-center justify-center text-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">
                        {booking.services?.category === 'cleaning' ? 'cleaning_services' : 'home_repair_service'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base md:text-lg font-bold text-on-surface leading-none">
                        {booking.services?.title || "Service"}
                      </h3>
                      <div className="flex items-center gap-1 md:gap-1.5 text-on-surface-variant text-xs md:text-sm mt-1.5 md:mt-2 flex-wrap">
                        <span className="material-symbols-outlined text-sm md:text-base">calendar_today</span>
                        <span>{dateStr}</span>
                        <span className="mx-0.5 md:mx-1 opacity-30">•</span>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-sm md:text-base">schedule</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-xs font-bold rounded-full font-headline tracking-wide uppercase shrink-0 ${getStatusClasses(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                {/* Professional UI (Placeholder for now) */}
                {(activeTab === "Upcoming" || activeTab === "Ongoing") && (
                  <div className="bg-surface-container-low rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center">
                        {booking.partner?.avatar_url ? (
                          <Image src={booking.partner.avatar_url} alt={booking.partner.full_name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant text-sm md:text-base">person</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] md:text-xs text-on-surface-variant font-medium">Your Professional</p>
                        <p className="text-xs md:text-sm font-bold text-on-surface">
                          {booking.partner?.full_name || "Assigning soon..."}
                        </p>
                      </div>
                    </div>
                    {booking.partner && (
                      <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Assigned</span>
                      </div>
                    )}
                  </div>
                )}

                {(booking.status === 'pending' || booking.status === 'reassigned') && !booking.partner && (
                  <div className="flex items-center gap-2 p-3 md:p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/10 mb-4 md:mb-6">
                    <span className="material-symbols-outlined text-on-surface-variant text-xs md:text-sm">info</span>
                    <p className="text-[10px] md:text-xs text-on-surface-variant font-medium">We are finding the best Professional for you. You will be notified shortly.</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Link href={booking.status === 'completed' ? `/customer/bookings/${booking.id}/invoice` : `/customer/bookings/${booking.id}/tracking`} className="flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-xl bg-primary text-on-primary font-bold font-headline text-xs md:text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95">
                    {booking.status === 'completed' ? (
                      <>
                        <span className="material-symbols-outlined text-base md:text-lg">receipt_long</span>
                        View Receipt
                      </>
                    ) : ['cancelled', 'expired', 'refunded'].includes(booking.status) ? (
                      <>
                        <span className="material-symbols-outlined text-base md:text-lg">info</span>
                        Details
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base md:text-lg">map</span>
                        Track Booking
                      </>
                    )}
                  </Link>
                  {booking.status === 'completed' && (!booking.reviews || booking.reviews.length === 0) && (
                    <Link href={`/customer/bookings/${booking.id}/tracking`} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-secondary text-on-secondary font-bold font-headline text-xs md:text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
                      <span className="material-symbols-outlined text-base md:text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      Rate & Review
                    </Link>
                  )}
                  {booking.status === 'completed' && booking.reviews && booking.reviews.length > 0 && (
                    <div className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-surface-container-high text-on-surface-variant font-bold font-headline text-xs md:text-sm flex items-center justify-center gap-1.5 border border-outline-variant/10">
                      <span className="material-symbols-outlined text-base md:text-lg text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span>{booking.reviews[0].rating} ★ Rated</span>
                    </div>
                  )}
                  {/* Reschedule logic placeholder */}
                  {activeTab === "Upcoming" && (
                    <button className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-surface-container-low text-on-surface font-bold font-headline text-xs md:text-sm transition-all hover:bg-surface-container-high active:scale-95">
                      Reschedule
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Featured Highlight Bento Item */}
        <div className="bg-primary-container rounded-2xl md:rounded-3xl p-5 md:p-6 text-on-primary-container relative overflow-hidden h-40 md:h-48 flex flex-col justify-end mt-3 md:mt-4 lg:col-span-2">
          <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-primary-fixed/20 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 blur-2xl"></div>
          <div className="relative z-10">
            <span className="px-2.5 md:px-3 py-0.5 md:py-1 bg-primary-fixed/30 rounded-full text-[9px] md:text-[10px] uppercase font-black tracking-widest font-headline">Member Perk</span>
            <h4 className="font-headline text-lg md:text-xl font-extrabold mt-2 max-w-[200px]">Priority handling for all upcoming bookings</h4>
          </div>
          <span className="material-symbols-outlined absolute top-5 md:top-6 right-5 md:right-6 text-4xl md:text-5xl opacity-20">verified_user</span>
        </div>
      </div>
    </>
  );
}
