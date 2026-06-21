import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import CustomerHeader from "@/components/CustomerHeader";
import BottomNav from "@/components/BottomNav";
import type { Metadata } from "next";
import RatingSection from "@/components/RatingSection";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Booking Status | PHS Cleaning Company",
    description: "View your booking status and details.",
  };
}

interface SubcategoryInfo {
  subcategory_name: string;
  icon_name: string;
}

interface ServiceInfo {
  title: string;
  category: string;
  subcategories: SubcategoryInfo | null;
}

interface PartnerInfo {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating_avg: number | null;
  jobs_accepted_count: number | null;
}

interface BookingDetails {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
  total_amount: number;
  address: string | null;
  city: string | null;
  arrival_otp: string | null;
  arrival_otp_verified: boolean;
  completion_otp: string | null;
  completion_otp_verified: boolean;
  services: ServiceInfo | null;
  partner: PartnerInfo | null;
}

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-warning/10 text-warning";
    case "confirmed":
      return "bg-success/10 text-success";
    case "assigned":
    case "accepted":
      return "bg-teal-500/10 text-teal-600";
    case "professional_en_route":
    case "professional_arrived":
    case "otp_pending":
    case "in_progress":
      return "bg-primary/10 text-primary";
    case "completed":
      return "bg-surface-container-highest text-on-surface-variant";
    case "cancelled":
      return "bg-error/10 text-error";
    default:
      return "bg-surface-container text-on-surface-variant";
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
    default:
      return status;
  }
};

export default async function BookingTrackingPage({ params }: TrackingPageProps) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch booking with service + subcategory + partner details
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      created_at,
      total_amount,
      address,
      city,
      arrival_otp,
      arrival_otp_verified,
      completion_otp,
      completion_otp_verified,
      services (
        title,
        category,
        subcategories (
          subcategory_name,
          icon_name
        )
      ),
      partner:partner_id (
        full_name,
        avatar_url,
        phone,
        rating_avg,
        jobs_accepted_count
      )
    `)
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single();

  const booking = bookingData as unknown as BookingDetails | null;

  if (!booking) {
    redirect("/customer/bookings");
  }

  // Fetch existing review if booking is completed
  let existingReview: { rating: number; comment: string | null } | null = null;
  if (booking.status === "completed") {
    const { data: reviewData } = await supabase
      .from("reviews")
      .select("rating, comment")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (reviewData) {
      existingReview = reviewData;
    }
  }

  const bookingRef = `BK-${booking.id.substring(0, 6).toUpperCase()}`;
  const scheduledDate = booking.scheduled_date ? new Date(booking.scheduled_date) : new Date();
  const displayDate = scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" });
  const displayTime = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const iconName = booking.services?.subcategories?.icon_name ||
    (booking.services?.category === "cleaning" ? "cleaning_services" : "home_repair_service");

  const isAssigned = !!booking.partner;
  const partnerName = booking.partner?.full_name || "Assigning soon...";
  const partnerAvatar = booking.partner?.avatar_url;

  const statusLevels: Record<string, number> = {
    pending: 1,
    confirmed: 1,
    assigned: 2,
    accepted: 2,
    professional_en_route: 3,
    professional_arrived: 4,
    otp_pending: 4,
    in_progress: 5,
    completed: 6,
    cancelled: 0,
  };

  const currentLevel = statusLevels[booking.status] || 1;
  const isArrivalOtpVerified = !!booking.arrival_otp_verified;
  const actualLevel = (booking.status === "otp_pending" && isArrivalOtpVerified) ? 5 : currentLevel;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Navigation & Header */}
        <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/customer/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Bookings
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
                Booking Status
              </h1>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${getStatusBadgeClasses(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>
            <p className="text-on-surface-variant text-xs md:text-sm font-medium mt-1">
              Reference: <span className="font-bold">#{bookingRef}</span> &middot; Scheduled for {displayDate} at {displayTime}
            </p>
          </div>
        </section>

        {/* Bento-Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Column: Status Checklist and Booking Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Service Timeline Progress */}
            <div className="glass-panel rounded-3xl p-6 md:p-8">
              <h3 className="font-headline text-base font-bold uppercase tracking-wider text-on-surface-variant mb-6">
                Service Progress Checklist
              </h3>

              <div className="space-y-6 relative before:content-[''] before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant/40">
                {/* Step 1: Placed */}
                <div className="flex gap-4 relative z-10 hover:translate-x-0.5 transition-transform duration-200">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-sm font-bold">done</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-bold text-on-surface">Booking Placed</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Request registered and confirmed successfully</p>
                  </div>
                </div>

                {/* Step 2: Assigned */}
                <div className="flex gap-4 relative z-10 hover:translate-x-0.5 transition-transform duration-200">
                  {isAssigned ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">done</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 animate-pulse border border-secondary/20 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">person_search</span>
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <h4 className={`text-sm font-bold ${isAssigned ? "text-on-surface" : "text-on-surface-variant animate-pulse"}`}>
                      {isAssigned ? "Technician Assigned" : "Assigning Technician"}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {isAssigned ? `${booking.partner?.full_name} has been selected for your service` : "Selecting the optimal service professional near you"}
                    </p>
                  </div>
                </div>

                {/* Step 3: Transit */}
                <div className="flex gap-4 relative z-10 hover:translate-x-0.5 transition-transform duration-200">
                  {actualLevel >= 4 ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">done</span>
                    </div>
                  ) : actualLevel === 3 ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-pulse border border-primary/20 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">motorcycle</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-sm font-bold">lock</span>
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <h4 className={`text-sm font-bold ${actualLevel >= 3 ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {actualLevel >= 4 ? "Professional Dispatched" : actualLevel === 3 ? "Professional On The Way" : "Professional Dispatched"}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {actualLevel >= 4 ? "Professional arrived at your location" : actualLevel === 3 ? "Technician is on the way to you" : "Awaiting dispatch status updates"}
                    </p>
                  </div>
                </div>

                {/* Step 4: Started */}
                <div className="flex gap-4 relative z-10 hover:translate-x-0.5 transition-transform duration-200">
                  {actualLevel >= 6 ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">done</span>
                    </div>
                  ) : actualLevel === 4 ? (
                    <div className="w-8 h-8 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 animate-pulse border border-warning/20 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">vpn_key</span>
                    </div>
                  ) : actualLevel === 5 ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-pulse border border-primary/20 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">build</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-sm font-bold">lock</span>
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <h4 className={`text-sm font-bold ${actualLevel >= 4 ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {actualLevel >= 6 ? "Service Completed" : actualLevel === 5 ? "Service Active" : actualLevel === 4 ? "Awaiting OTP Verification" : "Service Active"}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {actualLevel >= 6 ? "Work has been completed" : actualLevel === 5 ? "Technician is performing the service" : actualLevel === 4 ? "Provide the Arrival OTP to the technician to start the job" : "Job verification and work in progress"}
                    </p>
                  </div>
                </div>

                {/* Step 5: Completed */}
                <div className="flex gap-4 relative z-10 hover:translate-x-0.5 transition-transform duration-200">
                  {actualLevel >= 6 ? (
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">done</span>
                    </div>
                  ) : (booking.status === "otp_pending" && isArrivalOtpVerified) ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/15 text-[#059669] flex items-center justify-center shrink-0 animate-pulse border border-[#059669]/30 shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">verified_user</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-sm font-bold">lock</span>
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <h4 className={`text-sm font-bold ${actualLevel >= 6 ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {(booking.status === "otp_pending" && isArrivalOtpVerified) ? "Awaiting Completion OTP" : "Appointment Concluded"}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {actualLevel >= 6 ? "Invoice generated and rating feedback recorded" : (booking.status === "otp_pending" && isArrivalOtpVerified) ? "Provide the Completion OTP to the technician to finish" : "Final billing and closing checks"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {booking.status === "completed" && (
              <div className="glass-panel rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#059669] drop-shadow-sm">receipt_long</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-base font-bold text-on-surface">Service Invoice & Receipt</h3>
                    <p className="text-xs text-on-surface-variant">Tax invoice generated successfully</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                  Your tax invoice is ready. You can view it online, download it as a print-friendly PDF, or share the link.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/customer/bookings/${booking.id}/invoice`}
                    className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View Invoice
                  </Link>
                  <Link
                    href={`/customer/bookings/${booking.id}/invoice?download=true`}
                    className="px-5 py-2.5 bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline-variant/15 hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    Download PDF
                  </Link>
                </div>
              </div>
            )}

            {booking.status === "completed" && (
              <RatingSection bookingId={booking.id} existingReview={existingReview} />
            )}

            {/* Service & Booking Details Summary Card */}
            <div className="glass-panel rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-outline-variant/30">
                <div className="flex items-center gap-4">
                  {/* Emerald green actionable container standard as per rule 11-B & 8-H */}
                  <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl text-[#059669] drop-shadow-sm">{iconName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                      Booked Service
                    </span>
                    <h3 className="font-headline text-lg md:text-xl font-bold text-on-surface leading-tight mt-0.5">
                      {booking.services?.title || "Service Appointment"}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                    Total Amount
                  </span>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    ₹{booking.total_amount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                    Reference Code
                  </span>
                  <p className="text-on-surface font-bold mt-1">
                    #{bookingRef}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                    Scheduled Slot
                  </span>
                  <p className="text-on-surface font-bold mt-1">
                    {displayDate} &middot; {displayTime}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                    Service Address
                  </span>
                  <p className="text-on-surface font-bold mt-1 leading-tight">
                    {booking.address || "Local Delivery Area"}, {booking.city || ""}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Column: Professional details & actions */}
          <div className="flex flex-col gap-6">

            {/* OTP Verification Card */}
            {booking.status === "otp_pending" && (
              <div className="bg-success/10 border border-success/20 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col items-center justify-center text-center animate-pulse">
                <div className="absolute top-0 right-0 w-12 h-12 bg-success/5 rounded-bl-full pointer-events-none" />
                <span className="material-symbols-outlined text-success text-3xl mb-2 drop-shadow-sm font-bold">
                  {!booking.arrival_otp_verified ? "vpn_key" : "verified_user"}
                </span>
                <h3 className="font-headline font-bold text-sm text-success uppercase tracking-wider drop-shadow-sm">
                  {!booking.arrival_otp_verified ? "Arrival OTP to Start Service" : "Completion OTP to Conclude Service"}
                </h3>
                <p className="font-headline text-3xl font-extrabold tracking-widest text-success mt-2 drop-shadow-sm">
                  {!booking.arrival_otp_verified ? booking.arrival_otp : booking.completion_otp}
                </p>
                <p className="text-[11px] text-success/80 font-medium mt-2 max-w-[220px]">
                  Share this 6-digit verification code with your Professional to {!booking.arrival_otp_verified ? "start the job" : "complete the job"}.
                </p>
              </div>
            )}

            {/* Professional Snapshot */}
            <div className="glass-panel rounded-3xl p-5 md:p-6">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                Your Professional
              </h3>

              {isAssigned ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 shrink-0 relative">
                      {partnerAvatar ? (
                        <Image src={partnerAvatar} alt={partnerName} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container text-on-surface font-black">
                          {partnerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-headline text-sm font-bold text-on-surface leading-tight">
                          {partnerName}
                        </p>
                        <span className="material-symbols-outlined text-[#059669] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {booking.partner?.rating_avg && (
                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-on-surface-variant">
                            <span className="material-symbols-outlined text-amber-500 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {booking.partner.rating_avg.toFixed(1)}
                          </div>
                        )}
                        {booking.partner?.jobs_accepted_count != null && booking.partner.jobs_accepted_count > 0 && (
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            &middot; {booking.partner.jobs_accepted_count} jobs completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex gap-2">
                    <button
                      disabled
                      className="flex-1 py-2 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center gap-1.5 opacity-65 cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm">phone</span>
                      Call (Active on dispatch)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/40 animate-pulse mb-2">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <h4 className="font-headline text-xs font-bold text-on-surface">Assigning Technician...</h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed mt-1 max-w-[200px]">
                    Our administration team is currently assigning the optimal, background-verified technician for your service.
                  </p>
                </div>
              )}
            </div>

            {/* Back CTA Button block */}
            <div className="flex flex-col gap-2">
              <Link
                href="/customer/bookings"
                className="w-full text-center py-3 bg-primary text-on-primary font-bold rounded-xl font-headline transition-opacity hover:opacity-90 active:scale-98 text-xs md:text-sm shadow-sm"
              >
                Back to Bookings List
              </Link>
              <Link
                href="/customer/dashboard"
                className="w-full text-center py-3 bg-surface-container text-on-surface font-bold rounded-xl font-headline transition-colors hover:bg-surface-container-high active:scale-98 text-xs md:text-sm"
              >
                Go to Home Dashboard
              </Link>
            </div>

          </div>

        </div>

      </main>

      <BottomNav />
    </div>
  );
}
